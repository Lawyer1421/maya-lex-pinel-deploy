import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectarInstrumentoDesdeTexto, identidadDeFuente } from '@/lib/legal-retrieval/exact-resolver';
import {
  clasificarIntencionInstrumental,
  elegibilidadSemantica,
  evidenciaCubreIntencion,
} from '@/lib/legal-retrieval/instrument-gate';

/**
 * P1 / P1.2 / P1.3 — intención instrumental en producción.
 * Estados: NONE, SPECIFIC_RESOLVED, MULTI_SPECIFIC_RESOLVED, SPECIFIC_UNRESOLVED.
 * Cubre alias notariales, genéricos que no bloquean, referencias específicas
 * sin resolver que bloquean, comparaciones con cobertura, D05 y C10.
 */

const FUENTE_CODIGO = 'Código del Notariado de Honduras (Decreto 353-2005)';
const FUENTE_REGLAMENTO = 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)';
const FUENTE_CODIGO_PENAL = 'Codigo Penal';
const FUENTE_CODIGO_COMERCIO = 'Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)';

const TXT_D05 = 'Según el reglamento notarial, ¿qué presunción tienen las afirmaciones del notario?';
const TXT_C10 = '¿Prevalece la nulidad prevista en otras leyes sobre la nulidad de la ley notarial?';
const CONSULTA_SEMANTICA = '¿Qué presunción tienen las afirmaciones del notario?';

const ORIGINAL_ENV = { ...process.env };

// ─────────────────────────────────────────────────────────────────────────────
// Clasificación: alias y referencias no resueltas
// ─────────────────────────────────────────────────────────────────────────────

describe('alias notariales → identidad resuelta', () => {
  it.each([
    'Según el reglamento notarial, ¿qué dice?',
    'Según el reglamento del notariado, ¿qué dice?',
    'Según el reglamento de la función notarial, ¿qué dice?',
    'Según el reglamento de la funcion notarial, ¿qué dice?',
  ])('REGLAMENTO_NOTARIADO — %s', (texto) => {
    const i = clasificarIntencionInstrumental(texto);
    expect(i.estado).toBe('SPECIFIC_RESOLVED');
    expect(i.identidades).toEqual(['REGLAMENTO_NOTARIADO']);
  });

  it.each([
    'Según el código del notariado, ¿qué dice?',
    'Según el código notarial, ¿qué dice?',
  ])('CODIGO_NOTARIADO — %s', (texto) => {
    const i = clasificarIntencionInstrumental(texto);
    expect(i.estado).toBe('SPECIFIC_RESOLVED');
    expect(i.identidades).toEqual(['CODIGO_NOTARIADO']);
  });

  it('el detector de la ruta exacta reconoce el alias "reglamento notarial"', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 12 del reglamento notarial')).toBe('REGLAMENTO_NOTARIADO');
  });
});

describe('"ley notarial" no se asimila a ningún instrumento', () => {
  it('es referencia específica sin resolver (SPECIFIC_UNRESOLVED), sin identidad fabricada', () => {
    const i = clasificarIntencionInstrumental('¿Qué dice la ley notarial?');
    expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
    expect(i.identidades).toEqual([]);
  });

  it('el detector de la ruta exacta no la convierte en CODIGO_NOTARIADO', () => {
    expect(detectarInstrumentoDesdeTexto('la ley notarial')).toBeNull();
  });
});

describe('genéricos no bloquean: estado NONE', () => {
  it.each([
    'Conforme a la resolución aplicable, ¿qué procede?',
    'Según el acuerdo correspondiente, ¿qué procede?',
    'Qué dispone la ley aplicable en este caso',
    'Según el código aplicable, ¿qué procede?',
    'Conforme al reglamento aplicable, ¿qué procede?',
    '¿Qué es la fe pública?',
  ])('%s', (texto) => {
    expect(clasificarIntencionInstrumental(texto).estado).toBe('NONE');
  });
});

describe('referencias específicas sin resolver bloquean', () => {
  it('número de identificación sin correspondencia verificada: "según el decreto 999-2099"', () => {
    expect(clasificarIntencionInstrumental('Según el decreto 999-2099, ¿qué dispone?').estado).toBe('SPECIFIC_UNRESOLVED');
  });

  it('número verificado sin nombre: "según el decreto 130-2017" resuelve al Código Penal', () => {
    const i = clasificarIntencionInstrumental('Según el decreto 130-2017, ¿qué dispone?');
    expect(i.estado).toBe('SPECIFIC_RESOLVED');
    expect(i.identidades).toEqual(['CODIGO_PENAL']);
  });

  it('número sin nombre cuya correspondencia no está verificada queda pendiente', () => {
    expect(clasificarIntencionInstrumental('Según el decreto 999-2099, ¿qué dispone?').estado).toBe('SPECIFIC_UNRESOLVED');
  });

  it('referencia específica junto a una resuelta: conserva ambas y queda SPECIFIC_UNRESOLVED', () => {
    const i = clasificarIntencionInstrumental('Código Penal y decreto 999-2099');
    expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
    expect(i.identidades).toEqual(['CODIGO_PENAL']);
  });

  it('C10 — "ley notarial" con materia notarial: SPECIFIC_UNRESOLVED', () => {
    expect(clasificarIntencionInstrumental(TXT_C10).estado).toBe('SPECIFIC_UNRESOLVED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Elegibilidad y cobertura (puros)
// ─────────────────────────────────────────────────────────────────────────────

describe('elegibilidadSemantica por estado', () => {
  it('NONE: no filtra', () => {
    const p = elegibilidadSemantica(clasificarIntencionInstrumental('¿Qué es la fe pública?'));
    expect(p(FUENTE_CODIGO)).toBe(true);
    expect(p('Ley desconocida de 2018')).toBe(true);
  });

  it('SPECIFIC_RESOLVED: sólo la identidad confirmada', () => {
    const p = elegibilidadSemantica(clasificarIntencionInstrumental(TXT_D05));
    expect(p(FUENTE_REGLAMENTO)).toBe(true);
    expect(p(FUENTE_CODIGO)).toBe(false);
    expect(p('Ley desconocida de 2018')).toBe(false);
  });

  it('SPECIFIC_UNRESOLVED: nada es elegible', () => {
    const p = elegibilidadSemantica(clasificarIntencionInstrumental(TXT_C10));
    expect(p(FUENTE_CODIGO)).toBe(false);
    expect(p(FUENTE_REGLAMENTO)).toBe(false);
  });

  it('MULTI_SPECIFIC_RESOLVED: unión de las identidades', () => {
    const p = elegibilidadSemantica(clasificarIntencionInstrumental('Código Penal y Código de Comercio'));
    expect(p(FUENTE_CODIGO_PENAL)).toBe(true);
    expect(p(FUENTE_CODIGO_COMERCIO)).toBe(true);
    expect(p(FUENTE_CODIGO)).toBe(false);
  });
});

describe('evidenciaCubreIntencion', () => {
  const comparacion = clasificarIntencionInstrumental('Código Penal y Código de Comercio');

  it('comparación con evidencia de un solo instrumento no cubre', () => {
    expect(evidenciaCubreIntencion([{ fuente: FUENTE_CODIGO_PENAL }], comparacion)).toBe(false);
  });

  it('comparación con evidencia de ambos instrumentos cubre', () => {
    expect(
      evidenciaCubreIntencion([{ fuente: FUENTE_CODIGO_PENAL }, { fuente: FUENTE_CODIGO_COMERCIO }], comparacion),
    ).toBe(true);
  });

  it('sin fragmentos no hay evidencia cubierta, aun sin intención instrumental', () => {
    expect(evidenciaCubreIntencion([], clasificarIntencionInstrumental('¿Qué es la fe pública?'))).toBe(false);
  });

  it('sin intención instrumental, con fragmentos, todos pasan', () => {
    expect(evidenciaCubreIntencion([{ fuente: FUENTE_CODIGO }], clasificarIntencionInstrumental('¿Qué es la fe pública?'))).toBe(true);
  });

  it('referencia no resuelta nunca queda cubierta', () => {
    const noResuelta = clasificarIntencionInstrumental(TXT_C10);
    expect(evidenciaCubreIntencion([{ fuente: FUENTE_CODIGO }], noResuelta)).toBe(false);
  });
});

describe('identidadDeFuente', () => {
  it('Reglamento y Código del Notariado se distinguen por fuente', () => {
    expect(identidadDeFuente(FUENTE_REGLAMENTO)).toBe('REGLAMENTO_NOTARIADO');
    expect(identidadDeFuente(FUENTE_CODIGO)).toBe('CODIGO_NOTARIADO');
  });

  it('fuente sin identidad reconocible devuelve null', () => {
    expect(identidadDeFuente('Ley desconocida de 2018')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ruta semántica de producción (buscarRAG completo, RPC mockeada)
// ─────────────────────────────────────────────────────────────────────────────

function filaRPC(id: string, fuente: string, similarity: number, contenido: string) {
  return {
    id,
    contenido,
    num_articulo: '9',
    fuente,
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: true,
    materia: '03_NOTARIAL',
    similarity,
  };
}

const codigoD05 = filaRPC('codigo-9', FUENTE_CODIGO, 0.95, 'Artículo 9. Las afirmaciones del notario se presumen auténticas.');
const reglamentoD05 = filaRPC('reglamento-9', FUENTE_REGLAMENTO, 0.80, 'Artículo 9. Presunción de las afirmaciones del notario en el protocolo.');
const codigoPenalRow = { ...filaRPC('penal-1', FUENTE_CODIGO_PENAL, 0.90, 'Artículo 1. Texto del Código Penal.'), materia: '01_PENAL' };
const codigoComercioRow = { ...filaRPC('comercio-1', FUENTE_CODIGO_COMERCIO, 0.85, 'Artículo 1. Texto del Código de Comercio.'), materia: '10_LEYES_REGLAMENTOS' };

/** RPC que respeta materia_filtro, solo_norma_vigente y límite, como buscar_biblioteca_v2. */
function mockearSemantica(filas: { materia?: string; es_norma_vigente?: boolean }[]) {
  const rpc = vi.fn(async (_nombre: string, params: Record<string, unknown>) => {
    const materia = params.materia_filtro as string | null;
    const data = filas
      .filter((f) => materia === null || f.materia === materia)
      .filter((f) => params.solo_norma_vigente !== true || f.es_norma_vigente === true)
      .slice(0, (params.limite as number | undefined) ?? filas.length);
    return { data, error: null };
  });
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({ rpc }),
  }));
  vi.doMock('@/lib/rag/embed', () => ({
    embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)),
  }));
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

describe('buscarRAG (semántica) — D05 y alias', () => {
  it('D05: consulta explícita del Reglamento; ningún fragmento del Código entra', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(TXT_D05, 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.fuente)).toEqual([FUENTE_REGLAMENTO]);
  });

  it('el alias "reglamento del notariado" aplica la misma invariante', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(
      'Según el reglamento del notariado, ¿qué presunción tienen las afirmaciones del notario?',
      5,
      'mayalex_normativos',
    );

    expect(resultado.fragmentos.some((f) => f.fuente === FUENTE_CODIGO)).toBe(false);
  });

  it('consulta explícita del Código: el Reglamento queda fuera', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(
      'Según el código del notariado, ¿qué presunción tienen las afirmaciones del notario?',
      5,
      'mayalex_normativos',
    );

    expect(resultado.fragmentos.map((f) => f.fuente)).toEqual([FUENTE_CODIGO]);
  });

  it('identidad resuelta sin fuente que la confirme: fail-close, OFFICIAL_FALLBACK_REQUIRED', async () => {
    mockearSemantica([codigoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(TXT_D05, 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});

describe('buscarRAG (semántica) — referencias no resueltas', () => {
  it('C10: "ley notarial" con materia notarial: ningún candidato por materia', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(TXT_C10, 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('decreto con número sin resolver: fail-close', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Según el decreto 999-2099, ¿qué dispone?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('genérico "conforme a la resolución aplicable": NONE, comportamiento previo sin filtro', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Conforme a la resolución aplicable, ¿qué procede?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_CODIGO, FUENTE_REGLAMENTO].sort());
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED'); // CLO 28-oct-2026 (Anexo 2.5): Notariado sin materia verificada = solo CONTEXT
  });

  it('sin clase explícita, la materia notarial conserva su autorización (comportamiento previo)', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(
      '¿Qué obligaciones tiene el notario sobre la escritura pública?',
      5,
      'mayalex_normativos',
    );

    expect(resultado.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_CODIGO, FUENTE_REGLAMENTO].sort());
  });

  it('sin clase ni materia: comportamiento semántico previo, sin filtro', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_CODIGO, FUENTE_REGLAMENTO].sort());
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });
});

describe('buscarRAG (semántica) — comparación con cobertura', () => {
  it('comparación con evidencia de ambos instrumentos: se devuelven ambos', async () => {
    mockearSemantica([codigoPenalRow, codigoComercioRow]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Compara el Código Penal y el Código de Comercio', 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_CODIGO_COMERCIO, FUENTE_CODIGO_PENAL].sort());
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });

  it('comparación sin evidencia de uno de los instrumentos: no hay respuesta completa', async () => {
    mockearSemantica([codigoPenalRow]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Compara el Código Penal y el Código de Comercio', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});

describe('buscarRAG (exacta) — alias de Reglamento llega al resolvedor exacto', () => {
  it('"artículo 9 del reglamento notarial" devuelve sólo la fila del Reglamento, como CONTEXT (sin pliego CLO)', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
        resolve({
          data: [
            { id: 'codigo-9', contenido: 'ARTICULO 9.- Texto del Código.', num_articulo: '9', fuente: FUENTE_CODIGO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_NOTARIAL', metadata: null },
            { id: 'reglamento-9', contenido: 'ARTICULO 9.- Texto del Reglamento.', num_articulo: '9', fuente: FUENTE_REGLAMENTO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_NOTARIAL', metadata: null },
          ],
          error: null,
        }),
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    const embedQueryMock = vi.fn().mockResolvedValue(new Array(384).fill(0.01));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Artículo 9 del reglamento notarial', 5, 'mayalex_normativos');

    // Salvaguarda CLO (d): el alias llega al resolvedor exacto y devuelve sólo la fila del Reglamento, pero el Reglamento PCSJ-17-2012
    // no puede ser PRIMARY hasta que haya pliego CLO: queda como CONTEXT y no hay evidencia suficiente.
    expect(resultado.fragmentos.map((f) => f.fuente)).toEqual([FUENTE_REGLAMENTO]);
    expect(resultado.fragmentos[0].rol_evidencia).toBe('CONTEXT');
    expect(resultado.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(resultado.outcome?.evidenceCount).toBe(0);
    expect(resultado.outcome?.cloBlocks).toContain('INSTRUMENTO_SIN_PLIEGO_CLO');
    expect(embedQueryMock).not.toHaveBeenCalled();
  });
});
