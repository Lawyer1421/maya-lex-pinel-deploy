import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { seleccionarFinal } from '@/lib/rag/search';

/**
 * Cableado de la Decisión C (DECISION_LOG 2026-09-07): el rerank Cohere queda
 * detrás de `flag_rerank` (default OFF). `seleccionarFinal()` es el corte final
 * del retrieval semántico.
 *
 * Contrato:
 *   - flag OFF  -> `candidatos.slice(0, k)` (orden pgvector), CERO llamadas a
 *     Cohere. Idéntico al fallback que `rerankearFragmentos()` ya hacía sin
 *     `COHERE_API_KEY` -> garantía de no-regresión.
 *   - flag ON   -> Cohere rerank-v3.5; degrada al slice si Cohere no responde.
 */

const ORIGINAL_ENV = { ...process.env };

type Cand = { id: string; contenido: string; relevancia: number };
const c = (id: string, relevancia: number): Cand => ({ id, contenido: `texto ${id}`, relevancia });

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('seleccionarFinal — flag_rerank OFF (default, Decisión C)', () => {
  it('devuelve candidatos.slice(0, k) sin llamar a fetch', async () => {
    const cands = [c('a', 0.9), c('b', 0.8), c('c', 0.7)];
    const r = await seleccionarFinal('consulta', cands, 2, false);
    expect(r.map((x) => x.id)).toEqual(['a', 'b']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('k mayor que la cantidad de candidatos → devuelve todos, sin fetch', async () => {
    const cands = [c('a', 0.9)];
    const r = await seleccionarFinal('consulta', cands, 5, false);
    expect(r.map((x) => x.id)).toEqual(['a']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('no-regresión: OFF con COHERE_API_KEY presente sigue siendo slice pgvector', async () => {
    process.env.COHERE_API_KEY = 'fake-key-solo-para-prueba';
    const cands = [c('a', 0.9), c('b', 0.8), c('c', 0.7), c('d', 0.6)];
    const r = await seleccionarFinal('consulta', cands, 3, false);
    expect(r.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('seleccionarFinal — flag_rerank ON', () => {
  it('sin COHERE_API_KEY → degrada a slice pgvector (nunca rompe el chat)', async () => {
    delete process.env.COHERE_API_KEY;
    const cands = [c('a', 0.9), c('b', 0.8), c('c', 0.7)];
    const r = await seleccionarFinal('consulta', cands, 2, true);
    expect(r.map((x) => x.id)).toEqual(['a', 'b']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('con COHERE_API_KEY → llama a Cohere y aplica su reordenamiento', async () => {
    process.env.COHERE_API_KEY = 'fake-key-solo-para-prueba';
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { index: 2, relevance_score: 0.99 },
          { index: 0, relevance_score: 0.51 },
        ],
      }),
    });
    const cands = [c('a', 0.9), c('b', 0.8), c('c', 0.7)];
    const r = await seleccionarFinal('consulta jurídica', cands, 2, true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cohere.com/v1/rerank',
      expect.any(Object),
    );
    expect(r.map((x) => x.id)).toEqual(['c', 'a']);
  });
});
