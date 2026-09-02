import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rerankearFragmentos, type CandidatoRerank } from '@/lib/rag/rerank';

/**
 * Integración Cohere Rerank (rerank-v3.5), Etapa 2 del retrieval en dos
 * etapas (2026-09-01). Contrato obligatorio: rerankearFragmentos() NUNCA
 * lanza — cualquier fallo (sin API key, red, timeout, respuesta inválida)
 * degrada a los candidatos originales (orden pgvector) truncados a topN, sin
 * romper el flujo del chat.
 */

const ORIGINAL_ENV = { ...process.env };

type CandidatoDePrueba = CandidatoRerank & { id: string };

function candidato(overrides: Partial<CandidatoDePrueba> = {}): CandidatoDePrueba {
  return { id: 'x', contenido: 'texto de prueba', relevancia: 0.5, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('rerankearFragmentos — sin COHERE_API_KEY', () => {
  it('retorna los primeros topN candidatos en orden original, sin llamar a fetch', async () => {
    delete process.env.COHERE_API_KEY;
    const candidatos = [
      candidato({ id: 'a', relevancia: 0.9 }),
      candidato({ id: 'b', relevancia: 0.8 }),
      candidato({ id: 'c', relevancia: 0.7 }),
    ];

    const resultado = await rerankearFragmentos('consulta de prueba', candidatos, 2);

    expect(resultado).toHaveLength(2);
    expect(resultado.map((r) => r.id)).toEqual(['a', 'b']);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('rerankearFragmentos — con COHERE_API_KEY, éxito', () => {
  beforeEach(() => {
    process.env.COHERE_API_KEY = 'fake-key-solo-para-prueba';
  });

  it('reordena por relevance_score de Cohere y trunca a topN', async () => {
    const candidatos = [
      candidato({ id: 'a', relevancia: 0.60 }), // índice 0 — bajo por pgvector
      candidato({ id: 'b', relevancia: 0.55 }), // índice 1
      candidato({ id: 'c', relevancia: 0.50 }), // índice 2 — el más relevante según Cohere
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { index: 2, relevance_score: 0.98 }, // c primero
          { index: 0, relevance_score: 0.71 }, // a segundo
        ],
      }),
    });

    const resultado = await rerankearFragmentos('consulta jurídica', candidatos, 2);

    expect(resultado).toHaveLength(2);
    expect(resultado.map((r) => r.id)).toEqual(['c', 'a']);
    expect(resultado[0].relevancia).toBe(0.98); // relevancia reasignada al score real de Cohere
    expect(resultado[1].relevancia).toBe(0.71);

    // Confirma endpoint, modelo y forma del payload exactos que pidió el Fundador.
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cohere.com/v1/rerank',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-key-solo-para-prueba',
        }),
      })
    );
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.model).toBe('rerank-v3.5');
    expect(body.query).toBe('consulta jurídica');
    expect(body.documents).toEqual(['texto de prueba', 'texto de prueba', 'texto de prueba']);
    expect(body.top_n).toBe(2);
  });

  it('top_n nunca excede candidatos.length (evita error 400 de Cohere)', async () => {
    const candidatos = [candidato({ id: 'unico' })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ index: 0, relevance_score: 0.9 }] }),
    });

    await rerankearFragmentos('consulta', candidatos, 5); // topN=5 > 1 candidato

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.top_n).toBe(1);
  });
});

describe('rerankearFragmentos — resiliencia (nunca rompe el flujo del chat)', () => {
  beforeEach(() => {
    process.env.COHERE_API_KEY = 'fake-key-solo-para-prueba';
  });

  it('fetch rechaza (red caída / timeout) → fallback a orden pgvector original', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fetch failed'));
    const candidatos = [candidato({ id: 'a' }), candidato({ id: 'b' }), candidato({ id: 'c' })];

    const resultado = await rerankearFragmentos('consulta', candidatos, 2);

    expect(resultado.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('Cohere responde no-ok (401/429/500) → fallback a orden pgvector original, sin lanzar', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    });
    const candidatos = [candidato({ id: 'a' }), candidato({ id: 'b' })];

    const resultado = await rerankearFragmentos('consulta', candidatos, 5);

    expect(resultado.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('respuesta 200 pero sin resultados válidos → fallback a orden pgvector original', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    const candidatos = [candidato({ id: 'a' }), candidato({ id: 'b' })];

    const resultado = await rerankearFragmentos('consulta', candidatos, 5);

    expect(resultado.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('candidatos vacío → [] inmediato, sin llamar a fetch', async () => {
    const resultado = await rerankearFragmentos('consulta', [], 5);
    expect(resultado).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
