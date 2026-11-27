/**
 * Hallazgo MEDIO del PR #170 (2026-11-26): las leyes V5 de las olas 12 y 13 no tenían identidad CLO. Sus filas caían en SIN_INSTRUMENT_ID
 * y nunca podían ser PRIMARY. Las fuentes de estas pruebas son las que hay en producción (consulta de solo lectura, 2026-11-26).
 */
import { describe, expect, it } from 'vitest';
import {
  clasificarFragmentoClo, INSTRUMENT_IDS, INSTRUMENTOS_SOLO_CONTEXT, instrumentIdDeFragmento, textoNombraInstrumento,
  type InstrumentId,
} from '@/lib/legal-retrieval/clo-guards';
import { parsearInstrumentRef } from '@/lib/legal-retrieval/instrument-ref';

const FUENTES_V5: Array<[InstrumentId, string, string]> = [
  ['LEY_JUSTICIA_CONSTITUCIONAL', 'OLA12_LJC_2007_01', 'Ley sobre Justicia Constitucional de Honduras (Decreto No. 244-2003)'],
  ['LEY_ORGANIZACION_TRIBUNALES', 'OLA12_LOAT_2007_01', 'Ley de Organización y Atribuciones de los Tribunales de Honduras (Decreto No. 76 de 1906)'],
  ['LEY_PROPIEDAD', 'OLA12_LP_2007_01', 'Ley de Propiedad de Honduras (Decreto No. 82-2004)'],
  ['LEY_LAVADO_ACTIVOS', 'OLA12_LA_2015_01', 'Ley Especial contra el Lavado de Activos de Honduras (Decreto No. 144-2014)'],
  ['LEY_PROCEDIMIENTO_ADMINISTRATIVO', 'OLA13_LPA_2014_01', 'Ley de Procedimiento Administrativo de Honduras (Decreto No. 152-87)'],
  ['LEY_MUNICIPALIDADES', 'OLA13_LMUN_2009_01', 'Ley de Municipalidades de Honduras (Decreto No. 134-90)'],
  ['REGLAMENTO_LEY_MUNICIPALIDADES', 'OLA13_RLMUN_1993_01', 'Reglamento General de la Ley de Municipalidades de Honduras (Acuerdo No. 018-93)'],
];
const FUENTE_RLMUN = FUENTES_V5[6][2];

const fila = (fuente: string, extra: Record<string, unknown> = {}) =>
  ({ fuente, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, num_articulo: '25', ...extra });

describe('identidad CLO de las leyes V5 de las olas 12 y 13', () => {
  it.each(FUENTES_V5)('%s (%s) se identifica y es PRIMARY si cumple los demás guardianes', (id, _lote, fuente) => {
    expect(INSTRUMENT_IDS).toContain(id);
    expect(INSTRUMENTOS_SOLO_CONTEXT[id]).toBeUndefined();
    const c = clasificarFragmentoClo(fila(fuente));
    expect(c).toMatchObject({ instrumentId: id, rol: 'PRIMARY', bloqueos: [] });
  });

  it.each(FUENTES_V5)('%s: los demás guardianes siguen mandando (derogado, rol CONTEXT, otro país)', (id, _lote, fuente) => {
    expect(clasificarFragmentoClo(fila(fuente, { es_norma_vigente: false })).bloqueos).toContain('VIGENCIA_FALSE_EXCLUIDA');
    expect(clasificarFragmentoClo(fila(fuente, { metadata: { rol: 'CONTEXT' } })).bloqueos).toContain('ROL_DECLARADO_CONTEXT');
    expect(clasificarFragmentoClo(fila(fuente, { jurisdiccion: 'SV' })).rol).toBe('CONTEXT');
    expect(clasificarFragmentoClo(fila(fuente, { es_norma_vigente: null })).rol).toBe('CONTEXT');
    expect(instrumentIdDeFragmento(fila(fuente))).toBe(id);
  });

  it('LMUN: los 3 derogados (31-B, 81 y 127) siguen siendo CONTEXT', () => {
    const fuente = FUENTES_V5[5][2];
    for (const n of ['31-B', '81', '127']) {
      const c = clasificarFragmentoClo(fila(fuente, { num_articulo: n, es_norma_vigente: false, metadata: { rol: 'CONTEXT' } }));
      expect(c.rol, n).toBe('CONTEXT');
    }
  });

  it('los patrones están anclados y cerrados: nombres parecidos no se confunden', () => {
    const nulos = [
      'Ley de Propiedad Intelectual (Decreto 12-99-E)',
      'Comentario a la Ley de Municipalidades',
      'Ley de Municipalidades de El Salvador comentada',
      'Ley Especial contra el Lavado de Activos y Financiamiento del Terrorismo de Panamá',
      'Ley General de la Administración Pública',
    ];
    for (const f of nulos) expect(instrumentIdDeFragmento({ fuente: f }), f).toBeNull();
    expect(instrumentIdDeFragmento({ fuente: 'LEY DE PROCEDIMIENTOS ADMINISTRATIVO HONDURAS' })).toBeNull();
    expect(instrumentIdDeFragmento({ fuente: 'Ley de Procedimientos Administrativos' })).toBe('LEY_PROCEDIMIENTO_ADMINISTRATIVO');
  });

  it('las identidades anteriores no cambian', () => {
    const casos: Array<[string, InstrumentId]> = [
      ['Ley sobre Justicia Constitucional', 'LEY_JUSTICIA_CONSTITUCIONAL'],
      ['Ley sobre Justicia Constitucional (Decreto 244-2003)', 'LEY_JUSTICIA_CONSTITUCIONAL'],
      ['Ley Especial de Adopciones de Honduras (Decreto No. 102-2018)', 'LEY_ESPECIAL_ADOPCIONES'],
      ['Constitución de la República de Honduras (Decreto No. 131 de 1982)', 'CONSTITUCION'],
      ['Código del Notariado de Honduras (Decreto No. 353-2005)', 'CODIGO_NOTARIADO'],
    ];
    for (const [fuente, id] of casos) expect(instrumentIdDeFragmento({ fuente }), fuente).toBe(id);
  });
});

describe('OLA13_RLMUN: desbloqueado por D8 (D1–D8 firmadas y cargado en producción, 2026-11-26)', () => {
  it('el Reglamento tiene identidad propia, distinta de la Ley', () => {
    expect(instrumentIdDeFragmento({ fuente: FUENTE_RLMUN })).toBe('REGLAMENTO_LEY_MUNICIPALIDADES');
    expect(instrumentIdDeFragmento({ fuente: 'Reglamento de la Ley de Municipalidades' })).toBe('REGLAMENTO_LEY_MUNICIPALIDADES');
    expect(instrumentIdDeFragmento({ fuente: FUENTES_V5[5][2] })).toBe('LEY_MUNICIPALIDADES');
  });

  it('una fila real del paquete firmado, tal como la entrega la búsqueda semántica (sin metadata), sale PRIMARY', () => {
    const c = clasificarFragmentoClo(fila(FUENTE_RLMUN, { num_articulo: '1', id: 'OLA13_RLMUN_1993_01:REGLAMENTO_LEY_MUNICIPALIDADES:1' }));
    expect(c).toMatchObject({ instrumentId: 'REGLAMENTO_LEY_MUNICIPALIDADES', rol: 'PRIMARY', bloqueos: [] });
  });

  it.each(FUENTES_V5)(
    'hueco cerrado (%s): con metadata.norm_id «HN:…», como la entrega la búsqueda exacta, sale PRIMARY',
    (id, _lote, fuente) => {
      // Antes del registro en instrument-identity.ts, parsearInstrumentRef rechazaba estos ids (INSTRUMENTO_DESCONOCIDO) y el guardián país
      // degradaba la fila a CONTEXT (IDENTIDAD_PAIS_INCONSISTENTE). La búsqueda exacta (lib/rag/search.ts) sí lee metadata.norm_id.
      expect(parsearInstrumentRef(`HN:${id}`)).toMatchObject({ ok: true, pais: 'HN', instrumento: id });
      const c = clasificarFragmentoClo(fila(fuente, { metadata: { norm_id: `HN:${id}` } }));
      expect(c).toMatchObject({ instrumentId: id, rol: 'PRIMARY', bloqueos: [] });
    },
  );

  it.each(FUENTES_V5)('%s: el guardián país sigue fallando cerrado ante un norm_id de otro país', (id, _lote, fuente) => {
    const c = clasificarFragmentoClo(fila(fuente, { metadata: { norm_id: `SV:${id}` } }));
    expect(c).toMatchObject({ rol: 'CONTEXT', bloqueos: ['IDENTIDAD_PAIS_INCONSISTENTE'] });
  });

  it('los demás bloqueos de instrumento siguen intactos (Reglamento del Notariado y D.77-2006)', () => {
    expect(INSTRUMENTOS_SOLO_CONTEXT).toEqual({ REGLAMENTO_NOTARIADO: 'INSTRUMENTO_SIN_PLIEGO_CLO', DECRETO_77_2006: 'INSTRUMENTO_TEXTO_NO_COTEJADO' });
  });
});

describe('las respuestas nombran estas leyes (R3/R4)', () => {
  it('reconoce cada ley por su nombre completo', () => {
    expect(textoNombraInstrumento('Según el artículo 25 de la Ley de Municipalidades…', 'LEY_MUNICIPALIDADES')).toBe(true);
    expect(textoNombraInstrumento('La Ley de Procedimiento Administrativo, art. 87…', 'LEY_PROCEDIMIENTO_ADMINISTRATIVO')).toBe(true);
    expect(textoNombraInstrumento('conforme a la Ley Especial contra el Lavado de Activos', 'LEY_LAVADO_ACTIVOS')).toBe(true);
    expect(textoNombraInstrumento('la Ley de Organización y Atribuciones de los Tribunales', 'LEY_ORGANIZACION_TRIBUNALES')).toBe(true);
    expect(textoNombraInstrumento('la Ley de Propiedad dispone', 'LEY_PROPIEDAD')).toBe(true);
  });

  it('citar el Reglamento General no es nombrar la Ley (ni al revés)', () => {
    const soloReglamento = 'El artículo 5 del Reglamento General de la Ley de Municipalidades establece…';
    expect(textoNombraInstrumento(soloReglamento, 'REGLAMENTO_LEY_MUNICIPALIDADES')).toBe(true);
    expect(textoNombraInstrumento(soloReglamento, 'LEY_MUNICIPALIDADES')).toBe(false);
    expect(textoNombraInstrumento('La Ley de Municipalidades, art. 25', 'REGLAMENTO_LEY_MUNICIPALIDADES')).toBe(false);
    const ambas = `${soloReglamento} Y la Ley de Municipalidades, art. 25, dispone…`;
    expect(textoNombraInstrumento(ambas, 'LEY_MUNICIPALIDADES')).toBe(true);
  });

  it('las siglas cortas no se registraron (no se confunden con «la» ni con «lp»)', () => {
    expect(textoNombraInstrumento('la propiedad del inmueble', 'LEY_PROPIEDAD')).toBe(false);
    expect(textoNombraInstrumento('la LA y la LP', 'LEY_LAVADO_ACTIVOS')).toBe(false);
  });
});
