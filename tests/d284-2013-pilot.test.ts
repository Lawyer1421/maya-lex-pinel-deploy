/**
 * Piloto de adjudicación del Decreto 284-2013 (2026-11-15): el decreto entra al catálogo cerrado de instrumentos para que la ingesta pueda
 * exigir HN:DECRETO_284_2013, sin cambiar la identidad de ninguna fuente existente y sin que ninguna fila suya pueda ser PRIMARY hasta que el
 * CLO apruebe su pliego.
 */
import { describe, expect, it } from 'vitest';
import { identidadDeFuente, RE_FUENTE_POR_INSTRUMENTO } from '@/lib/legal-retrieval/instrument-identity';
import { parsearInstrumentRef } from '@/lib/legal-retrieval/instrument-ref';
import { clasificarFragmentoClo, INSTRUMENT_IDS, INSTRUMENTOS_SOLO_CONTEXT, textoNombraInstrumento } from '@/lib/legal-retrieval/clo-guards';
import { PERFILES } from '@/tools/corpus/receive-pdf';
import { construirLote } from '@/scripts/ingesta-lote-staging';

const FUENTE_D284 =
  'Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)';

describe('catálogo: DECRETO_284_2013', () => {
  it('es un instrumento del catálogo y HN:DECRETO_284_2013 es una identidad válida', () => {
    expect(Object.keys(RE_FUENTE_POR_INSTRUMENTO)).toContain('DECRETO_284_2013');
    expect(parsearInstrumentRef('HN:DECRETO_284_2013')).toMatchObject({ ok: true, pais: 'HN', instrumento: 'DECRETO_284_2013' });
    expect(INSTRUMENT_IDS).toContain('DECRETO_284_2013');
  });

  it.each([FUENTE_D284, 'Decreto No. 284-2013', 'DECRETO LEGISLATIVO Nº 284-2013 (La Gaceta 33,445)', '  decreto numero 284 - 2013'])(
    'la fuente %j se identifica como el decreto',
    (fuente) => expect(identidadDeFuente(fuente)).toBe('DECRETO_284_2013'),
  );

  it('una fuente que solo CITA el decreto conserva su identidad (el patrón está anclado al inicio)', () => {
    expect(identidadDeFuente('Codigo de Comercio (Decreto No. 73-1950), reformado por el Decreto 284-2013')).toBe('CODIGO_COMERCIO');
    expect(identidadDeFuente('Comentario al Decreto 284-2013')).toBeNull();
  });

  it('las fuentes reales existentes no cambian de identidad', () => {
    const casos: Array<[string, string]> = [
      ['Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)', 'CODIGO_COMERCIO'],
      ['Constitucion de la Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)', 'CONSTITUCION'],
      ['Ley sobre Justicia Constitucional', 'LEY_JUSTICIA_CONSTITUCIONAL'],
      ['Reglamento del Código del Notariado (PCSJ-17-2012)', 'REGLAMENTO_NOTARIADO'],
      ['Codigo Procesal Penal', 'CODIGO_PROCESAL_PENAL'],
    ];
    for (const [fuente, esperado] of casos) expect(identidadDeFuente(fuente), fuente).toBe(esperado);
  });

  it('el CLO reconoce los nombres del decreto en una respuesta', () => {
    expect(textoNombraInstrumento('Según el Decreto 284-2013, artículo 13…', 'DECRETO_284_2013')).toBe(true);
    expect(textoNombraInstrumento('La Ley para la Generación de Empleo dispone…', 'DECRETO_284_2013')).toBe(true);
  });
});

describe('CLO: el decreto es solo CONTEXT hasta que el CLO apruebe su pliego', () => {
  it('aun con vigencia TRUE, país HN y tipo normativo, una fila del decreto no es PRIMARY', () => {
    expect(INSTRUMENTOS_SOLO_CONTEXT.DECRETO_284_2013).toBe('INSTRUMENTO_SIN_PLIEGO_CLO');
    const c = clasificarFragmentoClo({ fuente: FUENTE_D284, fuente_tipo: 'ley', jurisdiccion: 'HN', es_norma_vigente: true, num_articulo: '13' });
    expect(c.instrumentId).toBe('DECRETO_284_2013');
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toEqual(['INSTRUMENTO_SIN_PLIEGO_CLO']);
  });

  it('las filas que genera la ingesta nacen ocultas, sin vigencia y bloqueadas por el pliego', () => {
    const texto = 'Artículo 1.- Objeto de la ley, con texto suficiente para no ser corto.\nArtículo 2.- Ámbito de aplicación, con texto suficiente.';
    const { filas } = construirLote({ texto, instrumentoRef: 'HN:DECRETO_284_2013', ingestBatch: 'PILOTO_D284', fuente: FUENTE_D284, fuenteTipo: 'ley', meta: {} });
    expect(filas).toHaveLength(2);
    for (const f of filas) {
      expect(f).toMatchObject({ instrumento_id: 'DECRETO_284_2013', jurisdiccion: 'HN', revision_pendiente: true, es_norma_vigente: null });
      expect(f.metadata.norm_id).toBe('HN:DECRETO_284_2013');
      const c = clasificarFragmentoClo({ ...f, metadata: f.metadata });
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toEqual(expect.arrayContaining(['INSTRUMENTO_SIN_PLIEGO_CLO', 'VIGENCIA_NO_ACREDITADA']));
      expect(c.bloqueos).not.toContain('IDENTIDAD_PAIS_INCONSISTENTE');
    }
  });
});

describe('receptor: el paquete A02 declara su identidad país-calificada', () => {
  it('HN-001-A02 → HN:DECRETO_284_2013; La Gaceta 33,445', () => {
    expect(PERFILES['HN-001-A02']).toMatchObject({ instrumentRef: 'HN:DECRETO_284_2013', decreto: '284-2013', gaceta: '33,445' });
  });
});
