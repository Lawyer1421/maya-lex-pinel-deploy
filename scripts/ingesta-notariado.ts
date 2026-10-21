#!/usr/bin/env node
/**
 * scripts/ingesta-notariado.ts
 *
 * Slice 1 de INGESTA_LEYES_NOTARIADO — código primero, datos después.
 * Dry-run por defecto. --execute NO está autorizado en este slice
 * (embeddings + .sql local = slice posterior, tras dry-run contra PDF
 * oficial). Este archivo NUNCA abre conexión a Supabase ni declara VIGENTE.
 *
 * Identidad anclada al router ya mergeado (PR #23) y al currículo Slice 2:
 *   CODIGO_NOTARIADO     Decreto 353-2005
 *   REGLAMENTO_NOTARIADO Resolución PCSJ-17-2012
 *
 * Duplicados: colapso solo si el cuerpo normalizado es idéntico.
 * Ambiguos (mismo número, cuerpo distinto) → fail-hard, EXCEPTO:
 *   - 1/2/3/4: primera ocurrencia (Código 353-2005); el anexo 1–4 es trámite
 *     del decreto (orden, derogación Instituto, timbres CAH, vigencia).
 *   - 11/27 del Código: ya no se adjudican (dictamen CLO 21-oct-2026, issue
 *     #74). Solo deciden la Gaceta 30,904 o una fe de erratas oficial; hasta
 *     entonces van a curación TEXTO_DIVERGENTE y no se cargan (sin PRIMARY).
 * OCR: solo el número de artículo (`2O` → `20`). No se reescribe el cuerpo.
 * Encabezados: además de los del parser genérico, se aceptan «ARTÍCULO 21 -»
 * y «ARTÍCULO 52. -» (defecto técnico, mismo dictamen). No se reescribe el texto.
 * 17: HUECO. No se carga ni se inventa; queda en curación hasta tener fuente
 * oficial (no bloquea prepararLote). --execute sigue bloqueado.
 *
 * NETWORK_WRITES = 0. Este archivo NUNCA abre red ni Supabase.
 *
 * Uso:
 *   npx tsx scripts/ingesta-notariado.ts --instrumento codigo --input fuente.txt
 *   npx tsx scripts/ingesta-notariado.ts --instrumento reglamento --input fuente.txt
 */
import { extraerTexto, segmentarGenerico, construirRegistro, fallarDuro, validarLoteAntesDeSQL, type OpcionesCLI, type ChunkCandidato, type RegistroGenerico } from './ingestar-ley';
import { identidadDocumentalCoincide, type FilaExactaDB, type InstrumentoNormalizado } from '../lib/rag/search';

export type ClaveInstrumentoNotarial = 'codigo' | 'reglamento';

export interface IdentidadNotarial {
  clave: ClaveInstrumentoNotarial;
  instrumentoNormalizado: InstrumentoNormalizado;
  opts: OpcionesCLI;
  articulosCurriculo: readonly string[];
}

export const IDENTIDAD_CODIGO_NOTARIADO: IdentidadNotarial = {
  clave: 'codigo',
  instrumentoNormalizado: 'CODIGO_NOTARIADO',
  articulosCurriculo: ['2', '3', '7', '8'],
  opts: {
    input: '',
    coleccion: 'mayalex_normativos',
    materia: '03_NOTARIAL',
    fuente: 'Código del Notariado de Honduras (Decreto 353-2005)',
    fuenteTipo: 'codigo',
    idPrefix: 'mayalex_normativos:codigo_notariado_2005',
    instrumento: 'Decreto 353-2005',
    jurisdiccion: 'HN',
    dryRun: true,
    execute: null,
  },
};

export const IDENTIDAD_REGLAMENTO_NOTARIADO: IdentidadNotarial = {
  clave: 'reglamento',
  instrumentoNormalizado: 'REGLAMENTO_NOTARIADO',
  articulosCurriculo: [],
  opts: {
    input: '',
    coleccion: 'mayalex_normativos',
    materia: '03_NOTARIAL',
    fuente: 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)',
    fuenteTipo: 'codigo',
    idPrefix: 'mayalex_normativos:reglamento_notariado_2012',
    instrumento: 'Resolución PCSJ-17-2012',
    jurisdiccion: 'HN',
    dryRun: true,
    execute: null,
  },
};

/** Fail-closed: este slice no abre red ni escribe corpus/SQL. */
export const NETWORK_WRITES = 0 as const;
export const MARCADOR_DECRETO_77_2006 = 'DECRETO No. 77-2006';
export const ARTICULOS_REFORMA_77_2006: readonly string[] = ['11', '27'];
export const ARTICULOS_TRAMITE_77_2006: readonly string[] = ['1', '2', '3', '4'];
export const CODIGO_GAP_DOCUMENTAL =
  'GAPS_DOCUMENTALES_PENDIENTES_DE_FE_DE_ERRATAS_O_COPIA_GACETA' as const;

export interface GapDocumentalNotariado {
  numArticulo: string;
  codigo: typeof CODIGO_GAP_DOCUMENTAL;
  motivo: string;
}

/**
 * 21 y 52 dejaron de ser gaps: eran un defecto técnico del parser
 * (encabezadoNotarialConGuion). Sólo queda el 17 (dictamen CLO 21-oct-2026).
 */
export const GAPS_DOCUMENTALES_CODIGO_NOTARIADO: readonly GapDocumentalNotariado[] = [
  {
    numArticulo: '17',
    codigo: CODIGO_GAP_DOCUMENTAL,
    motivo: 'encabezado ARTÍCULO 17.Los sin espacio; no entra al patrón de candidato',
  },
];

/** Motivos de curación del Código del Notariado (dictamen CLO 21-oct-2026, issue #74). */
export type MotivoCuracionNotariado = 'HUECO' | 'TEXTO_DIVERGENTE';

export interface CuracionNotariado {
  numArticulo: string;
  motivo: MotivoCuracionNotariado;
  detalle: string;
}

/**
 * Artículos del Código que no se cargan y van a curación sin PRIMARY. No se
 * inventa texto ni se elige entre versiones: cambiar esta lista exige fuente
 * oficial (Gaceta 30,904 o fe de erratas) y un nuevo dictamen CLO.
 */
export const CURACION_CODIGO_NOTARIADO: readonly CuracionNotariado[] = [
  {
    numArticulo: '11',
    motivo: 'TEXTO_DIVERGENTE',
    detalle: 'texto 2005 y texto del anexo 77-2006 difieren; solo deciden la Gaceta 30,904 o una fe de erratas oficial',
  },
  {
    numArticulo: '17',
    motivo: 'HUECO',
    detalle: 'sin texto verificable en la fuente; no se carga ni se inventa hasta tener fuente oficial',
  },
  {
    numArticulo: '27',
    motivo: 'TEXTO_DIVERGENTE',
    detalle: 'texto 2005 y texto del anexo 77-2006 difieren; solo deciden la Gaceta 30,904 o una fe de erratas oficial',
  },
];

function curacionPara(clave: ClaveInstrumentoNotarial): readonly CuracionNotariado[] {
  return clave === 'codigo' ? CURACION_CODIGO_NOTARIADO : [];
}

/**
 * Encabezados del Código del Notariado que el parser genérico rechaza por el
 * guion: «ARTÍCULO 21 -» y «ARTÍCULO 52. -». Sólo la palabra en mayúsculas al
 * inicio de la ventana (una cita dentro de un cuerpo va en minúsculas) y, tras
 * el guion, mayúscula, número o comillas, como exige tieneEncabezadoArticulo.
 */
export function encabezadoNotarialConGuion(ventana: string, numArticulo: string): boolean {
  if (!/^\d+[a-z]?$/i.test(numArticulo)) return false;
  const m = new RegExp(`^ART[IÍ]CULO[ \\t]+${numArticulo}[ \\t]*\\.?[ \\t]*-[ \\t]*`).exec(ventana);
  if (!m) return false;
  const siguiente = ventana[m[0].length];
  if (!siguiente) return false;
  if (/[0-9"«]/.test(siguiente)) return true;
  return siguiente === siguiente.toUpperCase() && siguiente !== siguiente.toLowerCase();
}

/** Segmentación del Notariado: parser genérico + encabezados con guion. */
export function segmentarNotariado(textoLimpio: string): ChunkCandidato[] {
  return segmentarGenerico(textoLimpio, { aceptarEncabezadoExtra: encabezadoNotarialConGuion });
}

export function identidadPorClave(clave: string): IdentidadNotarial {
  if (clave === 'codigo') return IDENTIDAD_CODIGO_NOTARIADO;
  if (clave === 'reglamento') return IDENTIDAD_REGLAMENTO_NOTARIADO;
  fallarDuro(`--instrumento debe ser "codigo" o "reglamento", no "${clave}"`);
}

export function limpiarRuidoBasico(texto: string): string {
  return texto
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizarCuerpo(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim().toLowerCase();
}

export interface DuplicadoDivergente {
  numArticulo: string;
  ocurrencias: number;
  longitudes: number[];
}

export function normalizarNumeroArticuloOcr(num: string): { normalizado: string; eraOcr: boolean } {
  if (!/^\d+[Oo]$/.test(num)) {
    return { normalizado: num, eraOcr: false };
  }
  return { normalizado: `${num.slice(0, -1)}0`, eraOcr: true };
}

export function aplicarOcrNumerosNotariado(chunks: ChunkCandidato[]): {
  chunks: ChunkCandidato[];
  ocrNormalizados: string[];
} {
  const ocrNormalizados: string[] = [];
  const normalizados = chunks.map((c) => {
    const { normalizado, eraOcr } = normalizarNumeroArticuloOcr(c.numArticulo);
    if (eraOcr) ocrNormalizados.push(normalizado);
    return { ...c, numArticulo: normalizado };
  });
  return { chunks: normalizados, ocrNormalizados };
}

export function esArticuloTramite77(num: string): boolean {
  return ARTICULOS_TRAMITE_77_2006.includes(num);
}

/** Anclas de contenido: 2/3 canónicos = Código 2005, no cláusulas del 77-2006. */
export const ANCLA_ART2_CODIGO =
  /el notariado es la instituci[oó]n del estado/i;
export const ANCLA_ART2_TRAMITE_77 = /derogar el cap[ií]tulo\s*vi/i;
export const ANCLA_ART3_CODIGO =
  /funci[oó]n notarial es aquella funci[oó]n de inter[eé]s p[uú]blico/i;
export const ANCLA_ART3_TRAMITE_77 = /certificados de autenticidad/i;

export function verificarAnclasSustantivasNotariado(
  registros: Array<{ num_articulo: string; contenido: string; id: string }>,
): void {
  for (const r of registros) {
    if (r.num_articulo === '2') {
      if (ANCLA_ART2_TRAMITE_77.test(r.contenido)) {
        fallarDuro(
          `art. 2 canónico no puede ser la derogación del Capítulo VI / Instituto (cláusula 77-2006). id=${r.id}`,
        );
      }
      if (r.contenido.length >= 200 && !ANCLA_ART2_CODIGO.test(r.contenido)) {
        fallarDuro(
          `art. 2 canónico debe ser el concepto de Notariado (institución del Estado). id=${r.id}`,
        );
      }
    }
    if (r.num_articulo === '3') {
      if (ANCLA_ART3_TRAMITE_77.test(r.contenido)) {
        fallarDuro(
          `art. 3 canónico no puede ser el reparto de timbres / certificados CAH (cláusula 77-2006). id=${r.id}`,
        );
      }
      if (r.contenido.length >= 200 && !ANCLA_ART3_CODIGO.test(r.contenido)) {
        fallarDuro(
          `art. 3 canónico debe ser la función notarial. id=${r.id}`,
        );
      }
    }
  }
}

export function gapsDocumentalesPendientes(huecosNumeracion: string[]): GapDocumentalNotariado[] {
  return GAPS_DOCUMENTALES_CODIGO_NOTARIADO.filter((g) => huecosNumeracion.includes(g.numArticulo));
}

export function clasificarDuplicadosNotariado(aceptados: ChunkCandidato[]): {
  finales: ChunkCandidato[];
  colapsadosIdenticos: string[];
  divergentes: DuplicadoDivergente[];
} {
  const porNumero = new Map<string, ChunkCandidato[]>();
  for (const chunk of aceptados) {
    const lista = porNumero.get(chunk.numArticulo) ?? [];
    lista.push(chunk);
    porNumero.set(chunk.numArticulo, lista);
  }

  const finales: ChunkCandidato[] = [];
  const colapsadosIdenticos: string[] = [];
  const divergentes: DuplicadoDivergente[] = [];

  for (const [numero, ocurrencias] of porNumero) {
    if (ocurrencias.length === 1) {
      finales.push(ocurrencias[0]!);
      continue;
    }
    const cuerpos = new Set(ocurrencias.map((c) => normalizarCuerpo(c.contenido)));
    if (cuerpos.size === 1) {
      finales.push(ocurrencias[0]!);
      colapsadosIdenticos.push(numero);
      continue;
    }
    divergentes.push({
      numArticulo: numero,
      ocurrencias: ocurrencias.length,
      longitudes: ocurrencias.map((c) => c.contenido.length),
    });
  }

  return { finales, colapsadosIdenticos, divergentes };
}

export interface LoteEditorialNotariado {
  finales: ChunkCandidato[];
  colapsadosIdenticos: string[];
  divergentes: DuplicadoDivergente[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
  /** Artículos que no se cargan y van a curación sin PRIMARY (sólo Código). */
  curacion: CuracionNotariado[];
}

/**
 * OCR de número + adjudicación Control Plane:
 *   1/2/3/4 → primera ocurrencia (Código 353-2005; anexo = trámite del decreto)
 *   11/17/27 del Código → curación (CURACION_CODIGO_NOTARIADO): se quitan de
 *     `finales` aunque haya una sola ocurrencia (dictamen CLO 21-oct-2026).
 * El resto de divergentes no se adjudica. No declara VIGENTE.
 */
export function aplicarPoliticaEditorialNotariado(
  aceptados: ChunkCandidato[],
  clave: ClaveInstrumentoNotarial = 'codigo',
): LoteEditorialNotariado {
  const { chunks, ocrNormalizados } = aplicarOcrNumerosNotariado(aceptados);
  const curacion = [...curacionPara(clave)];
  const enCuracion = new Set(curacion.map((c) => c.numArticulo));
  const { finales, colapsadosIdenticos, divergentes } = clasificarDuplicadosNotariado(
    chunks.filter((c) => !enCuracion.has(c.numArticulo)),
  );
  const adjudicadosTramite77: string[] = [];
  const finalesAdjudicados = [...finales];
  const divergentesRestantes: DuplicadoDivergente[] = [];

  for (const d of divergentes) {
    const ocurrencias = chunks.filter((c) => c.numArticulo === d.numArticulo);
    if (esArticuloTramite77(d.numArticulo)) {
      const elegido = ocurrencias[0];
      if (!elegido) {
        divergentesRestantes.push(d);
        continue;
      }
      finalesAdjudicados.push(elegido);
      adjudicadosTramite77.push(d.numArticulo);
      continue;
    }
    divergentesRestantes.push(d);
  }

  const orden = new Map(chunks.map((c, i) => [c, i]));
  finalesAdjudicados.sort((a, b) => (orden.get(a) ?? 0) - (orden.get(b) ?? 0));

  return {
    finales: finalesAdjudicados,
    colapsadosIdenticos,
    divergentes: divergentesRestantes,
    adjudicadosTramite77,
    ocrNormalizados,
    curacion,
  };
}

export function resolverDuplicadosNotariado(
  aceptados: ChunkCandidato[],
  clave: ClaveInstrumentoNotarial = 'codigo',
): {
  finales: ChunkCandidato[];
  colapsadosIdenticos: string[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
  curacion: CuracionNotariado[];
} {
  const editorial = aplicarPoliticaEditorialNotariado(aceptados, clave);
  if (editorial.divergentes.length > 0) {
    fallarDuro(
      `artículos con cuerpos distintos no se adjudican: ${editorial.divergentes.map((d) => d.numArticulo).join(', ')}. ` +
        `Trámite 77-2006 (${ARTICULOS_TRAMITE_77_2006.join(', ')}) ya se aplicó; ${ARTICULOS_REFORMA_77_2006.join(', ')} van a curación.`,
    );
  }
  return {
    finales: editorial.finales,
    colapsadosIdenticos: editorial.colapsadosIdenticos,
    adjudicadosTramite77: editorial.adjudicadosTramite77,
    ocrNormalizados: editorial.ocrNormalizados,
    curacion: editorial.curacion,
  };
}

function snippetEncabezado(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim().slice(0, 60);
}

function huecosNumericos(numeros: string[]): string[] {
  const enteros = numeros
    .filter((n) => /^\d+$/.test(n))
    .map((n) => Number.parseInt(n, 10));
  if (enteros.length === 0) return [];
  const vistos = new Set(enteros);
  const min = Math.min(...enteros);
  const max = Math.max(...enteros);
  const huecos: string[] = [];
  for (let n = min; n <= max; n += 1) {
    if (!vistos.has(n)) huecos.push(String(n));
  }
  return huecos;
}

export interface InformeDryRunNotariado {
  instrumento: InstrumentoNormalizado;
  fuenteIdentidad: string;
  idPrefix: string;
  source: {
    path: string;
    sha256: string;
    bytes: number;
    pages: number | null;
    provenance: string;
    extractedChars: number;
  };
  counts: {
    candidatos: number;
    aceptados: number;
    rechazados: number;
    finalesUnicos: number;
    colapsadosIdenticos: number;
    divergentes: number;
    adjudicadosTramite77: number;
    ocrNormalizados: number;
    curacion: number;
  };
  articulosAceptados: string[];
  huecosNumeracion: string[];
  huecosBloqueantes: string[];
  curriculoFaltantes: string[];
  colapsadosIdenticos: string[];
  divergentes: DuplicadoDivergente[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
  gapsDocumentales: GapDocumentalNotariado[];
  curacion: CuracionNotariado[];
  rechazados: Array<{ numArticulo: string; snippet: string }>;
  hallazgos: HallazgoParseo;
  vigenciaDeclarada: false;
  corpusWrite: false;
  sqlApply: false;
  networkWrites: 0;
}

export interface HallazgoParseo {
  ocrLetraOPorCero: string[];
  huecosPorDivergente: string[];
  huecosPorRechazo: string[];
  huecosSinCandidato: string[];
  curriculoBloqueadoPorDivergente: string[];
  curriculoAusente: string[];
  ocrNormalizados: string[];
  adjudicadosTramite77: string[];
  gapsDocumentales: string[];
  enCuracion: string[];
}

export function clasificarHuecosParseo(
  articulosAceptados: string[],
  huecosNumeracion: string[],
  curriculoFaltantes: string[],
  divergentes: DuplicadoDivergente[],
  rechazados: Array<{ numArticulo: string }>,
  ocrNormalizados: string[] = [],
  adjudicadosTramite77: string[] = [],
  gapsDocumentales: string[] = [],
  enCuracion: string[] = [],
): HallazgoParseo {
  const ocrLetraOPorCero = articulosAceptados.filter((n) => /^\d+[Oo]$/.test(n));
  const equivalentesOcr = new Set([
    ...ocrLetraOPorCero.map((n) => n.slice(0, -1) + '0'),
    ...ocrNormalizados,
  ]);
  const divergenteNums = new Set(divergentes.map((d) => d.numArticulo));
  const rechazoNums = new Set(rechazados.map((r) => r.numArticulo));
  const curacionNums = new Set(enCuracion);
  return {
    ocrLetraOPorCero,
    huecosPorDivergente: huecosNumeracion.filter((n) => divergenteNums.has(n)),
    huecosPorRechazo: huecosNumeracion.filter((n) => rechazoNums.has(n) && !divergenteNums.has(n)),
    huecosSinCandidato: huecosNumeracion.filter(
      (n) => !equivalentesOcr.has(n) && !divergenteNums.has(n) && !rechazoNums.has(n) && !curacionNums.has(n),
    ),
    curriculoBloqueadoPorDivergente: curriculoFaltantes.filter((n) => divergenteNums.has(n)),
    curriculoAusente: curriculoFaltantes.filter((n) => !divergenteNums.has(n)),
    ocrNormalizados,
    adjudicadosTramite77,
    gapsDocumentales,
    enCuracion,
  };
}

export function analizarFuenteNotariado(
  texto: string,
  identidad: IdentidadNotarial,
  source: InformeDryRunNotariado['source'],
): InformeDryRunNotariado {
  const limpio = limpiarRuidoBasico(texto);
  const candidatos = segmentarNotariado(limpio);
  const aceptados = candidatos.filter((c) => c.aceptado);
  const rechazados = candidatos.filter((c) => !c.aceptado);
  const editorial = aplicarPoliticaEditorialNotariado(aceptados, identidad.clave);
  const articulosAceptados = editorial.finales.map((c) => c.numArticulo);
  const curriculoFaltantes = identidad.articulosCurriculo.filter((n) => !articulosAceptados.includes(n));
  const huecosNumeracion = huecosNumericos(articulosAceptados);
  const gapsDocumentales = identidad.clave === 'codigo' ? gapsDocumentalesPendientes(huecosNumeracion) : [];
  const enCuracion = editorial.curacion.map((c) => c.numArticulo);
  const huecosBloqueantes = huecosNumeracion.filter(
    (n) => !gapsDocumentales.some((g) => g.numArticulo === n) && !enCuracion.includes(n),
  );
  const rechazadosInforme = rechazados.map((c) => ({
    numArticulo: normalizarNumeroArticuloOcr(c.numArticulo).normalizado,
    snippet: snippetEncabezado(c.contenido),
  }));

  return {
    instrumento: identidad.instrumentoNormalizado,
    fuenteIdentidad: identidad.opts.fuente,
    idPrefix: identidad.opts.idPrefix,
    source,
    counts: {
      candidatos: candidatos.length,
      aceptados: aceptados.length,
      rechazados: rechazados.length,
      finalesUnicos: editorial.finales.length,
      colapsadosIdenticos: editorial.colapsadosIdenticos.length,
      divergentes: editorial.divergentes.length,
      adjudicadosTramite77: editorial.adjudicadosTramite77.length,
      ocrNormalizados: editorial.ocrNormalizados.length,
      curacion: editorial.curacion.length,
    },
    articulosAceptados,
    huecosNumeracion,
    huecosBloqueantes,
    curriculoFaltantes,
    colapsadosIdenticos: editorial.colapsadosIdenticos,
    divergentes: editorial.divergentes,
    adjudicadosTramite77: editorial.adjudicadosTramite77,
    ocrNormalizados: editorial.ocrNormalizados,
    gapsDocumentales,
    curacion: editorial.curacion,
    rechazados: rechazadosInforme,
    hallazgos: clasificarHuecosParseo(
      articulosAceptados,
      huecosNumeracion,
      curriculoFaltantes,
      editorial.divergentes,
      rechazadosInforme,
      editorial.ocrNormalizados,
      editorial.adjudicadosTramite77,
      gapsDocumentales.map((g) => g.numArticulo),
      enCuracion,
    ),
    vigenciaDeclarada: false,
    corpusWrite: false,
    sqlApply: false,
    networkWrites: NETWORK_WRITES,
  };
}

export interface LoteNotariado {
  identidad: IdentidadNotarial;
  candidatos: ChunkCandidato[];
  aceptados: ChunkCandidato[];
  rechazados: ChunkCandidato[];
  finales: ChunkCandidato[];
  colapsadosIdenticos: string[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
  gapsDocumentales: GapDocumentalNotariado[];
  curacion: CuracionNotariado[];
  manifest: ManifestoCorpusNotariado;
  registros: RegistroGenerico[];
}

export interface ManifestoCorpusNotariado {
  instrumento: InstrumentoNormalizado;
  adjudicacion_editorial: {
    tramite_77_2006_primera_ocurrencia: string[];
  };
  ocr_numeros_normalizados: string[];
  gaps_documentales: GapDocumentalNotariado[];
  /** No se cargan; sin PRIMARY hasta fuente oficial (dictamen CLO 21-oct-2026). */
  curacion: CuracionNotariado[];
  vigenciaDeclarada: false;
  networkWrites: 0;
}

export function prepararLoteNotariado(texto: string, identidad: IdentidadNotarial): LoteNotariado {
  const limpio = limpiarRuidoBasico(texto);
  const candidatos = segmentarNotariado(limpio);
  const aceptados = candidatos.filter((c) => c.aceptado);
  const rechazados = candidatos.filter((c) => !c.aceptado);
  const { finales, colapsadosIdenticos, adjudicadosTramite77, ocrNormalizados, curacion } =
    resolverDuplicadosNotariado(aceptados, identidad.clave);
  const huecos = huecosNumericos(finales.map((c) => c.numArticulo));
  const gapsDocumentales = identidad.clave === 'codigo' ? gapsDocumentalesPendientes(huecos) : [];
  const enCuracion = new Set(curacion.map((c) => c.numArticulo));
  if (finales.some((c) => enCuracion.has(c.numArticulo))) {
    fallarDuro('un artículo en curación (HUECO o TEXTO_DIVERGENTE) no puede cargarse');
  }
  const registros = finales.map((c) => {
    const registro = construirRegistro(c, identidad.opts);
    if (adjudicadosTramite77.includes(c.numArticulo)) {
      registro.metadata.adjudicacion_editorial = 'primera_ocurrencia_tramite_77_2006';
      registro.metadata.anexo_77_2006_descartado = 'tramite_legislativo';
    }
    if (ocrNormalizados.includes(c.numArticulo)) {
      registro.metadata.ocr_numero_normalizado = true;
    }
    return registro;
  });
  validarLoteAntesDeSQL(registros);
  if (identidad.clave === 'codigo') {
    verificarAnclasSustantivasNotariado(registros);
  }

  for (const registro of registros) {
    if (registro.es_norma_vigente) {
      fallarDuro(`registro ${registro.id} declaró vigencia -- prohibido`);
    }
    const fila: FilaExactaDB = {
      id: registro.id,
      contenido: registro.contenido,
      num_articulo: registro.num_articulo,
      fuente: registro.fuente,
      fuente_tipo: registro.fuente_tipo,
      jurisdiccion: registro.jurisdiccion,
      materia: registro.materia,
      es_norma_vigente: registro.es_norma_vigente,
      metadata: registro.metadata as Record<string, unknown>,
    };
    if (!identidadDocumentalCoincide(fila, identidad.instrumentoNormalizado)) {
      fallarDuro(`fuente "${registro.fuente}" no confirma ${identidad.instrumentoNormalizado}`);
    }
    const otro: InstrumentoNormalizado =
      identidad.instrumentoNormalizado === 'CODIGO_NOTARIADO'
        ? 'REGLAMENTO_NOTARIADO'
        : 'CODIGO_NOTARIADO';
    if (identidadDocumentalCoincide(fila, otro)) {
      fallarDuro(`fuente "${registro.fuente}" colisiona con ${otro}`);
    }
  }

  const faltantes = identidad.articulosCurriculo.filter(
    (n) => !finales.some((c) => c.numArticulo === n),
  );
  if (faltantes.length > 0) {
    fallarDuro(
      `el currículo Exequátur exige ${identidad.instrumentoNormalizado} arts. ` +
        `${identidad.articulosCurriculo.join(', ')}; faltan ${faltantes.join(', ')}`,
    );
  }

  return {
    identidad,
    candidatos,
    aceptados,
    rechazados,
    finales,
    colapsadosIdenticos,
    adjudicadosTramite77,
    ocrNormalizados,
    gapsDocumentales,
    curacion,
    manifest: {
      instrumento: identidad.instrumentoNormalizado,
      adjudicacion_editorial: {
        tramite_77_2006_primera_ocurrencia: adjudicadosTramite77,
      },
      ocr_numeros_normalizados: ocrNormalizados,
      gaps_documentales: gapsDocumentales,
      curacion,
      vigenciaDeclarada: false,
      networkWrites: NETWORK_WRITES,
    },
    registros,
  };
}

export function parsearArgsNotariado(argv: string[]): { identidad: IdentidadNotarial; input: string } {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  if (argv.includes('--execute')) {
    fallarDuro(
      '--execute no está autorizado en este slice (código primero, datos después). ' +
        'Solo dry-run. Embeddings/.sql local requieren un slice posterior tras revisar la fuente oficial.',
    );
  }
  const instrumento = get('--instrumento');
  const input = get('--input');
  if (!instrumento) fallarDuro('falta --instrumento codigo|reglamento');
  if (!input) fallarDuro('falta --input <ruta.pdf|ruta.txt>');
  const identidad = identidadPorClave(instrumento);
  return { identidad: { ...identidad, opts: { ...identidad.opts, input } }, input };
}

function main(): void {
  const { identidad, input } = parsearArgsNotariado(process.argv.slice(2));
  console.log(`=== ingesta-notariado.ts — DRY-RUN — ${identidad.instrumentoNormalizado} ===`);
  const lote = prepararLoteNotariado(extraerTexto(input), identidad);
  console.log(`Candidatos: ${lote.candidatos.length}`);
  console.log(`Aceptados: ${lote.aceptados.length}`);
  console.log(`Rechazados: ${lote.rechazados.length}`);
  console.log(`Colapsados idénticos: ${lote.colapsadosIdenticos.join(', ') || '(ninguno)'}`);
  console.log(`Trámite 77-2006 (1ª ocurrencia): ${lote.adjudicadosTramite77.join(', ') || '(ninguno)'}`);
  console.log(
    `Gaps documentales: ${lote.gapsDocumentales.map((g) => g.numArticulo).join(', ') || '(ninguno)'}`,
  );
  console.log(
    `En curación (no se cargan): ${lote.curacion.map((c) => `${c.numArticulo} ${c.motivo}`).join(', ') || '(ninguno)'}`,
  );
  console.log(`Registros: ${lote.registros.length}`);
  console.log(`IDs: ${lote.registros.map((r) => r.id).join(', ')}`);
  console.log('\n🔒 DRY-RUN: sin embeddings, sin .sql, sin write a corpus.');
}

if (process.argv[1] && process.argv[1].endsWith('ingesta-notariado.ts')) {
  try {
    main();
  } catch (err) {
    console.error('FALLÓ:', err);
    process.exit(1);
  }
}
