import { describe, it, expect } from 'vitest';
import { segmentarArticulos, qaTexto } from '../lib/legal-os/corpus-factory/staging';
import { createHash } from 'node:crypto';

const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');

describe('segmentación: formatos de encabezado', () => {
  it('reconoce «Articulo º N» con el número en una línea propia (formato del Código de Comercio del Congreso Nacional)', () => {
    const t = 'Código de Comercio.\nNorma º 73-50\nTITULO PRELIMINAR\nArticulo º 1\nLos comerciantes se rigen por este Código.\nArticulo º 2\nSon comerciantes:\nI.- Las personas.\nArticulo º 3\nSon actos de comercio los que...';
    const seg = segmentarArticulos(t);
    expect(seg.articulos.map((a) => a.numero)).toEqual(['1', '2', '3']);
    expect(seg.articulos[0].texto).toMatch(/^Los comerciantes/);
  });
  it('conserva los formatos anteriores («ARTÍCULO 1.-», «Art. 2.», «Artículo 3º»)', () => {
    const seg = segmentarArticulos('ARTÍCULO 1.- Uno.\nArt. 2. Dos.\nArtículo 3º Tres.');
    expect(seg.articulos.map((a) => a.numero)).toEqual(['1', '2', '3']);
  });
  it('un encabezado al comienzo de página (tras \\f) y con el cuerpo en la misma línea SÍ es encabezado', () => {
    const seg = segmentarArticulos('Articulo º 1431\nSe acumularan los juicios.\f\nArticulo º 1432 Desde el momento de la declaración de quiebra:\nI.- Se tendrán por vencidas.\fArticulo º 1433\nPara el ejercicio.');
    expect(seg.articulos.map((a) => a.numero)).toEqual(['1431', '1432', '1433']);
    expect(seg.articulos[1].texto).toMatch(/^Desde el momento/);
  });
  it('una cita «…por adición el⏎Artículo 17-A; todos los cuales…» NO crea un artículo falso (A02: 39 artículos, no 40)', () => {
    const seg = segmentarArticulos('ARTÍCULO 16.- Uno.\nARTÍCULO 17.- Dos.\nARTÍCULO 26.- Reformar los artículos de la Ley y\nincorporar por adición al mismo el\nArtículo 17-A; todos los cuales se leerán así:\n“ARTÍCULO 17-A.- Aún cuando lo hubiese decretado.”\nARTÍCULO 27.- Tres.');
    expect(seg.articulos.map((a) => a.numero)).toEqual(['16', '17', '26', '27']);
  });
  it('conserva los encabezados con letra («ARTÍCULO 17-A.-», «Art. 31-B.»)', () => {
    const seg = segmentarArticulos('ARTÍCULO 17-A.- Texto.\nArt. 31-B. Otro.');
    expect(seg.articulos.map((a) => a.numero)).toEqual(['17-A', '31-B']);
  });
  it('una remisión a mitad de línea NO parte el texto', () => {
    const seg = segmentarArticulos('Articulo º 1\nSe aplica lo dispuesto en el artículo 5 de este Código y en el Articulo 7 siguiente.\nArticulo º 2\nOtro.');
    expect(seg.articulos.map((a) => a.numero)).toEqual(['1', '2']);
  });
  it('QA: un texto largo con muchos artículos pasa la plausibilidad', () => {
    const largo = Array.from({ length: 200 }, (_, i) => `Articulo º ${i + 1}\n${'texto del articulo de prueba. '.repeat(20)}`).join('\n');
    const informe = qaTexto({ extracted_text: largo, text_sha256: sha(largo), document_type: 'CODE', source_domain: 'example.invalid' }, segmentarArticulos(largo));
    expect(informe.chequeos.find((c) => c.id === 'ARTICLES_PLAUSIBLE')?.ok).toBe(true);
  });
  it('QA: promedio de más de 20 mil caracteres por artículo falla el aviso', () => {
    const largo = `ARTÍCULO 1.- ${'texto sin otros encabezados. '.repeat(1500)}`; // ~42 mil caracteres, 1 artículo
    const informe = qaTexto({ extracted_text: largo, text_sha256: sha(largo), document_type: 'CODE', source_domain: 'example.invalid' }, segmentarArticulos(largo));
    const c = informe.chequeos.find((x) => x.id === 'ARTICLES_PLAUSIBLE');
    expect(c?.ok).toBe(false);
    expect(c?.severidad).toBe('WARNING');
    expect(informe.apto_para_clo).toBe(true); // es aviso, no bloquea
  });
});

describe('segmentación: notas al pie de un consolidado (fixture sintético)', () => {
  const texto = [
    'Artículo 1. 1 Texto del uno que sigue en la página', 'siguiente.',
    '1', '', 'Artículo 1. Reformado mediante Decreto 99-2013, del 1 de enero de 2013. Publicado en el', 'Diario Oficial La Gaceta No. 11,111 de fecha 2 de febrero de 2013.', '', 'www.sitio.example', '\f',
    'continuación del artículo uno.', 'Artículo 2. Texto del dos.',
    '2 Artículo 2. Adición mediante Decreto 99-2013, del 1 de enero de 2013. Publicado en el Diario', '', 'Oficial La Gaceta No. 11,111 de fecha 2 de febrero de 2013.', '',
    'Artículo 3. Derogado',
    'Artículo 4. Texto del cuatro.',
    '3', '', 'Artículos del 3 al 3. Derogados mediante Decreto 99-2013, del 1 de enero de 2013.', '',
    '4 Titulo modificado. mediante Decreto 99-2013, del 1 de enero de 2013.', '',
    '5', '', 'Articulo 4 inciso a). Derogado mediante Decreto 99-2013, del 1 de enero de 2013.', '',
    'Artículo 5. Texto del cinco.',
  ].join('\n');
  it('las notas (con número previo, partidas por línea en blanco, de rango, de título y con inciso) no son artículos y no contaminan', () => {
    const seg = segmentarArticulos(texto);
    expect(seg.articulos.map((a) => a.numero)).toEqual(['1', '2', '3', '4', '5']);
    expect(seg.notas.map((n) => n.referido)).toEqual(['1', '2', '3 a 3', 'TITULO', '4 INCISO A)']);
    expect(seg.articulos.every((a) => !/mediante\s+Decreto/i.test(a.texto))).toBe(true);
    expect(seg.notas[1].texto).toMatch(/Adición mediante Decreto 99-2013.*La Gaceta No\. 11,111 de fecha 2 de febrero de 2013\.$/);
  });
  it('la continuación del artículo que sigue a una nota vuelve al artículo anterior', () => {
    const seg = segmentarArticulos(texto);
    expect(seg.articulos[0].texto).toMatch(/continuación del artículo uno\./);
  });
  it('el artículo derogado marcado «Derogado» se conserva como artículo, no como nota', () => {
    const seg = segmentarArticulos(texto);
    expect(seg.articulos.find((a) => a.numero === '3')!.texto).toBe('Derogado');
  });
});

