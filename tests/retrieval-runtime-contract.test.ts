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
// Contrato: NOT_REQUIRED si la ruta no exige evidencia; si la exige, el
// contrato pide CONFIGURATION_ERROR *solo si fue accidental* -- pero hoy no
// existe forma de distinguir "disabled intencional" de "disabled accidental"
// una vez que el valor ya es 'disabled'. PARCIAL.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT B] RAG_BACKEND=disabled explícito', () => {
  it('getBackend() respeta disabled explícito sin importar si hay credenciales', async () => {
    process.env.RAG_BACKEND = 'disabled';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    const { getBackend, buscarRAG } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('disabled');

    const resultado = await buscarRAG('¿Qué dice el artículo 173 del Código Penal?', 5, 'mayalex_normativos');
    // GAP (contrato §3.1): este shape es IDÉNTICO al de "cero evidencia
    // genuina" -- no hay ningún campo que distinga "esto fue una decisión de
    // configuración" de "el corpus no tenía nada".
    expect(resultado).toEqual({ fragmentos: [], articulos_encontrados: [], backend: 'disabled' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C — Supabase RPC responde con error
// Contrato: RETRIEVAL_ERROR, nunca colapsado silenciosamente con zero-results.
// GAP CONFIRMADO: el campo `error` sí existe en ResultadoRAG, pero
// app/api/chat/route.ts no lo lee para bifurcar el gate fail-closed -- ver
// MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md §3.3.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT C] Supabase RPC error (no zero-results genuino)', () => {
  it('buscarRAG captura el error de la RPC y lo expone en .error, pero con el mismo fragmentos:[] que un cero-resultados legítimo', async () => {
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
    // La señal SÍ existe hoy...
    expect(resultado.error).toContain('connection timeout');
    // ...pero tiene el mismo shape de "cero fragmentos" que el escenario F
    // (cero resultados genuinos, sin ningún error). Este test documenta que
    // la distinción depende enteramente de que un consumidor lea `.error`
    // -- y hoy, `route.ts` no lo hace (ver contrato §0 y §3.3).
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D — HF timeout (fallo de embedding)
// Contrato: RETRIEVAL_ERROR si el exact resolver no aplica. Mismo GAP que C:
// se captura, pero termina con el mismo shape que zero-results.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT D] Fallo de embedding (HF timeout/error)', () => {
  it('buscarRAG captura el fallo de embedQuery() y degrada con el mismo shape que C', async () => {
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
    // Mismo GAP que C: indistinguible de F para el gate de route.ts.
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
// Contrato de diseño: OFFICIAL_FALLBACK_REQUIRED (futuro). Comportamiento
// HOY: idéntico shape que "cero evidencia genuina" siempre tuvo -- no hay
// regresión, simplemente no existe todavía la oportunidad de fallback
// oficial que el diseño propone en §4 del contrato.
// ─────────────────────────────────────────────────────────────────────────────
describe('[CONTRACT F] Cero resultados semánticos genuinos', () => {
  it('RPC responde sin error y sin filas -> fragmentos:[] sin .error (distinto de C/D)', async () => {
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseRPC([]) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('¿Cuáles son los requisitos para adoptar en Honduras?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.error).toBeUndefined();
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
