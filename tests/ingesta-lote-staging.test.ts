import { describe, expect, it } from 'vitest';
import { construirLote, sqlInsert } from '@/scripts/ingesta-lote-staging';

const TEXTO = [
  'Preámbulo', 'Artículo 1.- Primer artículo con texto suficiente para no ser corto en absoluto.',
  'Artículo 2.- Segundo artículo con texto suficiente para no ser corto en absoluto.',
  'Artículo 4.- Cuarto artículo con texto suficiente para no ser corto en absoluto.',
  'Artículo 4.- Cuarto artículo repetido con texto distinto y suficiente largo para no ser corto.',
].join('\n');
const base = { texto: TEXTO, instrumentoId: 'CODIGO_COMERCIO', ingestBatch: 'TRAMO_A_LOTE_01', fuente: 'Codigo de Comercio', fuenteTipo: 'codigo' as const, meta: {} };

describe('ingesta por lotes a staging', () => {
  const l = construirLote(base);
  it('todas las filas nacen ocultas, con vigencia NULL y trazabilidad', () => {
    expect(l.filas).toHaveLength(4);
    for (const f of l.filas) {
      expect(f.revision_pendiente).toBe(true);
      expect(f.es_norma_vigente).toBeNull();
      expect(f.ingest_batch).toBe('TRAMO_A_LOTE_01');
      expect(f.instrumento_id).toBe('CODIGO_COMERCIO');
      expect(f.hash_contenido).toMatch(/^[0-9a-f]{64}$/);
    }
  });
  it('un número repetido no aborta: ambas ocurrencias se insertan con id distinto y quedan en el log', () => {
    expect(l.filas.map((f) => f.id)).toContain('TRAMO_A_LOTE_01:CODIGO_COMERCIO:4~dup2');
    expect(l.excepciones.map((e) => e.codigo)).toEqual(expect.arrayContaining(['NUMERO_REPETIDO', 'NUMERO_AUSENTE']));
  });
  it('el SQL deja embedding NULL, revision_pendiente true y vigencia NULL, y escapa comillas', () => {
    const sql = sqlInsert(construirLote({ ...base, texto: "Artículo 1.- Texto con 'comillas' y más texto suficiente para pasar." }).filas).join('\n');
    expect(sql).toContain("''comillas''");
    expect(sql).toMatch(/NULL,'HN','codigo',NULL,true,/);
    expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
  });
});
