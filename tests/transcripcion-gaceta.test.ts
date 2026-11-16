import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { patronesEncabezado, transcribirSinEncabezados } from '@/tools/corpus/transcripcion-gaceta';

const FECHA = '5 DE JUNIO DEL 2014';
const NUM = '33,445';
// Fragmento con la forma real de la copia del D.284-2013: dos páginas, encabezados intercalados en medio de un artículo.
const TEXTO = [
  'ARTÍCULO 2.- A las sociedades mercantiles constituidas',
  'de Comercio relativas al tipo de sociedad de que se trate, así',
  'A.',
  '',
  '24\fLa Gaceta',
  '',
  'REPÚBLICA DE HONDURAS - TEGUCIG',
  '',
  'como las de otras leyes de la República.',
  'Sección A Acuerdos y Leyes',
  '',
  'GALPA, M. D. C., 5 DE JUNIO DEL 2014',
  '',
  'No. 33,445',
  '',
  'ARTÍCULO 34.- ...transformar el Diario Oficial La Gaceta',
  'en una publicación digital.',
].join('\r\n');

describe('transcripción candidata de La Gaceta: solo se quitan encabezados de página', () => {
  const t = transcribirSinEncabezados(TEXTO, FECHA, NUM);
  it('quita los 7 encabezados de la página y conserva el texto del artículo', () => {
    expect(t.quitadas.map((q) => q.texto)).toEqual([
      'A.', '24', 'La Gaceta', 'REPÚBLICA DE HONDURAS - TEGUCIG', 'Sección A Acuerdos y Leyes', 'GALPA, M. D. C., 5 DE JUNIO DEL 2014', 'No. 33,445',
    ]);
    expect(t.texto).toContain('de que se trate, así\n\ncomo las de otras leyes de la República.');
    expect(t.texto).not.toMatch(/Sección A|33,445|JUNIO DEL 2014|TEGUCIG/);
  });
  it('una mención de La Gaceta dentro del texto de la ley no es un encabezado', () => {
    expect(t.texto).toContain('transformar el Diario Oficial La Gaceta');
  });
  it('fin de línea normalizado a \\n y hash determinista del texto resultante', () => {
    expect(t.texto).not.toContain('\r');
    expect(t.sha256).toBe(createHash('sha256').update(t.texto, 'utf8').digest('hex'));
    expect(transcribirSinEncabezados(TEXTO.replace(/\r\n/g, '\n'), FECHA, NUM).sha256).toBe(t.sha256);
  });
  it('tolera los cortes del OCR en el encabezado (Caceta, Leves, IGALPA/LPA, «,No.»)', () => {
    const p = patronesEncabezado(FECHA, NUM);
    for (const l of ['La Caceta', 'Sección A Acuerdos y Leves', 'IGALPA, M. D. C, 5 DE JUNIO DEL 2014', 'LPA, M. D. C, 5 DE JUNIO DEL 2014', ',No. 33,445']) {
      expect(p.some((r) => r.test(l)), l).toBe(true);
    }
  });
  it('no toca líneas de otra edición ni texto que solo se parece', () => {
    const p = patronesEncabezado(FECHA, NUM);
    for (const l of ['No. 33,446', 'GALPA, M. D. C., 6 DE JUNIO DEL 2014', 'La Gaceta oficial publicará', 'Sección A del Código', 'A. Disposiciones generales']) {
      expect(p.some((r) => r.test(l)), l).toBe(false);
    }
  });
});

import { aplicarCorrecciones, type CorreccionCotejo } from '@/tools/corpus/transcripcion-gaceta';
describe('correcciones de cotejo: la única vía para cambiar una palabra del texto base', () => {
  const base = transcribirSinEncabezados('ARTÍCULO 30.- … contenida en el Decreto Legislativo No. 1432010 y sus reformas.\n', FECHA, NUM);
  const c: CorreccionCotejo = {
    articulo: '30', pagina_pdf: 15, buscar: 'No. 1432010', reemplazar: 'No. 143-2010',
    motivo: 'Guion de fin de renglón perdido; la imagen dice 143-2010', detectado_por: 'Titular, cotejo visual',
  };
  it('aplica la corrección, registra su línea y cambia el hash', () => {
    const r = aplicarCorrecciones(base, [c]);
    expect(r.texto).toContain('No. 143-2010');
    expect(r.texto).not.toContain('1432010');
    expect(r.aplicadas).toEqual([{ ...c, linea: 1 }]);
    expect(r.sha256).not.toBe(base.sha256);
    expect(r.sha256).toBe(createHash('sha256').update(r.texto, 'utf8').digest('hex'));
  });
  it('se detiene si el texto a buscar no aparece o aparece más de una vez', () => {
    expect(() => aplicarCorrecciones(base, [{ ...c, buscar: 'No. 9999' }])).toThrow(/aparece 0 veces/);
    const doble = transcribirSinEncabezados('No. 1432010 y No. 1432010\n', FECHA, NUM);
    expect(() => aplicarCorrecciones(doble, [c])).toThrow(/aparece 2 veces/);
  });
  it('exige motivo, autor, página y un reemplazo distinto', () => {
    for (const malo of [{ ...c, motivo: '' }, { ...c, detectado_por: '' }, { ...c, pagina_pdf: 0 }, { ...c, reemplazar: c.buscar }]) {
      expect(() => aplicarCorrecciones(base, [malo])).toThrow(/incompleta/);
    }
  });
  it('sin correcciones el texto y el hash no cambian', () => {
    const r = aplicarCorrecciones(base, []);
    expect(r.texto).toBe(base.texto);
    expect(r.sha256).toBe(base.sha256);
  });
});
