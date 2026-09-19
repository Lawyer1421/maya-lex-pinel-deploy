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
 * Ambiguos (mismo número, cuerpo distinto) → fail-hard. No se adjudica.
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

export function resolverDuplicadosNotariado(aceptados: ChunkCandidato[]): {
  finales: ChunkCandidato[];
  colapsadosIdenticos: string[];
} {
  const porNumero = new Map<string, ChunkCandidato[]>();
  for (const chunk of aceptados) {
    const lista = porNumero.get(chunk.numArticulo) ?? [];
    lista.push(chunk);
    porNumero.set(chunk.numArticulo, lista);
  }

  const finales: ChunkCandidato[] = [];
  const colapsadosIdenticos: string[] = [];

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
    fallarDuro(
      `artículo ${numero} aparece ${ocurrencias.length} veces con cuerpos distintos -- ` +
        'no se adjudica. Revisar la fuente o excluir en un slice editorial posterior.',
    );
  }

  return { finales, colapsadosIdenticos };
}

export interface LoteNotariado {
  identidad: IdentidadNotarial;
  candidatos: ChunkCandidato[];
  aceptados: ChunkCandidato[];
  rechazados: ChunkCandidato[];
  finales: ChunkCandidato[];
  colapsadosIdenticos: string[];
  registros: RegistroGenerico[];
}

export function prepararLoteNotariado(texto: string, identidad: IdentidadNotarial): LoteNotariado {
  const limpio = limpiarRuidoBasico(texto);
  const candidatos = segmentarGenerico(limpio);
  const aceptados = candidatos.filter((c) => c.aceptado);
  const rechazados = candidatos.filter((c) => !c.aceptado);
  const { finales, colapsadosIdenticos } = resolverDuplicadosNotariado(aceptados);
  const registros = finales.map((c) => construirRegistro(c, identidad.opts));
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
