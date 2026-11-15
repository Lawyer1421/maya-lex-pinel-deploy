import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { clasificarFragmentoClo, anotarFragmentosClo } from '@/lib/legal-retrieval/clo-guards';
import { resolverArticuloExacto, type FilaExactaDB } from '@/lib/legal-retrieval/exact-resolver';
import {
  resolverJurisdiccionConsulta,
  MENSAJE_JURISDICCION_AMBIGUA,
  MENSAJE_JURISDICCION_NO_HABILITADA,
} from '@/lib/legal-retrieval/jurisdiccion-consulta';
import { decidirAbstencion } from '@/lib/legal-retrieval/retrieval-session';
import { ARCHIVOS_PRODUCCION_JURIDICA } from '@/lib/ai-gateway/canary/evidence-integrity';
import { KNOWN_FLAGS } from '@/lib/flags';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';

/**
 * Multi-jurisdicción v3 — Bloque 2 (docs/retrieval/MULTI_JURISDICTION_V3_TECHNICAL_DESIGN.md §2-§3).
 * Invariantes: sin país objetivo todo queda como antes (v2 + CLO con HN); con país, ningún fragmento de otro país es PRIMARY ni llega
 * desde la DB, y un país no habilitado o ambiguo se abstiene antes del retrieval (nunca cae a HN).
 */

const frag = (o: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'x', contenido: 'Texto del artículo.', num_articulo: '5', fuente: 'Codigo Civil', relevancia: 0.9,
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...o,
});

describe('resolverJurisdiccionConsulta', () => {
  it('sin mención de país → HN', () => {
    expect(resolverJurisdiccionConsulta('¿Qué dice el artículo 5 del Código Civil?')).toEqual({ estado: 'RESUELTA', pais: 'HN' });
  });
  it('Honduras explícito → HN', () => {
    expect(resolverJurisdiccionConsulta('Código Civil de Honduras, artículo 5')).toEqual({ estado: 'RESUELTA', pais: 'HN' });
  });
  it.each([
    ['Código Civil de Guatemala, artículo 5', 'GT'],
    ['¿Cómo se regula el divorcio en El Salvador?', 'SV'],
    ['Código de Trabajo de Costa Rica', 'CR'],
    ['ley de Nicaragua sobre arrendamiento', 'NI'],
    ['sociedades en Panamá', 'PA'],
    ['sociedades en Panama', 'PA'],
    ['¿Qué dice la ley de Panamá?', 'PA'],
    ['sociedades panameñas', 'PA'],
    ['derecho de Belice', 'BZ'],
  ])('%j → PAIS_NO_HABILITADO %s (nunca HN)', (texto, pais) => {
    expect(resolverJurisdiccionConsulta(texto)).toEqual({ estado: 'PAIS_NO_HABILITADO', pais });
  });
  it('varios países → AMBIGUA', () => {
    const r = resolverJurisdiccionConsulta('Compare el Código Civil de Honduras con el de Guatemala');
    expect(r.estado).toBe('AMBIGUA');
  });
});

describe('decidirAbstencion con jurisdicción', () => {
  const vacio = { fragmentos: [], outcome: { state: 'NO_VERIFIED_EVIDENCE', evidenceCount: 0, exactAttempted: false, semanticAttempted: false, degraded: false } as const };
  it('país no habilitado en ruta con corpus: abstención con su propio mensaje y código, aunque la pregunta no exija corpus', () => {
    const d = decidirAbstencion('hola', true, vacio, { estado: 'PAIS_NO_HABILITADO', pais: 'GT' });
    expect(d).toEqual({ evidenciaInsuficiente: true, esFalloDeSistema: false, mensajeAbstencion: MENSAJE_JURISDICCION_NO_HABILITADA, codigoAbstencion: 'JURISDICTION_NOT_ENABLED' });
  });
  it('varios países: abstención pidiendo aclaración', () => {
    const d = decidirAbstencion('hola', true, vacio, { estado: 'AMBIGUA', paises: ['HN', 'GT'] });
    expect(d.mensajeAbstencion).toBe(MENSAJE_JURISDICCION_AMBIGUA);
    expect(d.codigoAbstencion).toBe('JURISDICTION_AMBIGUOUS');
  });
  it('país resuelto o ausente: misma decisión que antes', () => {
    const pregunta = 'Explica el artículo 5 del Código Civil';
    const base = decidirAbstencion(pregunta, true, vacio);
    expect(decidirAbstencion(pregunta, true, vacio, { estado: 'RESUELTA', pais: 'HN' })).toEqual(base);
  });
  it('fuera de una ruta con corpus no fuerza nada', () => {
    expect(decidirAbstencion('hola', false, vacio, { estado: 'PAIS_NO_HABILITADO', pais: 'GT' })).toEqual(decidirAbstencion('hola', false, vacio));
  });
});

describe('CLO con país objetivo', () => {
  it('sin objetivo (o HN) el resultado es idéntico al previo', () => {
    for (const f of [frag(), frag({ jurisdiccion: 'SV' }), frag({ jurisdiccion: null }), frag({ fuente_tipo: 'sentencia', jurisdiccion: 'SV' })]) {
      expect(clasificarFragmentoClo(f, { jurisdiccionObjetivo: 'HN' })).toEqual(clasificarFragmentoClo(f));
    }
    expect(clasificarFragmentoClo(frag()).rol).toBe('PRIMARY');
    expect(clasificarFragmentoClo(frag({ jurisdiccion: 'SV' })).bloqueos).toContain('JURISDICCION_NO_HONDURENA');
  });
  it('objetivo SV: una norma hondureña es CONTEXT y una salvadoreña puede ser PRIMARY', () => {
    const hn = clasificarFragmentoClo(frag(), { jurisdiccionObjetivo: 'SV' });
    expect(hn.rol).toBe('CONTEXT');
    expect(hn.bloqueos).toContain('JURISDICCION_DISTINTA_DEL_OBJETIVO');
    expect(clasificarFragmentoClo(frag({ jurisdiccion: 'SV' }), { jurisdiccionObjetivo: 'SV' }).rol).toBe('PRIMARY');
  });
  it.each(['HN', 'GT', 'CR', 'NI', 'PA'] as const)('objetivo SV: una fila %s nunca es PRIMARY', (pais) => {
    expect(clasificarFragmentoClo(frag({ jurisdiccion: pais }), { jurisdiccionObjetivo: 'SV' }).rol).toBe('CONTEXT');
  });
  it('sin país en la fila nunca es PRIMARY, con cualquier objetivo', () => {
    for (const j of ['HN', 'SV'] as const) {
      expect(clasificarFragmentoClo(frag({ jurisdiccion: null }), { jurisdiccionObjetivo: j }).bloqueos).toContain('JURISDICCION_NO_ACREDITADA');
    }
  });
  it('el objetivo sellado por la ruta viaja con el fragmento a los consumidores posteriores (R3/R4, Luna)', () => {
    const [sellado] = anotarFragmentosClo([frag()], { jurisdiccionObjetivo: 'SV' });
    expect(sellado.jurisdiccion_objetivo).toBe('SV');
    expect(sellado.rol_evidencia).toBe('CONTEXT');
    expect(clasificarFragmentoClo(sellado).rol).toBe('CONTEXT');
  });
  it('sin objetivo, anotarFragmentosClo no agrega el campo (fragmentos idénticos a los de antes)', () => {
    const [f] = anotarFragmentosClo([frag()]);
    expect('jurisdiccion_objetivo' in f).toBe(false);
    expect(f.rol_evidencia).toBe('PRIMARY');
  });
  it('un objetivo sellado inválido no acredita ningún país', () => {
    expect(clasificarFragmentoClo(frag({ jurisdiccion_objetivo: 'XX' })).rol).toBe('CONTEXT');
    expect(clasificarFragmentoClo(frag({ jurisdiccion_objetivo: '' })).rol).toBe('CONTEXT');
  });
  it('identidad país-calificada: coincide → sin bloqueo; contradice fila u objetivo → CONTEXT; ids legados no cuentan', () => {
    expect(clasificarFragmentoClo(frag({ norm_id: 'HN:CODIGO_CIVIL' })).rol).toBe('PRIMARY');
    expect(clasificarFragmentoClo(frag({ norm_id: 'SV:CODIGO_CIVIL' })).bloqueos).toContain('IDENTIDAD_PAIS_INCONSISTENTE');
    expect(clasificarFragmentoClo(frag({ jurisdiccion: 'SV', norm_id: 'SV:CODIGO_CIVIL' }), { jurisdiccionObjetivo: 'SV' }).rol).toBe('PRIMARY');
    expect(clasificarFragmentoClo(frag({ jurisdiccion: 'SV', norm_id: 'HN:CODIGO_CIVIL' }), { jurisdiccionObjetivo: 'SV' }).bloqueos).toContain('IDENTIDAD_PAIS_INCONSISTENTE');
    expect(clasificarFragmentoClo(frag({ norm_id: 'BZ:CODIGO_CIVIL' })).bloqueos).toContain('IDENTIDAD_PAIS_INCONSISTENTE');
    expect(clasificarFragmentoClo(frag({ metadata_clo: { norm_id: 'GT:CODIGO_CIVIL' } })).bloqueos).toContain('IDENTIDAD_PAIS_INCONSISTENTE');
    expect(clasificarFragmentoClo(frag({ norm_id: 'HN_CODIGO_CIVIL_1906' })).bloqueos).not.toContain('IDENTIDAD_PAIS_INCONSISTENTE');
    expect(clasificarFragmentoClo(frag({ norm_id: 'mayalex_normativos:codigo_civil_x' })).bloqueos).not.toContain('IDENTIDAD_PAIS_INCONSISTENTE');
  });
  it('la identidad país-calificada nunca confiere identidad', () => {
    expect(clasificarFragmentoClo(frag({ fuente: 'Fuente sin instrumento', norm_id: 'HN:CODIGO_CIVIL' })).bloqueos).toContain('SIN_INSTRUMENT_ID');
  });
});

describe('resolverArticuloExacto con país', () => {
  const fila = (o: Partial<FilaExactaDB>): FilaExactaDB => ({
    id: 'hn', contenido: 'ARTICULO 5.- Texto.', num_articulo: '5', fuente: 'Codigo Civil', fuente_tipo: 'codigo', jurisdiccion: 'HN',
    es_norma_vigente: true, materia: '02_CIVIL', metadata: null, ...o,
  });
  const filas = [fila({ id: 'sv', jurisdiccion: 'SV' }), fila({ id: 'nulo', jurisdiccion: null }), fila({ id: 'hn' })];
  it('sin país: comportamiento previo (primera fila válida)', () => {
    expect(resolverArticuloExacto(filas, '5', 'CODIGO_CIVIL').fragmentos.map((f) => f.id)).toEqual(['sv']);
  });
  it('con país: solo filas de ese país, y el CLO compara contra él', () => {
    const hn = resolverArticuloExacto(filas, '5', 'CODIGO_CIVIL', 'HN').fragmentos;
    expect(hn.map((f) => [f.id, f.rol_evidencia])).toEqual([['hn', 'PRIMARY']]);
    const sv = resolverArticuloExacto(filas, '5', 'CODIGO_CIVIL', 'SV').fragmentos;
    expect(sv.map((f) => [f.id, f.rol_evidencia, f.jurisdiccion_objetivo])).toEqual([['sv', 'PRIMARY', 'SV']]);
    expect(resolverArticuloExacto(filas, '5', 'CODIGO_CIVIL', 'GT').fragmentos).toEqual([]);
  });
});

describe('buscarRAG semántico: v3 solo con país', () => {
  const ORIGINAL_ENV = { ...process.env };
  const filaRpc = (id: string, jurisdiccion: string | null) => ({
    id, contenido: `Contenido ${id}.`, num_articulo: '5', fuente: 'Codigo Civil', fuente_tipo: 'codigo', jurisdiccion, es_norma_vigente: true, similarity: 0.9,
  });
  let rpc: Mock<(nombre: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>>;
  beforeEach(() => {
    vi.resetModules();
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    rpc = vi.fn(async () => ({ data: [filaRpc('hn-1', 'HN'), filaRpc('sv-1', 'SV'), filaRpc('nulo-1', null)], error: null }));
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock('@/lib/supabase');
    vi.doUnmock('@/lib/rag/embed');
  });
  const CONSULTA = 'obligaciones del arrendador en el contrato de arrendamiento';

  it('sin país: dos llamadas a v2 con los mismos argumentos de siempre (sin jurisdiccion_filtro)', async () => {
    const { buscarRAG } = await import('@/lib/rag/search');
    await buscarRAG(CONSULTA, 5, 'mayalex_normativos');
    expect(rpc).toHaveBeenCalledTimes(2);
    for (const [nombre, args] of rpc.mock.calls) {
      expect(nombre).toBe('buscar_biblioteca_v2');
      expect(args).not.toHaveProperty('jurisdiccion_filtro');
    }
  });

  it.each(['HN', 'SV'] as const)('con país %s: ambas llamadas van a v3 con el mismo filtro y solo quedan filas de ese país', async (pais) => {
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG(CONSULTA, 5, 'mayalex_normativos', undefined, { jurisdiccion: pais });
    expect(rpc).toHaveBeenCalledTimes(2);
    for (const [nombre, args] of rpc.mock.calls) {
      expect(nombre).toBe('buscar_biblioteca_v3');
      expect(args).toMatchObject({ jurisdiccion_filtro: pais });
    }
    expect(r.fragmentos.length).toBeGreaterThan(0);
    expect(r.fragmentos.every((f) => f.jurisdiccion === pais && f.jurisdiccion_objetivo === pais)).toBe(true);
  });

  it('si v3 falla no se recurre a v2: RETRIEVAL_ERROR', async () => {
    rpc.mockImplementation(async () => ({ data: null, error: { message: 'function buscar_biblioteca_v3 does not exist' } }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG(CONSULTA, 5, 'mayalex_normativos', undefined, { jurisdiccion: 'HN' });
    expect(rpc.mock.calls.every(([nombre]) => nombre === 'buscar_biblioteca_v3')).toBe(true);
    expect(r.outcome?.state).toBe('RETRIEVAL_ERROR');
  });
});

describe('POST /api/chat con flag_multi_jurisdiccion_v3', () => {
  const ORIGINAL_ENV = { ...process.env };
  let recuperar: Mock<(p: { jurisdiccion?: string }) => Promise<unknown>>;
  let llm: Mock<(...a: unknown[]) => unknown>;

  function mocks(flags: string[]) {
    vi.doMock('next/server', async () => {
      const actual = await vi.importActual<typeof import('next/server')>('next/server');
      return { ...actual, after: (fn: () => unknown) => { fn(); } };
    });
    const ok = { allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString() };
    vi.doMock('@/lib/rate-limit', () => ({
      checkRateLimit: vi.fn().mockResolvedValue(ok), reserveRateLimit: vi.fn().mockResolvedValue(ok),
      incrementRateLimit: vi.fn(), releaseRateLimit: vi.fn(), checkAndIncrementRateLimit: vi.fn().mockResolvedValue(ok),
      RateLimitStoreError: class extends Error {}, esFalloProveedorQueDevuelveCuota: () => false, esFalloOpenRouterQueDevuelveCuota: () => false,
      getUserIdentifierVerificado: vi.fn().mockResolvedValue('ip:test'), getVerifiedEmail: vi.fn().mockResolvedValue(null),
      getUserIdentifier: vi.fn().mockReturnValue('ip:test'), buildUserIdentifierFromEmail: (e: string) => `email:${e}`,
    }));
    vi.doMock('@/lib/flags', () => ({ isFlagEnabledForUser: vi.fn(async (n: string) => flags.includes(n)) }));
    vi.doMock('@/lib/analytics/logger', () => ({ logConsulta: vi.fn(), hashUsuario: vi.fn().mockReturnValue('h') }));
    vi.doMock('@/lib/websearch/tavily', () => ({ buscarWeb: vi.fn(), formatearContextoWeb: vi.fn().mockReturnValue(''), AVISO_BUSQUEDA_FALLIDA: '' }));
    vi.doMock('@/lib/self-learning/buscar-plantilla', () => ({ buscarPlantilla: vi.fn().mockResolvedValue([]), formatearContextoPlantilla: vi.fn().mockReturnValue('') }));
    llm = vi.fn();
    vi.doMock('@anthropic-ai/sdk', () => {
      class MockAnthropic { messages = { create: (...a: unknown[]) => llm(...a) }; static APIError = class extends Error {}; }
      return { default: MockAnthropic };
    });
    recuperar = vi.fn().mockResolvedValue({ texto: '', fragmentos: [], outcome: { state: 'OFFICIAL_FALLBACK_REQUIRED', evidenceCount: 0, exactAttempted: false, semanticAttempted: true, degraded: false } });
    vi.doMock('@/lib/legal-retrieval/retrieval-session', async () => {
      const actual = await vi.importActual<typeof import('@/lib/legal-retrieval/retrieval-session')>('@/lib/legal-retrieval/retrieval-session');
      return { ...actual, recuperarEvidenciaCorpus: recuperar };
    });
  }
  async function preguntar(pregunta: string) {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST({ json: async () => ({ messages: [{ role: 'user', content: pregunta }], mode: 'analisis_penal' }) } as never);
    const raw = await new Response(res.body).text();
    const eventos = raw.split('\n\n').filter((c) => c.startsWith('data: ')).map((c) => JSON.parse(c.slice(6)));
    return { done: eventos.find((e) => e.type === 'done'), texto: eventos.filter((e) => e.type === 'text').map((e) => e.text).join('') };
  }
  beforeEach(() => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = 'fake-key';
    process.env.LLM_PROVIDER = 'anthropic';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const m of ['next/server', '@/lib/rate-limit', '@/lib/flags', '@/lib/analytics/logger', '@/lib/websearch/tavily', '@/lib/self-learning/buscar-plantilla', '@anthropic-ai/sdk', '@/lib/legal-retrieval/retrieval-session']) vi.doUnmock(m);
  });

  it('flag apagado: la recuperación no recibe país (camino v2 intacto), aunque la consulta nombre otro país', async () => {
    mocks([]);
    await preguntar('Explica las medidas cautelares del proceso penal de Guatemala');
    expect(recuperar).toHaveBeenCalledTimes(1);
    expect(recuperar.mock.calls[0][0].jurisdiccion).toBeUndefined();
  });

  it('flag encendido y sin país: HN por defecto', async () => {
    mocks(['flag_multi_jurisdiccion_v3']);
    await preguntar('Explica las medidas cautelares personales del proceso penal');
    expect(recuperar.mock.calls[0][0].jurisdiccion).toBe('HN');
  });

  it('flag encendido y país no habilitado: abstención sin retrieval ni LLM', async () => {
    mocks(['flag_multi_jurisdiccion_v3']);
    const { done, texto } = await preguntar('Explica las medidas cautelares del proceso penal de Guatemala');
    expect(recuperar).not.toHaveBeenCalled();
    expect(llm).not.toHaveBeenCalled();
    expect(done.codigo).toBe('JURISDICTION_NOT_ENABLED');
    expect(done.citas).toEqual([]);
    expect(texto).toBe(MENSAJE_JURISDICCION_NO_HABILITADA);
  });

  it('flag encendido y varios países: abstención pidiendo aclaración', async () => {
    mocks(['flag_multi_jurisdiccion_v3']);
    const { done } = await preguntar('Compara la prisión preventiva en Honduras y en El Salvador en el proceso penal');
    expect(recuperar).not.toHaveBeenCalled();
    expect(done.codigo).toBe('JURISDICTION_AMBIGUOUS');
  });
});

describe('G6: la lógica de país e identidad está protegida por hash', () => {
  it.each([
    'lib/legal-retrieval/instrument-ref.ts',
    'lib/legal-retrieval/instrument-identity.ts',
    'lib/legal-os/jurisdiction/registry.ts',
    'lib/legal-retrieval/clo-guards.ts',
    'lib/legal-retrieval/jurisdiccion-consulta.ts',
    'lib/legal-retrieval/retrieval-session.ts',
  ])('%s está en ARCHIVOS_PRODUCCION_JURIDICA', (ruta) => {
    expect(ARCHIVOS_PRODUCCION_JURIDICA).toContain(ruta);
  });
  it('el flag existe y es conocido (fila ausente = apagado)', () => {
    expect(KNOWN_FLAGS).toContain('flag_multi_jurisdiccion_v3');
  });
});
