import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fase 1D — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md, primer cambio de
 * comportamiento autorizado de Retrieval v3.
 *
 * Cubre la matriz de pruebas requerida por la directiva de Fase 1D que no
 * está ya cubierta por tests/retrieval-runtime-contract.test.ts (escenarios
 * A-D, actualizados ahí mismo con comentarios "FIXED IN RETRIEVAL V3 PHASE
 * 1D") ni por tests/rag-articulo-exacto.test.ts (E, ya correcto antes de
 * esta fase). Este archivo prueba directamente `buildRetrievalOutcome` y los
 * caminos de buscarRAG() que producen EXACT_SUCCESS / SEMANTIC_SUCCESS /
 * ambigüedad (K) / resiliencia ante fallo de Cohere (L).
 */

import { buildRetrievalOutcome, classifyRetrievalError, safeErrorCode } from '@/lib/legal-retrieval/retrieval-outcome';

describe('buildRetrievalOutcome — defaults', () => {
  it('NOT_REQUIRED: shape mínimo, sin campos de error', () => {
    const outcome = buildRetrievalOutcome('NOT_REQUIRED');
    expect(outcome).toEqual({
      state: 'NOT_REQUIRED', evidenceCount: 0, exactAttempted: false, semanticAttempted: false, degraded: false,
    });
  });

  it('RETRIEVAL_ERROR: incluye errorCategory/errorCode solo cuando se pasan', () => {
    const outcome = buildRetrievalOutcome('RETRIEVAL_ERROR', { errorCategory: 'DATABASE', errorCode: 'DATABASE_RETRIEVAL_FAILED' });
    expect(outcome.errorCategory).toBe('DATABASE');
    expect(outcome.errorCode).toBe('DATABASE_RETRIEVAL_FAILED');
  });
});

describe('classifyRetrievalError / safeErrorCode', () => {
  it('mensaje con prefijo "Supabase RAG error:" -> DATABASE', () => {
    expect(classifyRetrievalError('Supabase RAG error: connection refused', 'supabase')).toBe('DATABASE');
    expect(safeErrorCode('DATABASE')).toBe('DATABASE_RETRIEVAL_FAILED');
  });

  it('mensaje con "HF Inference"/"HF_API_TOKEN" -> EMBEDDING', () => {
    expect(classifyRetrievalError('HF Inference: timeout tras 12000ms', 'supabase')).toBe('EMBEDDING');
    expect(classifyRetrievalError('HF_API_TOKEN no configurada', 'supabase')).toBe('EMBEDDING');
    expect(safeErrorCode('EMBEDDING')).toBe('EMBEDDING_UNAVAILABLE');
  });

  it('backend python + mensaje sin patrón conocido -> NETWORK', () => {
    expect(classifyRetrievalError('fetch failed', 'python')).toBe('NETWORK');
  });

  it('mensaje sin patrón conocido, backend supabase -> UNKNOWN (nunca se inventa una categoría más específica)', () => {
    expect(classifyRetrievalError('algo inesperado', 'supabase')).toBe('UNKNOWN');
    expect(safeErrorCode('UNKNOWN')).toBe('UNKNOWN_RETRIEVAL_FAILURE');
  });

  it('errorCode nunca contiene el mensaje crudo (seguro para telemetría, §6)', () => {
    const categoria = classifyRetrievalError('Supabase RAG error: password="hunter2" host=db.internal', 'supabase');
    const codigo = safeErrorCode(categoria);
    expect(codigo).not.toContain('hunter2');
    expect(codigo).not.toContain('db.internal');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buscarRAG — estados de éxito y ambigüedad (mocking real, mismo patrón que
// tests/rag-buscarRAG-guardarrail.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

function fakeSupabaseConFilas(filas: unknown[]) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: filas, error: null }),
  };
  return { from: vi.fn(() => chain) };
}

function fakeSupabaseRPC(filas: unknown[]) {
  return { rpc: vi.fn(async () => ({ data: filas, error: null })) };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.RAG_BACKEND = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
  delete process.env.COHERE_API_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('[MATRIX F] artículo exacto válido -> EXACT_SUCCESS', () => {
  it('outcome.state=EXACT_SUCCESS, exactAttempted=true, semanticAttempted=false', async () => {
    const filaCPP = {
      id: 'cpp-173', contenido: 'ARTICULO 173.- Medidas Cautelares Aplicables.',
      num_articulo: '173', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)',
      fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL',
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseConFilas([filaCPP]) }));
    const embedQueryMock = vi.fn();
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('Cita el artículo 173 del Código Procesal Penal de Honduras', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(1);
    expect(resultado.outcome?.state).toBe('EXACT_SUCCESS');
    expect(resultado.outcome?.evidenceCount).toBe(1);
    expect(resultado.outcome?.exactAttempted).toBe(true);
    expect(resultado.outcome?.semanticAttempted).toBe(false);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });
});

describe('[MATRIX G] recuperación semántica exitosa con resultados -> SEMANTIC_SUCCESS', () => {
  it('outcome.state=SEMANTIC_SUCCESS, evidenceCount coincide, semanticAttempted=true', async () => {
    const chunkValido = {
      id: 'familia-119', contenido: 'Artículo 119. La adopción es una institución jurídica de protección.',
      num_articulo: '119', fuente: 'Codigo de Familia', fuente_tipo: 'codigo',
      jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.9,
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseRPC([chunkValido]) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('¿Cuáles son los requisitos para adoptar en Honduras?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(1);
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
    expect(resultado.outcome?.evidenceCount).toBe(1);
    expect(resultado.outcome?.semanticAttempted).toBe(true);
    expect(resultado.outcome?.exactAttempted).toBe(false);
  });
});

describe('[MATRIX K] ambigüedad entre instrumentos -> NO_VERIFIED_EVIDENCE, NUNCA contaminación semántica', () => {
  it('dos filas del mismo instrumento con materia distinta (dato inconsistente del corpus) -> ambiguo + NO_VERIFIED_EVIDENCE, embedQuery nunca se llama', async () => {
    const filaA = {
      id: 'a', contenido: 'Texto A', num_articulo: '999', fuente: 'Codigo Penal',
      fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL',
    };
    const filaB = {
      id: 'b', contenido: 'Texto B', num_articulo: '999', fuente: 'Codigo Penal',
      fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '07_CONSTITUCIONAL',
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseConFilas([filaA, filaB]) }));
    const embedQueryMock = vi.fn();
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('Cita el artículo 999 del Código Penal de Honduras', 5, 'mayalex_normativos');

    expect(resultado.ambiguo).toBe(true);
    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(resultado.outcome?.exactAttempted).toBe(true);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });
});

describe('[MATRIX L] Cohere (opcional) falla -> sigue SEMANTIC_SUCCESS, NUNCA RETRIEVAL_ERROR', () => {
  it('flag_rerank ON pero sin COHERE_API_KEY -> degrada a orden pgvector, outcome sigue siendo SEMANTIC_SUCCESS', async () => {
    const chunkValido = {
      id: 'familia-119', contenido: 'Artículo 119. La adopción es una institución jurídica de protección.',
      num_articulo: '119', fuente: 'Codigo de Familia', fuente_tipo: 'codigo',
      jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.9,
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseRPC([chunkValido]) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    // opts.rerank=true simula flag_rerank habilitado; COHERE_API_KEY ausente
    // (borrado en beforeEach) hace que rerankearFragmentos degrade solo, sin
    // lanzar -- exactamente el comportamiento ya probado en rag-rerank.test.ts.
    const resultado = await buscarRAG('¿Cuáles son los requisitos para adoptar en Honduras?', 5, 'mayalex_normativos', undefined, { rerank: true });

    expect(resultado.fragmentos).toHaveLength(1);
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
    expect(resultado.outcome?.state).not.toBe('RETRIEVAL_ERROR');
  });
});
