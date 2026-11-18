import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { reglaPorEstado, sqlVisibilidad, validarCanonico, type ManifiestoCanonico } from '../scripts/ingesta-canonico-staging';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const texto = 'Artículo 1. Uno.\n\nArtículo 2. Dos.\n';
const base = (): ManifiestoCanonico => ({
  instrumento: 'HN:CODIGO_NINEZ', estado: 'TEXTO_DEFINITIVO_FIRMA_D3', texto_sha256: sha(texto),
  firma_d3: { firmante: 'CLO', sha256_lf: sha(texto) },
  articulos_detalle: [{ numero: '1', ordinal: 1, estado: 'TEXTO_V8_D3', sha256: 'x' }],
});
const pliego = `**Estado:** **D1–D8 FIRMADAS** · texto ${sha(texto)}`;

describe('validarCanonico', () => {
  it('acepta texto, manifiesto y pliego coherentes', () => {
    expect(validarCanonico({ texto, manifiesto: base(), pliego, instrumentoRef: 'HN:CODIGO_NINEZ' }).textoSha).toBe(sha(texto));
  });
  it('rechaza un texto distinto del manifiesto', () => {
    expect(() => validarCanonico({ texto: texto + 'x', manifiesto: base(), pliego, instrumentoRef: 'HN:CODIGO_NINEZ' })).toThrow(/no es el del manifiesto/);
  });
  it('rechaza un manifiesto sin firma D3 o en otro estado', () => {
    expect(() => validarCanonico({ texto, manifiesto: { ...base(), estado: 'CANONICO_V1_PARCIAL' }, pliego, instrumentoRef: 'HN:CODIGO_NINEZ' })).toThrow(/firma D3/);
    expect(() => validarCanonico({ texto, manifiesto: { ...base(), firma_d3: { firmante: 'CLO', sha256_lf: 'otro' } }, pliego, instrumentoRef: 'HN:CODIGO_NINEZ' })).toThrow(/firma D3/);
  });
  it('rechaza un pliego sin firmar o que no cita el hash', () => {
    expect(() => validarCanonico({ texto, manifiesto: base(), pliego: `pendiente ${sha(texto)}`, instrumentoRef: 'HN:CODIGO_NINEZ' })).toThrow(/no está firmado/);
    expect(() => validarCanonico({ texto, manifiesto: base(), pliego: '**D1–D8 FIRMADAS**', instrumentoRef: 'HN:CODIGO_NINEZ' })).toThrow(/no cita/);
  });
  it('rechaza otra identidad o una identidad fuera del catálogo', () => {
    expect(() => validarCanonico({ texto, manifiesto: base(), pliego, instrumentoRef: 'HN:DECRETO_35_2013' })).toThrow(/no de HN:DECRETO_35_2013/);
    expect(() => validarCanonico({ texto, manifiesto: base(), pliego, instrumentoRef: 'CODIGO_NINEZ' })).toThrow();
  });
});

describe('reglas D4/D5 del pliego de HN:CODIGO_NINEZ', () => {
  it('v8 vigente: TRUE y sin rol (PRIMARY elegible)', () => expect(reglaPorEstado('TEXTO_V8_D3')).toMatchObject({ esNormaVigente: 'true', rol: null }));
  it('A03 dictaminado: TRUE y CONTEXT (reserva D1 b)', () => expect(reglaPorEstado('TEXTO_A03_DICTAMINADO_CLO')).toMatchObject({ esNormaVigente: 'true', rol: 'CONTEXT' }));
  it('art. 21 (C07): NULL y CONTEXT', () => expect(reglaPorEstado('TEXTO_V8_D3_C07_PENDIENTE')).toMatchObject({ esNormaVigente: 'null', rol: 'CONTEXT' }));
  it('derogados: FALSE y CONTEXT', () => {
    expect(reglaPorEstado('DEROGADO')).toMatchObject({ esNormaVigente: 'false', rol: 'CONTEXT' });
    expect(reglaPorEstado('DEROGADO_INTEGRO')).toMatchObject({ esNormaVigente: 'false', rol: 'CONTEXT' });
  });
  it('un estado desconocido detiene la generación', () => expect(() => reglaPorEstado('A03_PENDIENTE_VERIFICACION')).toThrow(/sin regla/));
  it('el SQL de visibilidad lleva los conteos esperados en sus postcondiciones', () => {
    const sql = sqlVisibilidad({
      ingestBatch: 'L', instrumento: 'HN:CODIGO_NINEZ', adjudicacion: 'P', adjudicadoPor: 'CLO', total: 4,
      articulos: [{ numero: '1', ordinal: 1, estado: 'TEXTO_V8_D3', sha256: 'a' }, { numero: '2', ordinal: 2, estado: 'TEXTO_A03_DICTAMINADO_CLO', sha256: 'b' },
        { numero: '21', ordinal: 3, estado: 'TEXTO_V8_D3_C07_PENDIENTE', sha256: 'c' }, { numero: '62', ordinal: 4, estado: 'DEROGADO', sha256: 'd' }],
    });
    expect(sql).toMatch(/PRIMARY elegibles vigentes = % \(esperado 1\)/);
    expect(sql).toMatch(/CONTEXT vigentes = % \(esperado 1\)/);
    expect(sql).toMatch(/CONTEXT derogados = % \(esperado 1\)/);
    expect(sql).toMatch(/CONTEXT con vigencia NULL = % \(esperado 1\)/);
    expect(sql).toContain("es_norma_vigente = false");
    expect(sql).toContain('INTERPRETACION_PENDIENTE_CLO (C07)');
  });
});
