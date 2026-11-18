/**
 * A03 · barrido de calidad frente a la v7 del D.35-2013 — paso 1: exporta los segmentos que compara barrido_a03_v7.py.
 *
 * - A03 (consolidado, bytes bd115673…, texto 67116d82…): `segmentarArticulos` del corpus-factory, el mismo que produjo el candidato.
 *   Se detiene si no salen 302 artículos con los mismos números y sha256 del candidato.
 * - v7 (460e493d…): `segmentarSerieCorrelativa(texto, 19)`, como la ingesta. Dentro de los arts. 1 y 3 del decreto, cada artículo del Código
 *   de la Niñez transcrito empieza en una línea con comilla de apertura («"ARTÍCULO 141.-»); el cuerpo llega hasta el siguiente.
 *
 * Solo lee archivos del repositorio. No escribe en ninguna base.
 * Uso (raíz del repo): npx tsx <este archivo> <salida.json>
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { segmentarArticulos, segmentarSerieCorrelativa } from '../../../../../lib/legal-os/corpus-factory/staging';

const RAIZ = 'docs/corpus';
const SHA_V7 = '460e493db5e97a9dba53345010281dc338642edee525b6cfbc9fee2f3ddab023';
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

const pkg = JSON.parse(readFileSync(`${RAIZ}/inbox/2026-11-04-hn-001-tranche-a-drive/HN-001-A03.json`, 'utf8'));
const cand = JSON.parse(readFileSync(`${RAIZ}/staging/2026-11-04-hn-001-tranche-a-drive/candidates/PKG_CODIGO_DE_LA_NINEZ_Y_DE_LA_ADOLESCENCIA@v1.json`, 'utf8'));
if (sha(pkg.extracted_text) !== cand.hashes.text_sha256) throw new Error('el texto de A03 no es el del candidato (67116d82…)');
const a03 = segmentarArticulos(pkg.extracted_text);
if (a03.articulos.length !== 302 || a03.articulos.some((a, i) => cand.articulos[i]?.numero !== a.numero || cand.articulos[i]?.sha256 !== a.sha256)) {
  throw new Error('la segmentación de A03 no reproduce los 302 artículos del candidato');
}

const v7 = readFileSync(`${RAIZ}/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/A04_transcripcion_candidata_v7.txt`, 'utf8').replace(/\r\n?/g, '\n');
if (sha(v7) !== SHA_V7) throw new Error('la v7 no tiene el hash firmado (460e493d…)');
const decreto = segmentarSerieCorrelativa(v7, 19).articulos;
const ENCABEZADO_INTERNO = /^[ \t]*["“][ \t]*ART[ÍI]CULO[ \t]+(\d{1,4}(?:[ \t]*-[ \t]*[A-Z])?)[ \t]*\.?[ \t]*-?/gm;
const internos: Array<{ articulo_decreto: string; numero: string; texto: string }> = [];
for (const n of ['1', '3']) {
  const t = decreto.find((a) => a.numero === n)!.texto;
  const hs = [...t.matchAll(ENCABEZADO_INTERNO)];
  hs.forEach((m, i) => {
    const fin = i + 1 < hs.length ? hs[i + 1].index! : t.length;
    internos.push({ articulo_decreto: n, numero: m[1].replace(/[ \t]/g, '').toUpperCase(), texto: t.slice(m.index! + m[0].length, fin).trim() });
  });
}

writeFileSync(process.argv[2], JSON.stringify({
  a03: { bytes_sha256: cand.hashes.bytes_sha256, text_sha256: cand.hashes.text_sha256, articulos: a03.articulos, notas: a03.notas },
  v7: { sha256: SHA_V7, decreto: decreto.map((a) => ({ numero: a.numero, texto: a.texto })), internos },
}, null, 1));
console.log(`A03: ${a03.articulos.length} artículos (hashes del candidato OK), ${a03.notas.length} notas · v7: ${internos.length} artículos transcritos en los arts. 1 y 3`);
