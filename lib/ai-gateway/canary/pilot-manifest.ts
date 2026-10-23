/**
 * lib/ai-gateway/canary/pilot-manifest.ts
 * G5-A: herramienta OFFLINE para poblar el manifiesto de procedencia con un piloto pequeño.
 *
 *   candidato → verificación → revisión del CLO → entrada aprobada del manifiesto
 *
 * Reglas:
 *  - Un candidato NUNCA se aprueba solo: la aprobación exige una revisión del CLO con aprobador (persona),
 *    fecha real y una referencia verificable (URL https al dictamen). Un aprobador que parezca un sistema se rechaza.
 *  - Sin revisión formal, la etapa es PENDING_CLO_APPROVAL y la entrada queda FUERA del manifiesto efectivo.
 *  - Ningún campo se inventa: lo que no se sabe es `null` y aparece como faltante.
 * Puro: sin red, sin base de datos, sin escritura de archivos.
 */
import type { FragmentoRAG } from '../../legal-retrieval/types';
import { motivoEntradaInvalida, sha256Contenido, validarManifiesto, type EntradaProcedencia } from '../shadow/public-provenance';

export type EtapaPiloto = 'PENDING_CLO_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface RevisionCLO {
  decision: 'APPROVED' | 'REJECTED';
  aprobadoPor: string;
  /** YYYY-MM-DD */
  aprobadoEn: string;
  /** URL https del dictamen o comentario donde consta la decisión. */
  referencia: string;
}

export interface CandidatoPiloto {
  clave: string;
  descripcion: string;
  fragmentoId: string | null;
  fuente: string | null;
  numArticulo: string | null;
  contenidoSha256: string | null;
  fuenteOficial: { url: string | null; gaceta: string | null; pdfSha256: string | null };
  estadoVerificacion: 'V4' | 'V5' | null;
  /** Nota de procedencia: de dónde sale cada dato y qué NO se sabe. */
  nota: string;
  revisionCLO: RevisionCLO | null;
  /** G6-B: expediente completo para el CLO, con la procedencia de cada dato. Opcional: no afecta la verificación del manifiesto. */
  dossier?: DossierCLO;
}

export type EstadoDato = 'SOURCED_FROM_REPO' | 'PENDING_VERIFICATION';

/** Un dato del expediente: su valor (o null), de dónde sale y si falta verificarlo. Nunca se rellena lo que no se sabe. */
export interface DatoDossier {
  valor: string | null;
  estado: EstadoDato;
  /** Procedencia: archivo/sección del repositorio o fuente que lo respalda; null si no hay. */
  procedencia: string | null;
  nota?: string;
}

export interface DossierCLO {
  norma: DatoDossier;
  decreto: DatoDossier;
  articulo: DatoDossier;
  textoExacto: DatoDossier;
  fragmentoIdCanonico: DatoDossier;
  contenidoSha256: DatoDossier;
  gaceta: DatoDossier;
  fechaGaceta: DatoDossier;
  urlOficial: DatoDossier;
  pdfSha256: DatoDossier;
  estadoV: DatoDossier;
  evidenciaVigencia: DatoDossier;
  reformaODerogacion: DatoDossier;
  goldenSetRelacionado: DatoDossier;
  /** Qué se le pide decidir al CLO. */
  decisionSolicitada: string;
}

export interface ResultadoVerificacion {
  faltantes: string[];
  discrepancias: string[];
  /** Completo y sin discrepancias: puede pasar a revisión del CLO. */
  revisable: boolean;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const NO_PERSONA = /\b(claude|assistant|asistente|bot|auto(?:matic)?|sistema|system|gpt|ia)\b/i;

export function verificarCandidato(c: CandidatoPiloto, actual?: FragmentoRAG): ResultadoVerificacion {
  const faltantes: string[] = [];
  const val = (nombre: string, v: string | null) => { if (v === null || v.trim() === '') faltantes.push(nombre); };
  val('fragmentoId', c.fragmentoId); val('fuente', c.fuente); val('numArticulo', c.numArticulo);
  val('contenidoSha256', c.contenidoSha256); val('fuenteOficial.url', c.fuenteOficial.url);
  val('fuenteOficial.gaceta', c.fuenteOficial.gaceta); val('fuenteOficial.pdfSha256', c.fuenteOficial.pdfSha256);
  if (c.estadoVerificacion === null) faltantes.push('estadoVerificacion');
  const discrepancias: string[] = [];
  // Si todo está completo, el formato lo valida el mismo validador del manifiesto.
  if (faltantes.length === 0) {
    const r = motivoEntradaInvalida({ ...entradaSinAprobar(c), aprobadoPor: 'pendiente', aprobadoEn: '2000-01-01' });
    if (r) discrepancias.push(`formato:${r}`);
  }
  if (actual) {
    if (c.fragmentoId !== null && actual.id !== c.fragmentoId) discrepancias.push('fragmentoId');
    if (c.fuente !== null && actual.fuente !== c.fuente) discrepancias.push('fuente');
    if (c.numArticulo !== null && String(actual.num_articulo ?? '') !== c.numArticulo) discrepancias.push('numArticulo');
    if (c.contenidoSha256 !== null && sha256Contenido(actual.contenido) !== c.contenidoSha256) discrepancias.push('contenidoSha256');
  }
  return { faltantes, discrepancias, revisable: faltantes.length === 0 && discrepancias.length === 0 };
}

export function etapaDe(c: CandidatoPiloto, actual?: FragmentoRAG): EtapaPiloto {
  if (c.revisionCLO?.decision === 'REJECTED') return 'REJECTED';
  if (c.revisionCLO?.decision === 'APPROVED' && verificarCandidato(c, actual).revisable) return 'APPROVED';
  return 'PENDING_CLO_APPROVAL';
}

function entradaSinAprobar(c: CandidatoPiloto): Omit<EntradaProcedencia, 'aprobadoPor' | 'aprobadoEn'> {
  return {
    fragmentoId: c.fragmentoId ?? '', fuente: c.fuente ?? '', numArticulo: c.numArticulo ?? '', contenidoSha256: c.contenidoSha256 ?? '',
    fuenteOficial: { url: c.fuenteOficial.url ?? '', gaceta: c.fuenteOficial.gaceta ?? '', pdfSha256: c.fuenteOficial.pdfSha256 ?? '' },
    estadoVerificacion: c.estadoVerificacion ?? ('' as never),
  };
}

/** Registra la decisión del CLO. Lanza si la revisión no es formal; nunca fabrica una aprobación. */
export function registrarRevisionCLO(c: CandidatoPiloto, r: RevisionCLO): CandidatoPiloto {
  if (r.decision !== 'APPROVED' && r.decision !== 'REJECTED') throw new Error('decision inválida');
  if (typeof r.aprobadoPor !== 'string' || r.aprobadoPor.trim().length < 3 || NO_PERSONA.test(r.aprobadoPor)) throw new Error('aprobadoPor debe ser una persona identificable');
  if (!FECHA.test(r.aprobadoEn) || Number.isNaN(Date.parse(r.aprobadoEn))) throw new Error('aprobadoEn debe ser una fecha YYYY-MM-DD real');
  if (!/^https:\/\/\S+$/.test(r.referencia)) throw new Error('referencia debe ser una URL https al dictamen');
  if (r.decision === 'APPROVED' && !verificarCandidato(c).revisable) throw new Error('no se aprueba un candidato incompleto o con discrepancias');
  return { ...c, revisionCLO: { ...r } };
}

/** Entrada de manifiesto para un candidato APROBADO; null en cualquier otro caso. */
export function aEntradaManifiesto(c: CandidatoPiloto, actual?: FragmentoRAG): EntradaProcedencia | null {
  if (etapaDe(c, actual) !== 'APPROVED' || !c.revisionCLO) return null;
  const e: EntradaProcedencia = { ...entradaSinAprobar(c), aprobadoPor: c.revisionCLO.aprobadoPor, aprobadoEn: c.revisionCLO.aprobadoEn };
  return motivoEntradaInvalida(e) === null ? e : null;
}

export interface ManifiestoEfectivo { entradas: EntradaProcedencia[]; fueraDelManifiesto: Array<{ clave: string; etapa: EtapaPiloto; faltantes: string[] }> }

/** Solo las entradas APROBADAS y válidas; el resto queda listado fuera. */
export function construirManifiestoEfectivo(candidatos: readonly CandidatoPiloto[]): ManifiestoEfectivo {
  const entradas: EntradaProcedencia[] = [];
  const fuera: ManifiestoEfectivo['fueraDelManifiesto'] = [];
  for (const c of candidatos) {
    const e = aEntradaManifiesto(c);
    if (e) entradas.push(e);
    else fuera.push({ clave: c.clave, etapa: etapaDe(c), faltantes: verificarCandidato(c).faltantes });
  }
  if (validarManifiesto(entradas).length > 0) return { entradas: [], fueraDelManifiesto: candidatos.map((c) => ({ clave: c.clave, etapa: etapaDe(c), faltantes: ['manifiesto_invalido'] })) };
  return { entradas, fueraDelManifiesto: fuera };
}

/** Informe legible del piloto, para el CLO. */
export function informePiloto(candidatos: readonly CandidatoPiloto[]): string {
  const lineas = ['PILOTO DE MANIFIESTO DE PROCEDENCIA PÚBLICA'];
  for (const c of candidatos) {
    const v = verificarCandidato(c);
    lineas.push(
      `- ${c.clave} — ${c.descripcion}`,
      `    etapa: ${etapaDe(c)}${c.revisionCLO ? ` (${c.revisionCLO.decision} por ${c.revisionCLO.aprobadoPor}, ${c.revisionCLO.aprobadoEn})` : ' (sin revisión formal del CLO)'}`,
      `    faltantes: ${v.faltantes.length ? v.faltantes.join(', ') : 'ninguno'}`,
      `    discrepancias: ${v.discrepancias.length ? v.discrepancias.join(', ') : 'ninguna'}`,
      `    nota: ${c.nota}`,
    );
  }
  const ef = construirManifiestoEfectivo(candidatos);
  lineas.push(`MANIFIESTO EFECTIVO: ${ef.entradas.length} entrada(s) aprobada(s); ${ef.fueraDelManifiesto.length} fuera.`);
  return lineas.join('\n');
}
