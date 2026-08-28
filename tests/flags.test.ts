import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFlagEnabledForUser } from '@/lib/flags';

/**
 * Fase 0 -- infraestructura de feature flags (Operación "Facultades Completas").
 * Cubre el contrato fail-closed: cualquier ausencia/error se trata como
 * desactivado, nunca como activado por defecto (R1/R2/R3).
 */

function fakeSupabase(row: { enabled: boolean; allowed_emails: string[] } | null, throwError = false) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(
      throwError ? { data: null, error: { message: 'db error' } } : { data: row, error: null }
    ),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

async function freshFlags(row: { enabled: boolean; allowed_emails: string[] } | null, throwError = false) {
  vi.resetModules();
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabase(row, throwError) }));
  return import('@/lib/flags');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isFlagEnabledForUser', () => {
  it('flag inexistente (fila ausente) -> false', async () => {
    const { isFlagEnabledForUser } = await freshFlags(null);
    expect(await isFlagEnabledForUser('flag_voz', 'x@y.com')).toBe(false);
  });

  it('error de lectura de Supabase -> false (fail-closed, nunca lanza)', async () => {
    const { isFlagEnabledForUser } = await freshFlags(null, true);
    expect(await isFlagEnabledForUser('flag_voz', 'x@y.com')).toBe(false);
  });

  it('enabled=false -> false sin importar la allowlist', async () => {
    const { isFlagEnabledForUser } = await freshFlags({ enabled: false, allowed_emails: ['x@y.com'] });
    expect(await isFlagEnabledForUser('flag_voz', 'x@y.com')).toBe(false);
  });

  it('enabled=true, allowlist vacía -> true para cualquier usuario', async () => {
    const { isFlagEnabledForUser } = await freshFlags({ enabled: true, allowed_emails: [] });
    expect(await isFlagEnabledForUser('flag_voz', 'quien-sea@ejemplo.com')).toBe(true);
  });

  it('enabled=true, allowlist con contenido -> true solo para correos listados', async () => {
    const { isFlagEnabledForUser } = await freshFlags({ enabled: true, allowed_emails: ['fredy@x.com'] });
    expect(await isFlagEnabledForUser('flag_voz', 'fredy@x.com')).toBe(true);
    expect(await isFlagEnabledForUser('flag_voz', 'otro@x.com')).toBe(false);
  });

  it('normaliza el correo del usuario (trim + lowercase) contra la allowlist', async () => {
    const { isFlagEnabledForUser } = await freshFlags({ enabled: true, allowed_emails: ['fredy@x.com'] });
    expect(await isFlagEnabledForUser('flag_voz', '  Fredy@X.com  ')).toBe(true);
  });

  it('sin sesión (userEmail null/undefined) + allowlist no vacía -> false', async () => {
    const { isFlagEnabledForUser } = await freshFlags({ enabled: true, allowed_emails: ['fredy@x.com'] });
    expect(await isFlagEnabledForUser('flag_voz', null)).toBe(false);
    expect(await isFlagEnabledForUser('flag_voz', undefined)).toBe(false);
  });
});
