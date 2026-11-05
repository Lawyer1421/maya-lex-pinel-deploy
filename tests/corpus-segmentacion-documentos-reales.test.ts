/**
 * Regresión con los DOCUMENTOS REALES del Tramo A (texto extraído, ya versionado en docs/corpus/inbox/2026-11-04-hn-001-tranche-a-drive/).
 * Fijan lo comprobado: lo que sigue ausente, repetido o dudoso en la fuente se registra como pendiente; no se «arregla» por heurística.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { segmentarArticulos, qaTexto } from '../lib/legal-os/corpus-factory/staging';

const DIR = join(__dirname, '../docs/corpus/inbox/2026-11-04-hn-001-tranche-a-drive');
const cargar = (id: string) => {
  const ruta = join(DIR, `${id}.json`);
  return existsSync(ruta) ? (JSON.parse(readFileSync(ruta, 'utf8')) as { extracted_text: string; text_sha256: string; document_type: string; source_domain: string }) : null;
};
const numericos = (nums: string[]): number[] => nums.filter((n) => /^\d+$/.test(n)).map(Number);

describe('A02 · Decreto 284-2013 (La Gaceta 33,445): 39 artículos, sin citas internas como artículos', () => {
  const p = cargar('HN-001-A02');
  it.skipIf(!p)('segmenta exactamente 39 artículos, en orden, sin repetidos (la cita «Artículo 17-A;» ya no crea el 40.º)', () => {
    const seg = segmentarArticulos(p!.extracted_text);
    expect(seg.articulos.map((a) => a.numero)).toEqual(Array.from({ length: 39 }, (_, i) => String(i + 1)));
    expect(seg.notas).toEqual([]);
  });
  it.skipIf(!p)('el art. 13 reforma los 12 artículos del Código de Comercio y el art. 37 deroga 380–383', () => {
    const seg = segmentarArticulos(p!.extracted_text);
    const plano = (n: string) => seg.articulos.find((a) => a.numero === n)!.texto.replace(/\s+/g, ' ');
    expect(plano('13')).toMatch(/Reformar los art[ií]culos 14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 y 228 del C[oó]digo de Comercio/);
    expect(plano('37')).toMatch(/Derogar los Art[ií]culos 380, 381, 382 y 383 del C[oó]digo de Comercio/);
    expect(plano('39')).toMatch(/entrar[aá] en vigencia/);
  });
});

describe('A01 · Código de Comercio (Norma 73-50): discontinuidades registradas, no resueltas', () => {
  const p = cargar('HN-001-A01');
  it.skipIf(!p)('1,705 artículos, hasta el 1714; los 13 números ausentes y los 4 repetidos con cuerpo propio son exactamente los comprobados', () => {
    const seg = segmentarArticulos(p!.extracted_text);
    const nums = seg.articulos.map((a) => a.numero);
    const set = new Set(numericos(nums));
    const faltantes = Array.from({ length: 1714 }, (_, i) => i + 1).filter((n) => !set.has(n));
    expect(seg.articulos.length).toBe(1705);
    expect(Math.max(...numericos(nums))).toBe(1714);
    expect(faltantes).toEqual([417, 1000, 1236, 1237, 1238, 1239, 1240, 1241, 1242, 1243, 1244, 1245, 1661]);
    expect([...new Set(nums.filter((n, i) => nums.indexOf(n) !== i))]).toEqual(['418', '1511', '1541', '1662']);
    expect(numericos(nums).every((n, i, a) => i === 0 || n >= a[i - 1])).toBe(true); // sin retrocesos
  });
  it.skipIf(!p)('el artículo 504 (encabezado repetido sin cuerpo) se funde en uno; el 1432 con cuerpo en la misma línea y los de comienzo de página se reconocen', () => {
    const seg = segmentarArticulos(p!.extracted_text);
    const nums = seg.articulos.map((a) => a.numero);
    expect(nums.filter((n) => n === '504').length).toBe(1);
    expect(nums).toContain('1432');
    expect(nums).toContain('165');
    expect(seg.articulos.find((a) => a.numero === '1432')!.texto).toMatch(/^Desde el momento de la declaraci[oó]n de quiebra/);
  });
  it.skipIf(!p)('el QA ya no da por bueno 1 artículo en 654 mil caracteres', () => {
    const seg = segmentarArticulos(p!.extracted_text);
    const qa = qaTexto({ extracted_text: p!.extracted_text, text_sha256: p!.text_sha256, document_type: 'CODE', source_domain: p!.source_domain }, seg);
    expect(qa.chequeos.find((c) => c.id === 'ARTICLES_PLAUSIBLE')?.ok).toBe(true);
  });
});

describe('A03 · Código de la Niñez consolidado: notas al pie separadas de los artículos', () => {
  const p = cargar('HN-001-A03');
  it.skipIf(!p)('302 artículos (1–288 con sus letras), sin repetidos ni retrocesos; 153 notas al pie fuera de los artículos', () => {
    const seg = segmentarArticulos(p!.extracted_text);
    const nums = seg.articulos.map((a) => a.numero);
    expect(seg.articulos.length).toBe(302);
    expect(new Set(nums).size).toBe(nums.length);
    expect(numericos(nums).every((n, i, a) => i === 0 || n >= a[i - 1])).toBe(true);
    expect(seg.notas.length).toBe(153);
    expect(seg.articulos.some((a) => /mediante\s+Decreto\s+(35-2013|130-2017)/i.test(a.texto))).toBe(false);
  });
  it.skipIf(!p)('las notas conservan la atribución al decreto y las de rango y de título se reconocen', () => {
    const seg = segmentarArticulos(p!.extracted_text);
    const nota = (ref: string) => seg.notas.filter((n) => n.referido === ref).map((n) => n.texto);
    expect(nota('1')[0]).toMatch(/^Reformado mediante Decreto 35-2013, del 27 de febrero de 2013\. Publicado en el Diario Oficial La Gaceta No\. 33,222/);
    expect(nota('21')[0]).toMatch(/Derogado mediante Decreto 130-2017 \(Nuevo C[oó]digo Penal\).*Vigente a partir del 10 de mayo de 2020/);
    expect(nota('62 a 72')[0]).toMatch(/Derogados mediante Decreto 35-2013/);
    expect(nota('73 a 82')[0]).toMatch(/Derogados mediante Decreto 35-2013/);
    expect(seg.notas.some((n) => n.referido === 'TITULO')).toBe(true);
  });
  it.skipIf(!p)('los artículos «Derogado» se distinguen de los vacíos en el QA', () => {
    const seg = segmentarArticulos(p!.extracted_text);
    const qa = qaTexto({ extracted_text: p!.extracted_text, text_sha256: p!.text_sha256, document_type: 'CODE', source_domain: p!.source_domain }, seg);
    expect(qa.chequeos.find((c) => c.id === 'NO_EMPTY_ARTICLES')?.ok).toBe(true);
    expect(qa.chequeos.find((c) => c.id === 'DEROGATED_MARKED')?.detalle).toMatch(/22 artículos marcados «Derogado»/);
  });
});
