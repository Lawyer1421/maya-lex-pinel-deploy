/**
 * lib/ai-gateway/shadow/public-provenance.ts
 * G4-A: PRUEBA FUERTE de procedencia pública (cierra PUBLIC_PROVENANCE_STRONG_PROOF_PENDING cuando el manifiesto
 * se pueble con aprobación del CLO). Puro y determinista: sin red, sin SQL, sin variables de entorno.
 *
 * Un fragmento solo es «público probado» si el manifiesto aprobado contiene una entrada para ese fragmento cuyo
 * hash SHA-256 de contenido, fuente y artículo coinciden con los del fragmento recuperado, y cuya fuente oficial
 * (URL https + hash SHA-256 del PDF oficial) está en estado de verificación ≥ V4 con aprobador y fecha.
 * NO basta con pertenecer a una colección, tabla o `fuente_tipo`: eso ya lo cubre el gate estructural (G3) y es
 * necesario, pero no suficiente. Los motivos de rechazo son solo NOMBRES de campo, nunca valores.
 */
import { createHash } from 'crypto';
import type { FragmentoRAG } from '../../legal-retrieval/types';
import { MANIFIESTO_PROCEDENCIA_PUBLICA } from './public-provenance-manifest';

export type EstadoVerificacion = 'V4' | 'V5';

export interface EntradaProcedencia {
  /** Id canónico del fragmento (FragmentoRAG.id), p. ej. `mayalex_normativos:<slug>_a<N>`. */
  fragmentoId: string;
  fuente: string;
  numArticulo: string;
  /** SHA-256 hex (64) del contenido EXACTO del artículo aprobado. */
  contenidoSha256: string;
  fuenteOficial: { url: string; gaceta: string; pdfSha256: string };
  estadoVerificacion: EstadoVerificacion;
  aprobadoPor: string;
  /** Fecha ISO (YYYY-MM-DD) de la aprobación. */
  aprobadoEn: string;
}

export type ResultadoProcedencia =
  | { estado: 'PROVENANCE_PASS' }
  | { estado: 'PROVENANCE_REJECT'; razon: string };

const HEX64 = /^[0-9a-f]{64}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const noVacio = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export const sha256Contenido = (texto: string): string => createHash('sha256').update(texto, 'utf8').digest('hex');

/** Razón (nombre de campo) por la que una entrada del manifiesto es inválida, o null si es válida. */
export function motivoEntradaInvalida(e: EntradaProcedencia): string | null {
  if (!noVacio(e?.fragmentoId)) return 'fragmentoId';
  if (!noVacio(e.fuente)) return 'fuente';
  if (!noVacio(e.numArticulo)) return 'numArticulo';
  if (!HEX64.test(e.contenidoSha256 ?? '')) return 'contenidoSha256';
  if (!/^https:\/\/\S+$/.test(e.fuenteOficial?.url ?? '')) return 'fuenteOficial.url';
  if (!noVacio(e.fuenteOficial?.gaceta)) return 'fuenteOficial.gaceta';
  if (!HEX64.test(e.fuenteOficial?.pdfSha256 ?? '')) return 'fuenteOficial.pdfSha256';
  if (e.estadoVerificacion !== 'V4' && e.estadoVerificacion !== 'V5') return 'estadoVerificacion';
  if (!noVacio(e.aprobadoPor)) return 'aprobadoPor';
  if (!FECHA.test(e.aprobadoEn ?? '')) return 'aprobadoEn';
  return null;
}

/** Valida el manifiesto completo: entradas válidas y sin ids duplicados. Devuelve los motivos (vacío = válido). */
export function validarManifiesto(m: readonly EntradaProcedencia[]): string[] {
  const motivos: string[] = [];
  const vistos = new Set<string>();
  m.forEach((e, i) => {
    const r = motivoEntradaInvalida(e);
    if (r) motivos.push(`entrada[${i}].${r}`);
    else if (vistos.has(e.fragmentoId)) motivos.push(`entrada[${i}].fragmentoId_duplicado`);
    else vistos.add(e.fragmentoId);
  });
  return motivos;
}

/**
 * Evalúa que TODOS los fragmentos tengan prueba fuerte. Un manifiesto inválido o una lista vacía rechazan.
 * No lanza: ante cualquier anomalía, PROVENANCE_REJECT.
 */
export function evaluarProcedenciaFuerte(
  fragmentos: readonly FragmentoRAG[],
  manifiesto: readonly EntradaProcedencia[] = MANIFIESTO_PROCEDENCIA_PUBLICA,
): ResultadoProcedencia {
  try {
    if (!Array.isArray(fragmentos) || fragmentos.length === 0) return { estado: 'PROVENANCE_REJECT', razon: 'sin_evidencia' };
    if (validarManifiesto(manifiesto).length > 0) return { estado: 'PROVENANCE_REJECT', razon: 'manifiesto_invalido' };
    const porId = new Map(manifiesto.map((e) => [e.fragmentoId, e]));
    for (const f of fragmentos) {
      const e = noVacio(f?.id) ? porId.get(f.id) : undefined;
      if (!e) return { estado: 'PROVENANCE_REJECT', razon: 'fragmento_sin_manifiesto' };
      if (f.fuente !== e.fuente) return { estado: 'PROVENANCE_REJECT', razon: 'fuente' };
      if (String(f.num_articulo ?? '') !== e.numArticulo) return { estado: 'PROVENANCE_REJECT', razon: 'num_articulo' };
      if (typeof f.contenido !== 'string' || sha256Contenido(f.contenido) !== e.contenidoSha256) return { estado: 'PROVENANCE_REJECT', razon: 'contenido_sha256' };
    }
    return { estado: 'PROVENANCE_PASS' };
  } catch {
    return { estado: 'PROVENANCE_REJECT', razon: 'error_interno' };
  }
}

/**
 * Propone (NO aprueba) una entrada de manifiesto a partir de un fragmento y los datos de la fuente oficial.
 * Sirve a la herramienta offline del CLO; la entrada solo vale cuando un humano la copia al manifiesto tras verificarla.
 */
export function proponerEntradaManifiesto(
  f: FragmentoRAG,
  oficial: EntradaProcedencia['fuenteOficial'],
  aprobacion: { estadoVerificacion: EstadoVerificacion; aprobadoPor: string; aprobadoEn: string },
): EntradaProcedencia {
  return {
    fragmentoId: f.id ?? '', fuente: f.fuente ?? '', numArticulo: String(f.num_articulo ?? ''),
    contenidoSha256: sha256Contenido(f.contenido), fuenteOficial: oficial, ...aprobacion,
  };
}
