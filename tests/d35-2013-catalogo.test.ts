/**
 * A04 (2026-11-16): el Decreto 35-2013 (reformas integrales en Familia y Niñez, La Gaceta 33,222) entra al catálogo cerrado para que la ingesta
 * pueda exigir HN:DECRETO_35_2013, sin cambiar la identidad de ninguna fuente existente y sin que ninguna fila suya pueda ser PRIMARY hasta que
 * el CLO apruebe su pliego (plan: docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/02_PLAN_CIERRE_A04.md).
 */
import { describe, expect, it } from 'vitest';
import { identidadDeFuente, RE_FUENTE_POR_INSTRUMENTO } from '@/lib/legal-retrieval/instrument-identity';
import { parsearInstrumentRef } from '@/lib/legal-retrieval/instrument-ref';
import { clasificarFragmentoClo, INSTRUMENT_IDS, INSTRUMENTOS_SOLO_CONTEXT, textoNombraInstrumento } from '@/lib/legal-retrieval/clo-guards';
import { PERFILES } from '@/tools/corpus/receive-pdf';
import { construirLote } from '@/scripts/ingesta-lote-staging';

const FUENTE_D35 = 'Decreto 35-2013, reformas integrales en Familia y Niñez (La Gaceta 33,222)';

describe('catálogo: DECRETO_35_2013', () => {
  it('es un instrumento del catálogo y HN:DECRETO_35_2013 es una identidad válida', () => {
    expect(Object.keys(RE_FUENTE_POR_INSTRUMENTO)).toContain('DECRETO_35_2013');
    expect(parsearInstrumentRef('HN:DECRETO_35_2013')).toMatchObject({ ok: true, pais: 'HN', instrumento: 'DECRETO_35_2013' });
    expect(INSTRUMENT_IDS).toContain('DECRETO_35_2013');
  });

  it.each([FUENTE_D35, 'Decreto No. 35-2013', 'DECRETO LEGISLATIVO Nº 35-2013 (La Gaceta 33,222)', '  decreto numero 35 - 2013'])(
    'la fuente %j se identifica como el decreto',
    (fuente) => expect(identidadDeFuente(fuente)).toBe('DECRETO_35_2013'),
  );

  it('otro decreto con el mismo final no es este (número anclado)', () => {
    expect(identidadDeFuente('Decreto 135-2013')).toBeNull();
    expect(identidadDeFuente('Decreto 35-2012')).toBeNull();
  });

  it('una fuente que solo CITA el decreto conserva su identidad', () => {
    expect(identidadDeFuente('Codigo de Familia (Decreto 76-84), reformado por el Decreto 35-2013')).toBe('CODIGO_FAMILIA');
    expect(identidadDeFuente('Comentario al Decreto 35-2013')).toBeNull();
  });

  it('las fuentes reales existentes no cambian de identidad, incluido el D.284-2013', () => {
    const casos: Array<[string, string]> = [
      ['Codigo de Familia', 'CODIGO_FAMILIA'],
      ['Codigo Civil', 'CODIGO_CIVIL'],
      ['Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)', 'CODIGO_COMERCIO'],
      ['Decreto 284-2013, Ley para la Generación de Empleo (La Gaceta 33,445)', 'DECRETO_284_2013'],
    ];
    for (const [fuente, esperado] of casos) expect(identidadDeFuente(fuente), fuente).toBe(esperado);
  });

  it('el CLO reconoce el decreto en una respuesta, pero no el 135-2013', () => {
    expect(textoNombraInstrumento('Según el Decreto 35-2013, artículo 5…', 'DECRETO_35_2013')).toBe(true);
    expect(textoNombraInstrumento('Según el Decreto 135-2013…', 'DECRETO_35_2013')).toBe(false);
  });
});

describe('CLO: el decreto es solo CONTEXT hasta que el CLO apruebe su pliego', () => {
  it('aun con vigencia TRUE, país HN y tipo normativo, una fila del decreto no es PRIMARY', () => {
    expect(INSTRUMENTOS_SOLO_CONTEXT.DECRETO_35_2013).toBe('INSTRUMENTO_SIN_PLIEGO_CLO');
    const c = clasificarFragmentoClo({ fuente: FUENTE_D35, fuente_tipo: 'ley', jurisdiccion: 'HN', es_norma_vigente: true, num_articulo: '5' });
    expect(c.instrumentId).toBe('DECRETO_35_2013');
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toEqual(['INSTRUMENTO_SIN_PLIEGO_CLO']);
  });

  it('las filas que genera la ingesta nacen ocultas, sin vigencia y bloqueadas por el pliego', () => {
    const texto = 'ARTÍCULO 1.- Reformar los artículos del código, con texto suficiente.\nARTÍCULO 2.- Adicionar los artículos siguientes, con texto suficiente.';
    const { filas } = construirLote({ texto, instrumentoRef: 'HN:DECRETO_35_2013', ingestBatch: 'PILOTO_D35', fuente: FUENTE_D35, fuenteTipo: 'ley', meta: {} });
    expect(filas).toHaveLength(2);
    for (const f of filas) {
      expect(f).toMatchObject({ instrumento_id: 'DECRETO_35_2013', jurisdiccion: 'HN', revision_pendiente: true, es_norma_vigente: null });
      expect(f.metadata.norm_id).toBe('HN:DECRETO_35_2013');
      const c = clasificarFragmentoClo({ ...f, metadata: f.metadata });
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toEqual(expect.arrayContaining(['INSTRUMENTO_SIN_PLIEGO_CLO', 'VIGENCIA_NO_ACREDITADA']));
      expect(c.bloqueos).not.toContain('IDENTIDAD_PAIS_INCONSISTENTE');
    }
  });

  it('el D.284-2013 sigue adjudicado (sin bloqueo de pliego)', () => {
    expect(INSTRUMENTOS_SOLO_CONTEXT.DECRETO_284_2013).toBeUndefined();
  });
});

describe('receptor: el paquete A04 declara su identidad país-calificada', () => {
  it('HN-001-A04 → HN:DECRETO_35_2013; La Gaceta 33,222', () => {
    expect(PERFILES['HN-001-A04']).toMatchObject({ instrumentRef: 'HN:DECRETO_35_2013', decreto: '35-2013', gaceta: '33,222' });
  });
});
