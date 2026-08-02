import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * P0-2B — reproduce el defecto real: RAG_BACKEND ausente en Preview hacía
 * que getBackend() defaulteara a 'disabled' aunque las credenciales de
 * Supabase estuvieran presentes. buscarRAG() retornaba fragmentos:[] antes
 * de intentar cualquier búsqueda — exacta o semántica — sin ningún error
 * visible. El fix: RAG_BACKEND ausente (no 'disabled' explícito) infiere
 * 'supabase' si hay credenciales.
 */
describe('getBackend — P0-2B RAG_BACKEND ausente', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.RAG_BACKEND;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('defecto real reproducido: sin RAG_BACKEND pero CON credenciales de Supabase → usa supabase, no disabled', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://aicakncgtuiiuomflkqj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key-para-test';
    const { getBackend } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('supabase');
  });

  it('sin RAG_BACKEND y sin credenciales de Supabase → disabled (nada que usar)', async () => {
    const { getBackend } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('disabled');
  });

  it('RAG_BACKEND=disabled explícito se respeta aunque haya credenciales', async () => {
    process.env.RAG_BACKEND = 'disabled';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://aicakncgtuiiuomflkqj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key-para-test';
    const { getBackend } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('disabled');
  });

  it('RAG_BACKEND=supabase explícito se respeta', async () => {
    process.env.RAG_BACKEND = 'supabase';
    const { getBackend } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('supabase');
  });

  it('RAG_BACKEND=python explícito se respeta', async () => {
    process.env.RAG_BACKEND = 'python';
    const { getBackend } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('python');
  });

  it('valor inválido de RAG_BACKEND se ignora igual que ausente', async () => {
    process.env.RAG_BACKEND = 'algo-invalido';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://aicakncgtuiiuomflkqj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key-para-test';
    const { getBackend } = await import('@/lib/rag/search');
    expect(getBackend()).toBe('supabase');
  });
});
