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
