import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectarInstrumentoDesdeTexto, identidadDeFuente } from '@/lib/legal-retrieval/exact-resolver';
import {
  intencionInstrumentoExplicita,
  cumpleIdentidadExplicita,
  elegibilidadSemantica,
} from '@/lib/legal-retrieval/instrument-gate';

/**
 * P1 — intención instrumental explícita (producción).
 * EXPLICIT_INSTRUMENT_INTENT > MATERIA. La materia sola nunca valida un
 * candidato cuyo instrumento es incompatible con el que la consulta nombra.
 * Cubre alias notariales, rechazo por instrumento incompatible, neutralidad
 * de "ley notarial" genérica, y la invariante D05 a nivel de buscarRAG.
 */

const FUENTE_CODIGO = 'Código del Notariado de Honduras (Decreto 353-2005)';
const FUENTE_REGLAMENTO = 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)';

const TXT_D05 = 'Según el reglamento notarial, ¿qué presunción tienen las afirmaciones del notario?';
const CONSULTA_SEMANTICA = '¿Qué presunción tienen las afirmaciones del notario?';

const ORIGINAL_ENV = { ...process.env };

// ─────────────────────────────────────────────────────────────────────────────
// Alias y clase explícita (puros)
// ─────────────────────────────────────────────────────────────────────────────

describe('alias notariales → REGLAMENTO_NOTARIADO', () => {
  it.each([
    'Según el reglamento notarial, ¿qué dice?',
    'Según el reglamento del notariado, ¿qué dice?',
    'Según el reglamento de la función notarial, ¿qué dice?',
    'Según el reglamento de la funcion notarial, ¿qué dice?',
  ])('%s', (texto) => {
    const i = intencionInstrumentoExplicita(texto);
    expect(i.clase).toBe('reglamento');
    expect(i.identidad).toBe('REGLAMENTO_NOTARIADO');
  });

  it('el detector de instrumento de producción reconoce el alias "reglamento notarial"', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 12 del reglamento notarial')).toBe('REGLAMENTO_NOTARIADO');
  });
});

describe('alias notariales → CODIGO_NOTARIADO', () => {
  it.each([
    'Según el código del notariado, ¿qué dice?',
    'Según el código notarial, ¿qué dice?',
  ])('%s', (texto) => {
    const i = intencionInstrumentoExplicita(texto);
    expect(i.clase).toBe('codigo');
    expect(i.identidad).toBe('CODIGO_NOTARIADO');
  });
});

describe('"ley notarial" genérica no se fuerza a ningún instrumento', () => {
  it('clase ley explícita, identidad sin resolver', () => {
    const i = intencionInstrumentoExplicita('¿Prevalece la nulidad de la ley notarial?');
    expect(i.clase).toBe('ley');
    expect(i.identidad).toBeNull();
  });

  it('el detector de instrumento no convierte "ley notarial" en CODIGO_NOTARIADO', () => {
    expect(detectarInstrumentoDesdeTexto('la ley notarial')).toBeNull();
  });

  it('sin clase de instrumento no hay intención alguna', () => {
    const i = intencionInstrumentoExplicita('¿Qué es la fe pública?');
    expect(i.clase).toBeNull();
    expect(i.identidad).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Identidad por fuente y compatibilidad (puros)
// ─────────────────────────────────────────────────────────────────────────────

describe('identidadDeFuente', () => {
  it('Reglamento y Código del Notariado se distinguen por fuente', () => {
    expect(identidadDeFuente(FUENTE_REGLAMENTO)).toBe('REGLAMENTO_NOTARIADO');
    expect(identidadDeFuente(FUENTE_CODIGO)).toBe('CODIGO_NOTARIADO');
  });

  it('fuente sin identidad reconocible devuelve null', () => {
    expect(identidadDeFuente('Ley desconocida de 2018')).toBeNull();
  });
});

describe('cumpleIdentidadExplicita', () => {
  it('rechaza un candidato del Código cuando la consulta nombra el Reglamento', () => {
    expect(cumpleIdentidadExplicita(FUENTE_CODIGO, 'REGLAMENTO_NOTARIADO')).toBe(false);
  });

  it('acepta el Reglamento cuando la consulta nombra el Reglamento', () => {
    expect(cumpleIdentidadExplicita(FUENTE_REGLAMENTO, 'REGLAMENTO_NOTARIADO')).toBe(true);
  });

  it('exige confirmación de identidad: una fuente sin identidad no entra con intención explícita', () => {
    expect(cumpleIdentidadExplicita('Ley desconocida de 2018', 'REGLAMENTO_NOTARIADO')).toBe(false);
  });

  it('sin identidad explícita no filtra (neutral)', () => {
    expect(cumpleIdentidadExplicita(FUENTE_CODIGO, null)).toBe(true);
    expect(cumpleIdentidadExplicita('Ley desconocida de 2018', null)).toBe(true);
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

function mockearSemantica(filas: unknown[]) {
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({ rpc: vi.fn(async () => ({ data: filas, error: null })) }),
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

describe('buscarRAG (semántica) — D05: materia sola no valida un instrumento incompatible', () => {
  it('consulta explícita de Reglamento: ningún fragmento del Código entra al resultado', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(TXT_D05, 5, 'mayalex_normativos');

    expect(resultado.fragmentos.some((f) => f.fuente === FUENTE_CODIGO)).toBe(false);
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

  it('si ningún candidato confirma el instrumento pedido, no hay evidencia (fail-close, nunca semántica de otro instrumento)', async () => {
    mockearSemantica([codigoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(TXT_D05, 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('C10 — clase explícita "ley" sin identidad + materia 03_NOTARIAL: ningún candidato del Código ni del Reglamento se acepta por materia', async () => {
    mockearSemantica([codigoD05, reglamentoD05]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(
      '¿Prevalece la nulidad prevista en otras leyes sobre la nulidad de la ley notarial?',
      5,
      'mayalex_normativos',
    );

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
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
});

describe('elegibilidadSemantica — tres ramas de la regla', () => {
  it('A. sin clase explícita: no filtra, aunque haya materia', () => {
    const p = elegibilidadSemantica(intencionInstrumentoExplicita('¿Qué es la fe pública?'), '03_NOTARIAL');
    expect(p(FUENTE_CODIGO)).toBe(true);
    expect(p('Ley desconocida de 2018')).toBe(true);
  });

  it('B. clase + identidad resuelta: sólo la identidad confirmada', () => {
    const p = elegibilidadSemantica(intencionInstrumentoExplicita(TXT_D05), '03_NOTARIAL');
    expect(p(FUENTE_REGLAMENTO)).toBe(true);
    expect(p(FUENTE_CODIGO)).toBe(false);
  });

  it('C. clase sin identidad + materia: bloquea todo, la materia no autoriza', () => {
    const p = elegibilidadSemantica(intencionInstrumentoExplicita('la ley notarial'), '03_NOTARIAL');
    expect(p(FUENTE_CODIGO)).toBe(false);
    expect(p(FUENTE_REGLAMENTO)).toBe(false);
  });

  it('C sin materia: no hay autorización por materia que bloquear, no filtra', () => {
    const p = elegibilidadSemantica(intencionInstrumentoExplicita('la ley de la República'), null);
    expect(p(FUENTE_CODIGO)).toBe(true);
  });
});

describe('buscarRAG (exacta) — alias de Reglamento llega al resolvedor exacto', () => {
  it('"artículo 9 del reglamento notarial" devuelve sólo la fila del Reglamento', async () => {
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

    expect(resultado.fragmentos.map((f) => f.fuente)).toEqual([FUENTE_REGLAMENTO]);
    expect(resultado.outcome?.state).toBe('EXACT_SUCCESS');
    expect(embedQueryMock).not.toHaveBeenCalled();
  });
});
