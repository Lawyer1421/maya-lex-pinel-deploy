/** OLA 14 (LGAP): partes puras del generador y del cotejo OCR. No leen PDF ni ejecutan Tesseract. */
import { describe, expect, it } from 'vitest';
import { ARTICULOS_SIN_NOTA, CORRECCIONES_GACETA, DEROGADOS_D266, extraerReformasD266, REFORMADOS_D266 } from '@/scripts/olas/ola14-lgap';
import { articulosOcr, comparable, diferencias, palabras } from '@/scripts/olas/ocr-lgap';

/** Bloque sintético con la forma de La Gaceta 33,336 extraída por columnas (`columnasD266`). */
function bloque(cuerpos: Partial<Record<string, string>> = {}): string {
  const base: Record<string, string> = { '2': 'La Administración Pública es Centralizada y Descentralizada.”' };
  const arts = REFORMADOS_D266.map((n) => `   “ARTÍCULO ${n}.- ${cuerpos[n] ?? base[n] ?? `Texto del artículo ${n}.”`}\n`);
  return ['ARTÍCULO 1.- Reformar los Artículos…\n', ...arts, '   ARTÍCULO 2.- Reformar los Artículos 1, 6, 41…\n'].join('\n');
}

describe('extraerReformasD266', () => {
  it('devuelve exactamente los 28 números del Artículo 1, sin comillas exteriores', () => {
    const r = extraerReformasD266(bloque());
    expect(Object.keys(r)).toEqual([...REFORMADOS_D266]);
    expect(r['124-D']).toBe('Texto del artículo 124-D.');
  });

  it('une palabras partidas, ignora la cabecera de página y no parte el párrafo en el cambio de columna', () => {
    const r = extraerReformasD266(bloque({
      '4': 'La creación, modificación o suspen-\nsión de las Secretarías de Estado,\n\n\u0000\n Sección A Acuerdos y Leyes\nGALPA, M. D. C., 23 DE ENERO DEL 2014     No. 33,336\n\n  solamente puede ser hecha.”',
    }));
    expect(r['4']).toBe('La creación, modificación o suspensión de las Secretarías de Estado, solamente puede ser hecha.');
  });

  it('separa incisos y, en el art. 29, el nombre de cada Secretaría de su descripción', () => {
    const r = extraerReformasD266(bloque({
      '29': 'Las Secretarías tendrán:\n\n1) Coordinación General de Gobierno\n    Auxiliar al Presidente de la República;\n2) Derechos Humanos, Justicia, Gobernación y\n    Descentralización\n    Lo concerniente al Gobierno Interior.”',
    }));
    expect(r['29'].split('\n\n')).toEqual([
      'Las Secretarías tendrán:', '1) Coordinación General de Gobierno', 'Auxiliar al Presidente de la República;',
      '2) Derechos Humanos, Justicia, Gobernación y Descentralización', 'Lo concerniente al Gobierno Interior.',
    ]);
  });

  it('falla si falta o sobra un artículo', () => {
    expect(() => extraerReformasD266(bloque().replace('“ARTÍCULO 98.- ', 'Texto: '))).toThrow(/se esperaban/);
  });
});

describe('correcciones y clasificación declaradas', () => {
  it('cada corrección dirigida cambia algo y nombra un artículo con texto de 1986', () => {
    for (const c of CORRECCIONES_GACETA) {
      expect(c.impreso).not.toBe(c.correcto);
      expect(REFORMADOS_D266 as readonly string[]).not.toContain(c.articulo);
      expect(DEROGADOS_D266 as readonly string[]).not.toContain(c.articulo);
    }
    expect(CORRECCIONES_GACETA).toHaveLength(17);
  });

  it('los 11 CONTEXT vigentes no se solapan con lo reformado ni derogado por el D.266-2013', () => {
    expect(Object.keys(ARTICULOS_SIN_NOTA).sort()).toEqual(['30', '31', '33', '34', '35', '36', '63', '69', '81', '84', '86'].sort());
    for (const n of Object.keys(ARTICULOS_SIN_NOTA)) expect([...REFORMADOS_D266, ...DEROGADOS_D266] as string[]).not.toContain(n);
  });
});

describe('cotejo OCR', () => {
  it('forma comparable y palabras partidas a fin de renglón', () => {
    expect(comparable('Públi-')).toBe('publi');
    expect(palabras('la Adminis-\ntración Pública, “RESUELVE”.')).toEqual(['la', 'administracion', 'publica', 'resuelve']);
  });

  it('encabezados: tolera ruido, «4RTICULO» y minúsculas al inicio de renglón; no una mención dentro del texto', () => {
    const a = articulosOcr('ARTICULO 1.—Uno.\n— ARTICULO 2.—Dos.\n4RTICULO 3.—Tres según el\nArtículo 58 de esta Ley.\nArtículo 4.—Cuatro.');
    expect([...a.keys()]).toEqual(['1', '2', '3', '4']);
    expect(a.get('3')).toContain('Artículo 58 de esta Ley');
  });

  it('diferencias: alinea y devuelve solo los tramos distintos', () => {
    const d = diferencias('por tres veces consecutivas'.split(' '), 'por tres 3 veces consecutivas'.split(' '));
    expect(d).toEqual([{ posicion: 2, ocr: [], paquete: ['3'], contexto: 'por tres 3 veces consecutivas' }]);
    expect(diferencias(['a', 'b'], ['a', 'b'])).toEqual([]);
  });
});
