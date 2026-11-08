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
  it('un artículo marcado «Derogado» por la edición se registra como informativo, no como defecto, y sigue sin vigencia', () => {
    const lote = construirLote({ ...base, texto: 'Artículo 1.- Texto suficiente de un artículo vigente en la edición, largo y claro.\nArtículo 2.- Derogado\nArtículo 3.- Texto suficiente de otro artículo en la edición, largo y claro.' });
    expect(lote.excepciones.map((e) => e.codigo)).toContain('MARCADO_DEROGADO_POR_LA_EDICION');
    expect(lote.excepciones.map((e) => e.codigo)).not.toContain('TEXTO_CORTO');
    expect(lote.filas.every((f) => f.es_norma_vigente === null && f.revision_pendiente)).toBe(true);
  });
});

import { construirNotas } from '@/scripts/ingesta-lote-staging';
describe('notas al pie como registros aparte', () => {
  const notas = [
    { referido: '1', sha256: 'a'.repeat(64), texto: 'Reformado mediante Decreto 35-2013.' },
    { referido: '123-A', sha256: 'b'.repeat(64), texto: 'Adicionado mediante Decreto 9-2014.' },
    { referido: 'TITULO II', sha256: 'c'.repeat(64), texto: 'Nota que anota una división.' },
  ];
  const filas = construirNotas({ notas, instrumentoId: 'CODIGO_NINEZ_ADOLESCENCIA', ingestBatch: 'TRAMO_A_LOTE_03_NOTAS', fuente: 'Codigo de la Ninez', meta: {} });
  it('nunca son norma: tipo nota_al_pie, ocultas, vigencia NULL, sin embedding', () => {
    for (const f of filas) {
      expect(f.fuente_tipo).toBe('nota_al_pie');
      expect(f.revision_pendiente).toBe(true);
      expect(f.es_norma_vigente).toBeNull();
      expect(f.metadata.no_es_norma).toBe(true);
    }
  });
  it('el artículo referido se normaliza solo cuando es un número; una división queda sin artículo', () => {
    expect(filas[0].num_articulo_norm).toBe('1');
    expect(filas[1].num_articulo_norm).toBe('123-A');
    expect(filas[2].num_articulo_norm).toBeNull();
  });
  it('ids únicos por nota y lote separado', () => {
    expect(new Set(filas.map((f) => f.id)).size).toBe(3);
    expect(filas[0].ingest_batch).toBe('TRAMO_A_LOTE_03_NOTAS');
  });
});
