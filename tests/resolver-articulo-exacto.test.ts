import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const M = readFileSync('supabase/migrations/20261107010000_resolver_articulo_exacto.sql', 'utf8');
const R = readFileSync('supabase/rollbacks/20261107010000_resolver_articulo_exacto_rollback.sql', 'utf8');
const sql = (s: string) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('resolver_articulo_exacto (solo lectura, solo staging)', () => {
  it('es solo lectura: STABLE, sin escrituras ni DDL de datos', () => {
    const m = sql(M);
    expect(m).toMatch(/STABLE/);
    expect(m).not.toMatch(/\b(insert|update|delete|truncate|alter\s+table|create\s+table|create\s+index)\b/i);
  });
  it('no declara vigencia ni PRIMARY: no filtra ni deriva es_norma_vigente / clasificación', () => {
    const m = sql(M);
    expect(m).not.toMatch(/WHERE[\s\S]*es_norma_vigente\s*=/i);
    expect(m).not.toMatch(/PRIMARY|clasificacion/i);
  });
  it('excluye revision_pendiente y exige instrumento y artículo exactos', () => {
    const m = sql(M);
    expect(m).toMatch(/revision_pendiente\s*=\s*false/);
    expect(m).toMatch(/b\.instrumento_id\s*=\s*p_instrumento_id/);
    expect(m).toMatch(/b\.num_articulo_norm\s*=\s*p_num_articulo_norm/);
  });
  it('limita permisos a service_role y no toca buscar_biblioteca_v2', () => {
    const m = sql(M);
    expect(m).toMatch(/REVOKE ALL[\s\S]*FROM PUBLIC, anon, authenticated/);
    expect(m).toMatch(/GRANT EXECUTE[\s\S]*TO service_role/);
    expect(m).not.toMatch(/buscar_biblioteca/i);
  });
  it('el rollback solo elimina la función', () => {
    expect(sql(R).trim()).toBe('DROP FUNCTION IF EXISTS public.resolver_articulo_exacto(text, text, integer);');
  });
});
