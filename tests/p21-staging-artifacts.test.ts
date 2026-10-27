import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = join(process.cwd(), 'docs/corpus/staging/p21');
const DIRS = ['codigo-comercio', 'codigo-notariado-d59-2015', 'decreto-284-2013-titulo-ii'];
const leer = (d: string, f: string) => readFileSync(join(BASE, d, f), 'utf8');
const manifest = (d: string) => JSON.parse(leer(d, 'MANIFEST.json'));

const ESPERADOS: Record<string, string> = {
  'codigo-comercio': '57c42a07b7540168fa74287212fa897505d0283d9e314606b25dd9106ce7f74a',
  'codigo-notariado-d59-2015': '8ec5d27be89442e2fdaa0164356cecb82874f23bbbe93bed962fe083a52868f7',
  'decreto-284-2013-titulo-ii': '3b42a1f9120f386fbcb72039de94cc1110038450d0bbb16668c5818a1fe3a4cb',
  'ley-garantias-mobiliarias': '66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267',
};

describe('P21 load.staging.sql (A, B, C)', () => {
  for (const d of DIRS) {
    const sql = leer(d, 'load.staging.sql');
    it(`${d}: cabecera, sin DDL/DML destructivo ni proyectos de producción`, () => {
      expect(sql.startsWith('-- TARGET: staging aicakncgtuiiuomflkqj ONLY. NOT APPLIED. NO PRODUCTION.')).toBe(true);
      expect(sql).not.toMatch(/\b(DROP|DELETE|TRUNCATE|UPDATE|ALTER|CREATE)\b/i);
      expect(sql).not.toContain('thgrhueckkjdutjvcufp');
      expect(sql).not.toContain('pdzapmdcsrxlbeseunhm');
    });
    it(`${d}: todo el INSERT está comentado y marcado BLOCKED_SCHEMA + EMBEDDINGS_PENDING`, () => {
      const vivas = sql.split('\n').filter((l) => l.trim() !== '' && !l.startsWith('--'));
      expect(vivas).toEqual([]);
      expect(sql).toContain('BLOCKED_SCHEMA');
      expect(sql).toContain('EMBEDDINGS_PENDING');
      expect(sql).toContain('-- ON CONFLICT (id) DO NOTHING;');
      expect(sql).toContain('INSERT INTO public.biblioteca_vectores');
    });
    it(`${d}: una tupla por fila del manifiesto, con es_norma_vigente=false y sin embedding real`, () => {
      const m = manifest(d);
      const tuplas = sql.split('\n').filter((l) => l.startsWith(`--   ('${m.id_prefix}_a`));
      expect(tuplas.length).toBe(m.filas.length);
      expect(sql.match(/NULL \/\* EMBEDDINGS_PENDING \*\//g)?.length).toBe(m.filas.length);
    });
  }
  it('Garantías Mobiliarias (D) no tiene SQL', () => {
    expect(readdirSync(join(BASE, 'ley-garantias-mobiliarias'))).toEqual(['MANIFEST.json']);
  });
});

describe('P21 MANIFEST.json (común)', () => {
  it('SHA-256 obtenido = esperado, bytes reales, es_norma_vigente=false, PDF no versionados', () => {
    for (const d of [...DIRS, 'ley-garantias-mobiliarias']) {
      const m = manifest(d);
      expect(m.source_url).toMatch(/^https:\/\//);
      expect(m.sha256_esperado).toBe(ESPERADOS[d]);
      expect(m.sha256_obtenido).toBe(m.sha256_esperado);
      expect(m.bytes).toBeGreaterThan(0);
      expect(m.pages).toBeGreaterThan(0);
      for (const f of m.fuentes) {
        expect(f.sha_coincide).toBe(true);
        expect(f.sha256_obtenido).toBe(f.sha256_esperado);
        expect(f.bytes).toBeGreaterThan(0);
      }
      expect(m.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(m.es_norma_vigente).toBe(false);
      expect(m.pdf_versionado_en_repo).toBe(false);
    }
    const versionados = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n');
    expect(versionados.filter((f) => /^(\.p21-src\/|docs\/corpus\/staging\/p21\/.*\.pdf$)/.test(f))).toEqual([]);
  });
  it('bytes y páginas de las fuentes acreditadas', () => {
    expect(manifest('codigo-comercio')).toMatchObject({ bytes: 751606, pages: 419 });
    expect(manifest('decreto-284-2013-titulo-ii')).toMatchObject({ bytes: 1720691, pages: 72 });
    expect(manifest('ley-garantias-mobiliarias')).toMatchObject({ bytes: 3648369, pages: 20 });
    expect(manifest('codigo-notariado-d59-2015').fuentes.map((f: { bytes: number }) => f.bytes)).toEqual([790648, 21102]);
  });
  it('conteos coherentes y un hash SHA-256 por fila, ids únicos', () => {
    for (const d of DIRS) {
      const m = manifest(d);
      expect(m.counts.finales).toBe(m.filas.length);
      expect(m.articulos).toEqual(m.filas.map((f: { num_articulo: string }) => f.num_articulo));
      expect(new Set(m.filas.map((f: { id: string }) => f.id)).size).toBe(m.filas.length);
      for (const f of m.filas) {
        expect(f.hash_sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(['PRIMARY', 'CONTEXT']).toContain(f.role);
      }
      expect(m.estado).toBe('READY_FOR_STAGING_REVIEW');
      expect(m.estados_adicionales).toEqual(['BLOCKED_SCHEMA', 'EMBEDDINGS_PENDING']);
    }
  });
  it('el hash de cada fila coincide con el contenido de su tupla en el SQL', () => {
    for (const d of DIRS) {
      const m = manifest(d);
      const sql = leer(d, 'load.staging.sql');
      for (const f of m.filas) {
        const inicio = sql.indexOf(`--   ('${f.id}',`);
        expect(inicio).toBeGreaterThan(-1);
        expect(sql.slice(inicio, inicio + 4000 + f.chars * 2)).toContain(`"hash_texto_sha256":"${f.hash_sha256}"`);
      }
    }
  });
});

describe('P21 reglas CLO por instrumento', () => {
  it('Notariado: solo 72, 72-A y 73, todos CONTEXT; sin 11/17/27; 72-A PENDING_CLO; nunca «Ley del Notariado»', () => {
    const m = manifest('codigo-notariado-d59-2015');
    expect(m.articulos).toEqual(['72', '72-A', '73']);
    expect(m.filas.every((f: { role: string }) => f.role === 'CONTEXT')).toBe(true);
    expect(Object.keys(m.no_cargar).sort()).toEqual(['11', '17', '27']);
    for (const a of ['11', '17', '27']) expect(m.articulos).not.toContain(a);
    expect(m.counts.curacion.pending_clo).toEqual(['72-A']);
    const sql = leer('codigo-notariado-d59-2015', 'load.staging.sql');
    expect(sql).toContain('"elegible_primary":false');
    expect(sql).not.toMatch(/Ley del Notariado/);
    expect(JSON.stringify(m)).not.toMatch(/Ley del Notariado/);
  });
  it('Notariado: el texto sale del COTEJO (arts. 72, 72-A y 73 de D.59-2015)', () => {
    const sql = leer('codigo-notariado-d59-2015', 'load.staging.sql');
    expect(sql).toContain('ARTÍCULO 72.- Créase la Unión de Notarios de Honduras (UNH)');
    expect(sql).toContain('ARTÍCULO 72-A.- Los órganos de la UNIÓN DE NOTARIOS DE HONDURAS (UNH)');
    expect(sql).toContain('ARTÍCULO 73.- Constituye el patrimonio de la Unión de Notarios de Honduras (UNH)');
  });
  it('Comercio: citado como Decreto 73-50, fecha no verificada, sin 418 ni 1662', () => {
    const m = manifest('codigo-comercio');
    expect(m.citado_como).toBe('Decreto 73-50');
    expect(m.fecha_instrumento).toBe('no verificada; las fuentes discrepan');
    expect(m.instrumento).toBe('Código de Comercio (Decreto 73-50)');
    expect(`${m.instrumento} ${m.citado_como} ${m.fecha_instrumento}`).not.toMatch(/1950|1949|feb|mayo/i);
    expect(m.counts.excluidos).toEqual(['418', '1662']);
    expect(m.articulos).not.toContain('418');
    expect(m.articulos).not.toContain('1662');
    expect(leer('codigo-comercio', 'load.staging.sql')).not.toMatch(/_a(418|1662)'/);
    expect(m.counts.duplicados_no_resueltos).toEqual([]);
    expect(m.source_url).toContain('bch.hn');
  });
  it('Comercio: prenda (1278, 1289–1307, 1313) en CONTEXT con desplazado_por=D.182-2009; el resto PRIMARY', () => {
    const m = manifest('codigo-comercio');
    const prenda = new Set(['1278', ...Array.from({ length: 19 }, (_, i) => String(1289 + i)), '1313']);
    for (const f of m.filas as Array<{ num_articulo: string; role: string; warnings: string[] }>) {
      if (prenda.has(f.num_articulo)) {
        expect(f.role).toBe('CONTEXT');
        expect(f.warnings.join(' ')).toContain('D.182-2009');
      } else expect(f.role).toBe('PRIMARY');
    }
    expect(m.filas.filter((f: { role: string }) => f.role === 'CONTEXT').length).toBe(prenda.size);
  });
  it('Comercio: glifo «Articulo º/° N» normalizado (sin encabezados con glifo en las filas)', () => {
    const m = manifest('codigo-comercio');
    expect(m.counts.curacion.glifos_ordinales_normalizados).toBeGreaterThan(1000);
    expect(leer('codigo-comercio', 'load.staging.sql')).not.toMatch(/'Articulo\s*[º°]\s*\d/);
  });
  it('D.284-2013: solo los arts. 15 a 25 (11), autónomo, vigencia solo como metadata', () => {
    const m = manifest('decreto-284-2013-titulo-ii');
    expect(m.articulos).toEqual(Array.from({ length: 11 }, (_, i) => String(15 + i)));
    expect(m.autonomo).toBe(true);
    expect(m.no_vincular_como_restauracion_de).toMatch(/60–71/);
    const sql = leer('decreto-284-2013-titulo-ii', 'load.staging.sql');
    expect(sql).toContain('TRUE_PRESUNTA (solo metadata)');
    expect(sql).not.toContain('TÍTULO III');
  });
  it('Garantías Mobiliarias: escaneo sin texto → solo manifiesto NEEDS_TEXT_LAYER, sin filas', () => {
    const m = manifest('ley-garantias-mobiliarias');
    expect(m.estado).toBe('NEEDS_TEXT_LAYER');
    expect(m.filas).toEqual([]);
    expect(m.articulos).toEqual([]);
    expect(m.counts.curacion.caracteres_capa_texto).toBe(0);
    expect(m.estados_adicionales).toEqual([]);
  });
});

describe('P21 DRY_RUN_COUNTS.md', () => {
  const md = readFileSync(join(BASE, 'DRY_RUN_COUNTS.md'), 'utf8');
  it('documenta la brecha de esquema y no crea migración', () => {
    for (const c of ['jurisdiccion', 'fuente_tipo', 'es_norma_vigente']) expect(md).toContain(c);
    expect(md).toContain('BLOCKED_SCHEMA');
    expect(md).toContain('EMBEDDINGS_PENDING');
    expect(readdirSync(join(process.cwd(), 'supabase/migrations')).some((f) => /p21/i.test(f))).toBe(false);
  });
  it('incluye los SHA-256 de las fuentes y de cada load.staging.sql, y la salida literal', () => {
    for (const h of Object.values(ESPERADOS)) expect(md).toContain(h);
    for (const d of DIRS) expect(md).toContain(createHash('sha256').update(leer(d, 'load.staging.sql')).digest('hex'));
    expect(md).toContain('=== A. Código de Comercio (Decreto 73-50) — dry-run ===');
  });
});

describe('P21 fuentes locales (si .p21-src/ está presente)', () => {
  const dir = join(process.cwd(), '.p21-src', 'p21-src');
  it.skipIf(!existsSync(join(dir, 'SHA256SUMS.txt')))('SHA-256 de cada archivo coincide con SHA256SUMS.txt', () => {
    const lineas = readFileSync(join(dir, 'SHA256SUMS.txt'), 'utf8').split('\n');
    for (const f of ['A_comercio.pdf', 'B1_gaceta33801.pdf', 'B2_COTEJO-D59-2015-literal.md', 'C_gaceta33445.pdf', 'D_lgm.pdf']) {
      const h = createHash('sha256').update(readFileSync(join(dir, f))).digest('hex');
      expect(lineas.some((l) => l.startsWith(h) && l.trim().endsWith(f))).toBe(true);
    }
  });
});
