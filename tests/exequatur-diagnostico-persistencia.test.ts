import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BANCO_DIAGNOSTICO_EXEQUATUR } from '@/lib/exequatur/diagnostico/banco';
import { evaluarDiagnostico } from '@/lib/exequatur/diagnostico/evaluar';

vi.mock('@/lib/supabase-ssr', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/exequatur/access', () => ({
  resolveExequaturAccess: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { resolveExequaturAccess } from '@/lib/exequatur/access';
import {
  cargarIntentoPropio,
  cargarUltimoIntentoPropio,
  esUuid,
  guardarIntento,
  parsearIntentoQuery,
  respuestasSeguras,
  resolverSesionExequatur,
  serializarRespuestas,
  type SesionExequatur,
} from '@/lib/exequatur/diagnostico/persistencia';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockResolveAccess = vi.mocked(resolveExequaturAccess);

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const INTENTO_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INTENTO_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const SESION_A: SesionExequatur = { userId: USER_A, email: 'a@test.com' };

function accessGranted() {
  return {
    granted: true,
    authorization: 'ALLOW' as const,
    tier: 'pro' as const,
    flagEnabled: true,
    eligibleTier: true,
  };
}

function accessDenied() {
  return {
    granted: false,
    authorization: 'DENY' as const,
    tier: 'free' as const,
    flagEnabled: false,
    eligibleTier: false,
  };
}

interface FilaFake {
  id: string;
  user_id: string;
  respuestas: unknown;
  created_at: string;
  aciertos?: number;
  total?: number;
}

function fakeClient(opts: {
  user?: { id: string; email?: string } | null;
  intentos?: FilaFake[];
  insertError?: string | null;
  selectError?: string | null;
  onInsert?: (row: Record<string, unknown>) => void;
}) {
  const intentos = opts.intentos ?? [];
  const from = vi.fn((table: string) => {
    const filters: Record<string, string> = {};
    let pendingInsert: Record<string, unknown> | null = null;
    const chain: Record<string, unknown> = {};

    chain.insert = vi.fn((row: Record<string, unknown>) => {
      pendingInsert = row;
      opts.onInsert?.(row);
      return chain;
    });
    chain.upsert = vi.fn().mockResolvedValue({ error: null });
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn((col: string, val: string) => {
      filters[col] = val;
      return chain;
    });
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () => {
      if (table === 'exequatur_diagnostico_intentos' && pendingInsert) {
        if (opts.insertError) {
          return { data: null, error: { message: opts.insertError } };
        }
        return {
          data: { id: INTENTO_A, created_at: '2026-09-19T12:00:00.000Z' },
          error: null,
        };
      }
      if (opts.selectError) {
        return { data: null, error: { message: opts.selectError } };
      }
      const match = intentos.find((fila) => {
        if (filters.id && fila.id !== filters.id) return false;
        if (filters.user_id && fila.user_id !== filters.user_id) return false;
        return true;
      });
      return { data: match ?? null, error: null };
    });
    return chain;
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user === undefined ? { id: USER_A, email: 'a@test.com' } : opts.user },
      }),
    },
    from,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('helpers de identidad y carga estructurada', () => {
  it('acepta UUID v4 y rechaza basura / inyección', () => {
    expect(esUuid(INTENTO_A)).toBe(true);
    expect(esUuid('no-es-uuid')).toBe(false);
    expect(esUuid('')).toBe(false);
    expect(esUuid(`${INTENTO_A}' OR 1=1`)).toBe(false);
  });

  it('parsearIntentoQuery no lee objetivos ni score', () => {
    expect(parsearIntentoQuery(INTENTO_A)).toBe(INTENTO_A);
    expect(parsearIntentoQuery(` ${INTENTO_A} `)).toBe(INTENTO_A);
    expect(parsearIntentoQuery('obj-definicion-notariado')).toBeNull();
    expect(parsearIntentoQuery(undefined)).toBeNull();
  });

  it('serializa [{ item_id, selected_option }] y re-lee solo ítems del banco', () => {
    const carga = serializarRespuestas({
      'item-notariado-institucion': 'a',
      'item-inventado': 'z',
    });
    expect(carga).toEqual([
      { item_id: 'item-notariado-institucion', selected_option: 'a' },
    ]);
    expect(respuestasSeguras(carga)).toEqual({ 'item-notariado-institucion': 'a' });
    expect(respuestasSeguras([{ item_id: 'item-inventado', selected_option: 'a' }])).toEqual({});
  });
});

describe('17 escenarios de seguridad — capa de aplicación (S01–S08)', () => {
  it('S01 sin usuario → null', async () => {
    mockCreateClient.mockResolvedValue(fakeClient({ user: null }) as never);
    await expect(resolverSesionExequatur()).resolves.toBeNull();
    expect(mockResolveAccess).not.toHaveBeenCalled();
  });

  it('S02 usuario sin acceso Exequátur → null', async () => {
    mockCreateClient.mockResolvedValue(
      fakeClient({ user: { id: USER_A, email: 'a@test.com' } }) as never,
    );
    mockResolveAccess.mockResolvedValue(accessDenied());
    await expect(resolverSesionExequatur()).resolves.toBeNull();
  });

  it('S03 userId sale de auth.getUser().id, no del email', async () => {
    mockCreateClient.mockResolvedValue(
      fakeClient({ user: { id: USER_A, email: 'a@test.com' } }) as never,
    );
    mockResolveAccess.mockResolvedValue(accessGranted());
    const sesion = await resolverSesionExequatur();
    expect(sesion).toEqual({ userId: USER_A, email: 'a@test.com' });
    expect(sesion?.userId).not.toContain('email:');
    expect(mockResolveAccess).toHaveBeenCalledWith('email:a@test.com', 'a@test.com');
  });

  it('S04 inserta user_id de sesión y carga estructurada (ignora score de cliente)', async () => {
    const inserted: Record<string, unknown>[] = [];
    mockCreateClient.mockResolvedValue(
      fakeClient({ onInsert: (row) => inserted.push(row) }) as never,
    );

    const respuestas = { 'item-notariado-institucion': 'a' };
    const esperado = evaluarDiagnostico(respuestas);
    const guardado = await guardarIntento(SESION_A, respuestas);

    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.user_id).toBe(USER_A);
    expect(inserted[0]?.user_id).not.toBe('email:a@test.com');
    expect(inserted[0]?.respuestas).toEqual([
      { item_id: 'item-notariado-institucion', selected_option: 'a' },
    ]);
    expect(inserted[0]?.aciertos).toBe(esperado.aciertos.length);
    expect(guardado?.id).toBe(INTENTO_A);
    expect(guardado?.resultado).toEqual(esperado);
  });

  it('S05 error de insert → fail-closed y el log no imprime respuestas', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateClient.mockResolvedValue(
      fakeClient({ insertError: 'relation does not exist' }) as never,
    );
    await expect(
      guardarIntento(SESION_A, { 'item-notariado-institucion': 'a' }),
    ).resolves.toBeNull();
    const dumped = spy.mock.calls.flat().map(String).join(' ');
    expect(dumped).toMatch(/fail-closed/);
    expect(dumped).not.toContain('item-notariado-institucion');
    expect(dumped).not.toContain('selected_option');
    spy.mockRestore();
  });

  it('S06 UUID inválido no consulta la tabla', async () => {
    const client = fakeClient({ intentos: [] });
    mockCreateClient.mockResolvedValue(client as never);
    await expect(cargarIntentoPropio(SESION_A, 'no-uuid')).resolves.toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('S07 intento ajeno filtrado por user_id → null (IDOR)', async () => {
    mockCreateClient.mockResolvedValue(
      fakeClient({
        intentos: [
          {
            id: INTENTO_B,
            user_id: USER_B,
            respuestas: [],
            created_at: '2026-09-19T12:00:00.000Z',
          },
        ],
      }) as never,
    );
    await expect(cargarIntentoPropio(SESION_A, INTENTO_B)).resolves.toBeNull();
  });

  it('S08 último intento solo considera filas de la sesión', async () => {
    mockCreateClient.mockResolvedValue(
      fakeClient({
        intentos: [
          {
            id: INTENTO_A,
            user_id: USER_A,
            respuestas: [],
            created_at: '2026-09-19T12:00:00.000Z',
          },
          {
            id: INTENTO_B,
            user_id: USER_B,
            respuestas: [],
            created_at: '2026-09-19T13:00:00.000Z',
          },
        ],
      }) as never,
    );
    const ultimo = await cargarUltimoIntentoPropio(SESION_A);
    expect(ultimo?.id).toBe(INTENTO_A);
    expect(ultimo?.resultado.total).toBe(BANCO_DIAGNOSTICO_EXEQUATUR.items.length);
  });
});

describe('re-evaluación (no es autoridad el score persistido)', () => {
  it('re-evalúa respuestas y no usa aciertos persistidos', async () => {
    const respuestas = [
      { item_id: 'item-notariado-institucion', selected_option: 'c' },
    ];
    mockCreateClient.mockResolvedValue(
      fakeClient({
        intentos: [
          {
            id: INTENTO_A,
            user_id: USER_A,
            respuestas,
            created_at: '2026-09-19T12:00:00.000Z',
            aciertos: 99,
            total: 1,
          },
        ],
      }) as never,
    );
    const cargado = await cargarIntentoPropio(SESION_A, INTENTO_A);
    const esperado = evaluarDiagnostico({ 'item-notariado-institucion': 'c' });
    expect(cargado?.resultado.aciertos).toEqual(esperado.aciertos);
    expect(cargado?.resultado.aciertos).not.toHaveLength(99);
    expect(cargado?.resultado.fallos).toContain('item-notariado-institucion');
  });

  it('ítems extra en la carga se ignoran', async () => {
    mockCreateClient.mockResolvedValue(
      fakeClient({
        intentos: [
          {
            id: INTENTO_A,
            user_id: USER_A,
            respuestas: [
              { item_id: 'item-inventado', selected_option: 'a' },
              { item_id: 'item-notariado-institucion', selected_option: 'a' },
            ],
            created_at: '2026-09-19T12:00:00.000Z',
          },
        ],
      }) as never,
    );
    const cargado = await cargarIntentoPropio(SESION_A, INTENTO_A);
    expect(cargado?.resultado.aciertos).toEqual(['item-notariado-institucion']);
    expect(cargado?.resultado.aciertos).toHaveLength(1);
  });

  it('error de lectura → fail-closed null', async () => {
    mockCreateClient.mockResolvedValue(fakeClient({ selectError: 'schema missing' }) as never);
    await expect(cargarIntentoPropio(SESION_A, INTENTO_A)).resolves.toBeNull();
  });
});
