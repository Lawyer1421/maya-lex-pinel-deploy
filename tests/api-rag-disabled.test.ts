import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * P25 (CLO 28-oct-2026): /api/rag deshabilitado SIEMPRE. 410 Gone en JSON; el cliente de Supabase con service_role no se crea ni se importa
 * antes de la respuesta; no se llama a HuggingFace; sin interruptor por variable de entorno.
 */
const MENSAJE = 'endpoint deshabilitado por seguridad';
const ruta = join(process.cwd(), 'app/api/rag/route.ts');

describe('/api/rag responde 410 Gone en todos los métodos', () => {
  const crearCliente = vi.fn();
  const embedQuery = vi.fn();
  const buscarRAG = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    crearCliente.mockReset(); embedQuery.mockReset(); buscarRAG.mockReset(); fetchMock.mockReset();
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: crearCliente, createSupabaseAdminClient: crearCliente }));
    vi.doMock('@/src/lib/supabase/admin', () => ({ createSupabaseAdminClient: crearCliente }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery }));
    vi.doMock('@/lib/rag/search', () => ({ buscarRAG, formatearContextoRAG: vi.fn() }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.doUnmock('@/lib/supabase'); vi.doUnmock('@/src/lib/supabase/admin'); vi.doUnmock('@/lib/rag/embed'); vi.doUnmock('@/lib/rag/search'); vi.unstubAllEnvs(); });

  const req = (metodo: string, url = 'http://localhost/api/rag?q=art%C3%ADculo+294+CPP&k=5', cuerpo?: unknown) =>
    new Request(url, { method: metodo, ...(cuerpo ? { body: JSON.stringify(cuerpo), headers: { 'Content-Type': 'application/json' } } : {}) });

  it('GET → 410 con JSON y el mensaje exacto', async () => {
    const { GET } = await import('@/app/api/rag/route');
    const res = await GET(req('GET'));
    expect(res.status).toBe(410);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ error: MENSAJE, code: 'API_RAG_DESHABILITADO' });
  });
  it('POST → 410 con JSON y el mensaje exacto, aunque el cuerpo sea válido o inválido', async () => {
    const { POST } = await import('@/app/api/rag/route');
    for (const cuerpo of [{ consulta: 'artículo 294 del CPP', k: 5, coleccion: 'mayalex_instrumentos' }, undefined]) {
      const res = await POST(req('POST', 'http://localhost/api/rag', cuerpo));
      expect(res.status).toBe(410);
      expect(await res.json()).toMatchObject({ error: MENSAJE });
    }
  });
  it('PUT, PATCH, DELETE, HEAD y OPTIONS también → 410', async () => {
    const m = await import('@/app/api/rag/route');
    for (const metodo of ['PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const) {
      const res = await m[metodo](req(metodo));
      expect(res.status, metodo).toBe(410);
    }
  });
  it('no se crea ni se importa service_role, no se busca, no se calcula embedding y no se hace fetch (HuggingFace incluido)', async () => {
    vi.stubEnv('HF_API_TOKEN', 'hf_token_falso');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-falsa');
    vi.stubEnv('RAG_BACKEND', 'supabase');
    const m = await import('@/app/api/rag/route');
    for (const metodo of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const) await m[metodo](req(metodo));
    expect(crearCliente).not.toHaveBeenCalled();
    expect(embedQuery).not.toHaveBeenCalled();
    expect(buscarRAG).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('sin interruptor por variable de entorno: ningún valor de entorno lo reactiva', async () => {
    for (const [k, v] of [['RAG_BACKEND', 'supabase'], ['API_RAG_ENABLED', '1'], ['ENABLE_API_RAG', 'true'], ['NODE_ENV', 'development']] as const) vi.stubEnv(k, v);
    const { GET } = await import('@/app/api/rag/route');
    expect((await GET(req('GET'))).status).toBe(410);
    expect(readFileSync(ruta, 'utf8')).not.toMatch(/process\.env/);
  });
});

describe('/api/rag: el archivo de la ruta no importa nada y la lógica original quedó sin enrutar', () => {
  const src = readFileSync(ruta, 'utf8');
  it('app/api/rag/route.ts no contiene ninguna sentencia import ni require', () => {
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/\brequire\(|\bimport\(/);
  });
  it('el código ejecutable de la ruta (sin comentarios) no menciona Supabase, HuggingFace ni la búsqueda', () => {
    const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(sinComentarios).not.toMatch(/supabase|huggingface|HF_API_TOKEN|buscarRAG|service_role/i);
  });
  it('la lógica original se conserva en lib/rag/api-rag-legacy.ts y ningún archivo la importa', () => {
    const legacy = readFileSync(join(process.cwd(), 'lib/rag/api-rag-legacy.ts'), 'utf8');
    expect(legacy).toContain('buscarRAG');
    expect(legacy).toContain('legacyGET');
    expect(legacy).toContain('legacyPOST');
    const importadores: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of readdirSync(dir)) {
        if (['node_modules', '.next', '.git', '.claude', '.p21-src'].includes(e)) continue;
        const p = join(dir, e);
        const st = statSync(p);
        if (st.isDirectory()) recorrer(p);
        else if (/\.(ts|tsx|js|mjs)$/.test(e) && !p.endsWith('api-rag-legacy.ts') && !p.endsWith('api-rag-disabled.test.ts') && /(?:from|import|require\()\s*\(?['"][^'"]*api-rag-legacy['"]/.test(readFileSync(p, 'utf8'))) importadores.push(p);
      }
    };
    for (const d of ['app', 'lib', 'src', 'components', 'tests', 'scripts', 'tools']) { try { recorrer(join(process.cwd(), d)); } catch { /* carpeta ausente */ } }
    expect(importadores).toEqual([]);
  });
});
