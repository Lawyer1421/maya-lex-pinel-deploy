import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { construirCedij, decretoDerogatorio, segmentarFlexible, tipificarNotaCedij, type ParamsCedij } from '../scripts/olas/cedij';
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
    expect(DICTAMENES_CLO['175-A'].constancia.texto).toMatch(/Capítulo VI[\s\S]*34,841|34,841[\s\S]*Capítulo VI/);
    expect(DICTAMENES_CLO['165'].constancia.tipo).toBe('DICTAMEN_CLO');
  });
});

describe('OLA 13 · parámetros nuevos del constructor (reformas posteriores, marcas en línea, edición)', () => {
  // Texto sintético por `extraerTexto`; `pdf` apunta a un archivo cualquiera solo para la huella.
  const base = (texto: string, extra: Partial<ParamsCedij> = {}): ParamsCedij => ({
    cfg: { ola: 'OLAT', normId: 'HN:PRUEBA', instrumentoId: 'PRUEBA', ingestBatch: 'OLAT_01', fechaCorte: '2026-11-25', adjudicacion: 'P.md' },
    pdf: 'package.json', materia: '10_LEYES_REGLAMENTOS', fuenteCanonica: 'Ley de prueba', edicionFuente: 'prueba', decreto: '1-2000',
    inicio: /^ARTÍCULO 1\.-/m, fin: /^Dado en/m, ultimoBase: 4, idLegacy: () => null, legacyDump: null, sinNotas: true,
    extraerTexto: () => texto, ...extra,
  });
  const TEXTO = [
    'ARTÍCULO 1.- (Según reforma por Decreto 48-', '91) Esta Ley tiene por objeto el régimen municipal.', '',
    'ARTÍCULO 2.- (Según reforma por Decreto 124-95), el Impuesto se paga anualmente.', '',
    'ARTÍCULO 3.- (Derogado Según artículo 5 del Decreto 143-2009)', '',
    'ARTÍCULO 4. (Derogado según Decreto 48-91) Impuesto de Tradición que paga el tradente.', '',
    'Dado en Tegucigalpa.',
  ].join('\n');

  it('marcasEnLinea: la marca pasa a constancia, sale del texto (sin la coma sobrante) y un artículo reducido a su marca queda «Derogado.»', () => {
    const { articulos } = construirCedij(base(TEXTO, { marcasEnLinea: /\((?:Según reforma|Derogado)[^()]*\)/g, edicion: 'AMHON' }));
    const a = Object.fromEntries(articulos.map((x) => [x.fila.num_articulo, x]));
    expect(a['1'].fila.contenido).toBe('Esta Ley tiene por objeto el régimen municipal.');
    expect(a['1'].constancias).toEqual([{ nota: null, tipo: 'REFORMA', texto: 'Según reforma por Decreto 48-91', decretos: ['48-91'] }]);
    expect(a['2'].fila.contenido).toBe('el Impuesto se paga anualmente.');
    expect(a['3'].fila.contenido).toBe('Derogado.');
    expect(a['3'].fila.clasificacion).toMatchObject({ vigencia: 'DEROGADO', rol: 'CONTEXT' });
    expect(a['3'].fila.clasificacion.motivo).toMatch(/por D\.143-2009 según la edición AMHON/);
    expect(a['1'].fila.metadata.texto_origen).toBe('PDF_CONSOLIDADO_AMHON_SANEADO');
    // Marca de derogación que no nombra el artículo y deja texto: sin dictamen se toma por parcial y el artículo sigue PRIMARY.
    expect(a['4'].constancias[0].tipo).toBe('DEROGACION_PARCIAL');
    expect(a['4'].fila.clasificacion.rol).toBeNull();
  });

  it('dictamen DEROGADO sobre una marca que no nombra el artículo: la constancia vuelve a total y derogado_por la recoge', () => {
    const { articulos } = construirCedij(base(TEXTO, {
      marcasEnLinea: /\((?:Según reforma|Derogado)[^()]*\)/g,
      dictamenes: { '4': { clasificacion: { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: 'DEROGADO por D.48-91 (dictamen)' } } },
    }));
    const a4 = articulos.find((x) => x.fila.num_articulo === '4')!;
    expect(a4.constancias[0].tipo).toBe('DEROGACION_TOTAL');
    expect(a4.fila.metadata.derogado_por).toBe('D.48-91');
    expect(a4.fila.contenido).toBe('Impuesto de Tradición que paga el tradente.');
  });

  it('reformasPosteriores: el texto de La Gaceta sustituye al de la edición, que queda por su huella', () => {
    const nuevo = 'Texto reformado según La Gaceta.';
    const { articulos } = construirCedij(base(TEXTO, {
      marcasEnLinea: /\((?:Según reforma|Derogado)[^()]*\)/g,
      reformasPosteriores: { '1': { texto: nuevo, constancia: { nota: null, tipo: 'REFORMA', texto: 'Reformado por el D.266-2013', decretos: ['266-2013'] } } },
    }));
    const a1 = articulos.find((x) => x.fila.num_articulo === '1')!;
    expect(a1.fila.contenido).toBe(nuevo);
    expect(a1.fila.hash_contenido).toBe(createHash('sha256').update(nuevo).digest('hex'));
    expect(a1.fila.metadata.texto_edicion_sha256).toBe(createHash('sha256').update('Esta Ley tiene por objeto el régimen municipal.').digest('hex'));
    expect(a1.constancias.map((c) => c.decretos)).toEqual([['48-91'], ['266-2013']]);
    expect(a1.correcciones).toContain('TEXTO_SUSTITUIDO_POR_REFORMA_POSTERIOR:266-2013');
  });

  it('sin los parámetros nuevos, el constructor no cambia: motivo y texto_origen siguen diciendo CEDIJ', () => {
    const texto = ['Uno', 'Dos', 'Tres', 'Cuatro'].map((x, i) => `ARTÍCULO ${i + 1}.- Disposición número ${x} de la ley de prueba.`).join('\n\n');
    const { articulos } = construirCedij(base(`${texto}\n\nDado en Tegucigalpa.`));
    expect(articulos[0].fila.metadata.texto_origen).toBe('PDF_CONSOLIDADO_CEDIJ_SANEADO');
    expect(articulos[0].fila.clasificacion.motivo).toMatch(/edición consolidada CEDIJ/);
    expect(articulos[0].fila.metadata).not.toHaveProperty('texto_edicion_sha256');
  });
});
