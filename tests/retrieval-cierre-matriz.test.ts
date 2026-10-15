import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { clasificarIntencionInstrumental } from '@/lib/legal-retrieval/instrument-gate';
import { identidadDeFuente, detectarInstrumentoDesdeTexto } from '@/lib/legal-retrieval/exact-resolver';

/**
 * Matriz de cierre del PR #62. Cada grupo corresponde a un punto de la misión de
 * verificación. Las consultas son las del auditor; las fuentes son nombres reales
 * del repositorio.
 */

const FUENTE_CIVIL = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
const FUENTE_PENAL_CPP = 'Código Procesal Penal de Honduras (Decreto 9-99-E)';
const FUENTE_CODIGO_PENAL = 'Codigo Penal';
const FUENTE_NOTARIADO = 'Código del Notariado de Honduras (Decreto 353-2005)';
const FUENTE_REGLAMENTO = 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)';
const FUENTE_COMERCIO = 'Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)';

type Fila = {
  id: string; contenido: string; num_articulo: string; fuente: string; fuente_tipo: string;
  jurisdiccion: string; es_norma_vigente: boolean; materia: string; similarity: number;
};

const fila = (id: string, fuente: string, materia: string, contenido: string, num = '1', sim = 0.9): Fila => ({
  id, contenido, num_articulo: num, fuente, fuente_tipo: 'codigo', jurisdiccion: 'HN',
  es_norma_vigente: true, materia, similarity: sim,
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Genéricas, con evidencia elegible disponible → NONE, sin vaciar la evidencia
// ─────────────────────────────────────────────────────────────────────────────

const CORPUS_GENERICO: { consulta: string; pertinente: Fila }[] = [
  { consulta: 'ley sobre el divorcio', pertinente: fila('civil-divorcio', FUENTE_CIVIL, '02_CIVIL', 'Artículo 1. El matrimonio se disuelve por divorcio.') },
  { consulta: '¿Qué establece la ley sobre la prescripción de la acción penal?', pertinente: fila('cpp-prescripcion', FUENTE_PENAL_CPP, '01_PENAL', 'Artículo 30. La acción penal prescribe en los plazos que señala la ley.') },
  { consulta: '¿Cómo apelar una resolución judicial en materia penal?', pertinente: fila('cpp-apelacion', FUENTE_PENAL_CPP, '01_PENAL', 'Artículo 400. Recurso de apelación contra las resoluciones judiciales penales.') },
  { consulta: 'arrendamiento ley civil', pertinente: fila('civil-arrendamiento', FUENTE_CIVIL, '02_CIVIL', 'Artículo 1. El arrendamiento es un contrato.') },
  { consulta: 'el código dice algo sobre la herencia', pertinente: fila('civil-herencia', FUENTE_CIVIL, '02_CIVIL', 'Artículo 2. La herencia se defiere por ley.') },
];

// ─────────────────────────────────────────────────────────────────────────────
// Clasificación pura: 2, 3, 4
// ─────────────────────────────────────────────────────────────────────────────

const TITULOS_PARTICULARES = [
  'Ley de Propiedad',
  'Ley de Procedimiento Administrativo',
  'Ley de Propiedad Intelectual',
  'Ley del Contrato de Seguro',
  'Ley Marco de Telecomunicaciones',
  'Ley de Adopciones',
  'Ley de Inquilinato',
  'Ley de las 8 horas',
];

describe('2 — títulos particulares no resueltos → SPECIFIC_UNRESOLVED', () => {
  it.each(TITULOS_PARTICULARES)('%s', (titulo) => {
    const i = clasificarIntencionInstrumental(`Según la ${titulo}, ¿qué procede?`);
    expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
    expect(i.identidades).toEqual([]);
  });
});

describe('3 — años: no identifican, y "ley/decreto de AÑO" es referencia específica', () => {
  it.each([
    '¿Qué procede según la ley de 2018?',
    '¿Qué procede según el decreto de 2018?',
    '¿Qué procede según la ley 2018?',
  ])('%s → SPECIFIC_UNRESOLVED sin identidad', (consulta) => {
    const i = clasificarIntencionInstrumental(consulta);
    expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
    expect(i.identidades).toEqual([]);
  });

  it('"contratos celebrados en 2018" → NONE (el año no es una clase de instrumento)', () => {
    expect(clasificarIntencionInstrumental('¿Qué procede en los contratos celebrados en 2018?').estado).toBe('NONE');
  });
});

describe('4 — correspondencias: identidad resuelta sin referencia pendiente espuria', () => {
  it.each([
    ['Código del Notariado + Decreto 353-2005', 'SPECIFIC_RESOLVED', ['CODIGO_NOTARIADO']],
    ['Código Penal + Decreto 130-2017', 'SPECIFIC_RESOLVED', ['CODIGO_PENAL']],
    ['Reglamento del Código del Notariado + Resolución PCSJ-17-2012', 'SPECIFIC_RESOLVED', ['REGLAMENTO_NOTARIADO']],
    ['Código del Notariado D.353-2005', 'SPECIFIC_RESOLVED', ['CODIGO_NOTARIADO']],
    ['Código Penal D.130-2017', 'SPECIFIC_RESOLVED', ['CODIGO_PENAL']],
  ])('%s', (consulta, estado, identidades) => {
    const i = clasificarIntencionInstrumental(consulta);
    expect(i.estado).toBe(estado);
    expect(i.identidades).toEqual(identidades);
  });

  it('control negativo: "Código Civil + Decreto 130-2017" no ignora el conflicto', () => {
    const i = clasificarIntencionInstrumental('Código Civil + Decreto 130-2017');
    expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
    expect(i.identidades).toEqual(['CODIGO_CIVIL']);
  });

  it('el alias "función notarial" tiene correspondencia documental: el Art. 3 del Reglamento lo usa en su título', () => {
    const lote = JSON.parse(readFileSync(join(process.cwd(), 'docs/governance/exequatur-ingesta-notariado-lote-formal.json'), 'utf8')) as {
      instrumentos: { instrumento: string; registros: { fuente: string; contenido: string }[] }[];
    };
    const articulo3 = lote.instrumentos
      .flatMap((ins) => ins.registros)
      .find((r) => r.contenido.includes('EJERCICIO DE LA FUNCION NOTARIAL'));
    expect(articulo3).toBeDefined();
    expect(identidadDeFuente(articulo3!.fuente)).toBe('REGLAMENTO_NOTARIADO');
    expect(detectarInstrumentoDesdeTexto('reglamento de la función notarial')).toBe('REGLAMENTO_NOTARIADO');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recuperación con candidatos (1), RPC que aplica materia_filtro
// ─────────────────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

function mockearRPC(filas: Fila[]) {
  const rpc = vi.fn(async (_n: string, params: Record<string, unknown>) => {
    const materia = params.materia_filtro as string | null;
    return { data: filas.filter((f) => materia === null || f.materia === materia), error: null };
  });
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
  vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.RAG_BACKEND = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('1 — genéricas con evidencia elegible: NONE y la evidencia se conserva', () => {
  it.each(CORPUS_GENERICO.map((c) => [c.consulta, c.pertinente.id, c] as const))(
    '%s → conserva %s',
    async (_consulta, _id, caso) => {
      mockearRPC(CORPUS_GENERICO.map((c) => c.pertinente));
      const { buscarRAG } = await import('@/lib/rag/search');

      const r = await buscarRAG(caso.consulta, 5, 'mayalex_normativos');

      expect(r.intencionInstrumental).toBe('NONE');
      expect(r.fragmentos.map((f) => f.id)).toContain(caso.pertinente.id);
      expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Contexto: Fuente documental verificable en NONE, SPECIFIC y MULTI
// ─────────────────────────────────────────────────────────────────────────────

describe('5 — contexto: cada fragmento muestra su fuente documental', () => {
  it('NONE: "Fuente documental" real por fragmento, sin relevancia declarada', async () => {
    mockearRPC([CORPUS_GENERICO[0].pertinente]);
    const { buscarRAG, formatearContextoRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('ley sobre el divorcio', 5, 'mayalex_normativos');
    const ctx = formatearContextoRAG(r);

    expect(ctx).toContain(`Fuente documental: ${FUENTE_CIVIL}`);
    expect(ctx).toContain('similitud de recuperación:');
    expect(ctx).toContain('sin evaluación de relevancia jurídica');
    expect(ctx).not.toContain('relevancia:');
  });

  it('SPECIFIC: "Fuente documental" real por fragmento', async () => {
    mockearRPC([fila('civil-divorcio', FUENTE_CIVIL, '02_CIVIL', 'Artículo 1. El matrimonio se disuelve por divorcio.')]);
    const { buscarRAG, formatearContextoRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Según el Código Civil, ¿qué dispone sobre el divorcio?', 5, 'mayalex_normativos');
    const ctx = formatearContextoRAG(r);

    expect(r.intencionInstrumental).toBe('SPECIFIC_RESOLVED');
    expect(ctx).toContain(`Fuente documental: ${FUENTE_CIVIL}`);
    expect(ctx).toContain('similitud de recuperación:');
    expect(ctx).not.toContain('CONSULTA TEMÁTICA');
  });

  it('MULTI con artículo: cada instrumento aparece con su fuente documental', async () => {
    const tabla = [
      { id: 'penal-173', contenido: 'ARTICULO 173.- Texto del Código Penal.', num_articulo: '173', fuente: FUENTE_CODIGO_PENAL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL', metadata: null },
      { id: 'comercio-173', contenido: 'ARTICULO 173.- Texto del Código de Comercio.', num_articulo: '173', fuente: FUENTE_COMERCIO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '10_LEYES_REGLAMENTOS', metadata: null },
    ];
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: tabla, error: null }),
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain), rpc: vi.fn(async () => ({ data: [], error: null })) }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG, formatearContextoRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Artículo 173 del Código Penal y del Código de Comercio', 5, 'mayalex_normativos');
    const ctx = formatearContextoRAG(r);

    expect(r.intencionInstrumental).toBe('MULTI_SPECIFIC_RESOLVED');
    expect(ctx).toContain(`Fuente documental: ${FUENTE_CODIGO_PENAL}`);
    expect(ctx).toContain(`Fuente documental: ${FUENTE_COMERCIO}`);
    expect(ctx).toContain('similitud de recuperación:');
  });
});
