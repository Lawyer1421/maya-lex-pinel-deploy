import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = join(process.cwd(), 'docs/corpus/staging/p21');
const DIRS = ['codigo-comercio', 'codigo-notariado-d59-2015', 'decreto-284-2013-titulo-ii'];
const leer = (d: string, f: string) => readFileSync(join(BASE, d, f), 'utf8');
const manifest = (d: string) => JSON.parse(leer(d, 'MANIFEST.json'));

describe('P21 load.staging.sql (A, B, C)', () => {
  for (const d of DIRS) {
    const sql = leer(d, 'load.staging.sql');
    it(`${d}: cabecera, sin DDL/DML destructivo ni proyectos de producción`, () => {
      expect(sql.startsWith('-- TARGET: staging aicakncgtuiiuomflkqj ONLY. NOT APPLIED. NO PRODUCTION.')).toBe(true);
      expect(sql).not.toMatch(/\b(DROP|DELETE|TRUNCATE|UPDATE|ALTER|CREATE)\b/i);
      expect(sql).not.toContain('thgrhueckkjdutjvcufp');
      expect(sql).not.toContain('pdzapmdcsrxlbeseunhm');
    });
    it(`${d}: todo INSERT está comentado y marcado BLOCKED_SCHEMA + EMBEDDINGS_PENDING`, () => {
      const vivas = sql.split('\n').filter((l) => !l.trim().startsWith('--') && l.trim() !== '');
      expect(vivas).toEqual([]);
      expect(sql).toContain('BLOCKED_SCHEMA');
      expect(sql).toContain('EMBEDDINGS_PENDING');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
    });
  }
  it('Garantías Mobiliarias (D) no tiene SQL', () => {
    expect(existsSync(join(BASE, 'ley-garantias-mobiliarias', 'load.staging.sql'))).toBe(false);
    expect(readdirSync(join(BASE, 'ley-garantias-mobiliarias'))).toEqual(['MANIFEST.json']);
  });
});

describe('P21 MANIFEST.json', () => {
  it('cada instrumento declara URL, SHA-256 esperado, estado y es_norma_vigente=false; sin conteos inventados', () => {
    for (const d of [...DIRS, 'ley-garantias-mobiliarias']) {
      const m = manifest(d);
      expect(m.source_url).toMatch(/^https:\/\//);
      expect(m.sha256_esperado).toMatch(/^[0-9a-f]{64}$/);
      expect(m.estado).toMatch(/^(READY_FOR_STAGING_REVIEW|NEEDS_TEXT_LAYER|BLOCKED_[A-Z_]+)$/);
      expect(m.es_norma_vigente).toBe(false);
      expect(m.pdf_versionado_en_repo).toBe(false);
      if (m.estado !== 'READY_FOR_STAGING_REVIEW') {
        expect(m.sha256_obtenido).toBeNull();
        expect(m.articulos).toEqual([]);
        expect(m.filas).toEqual([]);
      }
    }
  });
  it('Notariado: solo 72, 72-A, 73; sin 11/17/27; en CONTEXT', () => {
    const m = manifest('codigo-notariado-d59-2015');
    expect(m.reglas.articulos_permitidos).toEqual(['72', '72-A', '73']);
    expect(m.reglas.rol).toMatch(/CONTEXT/);
    expect(Object.keys(m.reglas.no_cargar).sort()).toEqual(['11', '17', '27']);
    for (const a of m.articulos as string[]) expect(['11', '17', '27']).not.toContain(a);
    expect(JSON.stringify(m)).not.toMatch(/Ley del Notariado/);
  });
  it('Comercio: 418 y 1662 excluidos; fecha del Decreto 73-50 no verificada', () => {
    const m = manifest('codigo-comercio');
    expect(m.reglas.excluidos_brecha).toEqual(['418', '1662']);
    expect(m.articulos).not.toContain('418');
    expect(m.articulos).not.toContain('1662');
    expect(m.fecha_instrumento).toMatch(/no verificada/);
    expect(JSON.stringify(m)).not.toMatch(/1950|1949|16-feb|17-feb/i);
  });
  it('D.284-2013: solo 15..25', () => {
    const m = manifest('decreto-284-2013-titulo-ii');
    expect(m.reglas.articulos_esperados).toBe('15..25 (11)');
    for (const a of m.articulos as string[]) {
      const n = Number(a);
      expect(n).toBeGreaterThanOrEqual(15);
      expect(n).toBeLessThanOrEqual(25);
    }
    expect(m.reglas.autonomo).toBe(true);
  });
});

describe('P21 DRY_RUN_COUNTS.md', () => {
  it('documenta la brecha de esquema y no crea migración', () => {
    const md = readFileSync(join(BASE, 'DRY_RUN_COUNTS.md'), 'utf8');
    for (const c of ['jurisdiccion', 'fuente_tipo', 'es_norma_vigente']) expect(md).toContain(c);
    expect(md).toContain('BLOCKED_SCHEMA');
    expect(md).toContain('EMBEDDINGS_PENDING');
  });
});
