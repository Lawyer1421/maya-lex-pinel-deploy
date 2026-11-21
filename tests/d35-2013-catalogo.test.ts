/**
 * A04 (2026-11-16): el Decreto 35-2013 (reformas integrales en Familia y Niñez, La Gaceta 33,222) entra al catálogo cerrado para que la ingesta
 * pueda exigir HN:DECRETO_35_2013, sin cambiar la identidad de ninguna fuente existente y sin que ninguna fila suya pueda ser PRIMARY hasta que
 * el CLO apruebe su pliego (plan: docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/02_PLAN_CIERRE_A04.md).
 */
import { describe, expect, it } from 'vitest';
import { identidadDeFuente, RE_FUENTE_POR_INSTRUMENTO } from '@/lib/legal-retrieval/instrument-identity';
import { parsearInstrumentRef } from '@/lib/legal-retrieval/instrument-ref';
import { clasificarFragmentoClo, INSTRUMENT_IDS, INSTRUMENTOS_SOLO_CONTEXT, instrumentIdDeFragmento, textoNombraInstrumento } from '@/lib/legal-retrieval/clo-guards';
import { PERFILES } from '@/tools/corpus/receive-pdf';
import { construirLote } from '@/scripts/ingesta-lote-staging';
import { detectarInstrumentoDesdeTexto } from '@/lib/legal-retrieval/exact-resolver';

const FUENTE_D35 = 'Decreto 35-2013, reformas integrales en Familia y Niñez (La Gaceta 33,222)';
const FUENTE_NINEZ = 'Código de la Niñez y de la Adolescencia (Decreto No. 73-96)';

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

  it('CODIGO_NINEZ es una identidad estrictamente anclada y no captura ninguna de las 19 filas del D.35', () => {
    expect(identidadDeFuente(FUENTE_NINEZ)).toBe('CODIGO_NINEZ');
    expect(detectarInstrumentoDesdeTexto('Artículo 5 del Código de la Niñez y de la Adolescencia')).toBe('CODIGO_NINEZ');
    expect(Object.keys(RE_FUENTE_POR_INSTRUMENTO)).toContain('CODIGO_NINEZ');
    expect(parsearInstrumentRef('HN:CODIGO_NINEZ')).toMatchObject({ ok: true, pais: 'HN', instrumento: 'CODIGO_NINEZ' });
    expect(INSTRUMENT_IDS).toContain('CODIGO_NINEZ');
    const identidadesD35 = Array.from({ length: 19 }, (_, i) => {
      const fila = { fuente: FUENTE_D35, num_articulo: String(i + 1), jurisdiccion: 'HN', fuente_tipo: 'ley', metadata: { norm_id: 'HN:DECRETO_35_2013' } };
      return { fuente: identidadDeFuente(fila.fuente), clo: instrumentIdDeFragmento(fila) };
    });
    expect(identidadesD35).toEqual(Array.from({ length: 19 }, () => ({ fuente: 'DECRETO_35_2013', clo: 'DECRETO_35_2013' })));
  });
});

describe('CLO: adjudicación del pliego D1–D8 (ADJUDICACION_CLO_D35_2013.md §7)', () => {
  const vigente = { fuente: FUENTE_D35, fuente_tipo: 'ley', jurisdiccion: 'HN', es_norma_vigente: true } as const;

  it('D7: el decreto ya no está bloqueado por falta de pliego', () => {
    expect(INSTRUMENTOS_SOLO_CONTEXT.DECRETO_35_2013).toBeUndefined();
  });

  it('D7: Código de la Niñez puede ser PRIMARY tras adjudicación, si cumple los demás guardianes', () => {
    expect(INSTRUMENTOS_SOLO_CONTEXT.CODIGO_NINEZ).toBeUndefined();
    const c = clasificarFragmentoClo({
      fuente: FUENTE_NINEZ, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, num_articulo: '1',
      metadata: { norm_id: 'HN:CODIGO_NINEZ' },
    });
    expect(c.instrumentId).toBe('CODIGO_NINEZ');
    expect(c.rol).toBe('PRIMARY');
    expect(c.bloqueos).toEqual([]);
  });

  it('D4/D5: la metadata conserva los artículos reservados como CONTEXT', () => {
    const c = clasificarFragmentoClo({
      fuente: FUENTE_NINEZ, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, num_articulo: '2',
      metadata: { norm_id: 'HN:CODIGO_NINEZ', rol: 'CONTEXT', motivo_rol: 'RESERVA_D1_B' },
    });
    expect(c.instrumentId).toBe('CODIGO_NINEZ');
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('ROL_DECLARADO_CONTEXT');
    expect(c.bloqueos).not.toContain('INSTRUMENTO_SIN_PLIEGO_CLO');
  });

  it('C07: el artículo 21 con vigencia NULL sigue siendo solo CONTEXT', () => {
    const c = clasificarFragmentoClo({
      fuente: FUENTE_NINEZ, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, num_articulo: '21',
      metadata: { norm_id: 'HN:CODIGO_NINEZ', rol: 'CONTEXT', interpretacion_pendiente_clo: 'INTERPRETACION_PENDIENTE_CLO (C07)' },
    });
    expect(c.instrumentId).toBe('CODIGO_NINEZ');
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('VIGENCIA_NO_ACREDITADA');
    expect(c.bloqueos).toContain('ROL_DECLARADO_CONTEXT');
  });

  it.each(['12', '13', '14', '15', '16', '17', '18', '19'])('D5: el art. %s (disposición propia del decreto), vigente y HN, es PRIMARY', (art) => {
    const c = clasificarFragmentoClo({ ...vigente, num_articulo: art, metadata: { norm_id: 'HN:DECRETO_35_2013' } });
    expect(c.instrumentId).toBe('DECRETO_35_2013');
    expect(c.bloqueos).toEqual([]);
    expect(c.rol).toBe('PRIMARY');
  });

  it.each(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])('D5: el art. %s (texto de otra ley, o art. 11 con INTERPRETACION_PENDIENTE_CLO) sigue CONTEXT por su metadata.rol', (art) => {
    const c = clasificarFragmentoClo({ ...vigente, num_articulo: art, metadata: { norm_id: 'HN:DECRETO_35_2013', rol: 'CONTEXT', motivo_rol: 'DISPOSICION_MODIFICATORIA' } });
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toEqual(['ROL_DECLARADO_CONTEXT']);
    expect(c.bloqueos).not.toContain('INSTRUMENTO_SIN_PLIEGO_CLO');
  });

  it('las filas que genera la ingesta siguen naciendo ocultas y sin vigencia: solo CONTEXT hasta la escritura de visibilidad', () => {
    const texto = 'ARTÍCULO 1.- Reformar los artículos del código, con texto suficiente.\nARTÍCULO 2.- Adicionar los artículos siguientes, con texto suficiente.';
    const { filas } = construirLote({ texto, instrumentoRef: 'HN:DECRETO_35_2013', ingestBatch: 'PILOTO_D35', fuente: FUENTE_D35, fuenteTipo: 'ley', meta: {}, serieCorrelativa: 2 });
    expect(filas).toHaveLength(2);
    for (const f of filas) {
      expect(f).toMatchObject({ instrumento_id: 'DECRETO_35_2013', jurisdiccion: 'HN', revision_pendiente: true, es_norma_vigente: null });
      const c = clasificarFragmentoClo({ ...f, metadata: f.metadata });
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toEqual(['VIGENCIA_NO_ACREDITADA']);
    }
  });

  it('una fila con vigencia FALSE queda excluida aunque el pliego esté aprobado', () => {
    const c = clasificarFragmentoClo({ ...vigente, es_norma_vigente: false, num_articulo: '19' });
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('VIGENCIA_FALSE_EXCLUIDA');
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
