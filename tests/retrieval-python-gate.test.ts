import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Gate de intención explícita en el backend Python (sin red real: fetch se
 * stubea). Verifica que un fragmento de instrumento incompatible se excluye y
 * que sin evidencia elegible el resultado es OFFICIAL_FALLBACK_REQUIRED.
 */

const FUENTE_CODIGO = 'Código del Notariado de Honduras (Decreto 353-2005)';
const FUENTE_REGLAMENTO = 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)';

const ORIGINAL_ENV = { ...process.env };

function respuestaPython(fragmentos: unknown[]) {
  return {
    ok: true,
    json: async () => ({ fragmentos, articulos_encontrados: ['9'] }),
    text: async () => '',
  };
}

function fragmentoPython(fuente: string, contenido: string) {
  return { contenido, num_articulo: '9', fuente, relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  delete process.env.VERCEL;
  process.env.RAG_BACKEND = 'python';
  process.env.PYTHON_RAG_URL = 'http://python-rag.test';
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe('buscarRAG backend python — gate de intención explícita', () => {
  it('instrumento explícito resuelto: el fragmento de instrumento incompatible se excluye', async () => {
    const fetchMock = vi.fn(async () =>
      respuestaPython([
        fragmentoPython(FUENTE_CODIGO, 'Artículo 9. Presunción del Código.'),
        fragmentoPython(FUENTE_REGLAMENTO, 'Artículo 9. Presunción del Reglamento.'),
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(
      'Según el reglamento notarial, ¿qué presunción tienen las afirmaciones del notario?',
      5,
      'mayalex_normativos',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resultado.fragmentos.map((f) => f.fuente)).toEqual([FUENTE_REGLAMENTO]);
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });

  it('sin evidencia elegible: OFFICIAL_FALLBACK_REQUIRED, no se acepta nada por materia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respuestaPython([fragmentoPython(FUENTE_CODIGO, 'Artículo 9. Presunción del Código.')])),
    );
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(
      'Según el reglamento notarial, ¿qué presunción tienen las afirmaciones del notario?',
      5,
      'mayalex_normativos',
    );

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('clase explícita "ley" sin identidad + materia notarial: bloquea ambos instrumentos (fail-close)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respuestaPython([
          fragmentoPython(FUENTE_CODIGO, 'Artículo 9. Texto del Código.'),
          fragmentoPython(FUENTE_REGLAMENTO, 'Artículo 9. Texto del Reglamento.'),
        ]),
      ),
    );
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(
      '¿Prevalece la nulidad prevista en otras leyes sobre la nulidad de la ley notarial?',
      5,
      'mayalex_normativos',
    );

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});
