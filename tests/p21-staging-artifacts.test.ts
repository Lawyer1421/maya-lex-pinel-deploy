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
  it('SHA-256 obtenido = esperado, bytes reales, es_norma_vigente sin TRUE (CLO), PDF no versionados', () => {
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
      // Significado CLO: TRUE elegible · FALSE excluido · NULL solo CONTEXT. Ninguna fila P21 tiene vigencia acreditada → ningún TRUE.
      expect(m.es_norma_vigente.TRUE).toBe(0);
      expect(m.es_norma_vigente.significado_clo).toBe('TRUE elegible · FALSE excluido · NULL solo CONTEXT');
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
      expect(m.estado).toBe('CLO_CLEARED_FOR_STAGING_PREP');
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
  it('Notariado: solo 72, 72-A y 73, todos CONTEXT; sin 11/17/27; 72-A adjudicado CONTEXT; nunca «Ley del Notariado»', () => {
    const m = manifest('codigo-notariado-d59-2015');
    expect(m.articulos).toEqual(['72', '72-A', '73']);
    expect(m.filas.every((f: { role: string }) => f.role === 'CONTEXT')).toBe(true);
    expect(Object.keys(m.no_cargar).sort()).toEqual(['11', '17', '27']);
    for (const a of ['11', '17', '27']) expect(m.articulos).not.toContain(a);
    expect(m.counts.curacion.clo_adjudicado_context).toEqual(['72-A']);
    expect(JSON.stringify(m)).not.toContain('PENDING_CLO');
    expect(leer('codigo-notariado-d59-2015', 'load.staging.sql')).not.toContain('PENDING_CLO');
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
  it('Comercio: prenda (1289–1307 y 1313; el 1278 NO es prenda) en CONTEXT con desplazado_por=D.182-2009', () => {
    const m = manifest('codigo-comercio');
    const prenda = new Set([...Array.from({ length: 19 }, (_, i) => String(1289 + i)), '1313']);
    expect(m.prenda_desplazada_d182_2009.articulos).toEqual([...prenda].sort((a, b) => Number(a) - Number(b)));
    for (const f of m.filas as Array<{ num_articulo: string; role: string; warnings: string[]; desplazado_por?: string }>) {
      if (prenda.has(f.num_articulo)) {
        expect(f.role).toBe('CONTEXT');
        expect(f.desplazado_por).toBe('D.182-2009');
        expect(f.warnings.join(' ')).toContain('D.182-2009');
      } else expect(f.desplazado_por).toBeUndefined();
    }
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
    expect(sql).not.toContain('"vigencia_state":"TRUE_PRESUNTA"');
    expect(sql).toContain('NULL (sin vigencia acreditada; antes TRUE_PRESUNTA)');
    expect(JSON.stringify(m)).not.toMatch(/TRUE_PRESUNTA solo como metadata/);
    for (const f of m.filas) expect(f.es_norma_vigente).toBeNull();
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

describe('P21 Comercio — dictamen CLO 27-oct-2026 (418/1662 y GAP_IN_SOURCE)', () => {
  const GAP = ['417', '1000', ...Array.from({ length: 10 }, (_, i) => String(1236 + i)), '1661'];
  const m = manifest('codigo-comercio');
  it('ningún número GAP_IN_SOURCE ni 418/1662 aparece como fila (manifiesto, ids ni tuplas SQL)', () => {
    const sql = leer('codigo-comercio', 'load.staging.sql');
    for (const n of [...GAP, '418', '1662']) {
      expect(m.articulos).not.toContain(n);
      expect(m.filas.map((f: { num_articulo: string }) => f.num_articulo)).not.toContain(n);
      expect(m.filas.map((f: { id: string }) => f.id)).not.toContain(`${m.id_prefix}_a${n}`);
      expect(sql).not.toContain(`'${m.id_prefix}_a${n}'`);
    }
  });
  it('GAP_IN_SOURCE registrado en el manifiesto (13 números) y en DRY_RUN_COUNTS.md', () => {
    expect(m.counts.gap_in_source.map(String)).toEqual(GAP);
    expect(m.gap_in_source.map((g: { num_articulo: string }) => g.num_articulo)).toEqual(GAP);
    expect(m.gap_in_source.every((g: { estado: string }) => g.estado === 'GAP_IN_SOURCE')).toBe(true);
    const md = readFileSync(join(BASE, 'DRY_RUN_COUNTS.md'), 'utf8');
    expect(md).toContain('GAP_IN_SOURCE (ausentes en BCH y DGMM; no se inventan ni se rellenan)');
    expect(md).toContain('417, 1000, 1236, 1237, 1238, 1239, 1240, 1241, 1242, 1243, 1244, 1245, 1661');
  });
  it('418 y 1662: los CUATRO textos excluidos (una entrada por número, con sus dos ocurrencias), con nota de numeración defectuosa', () => {
    expect(m.excluidos_detalle).toHaveLength(2);
    expect(m.counts.excluidos_textos).toBe(4);
    expect(m.excluidos_detalle.map((e: { num_articulo: string }) => e.num_articulo)).toEqual(['418', '1662']);
    const hashesFilas = new Set(m.filas.map((f: { hash_sha256: string }) => f.hash_sha256));
    let ocurrencias = 0;
    for (const e of m.excluidos_detalle) {
      expect(e.estado).toMatch(/^EXCLUIDO/);
      expect(e.ocurrencias).toHaveLength(2);
      for (const o of e.ocurrencias) { ocurrencias += 1; expect(o.sha256).toMatch(/^[0-9a-f]{64}$/); expect(hashesFilas.has(o.sha256)).toBe(false); }
    }
    expect(ocurrencias).toBe(4);
    expect(m.nota_numeracion).toBe('numeración defectuosa en la fuente; la posición sugiere 417 y 1661, no verificado contra Gaceta');
    expect(m.notas).toContain(m.nota_numeracion);
    expect(m.dictamen_clo).toContain('es la fuente, no el parser');
  });
  it('1699 finales (incluye el 1714); dedup 1511/1541 documentados con su texto', () => {
    expect(m.filas).toHaveLength(1699);
    expect(m.counts.finales).toBe(1699);
    expect(m.counts.deduplicados).toEqual(['1511', '1541']);
    expect(m.deduplicados_detalle.map((d: { num_articulo: string }) => d.num_articulo)).toEqual(['1511', '1541']);
    const md = readFileSync(join(BASE, 'DRY_RUN_COUNTS.md'), 'utf8');
    expect(md).toContain('### Deduplicados 1511 y 1541 (texto documentado)');
    expect(md).toContain('La apelación contra el reconocimiento de crédito ajeno');
    expect(md).toContain('Se considerara que se ha realizado todo el activo');
    expect(md).toContain('Se considerará que se ha realizado todo el activo');
  });
});

describe('P21 Notariado 72-A — adjudicado CONTEXT, completo y con vigencia UNKNOWN (CLO 27-oct-2026)', () => {
  const sql = leer('codigo-notariado-d59-2015', 'load.staging.sql');
  const m = manifest('codigo-notariado-d59-2015');
  // Reconstruye el contenido de una tupla comentada del SQL (sin el prefijo «--   »).
  const contenidoSql = (num: string, siguiente: string): string => {
    const ini = sql.indexOf(`--   ('${m.id_prefix}_a${num}',`);
    const fin = sql.indexOf(`--   ('${m.id_prefix}_a${siguiente}',`);
    const bloque = sql.slice(ini, fin < 0 ? undefined : fin).split('\n').map((l) => l.replace(/^--   /, '')).join('\n');
    const desde = bloque.indexOf(", '03_NOTARIAL', '") + ", '03_NOTARIAL', '".length;
    const hasta = bloque.indexOf(`', '${num.toUpperCase()}', `);
    return bloque.slice(desde, hasta).replace(/''/g, "'");
  };
  const a72a = contenidoSql('72-a', '73');
  it('el texto va completo: de «ARTÍCULO 72-A.-» hasta justo antes de «ARTÍCULO 73.-» (~10.100 caracteres)', () => {
    expect(a72a.startsWith('ARTÍCULO 72-A.-')).toBe(true);
    for (const t of ['A. DE LA ASAMBLEA GENERAL', 'B. DE LA JUNTA DIRECTIVA', 'C. DEL TRIBUNAL DE HONOR', 'D. DE LOS CAPÍTULOS']) expect(a72a).toContain(t);
    expect(a72a.trimEnd().endsWith('el Reglamento establezca')).toBe(true);
    expect(a72a).not.toContain('ARTÍCULO 73');
    expect(a72a.length).toBeGreaterThanOrEqual(10000);
    expect(a72a.length).toBeLessThanOrEqual(10300);
    const fila = m.filas.find((f: { num_articulo: string }) => f.num_articulo === '72-A');
    expect(fila.chars).toBe(a72a.length);
    expect(createHash('sha256').update(a72a).digest('hex')).toBe(fila.hash_sha256);
  });
  it('sigue siendo CONTEXT (nunca PRIMARY), elegible_primary=false y vigencia UNKNOWN', () => {
    const fila = m.filas.find((f: { num_articulo: string }) => f.num_articulo === '72-A');
    expect(fila.role).toBe('CONTEXT');
    expect(fila.vigencia).toBe('UNKNOWN');
    const inicio = sql.indexOf(`--   ('${m.id_prefix}_a72-a',`);
    const tupla = sql.slice(inicio, sql.indexOf(`--   ('${m.id_prefix}_a73',`));
    expect(tupla).toContain('"rol":"CONTEXT"');
    expect(tupla).not.toContain('"rol":"PRIMARY"');
    expect(tupla).toContain('"elegible_primary":false');
    expect(tupla).toContain('"es_norma_vigente_clo":"UNKNOWN"');
    expect(tupla).toContain('vigencia posterior al D.59-2015 no cotejada');
    expect(tupla).toContain(", 'HN', 'codigo', NULL)");
  });
  it('el 72 y el 73 completos y también CONTEXT', () => {
    expect(contenidoSql('72', '72-a').startsWith('ARTÍCULO 72.-')).toBe(true);
    expect(contenidoSql('73', '__fin__').startsWith('ARTÍCULO 73.-')).toBe(true);
    expect(m.filas.map((f: { role: string }) => f.role)).toEqual(['CONTEXT', 'CONTEXT', 'CONTEXT']);
  });
});

describe('P21 estados de los manifiestos tras el dictamen CLO', () => {
  it('Comercio, Notariado y D.284 = CLO_CLEARED_FOR_STAGING_PREP; Garantías = NEEDS_TEXT_LAYER', () => {
    for (const d of DIRS) expect(manifest(d).estado).toBe('CLO_CLEARED_FOR_STAGING_PREP');
    expect(manifest('ley-garantias-mobiliarias').estado).toBe('NEEDS_TEXT_LAYER');
  });
});

describe('P21 anexo 1 del CLO (28-oct-2026): vigencia, reformas, 1714 y 1278', () => {
  const m = manifest('codigo-comercio');
  const sql = leer('codigo-comercio', 'load.staging.sql');
  const fila = (n: string) => m.filas.find((f: { num_articulo: string }) => f.num_articulo === n);
  const NOTA_D284_13 = 'texto anterior a la reforma del D.284-2013; no es el texto vigente';
  const NOTA_D255 = 'posible reforma/derogación por D.255-2002 (Gaceta 29,856), no cotejada con imagen';

  it('1) arts. 380–383: es_norma_vigente=FALSE, excluidos como fundamento (derogados por D.284-2013 art. 37)', () => {
    for (const n of ['380', '381', '382', '383']) {
      const f = fila(n);
      expect(f.es_norma_vigente, n).toBe(false);
      expect(f.excluido_como_fundamento).toBe(true);
      expect(f.role).toBe('CONTEXT');
      expect(f.reformadores[0]).toMatchObject({ instrumento: 'D.284-2013 (Gaceta 33,445)', articulo_reformador: '37', efecto: 'DEROGA' });
      const tupla = sql.slice(sql.indexOf(`--   ('${m.id_prefix}_a${n}',`), sql.indexOf(`--   ('${m.id_prefix}_a${Number(n) + 1}',`));
      expect(tupla).toContain(", 'HN', 'codigo', false)");
    }
    expect(m.es_norma_vigente.FALSE).toBe(4);
  });
  it('2) los 12 artículos reformados por D.284-2013 art. 13: CONTEXT, NULL, con la nota; nunca PRIMARY', () => {
    for (const n of ['14', '15', '18', '157', '169', '189', '193', '210', '222', '224', '226', '228']) {
      const f = fila(n);
      expect(f.role, n).toBe('CONTEXT');
      expect(f.es_norma_vigente).toBeNull();
      expect(f.nota).toContain(NOTA_D284_13);
    }
  });
  it('3) los 19 del D.255-2002 art. 8 y el art. 21 (art. 37): CONTEXT, NULL, sin FALSE; la nota exacta', () => {
    const D255 = ['15', '22', '24', '36', '89', '92', '308', '309', '310', '388', '398', '403', '431', '432', '433', '435', '441', '446', '448'];
    expect(m.reformas.d255_2002_art8_reforma.articulos).toEqual(D255);
    for (const n of [...D255, '21']) {
      const f = fila(n);
      expect(f.role, n).toBe('CONTEXT');
      expect(f.es_norma_vigente, n).toBeNull();
      expect(f.nota).toContain(NOTA_D255);
    }
    expect(m.reformas.d255_2002_art37_deroga_art21.articulos).toEqual(['21']);
    // 338 y 388: se reporta cuál aparece en la fuente, sin decidir
    expect(m.discrepancia_338_388.observado_en_las_copias_leidas_del_D255_art8).toBe('388');
    expect(m.discrepancia_338_388.aparece_338).toBe(false);
    expect(m.discrepancia_338_388.decision).toMatch(/ninguna/);
    expect(fila('338').role).toBe('PRIMARY');
    expect(fila('338').reformadores).toBeUndefined();
  });
  it('3b) 35 pares (artículo, reformador) = 4 + 12 + 19; el 15 tiene dos reformadores en UNA sola fila', () => {
    expect(m.reformas.pares_articulo_reformador).toBe(35);
    expect(m.reformas.articulos_con_dos_reformadores).toEqual(['15']);
    expect(m.filas.filter((f: { num_articulo: string }) => f.num_articulo === '15')).toHaveLength(1);
    expect(fila('15').reformadores).toHaveLength(2);
    const md = readFileSync(join(BASE, 'DRY_RUN_COUNTS.md'), 'utf8');
    expect(md).toContain('las 35 filas (artículo, instrumento reformador, valor anterior, valor nuevo, rol)');
    expect(md.split('\n').filter((l) => /^\| \d+ \| \d+ \| D\.(255|284)-/.test(l))).toHaveLength(35);
  });
  it('4) ningún TRUE_PRESUNTA queda en los manifiestos ni en los SQL', () => {
    for (const d of [...DIRS, 'ley-garantias-mobiliarias']) {
      expect(leer(d, 'MANIFEST.json')).not.toMatch(/"TRUE_PRESUNTA"|TRUE_PRESUNTA solo/);
      if (d !== 'ley-garantias-mobiliarias') expect(leer(d, 'load.staging.sql')).not.toContain('"vigencia_state":"TRUE_PRESUNTA"');
    }
  });
  it('5) art. 1714 incluido (NULL, sin vigencia acreditada), conteo final 1699, sin otros rescates', () => {
    const f = fila('1714');
    expect(f).toBeDefined();
    expect(f.es_norma_vigente).toBeNull();
    expect(m.counts.rescatados_por_parser).toEqual(['1714']);
    expect(m.filas).toHaveLength(1699);
    expect(m.art_1714.rescatado_por_parser).toBe(true);
    expect(sql).toContain(`'${m.id_prefix}_a1714'`);
    // los GAP_IN_SOURCE siguen sin filas
    for (const n of m.counts.gap_in_source) expect(fila(String(n))).toBeUndefined();
  });
  it('6) art. 1278: contrato de edición, fuera de la lista de prenda desplazada', () => {
    expect(m.prenda_desplazada_d182_2009.articulos).not.toContain('1278');
    expect(m.prenda_desplazada_d182_2009.articulos).toHaveLength(20);
    expect(m.prenda_desplazada_d182_2009.excluido_de_la_lista['1278'].motivo).toMatch(/edición/);
    expect(m.prenda_desplazada_d182_2009.excluido_de_la_lista['1278'].primeras_lineas).toContain('Articulo 1278');
    expect(m.prenda_desplazada_d182_2009.excluido_de_la_lista['1278'].primeras_lineas).toContain('El autor conservará el derecho de hacer a su obra las correcciones');
    expect(fila('1278').desplazado_por).toBeUndefined();
    expect(fila('1278').role).toBe('PRIMARY');
  });
  it('7) sin filas duplicadas en la cobertura: una entrada por número excluido y una fila por artículo', () => {
    const nums = m.filas.map((f: { num_articulo: string }) => f.num_articulo);
    expect(new Set(nums).size).toBe(nums.length);
    expect(new Set(m.excluidos_detalle.map((e: { num_articulo: string }) => e.num_articulo)).size).toBe(m.excluidos_detalle.length);
    expect(new Set(m.gap_in_source.map((g: { num_articulo: string }) => g.num_articulo)).size).toBe(m.gap_in_source.length);
  });
  it('8) significado CLO de es_norma_vigente documentado frente a la «marca operativa» del registro canónico', () => {
    const doc = leer('.', 'ES_NORMA_VIGENTE_SEMANTICA.md');
    expect(doc).toContain('TRUE elegible');
    expect(doc).toContain('Marca operativa');
    expect(doc).toContain('MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1');
    expect(doc).toContain('Dónde chocaba');
  });
  it('0 líneas SQL activas: toda línea de los tres load.staging.sql es comentario o está en blanco', () => {
    for (const d of DIRS) {
      const vivas = leer(d, 'load.staging.sql').split('\n').filter((l) => l.trim() !== '' && !l.startsWith('--'));
      expect(vivas, d).toEqual([]);
    }
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
