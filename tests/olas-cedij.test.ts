import { describe, expect, it } from 'vitest';
import { decretoDerogatorio, segmentarFlexible, tipificarNotaCedij } from '../scripts/olas/cedij';
import { DICTAMENES_CLO } from '../scripts/olas/ola5-cf';

describe('OLAS 6–7 · segmentación CEDIJ tolerante', () => {
  it('llamadas fuera de orden, separadas tras «Derogado», solas en su línea, y «Artículo.» con punto', () => {
    const texto = [
      'Artículo 1. Uno.',
      'Artículo 2. Dos. Párrafo tercero Derogado 1',
      'Artículo 3. Derogado3', // la 3 aparece antes que la 2
      'Artículo 4. Cuatro con multas.2',
      'Artículo 5. Cinco termina aquí.',
      '4',
      'Artículo. 6. Seis.',
    ].join('\n');
    const a = segmentarFlexible(texto, 4);
    expect(a.map((x) => [x.numero, x.llamadas])).toEqual([['1', []], ['2', [1]], ['3', [3]], ['4', [2]], ['5', [4]], ['6', []]]);
    expect(a[1].texto).toBe('Dos. Párrafo tercero Derogado');
  });
  it('las citas de otros cuerpos dentro de un artículo no abren artículo', () => {
    const a = segmentarFlexible('Artículo 1. Reformar el Código Civil:\nArtículo 1444. La cesión comprenderá…\nArtículo 2. Fin.', 0);
    expect(a.map((x) => x.numero)).toEqual(['1', '2']);
    expect(a[0].texto).toContain('Artículo 1444.');
  });
  it('falla si una nota queda sin llamada', () => {
    expect(() => segmentarFlexible('Artículo 1. Uno.', 2)).toThrow(/sin resolver: 1, 2/);
  });
});

describe('OLAS 6–11 · regresiones del segmentador', () => {
  it('reconoce encabezados en mayúsculas («ARTÍCULO 420.-», el defecto de la OLA 6 firmada)', () => {
    const a = segmentarFlexible('Artículo 1.- TRAMITACIÓN. Texto.\nARTÍCULO 2.- PROMOCIÓN. Otro.\nArtículo 3.- Fin.', 0);
    expect(a.map((x) => x.numero)).toEqual(['1', '2', '3']);
    expect(a[0].texto).not.toMatch(/PROMOCIÓN/);
  });
  it('«14.- CÓMPUTO» no es el art. 14-C; «60-A» sí es bis', () => {
    const a = segmentarFlexible('ARTÍCULO 1.- VIGENCIA.\nARTÍCULO 2.- CÓMPUTO DE LOS PLAZOS.\nARTÍCULO 2-A. Bis.\nARTÍCULO 3.- Fin.', 0);
    expect(a.map((x) => x.numero)).toEqual(['1', '2', '2-A', '3']);
  });
  it('llamada entre espacios a mitad de línea («FORMAS. 14 Las notificaciones…»)', () => {
    const a = segmentarFlexible('ARTÍCULO 1.- FORMAS. 1 Las notificaciones se hacen así.', 1);
    expect(a[0].llamadas).toEqual([1]);
    expect(a[0].texto).toBe('FORMAS.  Las notificaciones se hacen así.');
  });
  it('fe de erratas se tipifica aparte; una reforma que la menciona sigue siendo reforma', () => {
    expect(tipificarNotaCedij('Artículo 94. Se corrigen las palabras «deben sujetan». Mediante Fe de Errata publicada en La Gaceta')).toBe('FE_DE_ERRATAS');
    expect(tipificarNotaCedij('Artículo 89. Reformado mediante Decreto No.180-2020 … Fe de Errata')).toBe('REFORMA');
  });
});

describe('OLA 12 · regresiones del segmentador', () => {
  it('llamadas encadenadas tras una pegada («Bahía20 21 22.»)', () => {
    const a = segmentarFlexible('Artículo 1.- Islas de la Bahía1 2 3.\nArtículo 2.- Fin.', 3);
    expect(a[0].llamadas).toEqual([1, 2, 3]);
    expect(a[0].texto).toBe('Islas de la Bahía.');
  });
  it('llamada pegada a punto y coma («pesos15;»)', () => {
    expect(segmentarFlexible('Artículo 1.- Multa de diez pesos1;\nArtículo 2.- Fin.', 1)[0].llamadas).toEqual([1]);
  });
  it('«Artículo 78 reformado de la Ley…» dentro del 78 no abre otro artículo 78; «Artículo 4.- A los Tribunales» no es 4-A', () => {
    const a = segmentarFlexible('Artículo 1.- Uno.\nArtículo 2.- DISTRIBUCIÓN. Conforme al\nArtículo 2 reformado de otra Ley.\nArtículo 3.- A los Tribunales corresponde.', 0);
    expect(a.map((x) => x.numero)).toEqual(['1', '2', '3']);
    expect(a[1].texto).toContain('Artículo 2 reformado');
  });
});

describe('OLAS 6–7 · notas', () => {
  it('tipifica reforma tácita, interpretación, derogación parcial y referencia', () => {
    expect(tipificarNotaCedij('Artículo 35. Reformado tácitamente al derogarse el artículo 33')).toBe('REFORMA_TACITA');
    expect(tipificarNotaCedij('Interpretación del Artículo No.4 según Decreto 927')).toBe('INTERPRETACION_AUTENTICA');
    expect(tipificarNotaCedij('Artículo 95 numeral 16. Derogado según Decreto No.255-2002')).toBe('DEROGACION_PARCIAL');
    expect(tipificarNotaCedij('Artículo 781. Léase Código de Procedimientos Civiles.')).toBe('REFERENCIA');
  });
  it('el decreto derogatorio es el primero citado tras «Derogado»', () => {
    expect(decretoDerogatorio('Artículo 188 y 190. Derogados por el Código de la Niñez, Decreto No.73-96 … Véase Nuevo Código Procesal Civil, Decreto No.211-2006.')).toBe('73-96');
    expect(decretoDerogatorio('Artículo 464. Derogado por Decreto 278-2013 de fecha 21 de diciembre de 2013')).toBe('278-2013');
  });
});

describe('OLA 5 · cierre de D5 por el art. 63 del D.102-2018', () => {
  it('122-A y 135 (Cap. I) y 175-A (Cap. VI) derogados; 165 (Cap. IV) CONTEXT vigente', () => {
    for (const n of ['122-A', '135', '175-A']) expect(DICTAMENES_CLO[n].clasificacion).toMatchObject({ vigencia: 'DEROGADO', rol: 'CONTEXT' });
    expect(DICTAMENES_CLO['165'].clasificacion).toMatchObject({ vigencia: 'VIGENTE', rol: 'CONTEXT' });
    expect(DICTAMENES_CLO['175-A'].constancia.texto).toMatch(/Capítulo VI.*34,841|34,841.*Capítulo VI/s);
    expect(DICTAMENES_CLO['165'].constancia.tipo).toBe('DICTAMEN_CLO');
  });
});
