import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const md = readFileSync(join(root, 'docs/schema/BIBLIOTECA_VECTORES_SCHEMA.md'), 'utf8');
const ro = readFileSync(join(root, 'docs/schema/biblioteca-vectores-columns-readonly.sql'), 'utf8');

describe('docs/schema — esquema de biblioteca_vectores (PROPUESTA_NO_APLICADA)', () => {
  it('el documento está marcado PROPUESTA_NO_APLICADA y cubre las tres columnas', () => {
    expect(md).toContain('PROPUESTA_NO_APLICADA');
    for (const c of ['jurisdiccion', 'fuente_tipo', 'es_norma_vigente']) {
      expect(md).toContain(c);
    }
    expect(md).toMatch(/jurisdiccion\s+text,/);
    expect(md).toMatch(/fuente_tipo\s+text,/);
    expect(md).toMatch(/es_norma_vigente boolean;/);
    expect(md).not.toMatch(/NOT NULL DEFAULT[^`]*es_norma_vigente/);
  });
  it('la DDL propuesta no está en supabase/migrations ni como .sql ejecutable en docs/schema', () => {
    const migs = readdirSync(join(root, 'supabase/migrations'));
    expect(migs.filter((f) => /schema-biblioteca|jurisdiccion|fuente_tipo|es_norma_vigente/i.test(f))).toEqual([]);
    for (const f of migs) {
      const t = readFileSync(join(root, 'supabase/migrations', f), 'utf8');
      expect(/ADD COLUMN IF NOT EXISTS\s+(jurisdiccion|fuente_tipo|es_norma_vigente)\b/i.test(t)).toBe(false);
    }
    expect(readdirSync(join(root, 'docs/schema')).filter((f) => f.endsWith('.sql'))).toEqual(['biblioteca-vectores-columns-readonly.sql']);
  });
  it('la consulta de confirmación es de solo lectura (solo SELECT) y apunta a information_schema.columns', () => {
    expect(ro).toContain('information_schema.columns');
    expect(ro).toContain("table_name = 'biblioteca_vectores'");
    const sinComentarios = ro.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(sinComentarios).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|COMMENT)\b/i);
    expect(existsSync(join(root, 'docs/schema/biblioteca-vectores-columns-readonly.sql'))).toBe(true);
  });
  it('documenta que supabase/vectores.sql ya define índices, RLS y políticas (y es verdad en el archivo)', () => {
    const v = readFileSync(join(root, 'supabase/vectores.sql'), 'utf8');
    for (const objeto of ['idx_biblio_coleccion', 'idx_biblio_materia', 'service_only_biblioteca', 'enable row level security', 'grant select, insert, update, delete on biblioteca_vectores to service_role']) {
      expect(v.toLowerCase(), objeto).toContain(objeto.toLowerCase());
      expect(md.toLowerCase(), objeto).toContain(objeto.toLowerCase().replace('enable row level security', 'enable row level security'));
    }
    expect(md).toContain('Lo que `supabase/vectores.sql` ya define');
  });
});
