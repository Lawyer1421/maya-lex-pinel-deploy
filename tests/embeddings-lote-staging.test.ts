import { describe, expect, it } from 'vitest';
import { sqlEmbeddings, sqlVerificacion } from '@/scripts/embeddings-lote-staging';

const vector = (semilla: number) => Array.from({ length: 384 }, (_, i) => Math.sin(semilla + i) / 10);
const filas = [
  { id: "PILOTO:DECRETO_284_2013:1", ingest_batch: 'PILOTO_D284_2013_01', embedding: vector(1) },
  { id: "PILOTO:DECRETO_284_2013:2'x", ingest_batch: 'PILOTO_D284_2013_01', embedding: vector(2) },
];

describe('embeddings del lote: UPDATE idempotente solo en staging', () => {
  const sql = sqlEmbeddings(filas);
  it('una sentencia por fila, en una transacción, solo sobre filas del lote aún sin embedding', () => {
    expect(sql.match(/^UPDATE /gm)).toHaveLength(2);
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toMatch(/^COMMIT;$/m);
    for (const l of sql.split('\n').filter((x) => x.startsWith('UPDATE'))) {
      expect(l).toMatch(/::vector\(384\) WHERE id = '.+' AND ingest_batch = 'PILOTO_D284_2013_01' AND embedding IS NULL;$/);
    }
    expect(sql).toContain('SOLO STAGING (aicakncgtuiiuomflkqj)');
  });
  it('no toca vigencia ni visibilidad, y escapa comillas en el id', () => {
    expect(sql).not.toMatch(/es_norma_vigente|revision_pendiente\s*=|DELETE|INSERT/);
    expect(sql).toContain("'PILOTO:DECRETO_284_2013:2''x'");
  });
  it('rechaza vectores de dimensión incorrecta o constantes, ids repetidos y varios lotes', () => {
    expect(() => sqlEmbeddings([{ ...filas[0], embedding: vector(1).slice(0, 383) }])).toThrow(/dimensión/);
    expect(() => sqlEmbeddings([{ ...filas[0], embedding: new Array(384).fill(0.05) }])).toThrow();
    expect(() => sqlEmbeddings([filas[0], filas[0]])).toThrow(/repetidos/);
    expect(() => sqlEmbeddings([filas[0], { ...filas[1], ingest_batch: 'OTRO' }])).toThrow(/un solo ingest_batch/);
  });
});

describe('verificación en staging: solo lectura, con los valores esperados', () => {
  const v = sqlVerificacion('PILOTO_D284_2013_01', 39);
  it('solo SELECT y cuenta filas, embeddings, ocultas, vigencia NULL, país e identidad', () => {
    expect(v).not.toMatch(/\b(UPDATE|INSERT|DELETE|ALTER|DROP)\b/);
    for (const k of ['con_embedding', 'ocultas', 'vigencia_null', 'jurisdiccion_hn', 'norm_id_hn', 'articulos_distintos']) expect(v).toContain(k);
    expect(v).toContain("WHERE ingest_batch = 'PILOTO_D284_2013_01'");
    expect(v).toContain('filas=39');
    expect(v).toMatch(/revision_pendiente = false;/);
  });
});
