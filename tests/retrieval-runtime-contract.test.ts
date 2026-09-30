import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * CHARACTERIZATION TESTS
 *
 * These tests document MayaLex behavior as of Retrieval v3 Phase 1B.5.
 * Passing does NOT mean every documented behavior is desirable.
 *
 * Some expectations intentionally capture known runtime gaps that later
 * Retrieval v3 phases are expected to change.
 *
 * When one of those gaps is intentionally corrected, update the
 * corresponding characterization expectation together with the
 * implementation and the Control Plane approval.
 *
 * Fase 1B.5 — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md
 *
 * Este archivo NO introduce `RetrievalExecutionState` ni ningún código de
 * producción nuevo. Documenta, con tests reales contra las funciones que YA
 * existen hoy, cuál es el comportamiento ACTUAL para cada uno de los 10
 * escenarios (A-J) del contrato -- incluyendo los que son GAPs confirmados
 * (el sistema no distingue error de infraestructura vs. evidencia cero, y no
 * considera evidencia web disponible antes de abstenerse). Ningún test aquí
 * afirma un comportamiento que no exista hoy; los GAPs se documentan
 * afirmando el comportamiento actual (imperfecto) explícitamente, no
 * fallando la prueba.
 *
 * Ver MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md para el diseño completo.
 */

const ORIGINAL_ENV = { ...process.env };

function fakeSupabaseRPC(data: unknown[] | null, error: { message: string } | null = null) {
  return { rpc: vi.fn(async () => ({ data, error })) };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// ─────────────────────────────────────────────────────────────────────────────
// A — RAG_BACKEND ausente + credenciales Supabase presentes
// Contrato: SEMANTIC_SUCCESS/EXACT_SUCCESS (según consulta) — CUMPLE hoy.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT A] RAG_BACKEND ausente + credenciales Supabase presentes', () => {
  it('getBackend() infiere "supabase" en vez de apagar el RAG en silencio (fix a7be9ee, ya vigente)', async () => {
    delete process.env.RAG_BACKEND;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    const { getBackend } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('supabase');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B — RAG_BACKEND=disabled explícito
// FIXED IN RETRIEVAL V3 PHASE 1D
// OLD: este shape era IDÉNTICO al de "cero evidencia genuina" -- ResultadoRAG
//      no tenía ningún campo que distinguiera "esto fue una decisión de
//      configuración" de "el corpus no tenía nada" (GAP §3.1 del contrato).
// NEW: buscarRAG() ahora adjunta `outcome.state === 'CONFIGURATION_ERROR'`
//      siempre que backend='disabled' -- buscarRAG no decide si ESE caller
//      exigía evidencia (eso sigue siendo responsabilidad de route.ts, ver
//      MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md §5A de la directiva de Fase 1D),
//      pero ya no colapsa silenciosamente con "cero evidencia genuina".
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT B] RAG_BACKEND=disabled explícito', () => {
  it('getBackend() respeta disabled explícito sin importar si hay credenciales', async () => {
    process.env.RAG_BACKEND = 'disabled';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    const { getBackend, buscarRAG } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('disabled');

    const resultado = await buscarRAG('¿Qué dice el artículo 173 del Código Penal?', 5, 'mayalex_normativos');
    expect(resultado.fragmentos).toEqual([]);
    expect(resultado.articulos_encontrados).toEqual([]);
    expect(resultado.backend).toBe('disabled');
    expect(resultado.outcome?.state).toBe('CONFIGURATION_ERROR');
    expect(resultado.outcome?.errorCategory).toBe('CONFIGURATION');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C — Supabase RPC responde con error
// FIXED IN RETRIEVAL V3 PHASE 1D
// OLD: el campo `error` existía en ResultadoRAG, pero nada distinguía este
//      caso de un cero-resultados genuino (mismo shape que F) -- la
//      distinción dependía enteramente de que un consumidor leyera `.error`.
// NEW: buscarRAG() clasifica el error (classifyRetrievalError, por el
//      prefijo estable "Supabase RAG error:") y adjunta
//      outcome.state='RETRIEVAL_ERROR' + errorCategory='DATABASE'. route.ts
//      ahora sí puede bifurcar por outcome.state en vez de ignorar `.error`.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT C] Supabase RPC error (no zero-results genuino)', () => {
  it('buscarRAG captura el error de la RPC y lo clasifica como RETRIEVAL_ERROR/DATABASE, distinguible de F', async () => {
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => fakeSupabaseRPC(null, { message: 'connection timeout' }),
    }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('¿Cuáles son los requisitos para adoptar en Honduras?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.backend).toBe('supabase');
    expect(resultado.error).toContain('connection timeout');
    expect(resultado.outcome?.state).toBe('RETRIEVAL_ERROR');
    expect(resultado.outcome?.errorCategory).toBe('DATABASE');
    expect(resultado.outcome?.errorCode).toBe('DATABASE_RETRIEVAL_FAILED');
    // errorCode es seguro para telemetría -- nunca el mensaje crudo.
    expect(resultado.outcome?.errorCode).not.toContain('connection timeout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D — HF timeout (fallo de embedding)
// FIXED IN RETRIEVAL V3 PHASE 1D
// OLD: mismo GAP que C -- se capturaba pero terminaba indistinguible de F.
// NEW: outcome.state='RETRIEVAL_ERROR' + errorCategory='EMBEDDING'.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT D] Fallo de embedding (HF timeout/error)', () => {
  it('buscarRAG captura el fallo de embedQuery() y lo clasifica como RETRIEVAL_ERROR/EMBEDDING', async () => {
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseRPC([]) }));
    vi.doMock('@/lib/rag/embed', () => ({
      embedQuery: vi.fn().mockRejectedValue(new Error('HF Inference: timeout tras 12000ms')),
    }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('¿Cuáles son los requisitos para adoptar en Honduras?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.error).toContain('timeout');
    expect(resultado.outcome?.state).toBe('RETRIEVAL_ERROR');
    expect(resultado.outcome?.errorCategory).toBe('EMBEDDING');
    expect(resultado.outcome?.errorCode).toBe('EMBEDDING_UNAVAILABLE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E — Artículo exacto inexistente (Art. 9999)
// Contrato: NO_VERIFIED_EVIDENCE directo, sin contaminación semántica.
// YA CUMPLE hoy -- cobertura completa y más detallada en
// tests/rag-buscarRAG-guardarrail.test.ts. Se incluye aquí una verificación
// mínima para que este archivo de contrato sea autocontenible.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT E] Artículo exacto inexistente', () => {
  it('instrumento + número identificados, cero candidatos -> abstención limpia sin caer a semántica', async () => {
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => ({
        from: vi.fn(() => {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
          };
          return chain;
        }),
      }),
    }));
    const embedQueryMock = vi.fn();
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('Cita el artículo 9999 del Código Procesal Penal de Honduras', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F — Cero resultados semánticos (sin número de artículo)
// FIXED IN RETRIEVAL V3 PHASE 1D
// OLD: shape idéntico a "cero evidencia genuina" siempre tuvo -- no había
//      ningún estado que representara "el retrieval SÍ corrió bien, solo no
//      encontró nada" como algo distinto de un error.
// NEW: outcome.state='OFFICIAL_FALLBACK_REQUIRED' -- todavía NO implementa
//      ningún adapter externo (eso es Fase 1E), pero ya es un estado interno
//      explícito y distinguible de RETRIEVAL_ERROR (C/D) y de
//      NO_VERIFIED_EVIDENCE (E, artículo exacto inexistente).
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT F] Cero resultados semánticos genuinos', () => {
  it('RPC responde sin error y sin filas -> OFFICIAL_FALLBACK_REQUIRED, sin .error (distinto de C/D)', async () => {
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseRPC([]) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('¿Cuáles son los requisitos para adoptar en Honduras?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.error).toBeUndefined();
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
    expect(resultado.outcome?.semanticAttempted).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G — Corpus insuficiente + web disponible
// GAP CONFIRMADO (nuevo, identificado en esta fase): el gate fail-closed de
// route.ts (requiereEvidenciaCorpus) no tiene forma estructural de considerar
// si hay contexto web disponible -- su firma no recibe esa información.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT G] Corpus insuficiente + web disponible — GAP', () => {
  it('requiereEvidenciaCorpus() no tiene ningún parámetro para contexto web: estructuralmente no puede evitar la abstención aunque Tavily haya traído evidencia', async () => {
    const { requiereEvidenciaCorpus } = await import('@/lib/rag/search');
    // Firma actual: (query: string, rutaCorpusObligatoria: boolean) -> boolean.
    // Si en el futuro se le agrega un tercer parámetro para contexto web,
    // este assert de arity fallará intencionalmente y forzará a actualizar
    // este test junto con el contrato -- ese es el punto.
    expect(requiereEvidenciaCorpus.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H — Corpus insuficiente + web no disponible
// Contrato: NO_VERIFIED_EVIDENCE. YA CUMPLE -- el mensaje de abstención está
// exportado y es el que realmente usa route.ts.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT H] Corpus insuficiente + web no disponible', () => {
  it('MENSAJE_ABSTENCION_CORPUS y CORPUS_EVIDENCE_NOT_FOUND siguen siendo la señal de abstención real', async () => {
    const { MENSAJE_ABSTENCION_CORPUS, CORPUS_EVIDENCE_NOT_FOUND } = await import('@/lib/rag/search');
    expect(typeof MENSAJE_ABSTENCION_CORPUS).toBe('string');
    expect(MENSAJE_ABSTENCION_CORPUS.length).toBeGreaterThan(0);
    expect(CORPUS_EVIDENCE_NOT_FOUND).toBe('CORPUS_EVIDENCE_NOT_FOUND');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I — Modo sala (sala_ia / sala_penal)
// Contrato: NOT_REQUIRED, LLM_WITHOUT_CORPUS_ALLOWED_BY_DESIGN=true. YA
// CUMPLE, y es intencional -- este test documenta el riesgo, no lo corrige.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT I] Modos sala — LLM_WITHOUT_CORPUS_ALLOWED_BY_DESIGN=true', () => {
  it('sala_ia y sala_penal siempre clasifican como ruta D (sin RAG), sin importar el contenido de la consulta', async () => {
    const { clasificarConsulta } = await import('@/lib/router/clasificar_consulta');
    expect(clasificarConsulta('Cita el artículo 173 del Código Penal de Honduras', 'sala_ia')).toBe('D');
    expect(clasificarConsulta('Cita el artículo 173 del Código Penal de Honduras', 'sala_penal')).toBe('D');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J — Modo de análisis jurídico con evidencia real
// Contrato: EXACT_SUCCESS/SEMANTIC_SUCCESS. YA CUMPLE -- cobertura extensa y
// más específica ya existe en tests/rag-articulo-exacto.test.ts y
// tests/rag-fuente-null-exclusion.test.ts. Verificación mínima de router aquí.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT J] Modo de análisis jurídico con router activo', () => {
  it('analisis/analisis_penal/escritos_penales/documento activan el router (no son ruta D por defecto ante consulta normativa)', async () => {
    const { clasificarConsulta } = await import('@/lib/router/clasificar_consulta');
    const consulta = 'Cita el artículo 173 del Código Penal de Honduras';
    expect(clasificarConsulta(consulta, 'analisis')).not.toBe('D');
    expect(clasificarConsulta(consulta, 'analisis_penal')).not.toBe('D');
    expect(clasificarConsulta(consulta, 'escritos_penales')).not.toBe('D');
    expect(clasificarConsulta(consulta, 'documento')).not.toBe('D');
  });
});
