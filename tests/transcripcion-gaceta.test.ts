import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { compactarLinea, patronesEncabezado, patronesEncabezadoEspaciados, transcribirSinEncabezados } from '@/tools/corpus/transcripcion-gaceta';

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

describe('encabezados espaciados o partidos (A04, D.35-2013, La Gaceta 33,222): opción variantesEspaciadas', () => {
  const F = '6 DE SEPTIEMBRE DEL 2013';
  const N = '33,222';
  // Líneas reales de la transcripción del A04 (v3), una por variante.
  const ENCABEZADOS = [
    'L a Gaceta R E P U B L I C A D E HONDURAS - T E G U C I G A L P',
    'La Gaceta R E P U B L I C A D E HONDURAS - T E G U C I G A L P',
    'L a Gaceta | R E P Ú B L I C A D E H O N D U R A S - T E G U C I G A',
    'L a Gaceta REPÚBLICA D E HONDURAS T E G U C I G A L',
    'L a Gaceta REPUBLICA DE HONDURAS - TEGUCIGALPA,',
    'R E P U B L I C A D E HONDURAS - T E G U C I G A L P A',
    'REPÚBLICA D E HONDURAS - T E G U C I G A',
    'A L P A , M . D. C , 6 D E S E P T I E M B R E D E L 2013 No. 33,222',
    ', M . D. C , 6 D E S E P T I E M B R E D E L 2013 No. 33,222',
    'P A , M . D. C . , 6 D E S E P T I E M B R E D E L 2013 No. 33,222',
    'P A , M . D. C , 6 D E S E P T I E M B R E D E L 2 0 Í 3 No. 33,222',
    'A , M . D. C , 6 D E S E P T I E M B R E D E L 2013 No. 33.222',
    'A L P A , M . D. C , 6 D E S E P T I E M B R E D E L 2013 No. 33,22',
    'A L P A , M . D. C , 6 D E S E P T I E M B R E D E L 2013 No. 33,22:',
    'M. D. C , 6 DE SEPTIEMBRE DEL 2013 No. 33,222',
    'Sección A Acuerdos y Ley es',
    '•Ps&PIII^^ Sección A Acuerdos y Leyes',
    'A. 41',
  ];
  // Texto del decreto que menciona las mismas palabras: no es encabezado.
  const TEXTO_LEY = [
    'hoy, como Diario Oficial "La Gaceta".',
    'partir del día de su publicación en el Diario Oficial "La Gaceta".',
    'Dado en la ciudad de Tegucigalpa, municipio del Distrito',
    'Tegucigalpa, M.D.C., 5 de septiembre de 2013',
    'CONSIDERANDO: Que la Constitución de la República',
    '9) Quien no tenga domicilio en la República;',
    'de Letras de Niñez y los Jueces de Letras Seccionales."',
    'Decreto No. 132-97, de fecha 11 de septiembre de 1997,',
    'VIERNES 6 DE SEPTIEMBRE DEL 2013. NUM. 33,222',
    'DIARIO OFICIAL DE LA REPÚBLICA DE HONDURAS',
  ];

  it('con la opción, quita cada variante espaciada real y conserva el texto que solo menciona esas palabras', () => {
    const t = transcribirSinEncabezados([...ENCABEZADOS, ...TEXTO_LEY].join('\n'), F, N, { variantesEspaciadas: true });
    expect(t.quitadas.map((q) => q.texto)).toEqual(ENCABEZADOS);
    for (const l of TEXTO_LEY) expect(t.texto).toContain(l);
  });

  it('sin la opción (como en el D.284-2013), el comportamiento no cambia: ninguna variante espaciada se quita', () => {
    const t = transcribirSinEncabezados(ENCABEZADOS.join('\n'), F, N);
    expect(t.quitadas).toEqual([]);
    const d284 = transcribirSinEncabezados(TEXTO, FECHA, NUM);
    expect(transcribirSinEncabezados(TEXTO, FECHA, NUM, { variantesEspaciadas: false }).sha256).toBe(d284.sha256);
  });

  it('la fecha y el número son los de la edición: otra fecha u otro número no coinciden', () => {
    const p = patronesEncabezadoEspaciados(F, N);
    const es = (l: string) => p.some((r) => r.test(compactarLinea(l)));
    expect(es('A , M . D. C , 6 D E S E P T I E M B R E D E L 2013 No. 33,222')).toBe(true);
    expect(es('A , M . D. C , 7 D E S E P T I E M B R E D E L 2013 No. 33,222')).toBe(false);
    expect(es('A , M . D. C , 6 D E S E P T I E M B R E D E L 2013 No. 33,445')).toBe(false);
  });
});
