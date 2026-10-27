/**
 * P21 — parseo local y generación de artefactos de staging (SIN BD, SIN red, SIN variables de entorno).
 * Uso: npx tsx tools/corpus/p21-build.ts --local <carpeta-con-fuentes> [--out docs/corpus/staging/p21]
 *
 * Verifica el SHA-256 de cada archivo local contra el esperado (y contra SHA256SUMS.txt si existe).
 * Si un hash no coincide, ESA fuente se aborta (no se parsea ni se sustituye).
 * Escribe MANIFEST.json por instrumento, load.staging.sql (INSERT comentado) y DRY_RUN_COUNTS.md.
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { segmentarGenerico } from '../../scripts/ingestar-ley';

const sha256 = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');

// ── Fuentes esperadas (fijadas por CLO) ──────────────────────────────────────
const FUENTES = {
  A: { archivo: 'A_comercio.pdf', sha256: '57c42a07b7540168fa74287212fa897505d0283d9e314606b25dd9106ce7f74a', url: 'https://www.bch.hn/administrativas/JUR/Marco%20Legal%20OM%202/codigo_comercio.pdf' },
  B1: { archivo: 'B1_gaceta33801.pdf', sha256: '8ec5d27be89442e2fdaa0164356cecb82874f23bbbe93bed962fe083a52868f7', url: 'https://drive.google.com/file/d/1y6ZmCoEhHKCejag8QMvxjoAZuNILKNw0/view' },
  B2: { archivo: 'B2_COTEJO-D59-2015-literal.md', sha256: '7bbe492e83992c05087b568b56202460be49f138a786692506abacb006e25e6d', url: 'https://drive.google.com/file/d/1YZnjONI2E8VlXAbGMj-ZQ-lpIC8jjXiA/view' },
  C: { archivo: 'C_gaceta33445.pdf', sha256: '3b42a1f9120f386fbcb72039de94cc1110038450d0bbb16668c5818a1fe3a4cb', url: 'https://enag.gob.hn/index.php/gaceta-digital/20140605-33445/download' },
  D: { archivo: 'D_lgm.pdf', sha256: '66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267', url: 'https://www.tsc.gob.hn/web/leyes/Ley%20de%20Garantias%20Mobiliarias.pdf' },
} as const;
type Clave = keyof typeof FUENTES;

const args = process.argv.slice(2);
const local = args[args.indexOf('--local') + 1];
if (!local || args.indexOf('--local') < 0) throw new Error('falta --local <carpeta>');
const OUT = resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/corpus/staging/p21');
const retrievedAt = new Date().toISOString();

const log: string[] = [];
const anexos: string[] = [];
const BT = String.fromCharCode(96);
const FENCE = BT + BT + BT;
const code = (x: string) => BT + x + BT;
const say = (s = '') => { log.push(s); console.log(s); };

// ── Verificación de hashes ───────────────────────────────────────────────────
interface Verif { ok: boolean; obtenido: string; bytes: number; ruta: string; enSumas: boolean | null }
const sumasPath = join(local, 'SHA256SUMS.txt');
const sumas = new Map<string, string>();
if (existsSync(sumasPath)) for (const l of readFileSync(sumasPath, 'utf8').split('\n')) { const m = l.match(/^([0-9a-f]{64})\s+\*?(.+)$/); if (m) sumas.set(m[2].trim(), m[1]); }
const verif = {} as Record<Clave, Verif>;
say('=== Verificación SHA-256 (archivos locales) ===');
for (const k of Object.keys(FUENTES) as Clave[]) {
  const f = FUENTES[k]; const ruta = join(local, f.archivo);
  if (!existsSync(ruta)) { verif[k] = { ok: false, obtenido: 'AUSENTE', bytes: 0, ruta, enSumas: null }; say(`${k} ${f.archivo}: AUSENTE`); continue; }
  const buf = readFileSync(ruta); const h = sha256(buf);
  const enSumas = sumas.size ? sumas.get(f.archivo) === h : null;
  verif[k] = { ok: h === f.sha256 && enSumas !== false, obtenido: h, bytes: buf.length, ruta, enSumas };
  say(`${k} ${f.archivo}: ${buf.length} bytes sha256=${h} esperado=${h === f.sha256 ? 'COINCIDE' : 'NO COINCIDE'} SHA256SUMS=${enSumas === null ? 'n/a' : enSumas ? 'COINCIDE' : 'NO COINCIDE'}`);
}

const verPdftotext = String(spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).stderr).split('\n')[0].trim();
const PARSER = `${verPdftotext} + segmentarGenerico (scripts/ingestar-ley.ts) + tools/corpus/p21-build.ts`;

const pdfInfoPages = (ruta: string): number => Number(execFileSync('pdfinfo', [ruta], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)![1]);
const pdfText = (ruta: string, extra: string[] = []): string => execFileSync('pdftotext', [...extra, '-enc', 'UTF-8', ruta, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// ── Modelo de fila ───────────────────────────────────────────────────────────
interface Fila { id: string; num_articulo: string; role: 'PRIMARY' | 'CONTEXT'; contenido: string; hash_sha256: string; warnings: string[]; extra: Record<string, unknown> }
interface Resultado {
  clave: string; dir: string; instrumento: string; fuenteKeys: Clave[]; estado: string; id_prefix: string; fuente: string; materia: string; fuente_tipo: string;
  pages: number | null; textSha: string | null; counts: Record<string, unknown>; filas: Fila[]; notas: string[]; extraManifest: Record<string, unknown>; conSql: boolean;
}
const mkFila = (prefix: string, num: string, role: Fila['role'], contenido: string, warnings: string[] = [], extra: Record<string, unknown> = {}): Fila =>
  ({ id: `${prefix}_a${num.toLowerCase()}`, num_articulo: num, role, contenido, hash_sha256: sha256(contenido), warnings, extra });
const porNumero = (a: string, b: string) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b);
const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// ── A: Código de Comercio (Decreto 73-50), fuente BCH ────────────────────────
function parseComercio(): Resultado {
  const base = { clave: 'A', dir: 'codigo-comercio', instrumento: 'Código de Comercio (Decreto 73-50)', fuenteKeys: ['A'] as Clave[], id_prefix: 'mayalex_normativos:codigo_comercio_bch_d73_50', fuente: 'Codigo de Comercio (Decreto 73-50)', materia: '10_LEYES_REGLAMENTOS', fuente_tipo: 'codigo', conSql: true };
  if (!verif.A.ok) return { ...base, estado: 'BLOCKED_SHA_MISMATCH', pages: null, textSha: null, counts: {}, filas: [], notas: ['SHA-256 no coincide o archivo ausente: fuente abortada'], extraManifest: {} };
  const raw = pdfText(verif.A.ruta, ['-layout']);
  const limpio = raw.replace(/\r\n/g, '\n').replace(/\f/g, '\n')
    // Glifo espurio «Articulo º/° N» del escaneo (fix portado de fix/comercio-glifo-ordinal, c529f99).
    .replace(/(art[ií]culos?)\s*[º°]\s*(\d)/gi, '$1 $2')
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, '').replace(/\n{3,}/g, '\n\n');
  const glifos = (raw.match(/art[ií]culos?\s*[º°]\s*\d/gi) ?? []).length;
  const cands = segmentarGenerico(limpio, { exigirOrtografiaSinTilde: true });
  const acept = cands.filter((c) => c.aceptado), rech = cands.filter((c) => !c.aceptado);
  const grupos = new Map<string, typeof acept>();
  for (const c of acept) grupos.set(c.numArticulo, [...(grupos.get(c.numArticulo) ?? []), c]);
  const EXCLUIR = ['418', '1662'];
  const excluidos: string[] = [], dedup: string[] = [], noResueltos: string[] = [];
  const excluidosDetalle: Array<{ num_articulo: string; ocurrencia: number; estado: string; sha256: string; chars: number; vista_previa: string }> = [];
  const dedupDetalle: Array<{ num_articulo: string; conservada: 'A' | 'B'; identicas: boolean; sha256_conservada: string; sha256_descartada: string; texto_conservado: string; texto_descartado: string }> = [];
  const finalesTxt = new Map<string, string>();
  for (const [n, occ] of grupos) {
    if (EXCLUIR.includes(n)) {
      excluidos.push(n);
      occ.forEach((o, i) => excluidosDetalle.push({ num_articulo: n, ocurrencia: i + 1, estado: 'EXCLUIDO (ni PRIMARY ni CONTEXT; sin renumerar)', sha256: sha256(o.contenido), chars: o.contenido.length, vista_previa: o.contenido.replace(/\s+/g, ' ').slice(0, 90) }));
      continue;
    }
    if (occ.length === 1) { finalesTxt.set(n, occ[0].contenido); continue; }
    const [a, b] = occ;
    if (occ.length === 2 && sinAcentos(a.contenido) === sinAcentos(b.contenido)) {
      dedup.push(n);
      const conservaA = a.contenido === b.contenido || (/[áéíóú]/i.test(a.contenido) && a.contenido.replace(/[^áéíóúÁÉÍÓÚ]/g, '').length >= b.contenido.replace(/[^áéíóúÁÉÍÓÚ]/g, '').length);
      const [keep, drop] = conservaA ? [a, b] : [b, a];
      finalesTxt.set(n, keep.contenido);
      dedupDetalle.push({ num_articulo: n, conservada: conservaA ? 'A' : 'B', identicas: a.contenido === b.contenido, sha256_conservada: sha256(keep.contenido), sha256_descartada: sha256(drop.contenido), texto_conservado: keep.contenido, texto_descartado: drop.contenido });
    } else noResueltos.push(n);
  }
  const PRENDA = new Set(['1278', ...Array.from({ length: 19 }, (_, i) => String(1289 + i)), '1313']);
  const nums = [...finalesTxt.keys()].sort(porNumero);
  const filas = nums.map((n) => {
    const ctx = PRENDA.has(n);
    return mkFila(base.id_prefix, n, ctx ? 'CONTEXT' : 'PRIMARY', finalesTxt.get(n)!, ctx ? ['Prenda: desplazado_por D.182-2009 (Ley de Garantías Mobiliarias); no citar como norma vigente'] : [], ctx ? { desplazado_por: 'D.182-2009' } : {});
  });
  const max = Math.max(...nums.map(Number)); const huecos: number[] = [];
  for (let i = 1; i <= max; i++) if (!finalesTxt.has(String(i)) && !EXCLUIR.includes(String(i))) huecos.push(i);
  const GAP_ESPERADO = [417, 1000, ...Array.from({ length: 10 }, (_, i) => 1236 + i), 1661];
  if (JSON.stringify(huecos) !== JSON.stringify(GAP_ESPERADO)) throw new Error(`GAP_IN_SOURCE inesperado: ${huecos.join(',')}`);
  const gapIn = huecos.map((n) => ({ num_articulo: String(n), estado: 'GAP_IN_SOURCE', nota: 'ausente en BCH y DGMM (cotejo CLO, 27-oct-2026); no se inventa ni se rellena' }));
  const NOTA_NUM = 'numeración defectuosa en la fuente; la posición sugiere 417 y 1661, no verificado contra Gaceta';
  const ctxPresentes = nums.filter((n) => PRENDA.has(n)); const ctxAusentes = [...PRENDA].filter((n) => !finalesTxt.has(n));
  say('\n=== A. Código de Comercio (Decreto 73-50) — dry-run ===');
  say(`páginas=${pdfInfoPages(verif.A.ruta)} glifos «Articulo º/° N» normalizados=${glifos}`);
  say(`candidatos=${cands.length} aceptados=${acept.length} rechazados=${rech.length} números únicos aceptados=${grupos.size}`);
  say(`duplicados=${[...grupos].filter(([, o]) => o.length > 1).map(([n, o]) => `${n}x${o.length}`).join(',')}`);
  say(`excluidos CLO (ambas ocurrencias)=${excluidos.sort(porNumero).join(',')}; deduplicados (sin pérdida de texto)=${dedup.join(',')}; no resueltos=${noResueltos.join(',') || '(ninguno)'}`);
  say(`finales=${filas.length} (PRIMARY=${filas.filter((f) => f.role === 'PRIMARY').length}, CONTEXT prenda=${filas.filter((f) => f.role === 'CONTEXT').length}); prenda esperada=${PRENDA.size}, presente=${ctxPresentes.length}, ausente=${ctxAusentes.join(',') || '(ninguna)'}`);
  say(`GAP_IN_SOURCE (ausentes en BCH y DGMM) 1..${max}: ${huecos.length} → ${huecos.join(',')}`);
  say(`418 y 1662: ${excluidosDetalle.length} textos EXCLUIDOS (2 por número); ${NOTA_NUM}`);
  anexos.push([
    '## Código de Comercio — excluidos 418 y 1662 y GAP_IN_SOURCE (dictamen CLO 27-oct-2026)', '',
    `CLO cotejó BCH (${code('57c42a07…')}) y DGMM (${code('cd8b55fb…')}): ambas copias tienen los mismos defectos; es la fuente, no el parser.`, '',
    `**Nota:** ${NOTA_NUM}.`, '',
    '### Los CUATRO textos excluidos (no PRIMARY, no CONTEXT, no renumerados)', '',
    '| Art. | Ocurrencia | Caracteres | SHA-256 | Vista previa |', '| --- | --- | --- | --- | --- |',
    ...excluidosDetalle.map((e) => `| ${e.num_articulo} | ${e.ocurrencia} | ${e.chars} | ${code(e.sha256)} | ${e.vista_previa.replace(/\|/g, '/')} |`), '',
    '### GAP_IN_SOURCE (ausentes en BCH y DGMM; no se inventan ni se rellenan)', '',
    `${huecos.join(', ')} (${huecos.length} números: 417, 1000, 1236–1245 y 1661)`, '',
    '### Deduplicados 1511 y 1541 (texto documentado)', '',
    ...dedupDetalle.flatMap((d) => [
      `**Art. ${d.num_articulo}** — ${d.identicas ? 'las dos ocurrencias son idénticas' : 'las ocurrencias difieren solo en acentuación del OCR'}; se conserva la ocurrencia ${d.conservada} (SHA-256 ${code(d.sha256_conservada)}).`, '',
      'Conservada:', '', FENCE + 'text', d.texto_conservado, FENCE, '',
      ...(d.identicas ? [] : [`Descartada (SHA-256 ${code(d.sha256_descartada)}):`, '', FENCE + 'text', d.texto_descartado, FENCE, '']),
    ]),
  ].join('\n'));
  return { ...base, estado: noResueltos.length ? 'BLOCKED_DUPLICADOS_NO_RESUELTOS' : 'READY_FOR_STAGING_REVIEW', pages: pdfInfoPages(verif.A.ruta), textSha: sha256(limpio),
    counts: { candidatos: cands.length, aceptados: acept.length, rechazados: rech.length, finales: filas.length, excluidos: excluidos.sort(porNumero), deduplicados: dedup, duplicados_no_resueltos: noResueltos, gap_in_source: huecos, excluidos_textos: excluidosDetalle.length, curacion: { glifos_ordinales_normalizados: glifos, prenda_context: ctxPresentes.length } },
    filas, notas: [NOTA_NUM, `GAP_IN_SOURCE: ${huecos.join(',')}`], extraManifest: { gap_in_source: gapIn, excluidos_detalle: excluidosDetalle, deduplicados_detalle: dedupDetalle.map((d) => ({ ...d, texto_conservado: undefined, texto_descartado: undefined })), nota_numeracion: NOTA_NUM, dictamen_clo: 'CLO 27-oct-2026: cotejadas BCH (57c42a07…) y DGMM (cd8b55fb…); mismos defectos en ambas copias (es la fuente, no el parser).', citado_como: 'Decreto 73-50', fecha_instrumento: 'no verificada; las fuentes discrepan', reformas_solo_metadata: ['D.255-2002 art. 8', 'D.284-2013 arts. 13 y 37', 'D.127-2026 = NO_VERIFICADA']} };
}

// ── B: Código del Notariado, arts. 72, 72-A y 73 (texto D.59-2015, de COTEJO) ─
function parseNotariado(): Resultado {
  const base = { clave: 'B', dir: 'codigo-notariado-d59-2015', instrumento: 'Código del Notariado (Decreto 353-2005), arts. 72, 72-A y 73 en texto D.59-2015', fuenteKeys: ['B1', 'B2'] as Clave[], id_prefix: 'mayalex_normativos:codigo_notariado_d59_2015', fuente: 'Código del Notariado de Honduras (Decreto 353-2005)', materia: '03_NOTARIAL', fuente_tipo: 'codigo', conSql: true };
  if (!verif.B1.ok || !verif.B2.ok) return { ...base, estado: 'BLOCKED_SHA_MISMATCH', pages: null, textSha: null, counts: {}, filas: [], notas: ['SHA-256 no coincide o archivo ausente: fuente abortada'], extraManifest: {} };
  const md = readFileSync(verif.B2.ruta, 'utf8');
  const ini = md.indexOf('## 2. Texto literal'); const fin = md.indexOf('**ARTÍCULO 2.-**');
  if (ini < 0 || fin < 0) throw new Error('COTEJO: no se hallaron los límites de la sección 2');
  const lineas = md.slice(ini, fin).split('\n').map((l) => l.replace(/^>\s?/, ''));
  let texto = '';
  let pendienteUnion = false;
  for (const l of lineas) {
    if (/^##/.test(l)) { pendienteUnion = !/[.;:”"]\s*$/.test(texto.trimEnd()); continue; }
    if (l.trim() === '' && pendienteUnion) continue;
    if (l.trim() !== '' && pendienteUnion) { texto = texto.trimEnd() + ' ' + l.trim() + '\n'; pendienteUnion = false; continue; }
    texto += l + '\n';
  }
  texto = texto.replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n');
  const p72 = texto.indexOf('ARTÍCULO 72.-'), p72a = texto.indexOf('ARTÍCULO 72-A.-'), p73 = texto.indexOf('ARTÍCULO 73.-');
  if (!(p72 >= 0 && p72a > p72 && p73 > p72a)) throw new Error('COTEJO: orden de artículos inesperado');
  const corte = (s: string) => s.trim().replace(/^[“"]+/, '').replace(/[”"]+\.?$/, '').trim();
  const art = (s: string) => corte(s.replace(/[“"]\s*$/, ''));
  const t72 = art(texto.slice(p72, p72a)), t72a = art(texto.slice(p72a, p73)), t73 = art(texto.slice(p73));
  const filas = [
    mkFila(base.id_prefix, '72', 'CONTEXT', t72, ['Solo CONTEXT (CLO): NOTARIADO_SOLO_CONTEXT_CLO'], { elegible_primary: false, version: 'D.59-2015', gaceta: 'La Gaceta 33,801 (6-ago-2015)' }),
    mkFila(base.id_prefix, '72-A', 'CONTEXT', t72a, ['Solo CONTEXT (CLO)', 'PENDING_CLO'], { elegible_primary: false, estado_editorial: 'PENDING_CLO', version: 'D.59-2015', gaceta: 'La Gaceta 33,801 (6-ago-2015)' }),
    mkFila(base.id_prefix, '73', 'CONTEXT', t73, ['Solo CONTEXT (CLO): NOTARIADO_SOLO_CONTEXT_CLO'], { elegible_primary: false, version: 'D.59-2015', gaceta: 'La Gaceta 33,801 (6-ago-2015)' }),
  ];
  say('\n=== B. Código del Notariado, arts. 72, 72-A, 73 (D.59-2015) — dry-run ===');
  say(`Gaceta 33,801: páginas=${pdfInfoPages(verif.B1.ruta)} (fuente de verificación; el texto sale SOLO del COTEJO, no del OCR)`);
  filas.forEach((f) => say(`art. ${f.num_articulo}: ${f.contenido.length} chars, role=${f.role}, sha256=${f.hash_sha256}`));
  say('no cargados: 11 (TEXTO_DIVERGENTE), 17 (HUECO), 27 (TEXTO_DIVERGENTE)');
  anexos.push([
    '## Código del Notariado — art. 72-A, texto literal según el COTEJO (para adjudicación de CLO)', '',
    `Rol: CONTEXT · estado editorial: PENDING_CLO · ${code('elegible_primary=false')}. Fuente del texto: ${code('B2_COTEJO-D59-2015-literal.md')} (SHA-256 ${code(verif.B2.obtenido)}), La Gaceta 33,801 (6-ago-2015), D.59-2015. SHA-256 del texto cargado: ${code(filas[1].hash_sha256)} (${filas[1].contenido.length} caracteres). Las únicas diferencias con el COTEJO son la retirada de marcas Markdown (negritas, citas ${code('>')}, rótulos de columna) y la unión de oraciones partidas entre columnas.`, '',
    FENCE + 'text', filas[1].contenido, FENCE, '',
  ].join('\n'));
  return { ...base, estado: 'READY_FOR_STAGING_REVIEW', pages: pdfInfoPages(verif.B1.ruta), textSha: verif.B2.obtenido,
    counts: { candidatos: 3, aceptados: 3, rechazados: 0, finales: 3, excluidos: ['11', '17', '27'], curacion: { pending_clo: ['72-A'], solo_context: ['72', '72-A', '73'] } }, filas,
    notas: ['La cadena oculta de la capa de texto en A.4 (señalada en el COTEJO) no forma parte del texto cargado.'], extraManifest: { texto_origen: 'B2_COTEJO-D59-2015-literal.md (transcripción literal verificada visualmente); nunca OCR crudo', no_cargar: { '11': 'TEXTO_DIVERGENTE', '17': 'HUECO', '27': 'TEXTO_DIVERGENTE' }, versiones: 'las filas 2005 y 2015 son filas distintas', reglamento_pcsj_17_2012: 'fuera de alcance' } };
}

// ── C: Decreto 284-2013, solo Título II (arts. 15 a 25) ─────────────────────
function parseD284(): Resultado {
  const base = { clave: 'C', dir: 'decreto-284-2013-titulo-ii', instrumento: 'Decreto 284-2013, Título II (arts. 15 a 25)', fuenteKeys: ['C'] as Clave[], id_prefix: 'mayalex_normativos:decreto_284_2013_titulo_ii', fuente: 'Decreto 284-2013 (La Gaceta 33,445), Título II', materia: '10_LEYES_REGLAMENTOS', fuente_tipo: 'ley', conSql: true };
  if (!verif.C.ok) return { ...base, estado: 'BLOCKED_SHA_MISMATCH', pages: null, textSha: null, counts: {}, filas: [], notas: ['SHA-256 no coincide o archivo ausente: fuente abortada'], extraManifest: {} };
  const ruta = verif.C.ruta; const paginas = pdfInfoPages(ruta);
  const completo = pdfText(ruta).split('\f');
  const pIni = completo.findIndex((p) => p.includes('DECRETO No.284-2013') && p.includes('EL CONGRESO NACIONAL')) + 1;
  if (pIni <= 0) throw new Error('no se halló «DECRETO No.284-2013»');
  const BASURA = [/^La Gaceta$/, /^REPÚBLICA DE HONDURAS - TEGUCIG$/, /^Sección A Acuerdos y Leyes$/, /^GALPA, M\. D\. C\., 5 DE JUNIO DEL 2014$/, /^No\. 33,445$/, /^A\.$/, /^\d{1,3}$/];
  const lineas: string[] = []; let dentro = false, terminado = false;
  outer: for (let p = pIni; p <= Math.min(paginas, pIni + 15); p++) {
    for (const x of [0, 396]) {
      const col = pdfText(ruta, ['-f', String(p), '-l', String(p), '-x', String(x), '-y', '0', '-W', '396', '-H', '1224']);
      for (const l of col.split('\n').map((s) => s.trim())) {
        if (/^TÍTULO II$/.test(l)) { dentro = true; continue; }
        if (dentro && /^TÍTULO III$/.test(l)) { terminado = true; break outer; }
        if (!dentro || BASURA.some((r) => r.test(l))) continue;
        lineas.push(l);
      }
    }
  }
  if (!dentro || !terminado) throw new Error('no se delimitó el Título II (TÍTULO II → TÍTULO III)');
  // El rótulo del Título II ("DE LA SIMPLIFICACIÓN…") precede al art. 15; se descarta como encabezado.
  const cuerpo = lineas.join('\n').replace(/\n{3,}/g, '\n\n');
  const iArt = cuerpo.search(/^ARTÍCULO 15\.-/m);
  const texto = cuerpo.slice(iArt);
  const partes = [...texto.matchAll(/^ARTÍCULO (\d+)\.-/gm)];
  const arts = partes.map((m, i) => ({ n: m[1], t: texto.slice(m.index!, partes[i + 1]?.index ?? texto.length).replace(/\n(?!\n)/g, ' ').replace(/ {2,}/g, ' ').replace(/\s*\n\n\s*/g, '\n\n').trim() }));
  const nums = arts.map((a) => a.n);
  const esperado = Array.from({ length: 11 }, (_, i) => String(15 + i));
  const coincide = JSON.stringify(nums) === JSON.stringify(esperado);
  say('\n=== C. Decreto 284-2013, Título II — dry-run ===');
  say(`Gaceta 33,445: páginas=${paginas}; decreto inicia en pág. ${pIni}`);
  say(`artículos hallados=${nums.length} → ${nums.join(',')} ; esperado 11 (15..25): ${coincide ? 'COINCIDE' : 'DIFIERE — no se fuerza'}`);
  const filas = coincide ? arts.map((a) => mkFila(base.id_prefix, a.n, 'PRIMARY', a.t, [], { vigencia_metadata: 'TRUE_PRESUNTA (solo metadata)', gaceta: 'La Gaceta 33,445 (5-jun-2014)' })) : [];
  filas.forEach((f) => say(`art. ${f.num_articulo}: ${f.contenido.length} chars, sha256=${f.hash_sha256}`));
  return { ...base, estado: coincide ? 'READY_FOR_STAGING_REVIEW' : 'BLOCKED_CONTEO_DIFIERE', pages: paginas, textSha: sha256(texto),
    counts: { candidatos: nums.length, aceptados: nums.length, rechazados: 0, finales: filas.length, excluidos: [], curacion: { recorte: 'desde «DECRETO No.284-2013»; Título II = «TÍTULO II» → «TÍTULO III» (extracción por columna, pdftotext -x/-W)' } }, filas,
    notas: ['Extracción por columna (la Gaceta imprime a dos columnas).'], extraManifest: { autonomo: true, no_vincular_como_restauracion_de: 'Código del Notariado arts. 60–71', vigencia: 'TRUE_PRESUNTA solo como metadata', materia_nota: 'materia 10_LEYES_REGLAMENTOS provisional (no 03_NOTARIAL) hasta decisión CLO' } };
}

// ── D: Ley de Garantías Mobiliarias (escaneo; solo manifiesto) ───────────────
function parseGarantias(): Resultado {
  const base = { clave: 'D', dir: 'ley-garantias-mobiliarias', instrumento: 'Ley de Garantías Mobiliarias (D.182-2009)', fuenteKeys: ['D'] as Clave[], id_prefix: 'mayalex_normativos:ley_garantias_mobiliarias_d182_2009', fuente: '', materia: '', fuente_tipo: '', conSql: false };
  if (!verif.D.ok) return { ...base, estado: 'BLOCKED_SHA_MISMATCH', pages: null, textSha: null, counts: {}, filas: [], notas: ['SHA-256 no coincide o archivo ausente: fuente abortada'], extraManifest: {} };
  const paginas = pdfInfoPages(verif.D.ruta); const t = pdfText(verif.D.ruta).replace(/\s/g, '');
  say('\n=== D. Ley de Garantías Mobiliarias (D.182-2009) — dry-run ===');
  say(`páginas=${paginas}; caracteres de capa de texto (sin espacios)=${t.length}`);
  const sinTexto = t.length < 200;
  say(sinTexto ? 'capa de texto AUSENTE → NEEDS_TEXT_LAYER (solo manifiesto; sin filas ni SQL)' : 'capa de texto PRESENTE (inesperado) — no se parsea en este PR');
  return { ...base, estado: sinTexto ? 'NEEDS_TEXT_LAYER' : 'BLOCKED_TEXTO_INESPERADO', pages: paginas, textSha: null, counts: { candidatos: 0, aceptados: 0, rechazados: 0, finales: 0, excluidos: [], curacion: { caracteres_capa_texto: t.length } }, filas: [], notas: ['Escaneo sin capa de texto: requiere OCR/capa de texto verificada antes de cualquier parseo.'], extraManifest: {} };
}

// ── Escritura de artefactos ──────────────────────────────────────────────────
const COLS = 'id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente';
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
function sqlDe(r: Resultado, sourceShas: string): string {
  const cab = [
    '-- TARGET: staging aicakncgtuiiuomflkqj ONLY. NOT APPLIED. NO PRODUCTION.',
    `-- Instrumento: ${r.instrumento}`, `-- id_prefix: ${r.id_prefix}`, `-- Fuentes verificadas (SHA-256): ${sourceShas}`,
    `-- Filas: ${r.filas.length}. Estado: ${r.estado} + BLOCKED_SCHEMA + EMBEDDINGS_PENDING.`,
    '--   * jurisdiccion, fuente_tipo y es_norma_vigente no tienen DDL en supabase/vectores.sql ni en supabase/migrations.',
    '--   * embedding es NOT NULL y no hay embeddings generados localmente (se escribe NULL como marcador).',
    '-- TODO el INSERT está COMENTADO (cada línea con «-- »). No descomentar sin CLO + verificación de esquema en staging.',
    '-- es_norma_vigente = false en todas las filas. Sin DDL ni borrados: solo INSERT aditivo e idempotente.', '',
    '-- BEGIN;', `-- INSERT INTO public.biblioteca_vectores (${COLS})`, '-- VALUES'];
  const filas = r.filas.map((f, i) => {
    const meta = { norm_id: r.id_prefix, instrumento: r.instrumento, rol: f.role, hash_texto_sha256: f.hash_sha256, vigencia_state: 'NO_VERIFICADO', verificado: false, warnings: f.warnings, ...f.extra };
    const v = `(${lit(f.id)}, 'mayalex_normativos', ${lit(r.materia)}, ${lit(f.contenido)}, ${lit(f.num_articulo)}, ${lit(r.fuente)}, ${lit(JSON.stringify(meta))}::jsonb, NULL /* EMBEDDINGS_PENDING */, 'HN', ${lit(r.fuente_tipo)}, false)${i === r.filas.length - 1 ? '' : ','}`;
    return v.split('\n').map((l) => `--   ${l}`).join('\n');
  });
  const pie = ['-- ON CONFLICT (id) DO NOTHING;', '-- COMMIT;', '', '-- Verificación posterior (comentada):',
    `-- select count(*) from public.biblioteca_vectores where id like '${r.id_prefix}\\_a%';`, `-- select num_articulo, count(*) from public.biblioteca_vectores where id like '${r.id_prefix}\\_a%' group by 1 order by 1;`, ''];
  return [...cab, ...filas, ...pie].join('\n');
}

const resultados = [parseComercio(), parseNotariado(), parseD284(), parseGarantias()];
mkdirSync(OUT, { recursive: true });
const resumenSql: Array<[string, string]> = [];
for (const r of resultados) {
  const d = join(OUT, r.dir); mkdirSync(d, { recursive: true });
  const fuentes = r.fuenteKeys.map((k) => ({ id: k, archivo: FUENTES[k].archivo, source_url: FUENTES[k].url, sha256_esperado: FUENTES[k].sha256, sha256_obtenido: verif[k].obtenido, bytes: verif[k].bytes, sha_coincide: verif[k].obtenido === FUENTES[k].sha256, en_SHA256SUMS: verif[k].enSumas }));
  const main = fuentes[0];
  const manifest = {
    instrumento: r.instrumento, estado: r.estado, estados_adicionales: r.conSql ? ['BLOCKED_SCHEMA', 'EMBEDDINGS_PENDING'] : [], id_prefix: r.id_prefix,
    source_url: main.source_url, sha256_esperado: main.sha256_esperado, sha256_obtenido: main.sha256_obtenido, bytes: main.bytes, pages: r.pages,
    fuentes, retrieved_at: retrievedAt, retrieved_via: 'archivos locales verificados por CLO (zip), --local; el SHA-256 se recalculó en este entorno', text_sha256: r.textSha, parser: PARSER,
    counts: r.counts, articulos: r.filas.map((f) => f.num_articulo),
    filas: r.filas.map((f) => ({ id: f.id, num_articulo: f.num_articulo, role: f.role, hash_sha256: f.hash_sha256, chars: f.contenido.length, warnings: f.warnings })),
    es_norma_vigente: false, pdf_versionado_en_repo: false, notas: r.notas, ...r.extraManifest,
  };
  writeFileSync(join(d, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (r.conSql && r.filas.length) {
    const sql = sqlDe(r, fuentes.map((f) => `${f.id}=${f.sha256_obtenido}`).join(' '));
    writeFileSync(join(d, 'load.staging.sql'), sql);
    resumenSql.push([`${r.dir}/load.staging.sql`, sha256(sql)]);
  }
}

// ── DRY_RUN_COUNTS.md ────────────────────────────────────────────────────────
const fmt = (v: unknown) => (Array.isArray(v) ? v.join(', ') || '—' : String(v ?? '—'));
const tabla = resultados.map((r) => `| ${r.instrumento} | ${r.estado}${r.conSql ? ' + BLOCKED_SCHEMA + EMBEDDINGS_PENDING' : ''} | ${fmt((r.counts as any).candidatos)} | ${fmt((r.counts as any).aceptados)} | ${fmt((r.counts as any).rechazados)} | ${fmt((r.counts as any).finales)} | ${fmt((r.counts as any).excluidos)} |`).join('\n');
const tablaHash = (Object.keys(FUENTES) as Clave[]).map((k) => `| ${k} | ${FUENTES[k].archivo} | ${verif[k].bytes} | \`${verif[k].obtenido}\` | ${verif[k].obtenido === FUENTES[k].sha256 ? 'COINCIDE' : 'NO COINCIDE'} |`).join('\n');
const md = `# P21 — DRY_RUN_COUNTS (staging \`aicakncgtuiiuomflkqj\`; NO APLICADO)

Generado por \`npx tsx tools/corpus/p21-build.ts --local <carpeta>\` (sin BD, sin red, sin variables de entorno) el ${retrievedAt}.
Las fuentes se verificaron por SHA-256 recalculado sobre archivos locales entregados por CLO; los PDF no se versionan en el repo.

## SHA-256 de las fuentes

| Fuente | Archivo | Bytes | SHA-256 obtenido | Contra esperado |
| --- | --- | --- | --- | --- |
${tablaHash}

## Esperado vs obtenido

| Instrumento | Estado | Candidatos | Aceptados | Rechazados | Finales | Excluidos |
| --- | --- | --- | --- | --- | --- | --- |
${tabla}

Esperado: Comercio sin 418 ni 1662; Notariado 3 filas (72, 72-A, 73) sin 11/17/27; D.284-2013 Título II = 11 artículos (15..25); Garantías Mobiliarias sin filas (NEEDS_TEXT_LAYER).
Observación Comercio: el conteo final (1698) coincide con el de una corrida anterior sobre otra fuente; aquí se obtuvo de forma independiente desde los bytes BCH verificados.

## SHA-256 de los load.staging.sql (todos con el INSERT comentado)

| Archivo | SHA-256 |
| --- | --- |
${resumenSql.map(([a, h]) => `| ${a} | \`${h}\` |`).join('\n')}

## Salida literal de los dry-runs

\`\`\`text
${log.join('\n')}
\`\`\`

${anexos.join('\n')}
## Brecha de esquema (BLOCKED_SCHEMA + EMBEDDINGS_PENDING)

Columnas que usa el INSERT de \`load.staging.sql\` y dónde están definidas en el repo:

| Columna | \`supabase/vectores.sql\` | \`supabase/migrations/\` |
| --- | --- | --- |
| \`id\` (PK) | sí | — |
| \`coleccion\`, \`materia\`, \`contenido\`, \`num_articulo\`, \`fuente\`, \`metadata\` | sí | — |
| \`embedding\` (\`vector(384) NOT NULL\`) | sí | — |
| \`created_at\` (no usada por el INSERT) | sí | — |
| \`revision_pendiente\` (no usada por el INSERT) | no | sí (\`20260925055249_revision_pendiente_instrumentos.sql\`) |
| **\`jurisdiccion\`** | **no** | **no** (solo referenciada en una función) |
| **\`fuente_tipo\`** | **no** | **no** (solo referenciada en una función) |
| **\`es_norma_vigente\`** | **no** | **no** (solo referenciada en una función) |

Consecuencia (confirmada por CLO): el INSERT va **comentado** y marcado \`BLOCKED_SCHEMA\`; \`embedding\` es \`NOT NULL\` y no hay
embeddings locales, así que se escribe \`NULL /* EMBEDDINGS_PENDING */\` como marcador y el INSERT no es ejecutable tal cual.
No se creó ninguna migración. Las tres columnas existen en producción (auditorías previas), pero su DDL no está versionado en el repo;
cómo versionarlo lo deciden Fredy/CLO fuera de este PR.
`;
writeFileSync(join(OUT, 'DRY_RUN_COUNTS.md'), md);
console.log(`\nArtefactos escritos en ${OUT}`);
