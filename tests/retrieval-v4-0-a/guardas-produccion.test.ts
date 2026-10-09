import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const ARCHIVOS_RUNTIME = [
  'lib/rag/search.ts',
  'lib/legal-retrieval/semantic-retriever.ts',
  'lib/legal-retrieval/exact-resolver.ts',
  'lib/legal-retrieval/evidence-engine.ts',
  'app/api/chat/route.ts',
];

const ORIGINAL_ENV = { ...process.env };

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

describe('guardas de producción — el laboratorio no entra al runtime', () => {
  it.each(ARCHIVOS_RUNTIME)('%s no importa nada de lib/legal-retrieval/lab', (ruta) => {
    const codigo = readFileSync(join(RAIZ, ruta), 'utf8');
    expect(codigo).not.toMatch(/legal-retrieval\/lab/);
    expect(codigo).not.toMatch(/from\s+['"]\.\/lab/);
  });

  it('buscarRAG por defecto sigue descartando doc_*, fuente nula y D6b en la ruta semántica', async () => {
    const filas = [
      { id: 'doc-1', contenido: 'Documento de capa doc_.', num_articulo: null, fuente: 'doc_1', fuente_tipo: 'instrumento', jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.99 },
      { id: 'nula-1', contenido: 'Sin fuente.', num_articulo: null, fuente: null, fuente_tipo: null, jurisdiccion: null, es_norma_vigente: false, similarity: 0.98 },
      { id: 'derog-1', contenido: 'Artículo 9.- Derogado.', num_articulo: '9', fuente: 'Codigo de Familia', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false, similarity: 0.97 },
      { id: 'legit-1', contenido: 'Artículo 10.- Texto vigente.', num_articulo: '10', fuente: 'Codigo de Familia', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.5 },
    ];
    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => ({ rpc: vi.fn(async () => ({ data: filas, error: null })) }),
    }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const res = await buscarRAG('¿Qué requisitos existen para adoptar en Honduras?', 5, 'mayalex_normativos');

    expect(res.fragmentos.map((f) => f.id)).toEqual(['legit-1']);
  });
});
