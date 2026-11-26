/** Métricas puras del diagnóstico de OCR (scripts/olas/ocr-diagnostico.ts): no ejecutan Tesseract ni leen PDF. */
import { describe, expect, it } from 'vitest';
import { analizarArticulos, metricasTsv } from '@/scripts/olas/ocr-diagnostico';

describe('ocr-diagnostico', () => {
  it('metricasTsv cuenta solo palabras (nivel 5) con texto y confianza válida', () => {
    const tsv = [
      'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
      '4\t1\t1\t1\t1\t0\t0\t0\t10\t10\t-1\t',
      '5\t1\t1\t1\t1\t1\t0\t0\t10\t10\t96\tArtículo',
      '5\t1\t1\t1\t1\t2\t0\t0\t10\t10\t70\t1.-',
      '5\t1\t1\t1\t1\t3\t0\t0\t10\t10\t50\tqenmiciones',
      '5\t1\t1\t1\t1\t4\t0\t0\t10\t10\t-1\t ',
    ].join('\n');
    expect(metricasTsv(tsv, 3)).toEqual({ pagina: 3, palabras: 3, confMedia: 72, bajo60: 1, bajo80: 2 });
  });

  it('analizarArticulos tolera ruido de OCR antes del encabezado, pero no menciones dentro del texto', () => {
    const texto = ['ARTICULO 1.—Objeto.', '— ARTICULO 2.—El Consejo…', '. , ARTICULO 3.—Las instituciones…', 'según el ARTICULO 9 de la Ley', 'ARTÍCULO 5-A.- Adicionado', 'ARTICULO 5 bis.- Otro', 'ARTICULO 3.- repetido'].join('\n');
    expect(analizarArticulos(texto)).toEqual({ detectados: 5, maximo: 5, huecos: [4], repetidos: ['3'] });
  });

  it('una cifra mal leída en el encabezado («4RTICULO 23») aparece como hueco', () => {
    expect(analizarArticulos('ARTICULO 22.—x\n4RTICULO 23.—y\nARTICULO 24.—z').huecos).toEqual(Array.from({ length: 21 }, (_, i) => i + 1).concat(23));
  });
});
