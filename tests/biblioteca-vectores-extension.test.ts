import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const M = readFileSync('supabase/migrations/20261107000000_biblioteca_vectores_extension.sql', 'utf8');
const R = readFileSync('supabase/rollbacks/20261107000000_biblioteca_vectores_extension_rollback.sql', 'utf8');
const sql = (s: string) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('migración biblioteca_vectores (extensión aditiva, solo staging)', () => {
  it('no crea tablas paralelas ni funciones, ni modifica Luna', () => {
    const m = sql(M);
    expect(m).not.toMatch(/create\s+table/i);
    expect(m).not.toMatch(/legal_chunks|legal_sources|study_artifacts/i);
    expect(m).not.toMatch(/create\s+(or\s+replace\s+)?function/i);
    expect(m).not.toMatch(/buscar_biblioteca/i);
  });
  it('es aditiva: sin DROP, UPDATE, DELETE ni cambios de datos', () => {
    const m = sql(M);
    expect(m).not.toMatch(/\b(drop|update|delete|truncate|insert)\b/i);
    expect(m).not.toMatch(/es_norma_vigente\s*=|revision_pendiente\s*=/i);
  });
  it('no crea índice vectorial (HNSW cambió los resultados de buscar_biblioteca_v2 en staging)', () => {
    expect(sql(M)).not.toMatch(/hnsw|ivfflat|vector_cosine_ops/i);
  });
  it('columnas nuevas nullable sin default', () => {
    const adds = sql(M).match(/ADD COLUMN IF NOT EXISTS[^,;]+/gi) ?? [];
    expect(adds).toHaveLength(5);
    for (const a of adds) expect(a).not.toMatch(/not null|default/i);
  });
  it('declara alcance solo staging y trae rollback que solo revierte lo añadido', () => {
    expect(M).toContain('SOLO STAGING');
    expect(sql(R)).not.toMatch(/es_norma_vigente|revision_pendiente|delete|update/i);
    expect((sql(R).match(/DROP COLUMN IF EXISTS/gi) ?? []).length).toBe(5);
  });
});
