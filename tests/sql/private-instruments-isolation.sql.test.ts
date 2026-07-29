/**
 * Pruebas contra PostgreSQL REAL (PGlite, no mocks) del aislamiento de
 * private_instruments_staging y quarantine_legacy_staging, reproduciendo
 * EXACTAMENTE el estado verificado en vivo en el proyecto Supabase de
 * staging (mayalexhn-staging, ref aicakncgtuiiuomflkqj) durante la fase de
 * contención de privacidad del corpus:
 *
 *   - RLS habilitado desde la creación de la tabla.
 *   - anon/authenticated solo tienen REFERENCES/TRIGGER/TRUNCATE (sin SELECT).
 *   - 0 políticas RLS creadas (no hacen falta — el GRANT ya bloquea antes).
 *   - Verificado en vivo: `set role anon; select ...` → permission denied
 *     (42501), tanto para anon como para authenticated.
 *
 * Este test es la versión reproducible/CI de esa verificación en vivo — no
 * requiere red ni credenciales (ver tests/README.md).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

let db: PGlite;

async function asRole(role: 'anon' | 'authenticated' | 'service_role') {
  await db.exec(`set role ${role}`);
}

async function resetToSuperuser() {
  await db.exec(`reset role`);
}

beforeAll(async () => {
  db = new PGlite();

  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    -- En Supabase real, service_role tiene el atributo BYPASSRLS (por eso el
    -- backend sigue funcionando aunque una tabla tenga RLS sin políticas) —
    -- se reproduce aquí explícitamente en vez de asumirlo.
    alter role service_role bypassrls;

    create table private_instruments_staging (
      inst_id text primary key,
      materia_declarada text,
      tipo_instrumento text,
      clasificacion text check (clasificacion in
        ('reutilizable_como_modelo_tras_revision','privado_y_restringido','no_reutilizable','pendiente_decision_humana'))
    );
    alter table private_instruments_staging enable row level security;
    grant select, insert, update, delete on private_instruments_staging to service_role;
    grant references, trigger, truncate on private_instruments_staging to anon, authenticated;
    -- Deliberadamente CERO políticas — RLS habilitado sin políticas bloquea
    -- todo acceso de filas incluso para roles con SELECT, y aquí ni
    -- siquiera se otorgó SELECT a anon/authenticated.

    create table quarantine_legacy_staging (
      q_id text primary key,
      motivo_cuarentena text not null
    );
    alter table quarantine_legacy_staging enable row level security;
    grant select, insert, update, delete on quarantine_legacy_staging to service_role;
    grant references, trigger, truncate on quarantine_legacy_staging to anon, authenticated;

    insert into private_instruments_staging (inst_id, materia_declarada, tipo_instrumento, clasificacion)
    values ('DEMO-001', '03_NOTARIAL', 'poder_notarial', 'pendiente_decision_humana');
  `);
});

afterAll(async () => {
  await db.close();
});

describe('private_instruments_staging — aislamiento verificado', () => {
  it('anon no puede leer (permission denied a nivel de GRANT, antes de evaluar RLS)', async () => {
    await asRole('anon');
    await expect(db.exec('select * from private_instruments_staging')).rejects.toThrow(/permission denied/i);
    await resetToSuperuser();
  });

  it('authenticated no puede leer directamente', async () => {
    await asRole('authenticated');
    await expect(db.exec('select * from private_instruments_staging')).rejects.toThrow(/permission denied/i);
    await resetToSuperuser();
  });

  it('service_role sí puede leer (acceso administrativo, nunca expuesto al cliente)', async () => {
    await asRole('service_role');
    const res = await db.query('select count(*)::int as c from private_instruments_staging');
    expect((res.rows[0] as { c: number }).c).toBe(1);
    await resetToSuperuser();
  });

  it('anon no puede insertar ni modificar', async () => {
    await asRole('anon');
    await expect(
      db.exec(`insert into private_instruments_staging (inst_id, clasificacion) values ('X','no_reutilizable')`)
    ).rejects.toThrow(/permission denied/i);
    await resetToSuperuser();
  });
});

describe('quarantine_legacy_staging — mismo patrón de aislamiento', () => {
  it('anon no puede leer', async () => {
    await asRole('anon');
    await expect(db.exec('select * from quarantine_legacy_staging')).rejects.toThrow(/permission denied/i);
    await resetToSuperuser();
  });

  it('authenticated no puede leer', async () => {
    await asRole('authenticated');
    await expect(db.exec('select * from quarantine_legacy_staging')).rejects.toThrow(/permission denied/i);
    await resetToSuperuser();
  });
});
