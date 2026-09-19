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
 *   - 2/3/11/27: última ocurrencia (reforma sustantiva 77-2006).
 *   - 1/4: primera ocurrencia (cuerpo 353-2005); el anexo es trámite, no Código.
 * OCR: solo el número de artículo (`2O` → `20`). No se reescribe el cuerpo.
 * 17/21/52: GAPS_DOCUMENTALES_PENDIENTES_DE_FE_DE_ERRATAS_O_COPIA_GACETA
 * (no bloquean prepararLote).
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
export const ARTICULOS_REFORMA_77_2006: readonly string[] = ['2', '3', '11', '27'];
export const ARTICULOS_TRAMITE_77_2006: readonly string[] = ['1', '4'];
export const CODIGO_GAP_DOCUMENTAL =
  'GAPS_DOCUMENTALES_PENDIENTES_DE_FE_DE_ERRATAS_O_COPIA_GACETA' as const;

export interface GapDocumentalNotariado {
  numArticulo: string;
  codigo: typeof CODIGO_GAP_DOCUMENTAL;
  motivo: string;
}

export const GAPS_DOCUMENTALES_CODIGO_NOTARIADO: readonly GapDocumentalNotariado[] = [
  {
    numArticulo: '17',
    codigo: CODIGO_GAP_DOCUMENTAL,
    motivo: 'encabezado ARTÍCULO 17.Los sin espacio; no entra al patrón de candidato',
  },
  {
    numArticulo: '21',
    codigo: CODIGO_GAP_DOCUMENTAL,
    motivo: 'encabezado ARTÍCULO 21 - (guion espaciado); tieneEncabezadoArticulo rechaza',
  },
  {
    numArticulo: '52',
    codigo: CODIGO_GAP_DOCUMENTAL,
    motivo: 'encabezado ARTÍCULO 52. -; tieneEncabezadoArticulo rechaza el guion',
  },
];

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

export function esArticuloReforma77(num: string): boolean {
  return ARTICULOS_REFORMA_77_2006.includes(num);
}

export function esArticuloTramite77(num: string): boolean {
  return ARTICULOS_TRAMITE_77_2006.includes(num);
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
  adjudicadosReforma77: string[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
}

/**
 * OCR de número + adjudicación Control Plane:
 *   2/3/11/27 → última ocurrencia (reforma sustantiva 77-2006)
 *   1/4       → primera ocurrencia (Código 353-2005; anexo = trámite)
 * El resto de divergentes no se adjudica. No declara VIGENTE.
 */
export function aplicarPoliticaEditorialNotariado(aceptados: ChunkCandidato[]): LoteEditorialNotariado {
  const { chunks, ocrNormalizados } = aplicarOcrNumerosNotariado(aceptados);
  const { finales, colapsadosIdenticos, divergentes } = clasificarDuplicadosNotariado(chunks);
  const adjudicadosReforma77: string[] = [];
  const adjudicadosTramite77: string[] = [];
  const finalesAdjudicados = [...finales];
  const divergentesRestantes: DuplicadoDivergente[] = [];

  for (const d of divergentes) {
    const ocurrencias = chunks.filter((c) => c.numArticulo === d.numArticulo);
    if (esArticuloReforma77(d.numArticulo)) {
      const elegido = ocurrencias[ocurrencias.length - 1];
      if (!elegido) {
        divergentesRestantes.push(d);
        continue;
      }
      finalesAdjudicados.push(elegido);
      adjudicadosReforma77.push(d.numArticulo);
      continue;
    }
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
    adjudicadosReforma77,
    adjudicadosTramite77,
    ocrNormalizados,
  };
}

export function resolverDuplicadosNotariado(aceptados: ChunkCandidato[]): {
  finales: ChunkCandidato[];
  colapsadosIdenticos: string[];
  adjudicadosReforma77: string[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
} {
  const editorial = aplicarPoliticaEditorialNotariado(aceptados);
  if (editorial.divergentes.length > 0) {
    fallarDuro(
      `artículos con cuerpos distintos no se adjudican: ${editorial.divergentes.map((d) => d.numArticulo).join(', ')}. ` +
        `Reformas 77-2006 (${ARTICULOS_REFORMA_77_2006.join(', ')}) y trámite (${ARTICULOS_TRAMITE_77_2006.join(', ')}) ya se aplicaron.`,
    );
  }
  return {
    finales: editorial.finales,
    colapsadosIdenticos: editorial.colapsadosIdenticos,
    adjudicadosReforma77: editorial.adjudicadosReforma77,
    adjudicadosTramite77: editorial.adjudicadosTramite77,
    ocrNormalizados: editorial.ocrNormalizados,
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
    adjudicadosReforma77: number;
    adjudicadosTramite77: number;
    ocrNormalizados: number;
  };
  articulosAceptados: string[];
  huecosNumeracion: string[];
  huecosBloqueantes: string[];
  curriculoFaltantes: string[];
  colapsadosIdenticos: string[];
  divergentes: DuplicadoDivergente[];
  adjudicadosReforma77: string[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
  gapsDocumentales: GapDocumentalNotariado[];
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
  adjudicadosReforma77: string[];
  adjudicadosTramite77: string[];
  gapsDocumentales: string[];
}

export function clasificarHuecosParseo(
  articulosAceptados: string[],
  huecosNumeracion: string[],
  curriculoFaltantes: string[],
  divergentes: DuplicadoDivergente[],
  rechazados: Array<{ numArticulo: string }>,
  ocrNormalizados: string[] = [],
  adjudicadosReforma77: string[] = [],
  adjudicadosTramite77: string[] = [],
  gapsDocumentales: string[] = [],
): HallazgoParseo {
  const ocrLetraOPorCero = articulosAceptados.filter((n) => /^\d+[Oo]$/.test(n));
  const equivalentesOcr = new Set([
    ...ocrLetraOPorCero.map((n) => n.slice(0, -1) + '0'),
    ...ocrNormalizados,
  ]);
  const divergenteNums = new Set(divergentes.map((d) => d.numArticulo));
  const rechazoNums = new Set(rechazados.map((r) => r.numArticulo));
  return {
    ocrLetraOPorCero,
    huecosPorDivergente: huecosNumeracion.filter((n) => divergenteNums.has(n)),
    huecosPorRechazo: huecosNumeracion.filter((n) => rechazoNums.has(n) && !divergenteNums.has(n)),
    huecosSinCandidato: huecosNumeracion.filter(
      (n) => !equivalentesOcr.has(n) && !divergenteNums.has(n) && !rechazoNums.has(n),
    ),
    curriculoBloqueadoPorDivergente: curriculoFaltantes.filter((n) => divergenteNums.has(n)),
    curriculoAusente: curriculoFaltantes.filter((n) => !divergenteNums.has(n)),
    ocrNormalizados,
    adjudicadosReforma77,
    adjudicadosTramite77,
    gapsDocumentales,
  };
}

export function analizarFuenteNotariado(
  texto: string,
  identidad: IdentidadNotarial,
  source: InformeDryRunNotariado['source'],
): InformeDryRunNotariado {
  const limpio = limpiarRuidoBasico(texto);
  const candidatos = segmentarGenerico(limpio);
  const aceptados = candidatos.filter((c) => c.aceptado);
  const rechazados = candidatos.filter((c) => !c.aceptado);
  const editorial = aplicarPoliticaEditorialNotariado(aceptados);
  const articulosAceptados = editorial.finales.map((c) => c.numArticulo);
  const curriculoFaltantes = identidad.articulosCurriculo.filter((n) => !articulosAceptados.includes(n));
  const huecosNumeracion = huecosNumericos(articulosAceptados);
  const gapsDocumentales = identidad.clave === 'codigo' ? gapsDocumentalesPendientes(huecosNumeracion) : [];
  const huecosBloqueantes = huecosNumeracion.filter((n) => !gapsDocumentales.some((g) => g.numArticulo === n));
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
      adjudicadosReforma77: editorial.adjudicadosReforma77.length,
      adjudicadosTramite77: editorial.adjudicadosTramite77.length,
      ocrNormalizados: editorial.ocrNormalizados.length,
    },
    articulosAceptados,
    huecosNumeracion,
    huecosBloqueantes,
    curriculoFaltantes,
    colapsadosIdenticos: editorial.colapsadosIdenticos,
    divergentes: editorial.divergentes,
    adjudicadosReforma77: editorial.adjudicadosReforma77,
    adjudicadosTramite77: editorial.adjudicadosTramite77,
    ocrNormalizados: editorial.ocrNormalizados,
    gapsDocumentales,
    rechazados: rechazadosInforme,
    hallazgos: clasificarHuecosParseo(
      articulosAceptados,
      huecosNumeracion,
      curriculoFaltantes,
      editorial.divergentes,
      rechazadosInforme,
      editorial.ocrNormalizados,
      editorial.adjudicadosReforma77,
      editorial.adjudicadosTramite77,
      gapsDocumentales.map((g) => g.numArticulo),
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
  adjudicadosReforma77: string[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
  gapsDocumentales: GapDocumentalNotariado[];
  manifest: ManifestoCorpusNotariado;
  registros: RegistroGenerico[];
}

export interface ManifestoCorpusNotariado {
  instrumento: InstrumentoNormalizado;
  adjudicacion_editorial: {
    reformas_sustantivas_77_2006_ultima_ocurrencia: string[];
    tramite_77_2006_primera_ocurrencia: string[];
  };
  ocr_numeros_normalizados: string[];
  gaps_documentales: GapDocumentalNotariado[];
  vigenciaDeclarada: false;
  networkWrites: 0;
}

export function prepararLoteNotariado(texto: string, identidad: IdentidadNotarial): LoteNotariado {
  const limpio = limpiarRuidoBasico(texto);
  const candidatos = segmentarGenerico(limpio);
  const aceptados = candidatos.filter((c) => c.aceptado);
  const rechazados = candidatos.filter((c) => !c.aceptado);
  const { finales, colapsadosIdenticos, adjudicadosReforma77, adjudicadosTramite77, ocrNormalizados } =
    resolverDuplicadosNotariado(aceptados);
  const huecos = huecosNumericos(finales.map((c) => c.numArticulo));
  const gapsDocumentales = identidad.clave === 'codigo' ? gapsDocumentalesPendientes(huecos) : [];
  const registros = finales.map((c) => {
    const registro = construirRegistro(c, identidad.opts);
    if (adjudicadosReforma77.includes(c.numArticulo)) {
      registro.metadata.reforma_adjudicada = 'Decreto 77-2006';
      registro.metadata.adjudicacion_editorial = 'prevalece_anexo_77_2006';
    }
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
    adjudicadosReforma77,
    adjudicadosTramite77,
    ocrNormalizados,
    gapsDocumentales,
    manifest: {
      instrumento: identidad.instrumentoNormalizado,
      adjudicacion_editorial: {
        reformas_sustantivas_77_2006_ultima_ocurrencia: adjudicadosReforma77,
        tramite_77_2006_primera_ocurrencia: adjudicadosTramite77,
      },
      ocr_numeros_normalizados: ocrNormalizados,
      gaps_documentales: gapsDocumentales,
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
