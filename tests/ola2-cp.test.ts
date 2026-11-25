import { describe, expect, it } from 'vitest';
import { alinearEpigrafe, clasificar, esRuido, fusionar, lexicoDe, recomponerEspaciado, textoDeBloque, unidades, type ArticuloCP } from '../scripts/olas/ola2-cp';

const art = (p: Partial<ArticuloCP>): ArticuloCP => ({ numero: '1', texto: 'X.', textoOriginal2019: 'X.', vigente: true, ubicacion: [], correcciones: [], constancias: [], fusiones: [], historial: [], ...p });

describe('OLA2 CP · extracción', () => {
  it('retira cabeceras, pies y mancheta de la Gaceta, no el texto', () => {
    for (const l of ['Sección A Acuerdos y Leyes', 'M. D. C., 10 DE MAYO DEL 2019 No. 34,940 La Gaceta', 'C., 1 DE NOVIEMBRE DEL 2021 No. 35,760 La Gaceta', 'A. 11', '18 A.', 'Colonia MirafIores', 'EDIS ANTONIO MONCADA'])
      expect(esRuido(l)).toBe(true);
    expect(esRuido('Diario Oficial “La Gaceta”.')).toBe(false);
    expect(esRuido('Administración Pública hondureña.')).toBe(false);
  });
  it('recompone epígrafes espaciados con el léxico de la propia Gaceta', () => {
    const lx = lexicoDe('la suspensión del procedimiento en delitos acción civil y prescripción');
    expect(recomponerEspaciado('S U S P E N S I Ó N D E L P R O C E - DIMIENTO EN DELITOS', lx)).toBe('SUSPENSIÓN DEL PROCEDIMIENTO EN DELITOS');
    expect(recomponerEspaciado('L A A C C I Ó N C I V I L Y L A PRESCRIPCIÓN', lx)).toBe('LA ACCIÓN CIVIL Y LA PRESCRIPCIÓN');
    expect(recomponerEspaciado('TRATA DE PERSONAS', lx)).toBe('TRATA DE PERSONAS');
    const art48 = 'INHABILITACIÓN PARA CONTRATAR CON ALIANZA PÚBLICO-PRIVADA Y PARA GOZAR DE BENEFICIOS O INCENTIVOS FISCALES O DE LA SEGURIDAD SOCIAL.';
    expect(recomponerEspaciado(art48, lx)).toBe(art48); // palabras cortas legítimas no disparan la recomposición
    expect(() => recomponerEspaciado('X Q Z W K', lx)).toThrow(/no recomponible/);
  });
  it('alinea un epígrafe espaciado de la reforma y conserva lo que cambia (EXÓTICAS → EXÓGENAS)', () => {
    expect(alinearEpigrafe('I N T R O D U C C I Ó N D E ESPECIES EXÓGENAS.', 'INTRODUCCIÓN DE ESPECIES EXÓTICAS.')).toBe('INTRODUCCIÓN DE ESPECIES EXÓGENAS.');
    expect(alinearEpigrafe('E X P L O TA - CIÓN ILEGAL DE RECURSOS NATURALES.', 'EXPLOTACIÓN ILEGAL DE RECURSOS NATURALES.')).toBe('EXPLOTACIÓN ILEGAL DE RECURSOS NATURALES.');
  });
  it('el texto transcrito conserva su punto final aunque el decreto lo ponga tras las comillas', () => {
    expect(textoDeBloque('“ARTÍCULO 312.- AGRAVANTES. Texto (1/3)”.')).toBe('AGRAVANTES. Texto (1/3).');
    expect(textoDeBloque('“ARTÍCULO 325.- EXPLOTACIÓN ILEGAL.\nQuien hace algo.”')).toBe('EXPLOTACIÓN ILEGAL. Quien hace algo.');
  });
});

describe('OLA2 CP · reformas publicadas con elisiones', () => {
  const vigente = 'TRATA. Texto viejo:\n1) Uno viejo;\n2) Dos;\n3) Tres; o,\n4) Cuatro.\n\nEl consentimiento es irrelevante.\n\nAún cuando no se recurra, hay trata.';
  it('toma del texto vigente cada unidad elidida y ajusta la puntuación del sufijo', () => {
    const r = fusionar('219', vigente, 'TRATA. Texto nuevo:\n1) Uno nuevo;\n2) Dos …;\n3) Tres …;\n4) Cuatro …; o\n5) Cinco nuevo.\nEl consentimiento … Aun cuando…');
    expect(r.texto).toBe('TRATA. Texto nuevo:\n1) Uno nuevo;\n2) Dos;\n3) Tres;\n4) Cuatro; o\n5) Cinco nuevo.\n\nEl consentimiento es irrelevante.\n\nAún cuando no se recurra, hay trata.');
    expect(r.fusion.suprimidas).toEqual([]);
    expect(r.fusion.descartadas).toHaveLength(2); // epígrafe y numeral 1), ambos sustituidos por la reforma
  });
  it('epígrafe nuevo con cuerpo elidido: cambia solo el epígrafe', () => {
    const r = fusionar('328', 'ESPECIES EXÓTICAS. Quien introduce especies.\n\nCuando haya lucro, más pena.', 'ESPECIES EXÓGENAS. Quien… Cuando …');
    expect(r.texto).toBe('ESPECIES EXÓGENAS. Quien introduce especies.\n\nCuando haya lucro, más pena.');
    expect(r.fusion.tomadas[0].de).toBe('EPIGRAFE_REFORMA');
  });
  it('numerales elididos sin texto y oración elidida dentro de un párrafo', () => {
    const r = fusionar('439', 'LAVADO. Incurre quien lava. Las conductas se castigan así:\n1) Primera;\n2) Segunda.', 'LAVADO. Incurre quien lava más.\nLas conductas…\n1) …\n2) …');
    expect(r.texto).toBe('LAVADO. Incurre quien lava más.\n\nLas conductas se castigan así:\n1) Primera;\n2) Segunda.');
  });
  it('un párrafo omitido sin sustituto queda como suprimido y el artículo va a CONTEXT', () => {
    const r = fusionar('325', 'EXPLOTACIÓN. Quien explota.\n\nLas penas suben.\n\nCuando se ejecuten rosas, rebaja.', 'EXPLOTACIÓN. Quien explota mucho.\nLas penas …');
    expect(r.fusion.suprimidas).toEqual(['Cuando se ejecuten rosas, rebaja.']);
    const k = clasificar(art({ fusiones: [{ decreto: '59-2024', descartadas: r.fusion.descartadas, suprimidas: r.fusion.suprimidas, desdeVigente: 1, desdeReforma: 1, epigrafeNuevo: false }] }));
    expect(k).toMatchObject({ vigencia: 'VIGENTE', rol: 'CONTEXT' });
  });
  it('una elisión que no corresponde a nada falla', () => {
    expect(() => fusionar('1', 'A. Texto.', 'A. Texto.\nInexistente…')).toThrow(/no corresponde/);
  });
  it('separa una oración elidida pegada a texto nuevo', () => {
    expect(unidades('Nuevo texto por un tercero. Las conductas…\n1) …')).toEqual(['Nuevo texto por un tercero.', 'Las conductas…', '1) …']);
  });
});

describe('OLA2 CP · clasificación', () => {
  it('derogado → CONTEXT/false; sin reformas → PRIMARY; reformado sin supresiones → PRIMARY', () => {
    expect(clasificar(art({ vigente: false, constancias: [{ tipo: 'DEROGA', decreto: '93-2021', gaceta: '35,760', fecha_gaceta: '2021-11-01', detalle: '' }] }))).toMatchObject({ vigencia: 'DEROGADO', rol: 'CONTEXT' });
    expect(clasificar(art({}))).toMatchObject({ vigencia: 'VIGENTE', rol: null });
    expect(clasificar(art({ constancias: [{ tipo: 'REFORMA', decreto: '93-2021', gaceta: '35,760', fecha_gaceta: '2021-11-01', detalle: '' }] })).motivo).toMatch(/D\.93-2021/);
  });
  it('reforma de solo elisiones (sin texto ni epígrafe nuevo) → PENDIENTE', () => {
    expect(clasificar(art({ fusiones: [{ decreto: '93-2021', descartadas: [], suprimidas: [], desdeVigente: 2, desdeReforma: 0, epigrafeNuevo: false }] }))).toMatchObject({ vigencia: 'PENDIENTE', rol: 'CONTEXT' });
  });
});
