import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  JURISDICCIONES_V3,
  crearInstrumentRef,
  esInstrumentRef,
  parsearInstrumentRef,
  refCoincideConJurisdiccion,
  type InstrumentRef,
} from '@/lib/legal-retrieval/instrument-ref';
import { RE_FUENTE_POR_INSTRUMENTO } from '@/lib/legal-retrieval/instrument-identity';

const PAISES = ['HN', 'SV', 'GT', 'CR', 'NI', 'PA'] as const;

describe('instrument-ref: identidad país-calificada', () => {
  it('admite exactamente los seis países de v3 (Belice fuera)', () => {
    expect([...JURISDICCIONES_V3].sort()).toEqual([...PAISES].sort());
    expect(parsearInstrumentRef('BZ:CODIGO_CIVIL')).toEqual({ ok: false, motivo: 'PAIS_NO_ADMITIDO' });
  });

  it.each(PAISES)('%s:CODIGO_CIVIL es válido y conserva su país', (pais) => {
    const r = parsearInstrumentRef(`${pais}:CODIGO_CIVIL`);
    expect(r).toEqual({ ok: true, ref: `${pais}:CODIGO_CIVIL`, pais, instrumento: 'CODIGO_CIVIL' });
    expect(crearInstrumentRef(pais, 'CODIGO_CIVIL')).toBe(`${pais}:CODIGO_CIVIL`);
  });

  it('ningún instrumento de otro país colisiona con Honduras', () => {
    const refs = PAISES.flatMap((p) => Object.keys(RE_FUENTE_POR_INSTRUMENTO).map((i) => crearInstrumentRef(p, i)));
    expect(new Set(refs).size).toBe(refs.length);
    for (const otro of PAISES.filter((p) => p !== 'HN')) {
      const hn: InstrumentRef = crearInstrumentRef('HN', 'CODIGO_CIVIL');
      expect(crearInstrumentRef(otro, 'CODIGO_CIVIL')).not.toBe(hn);
      expect(refCoincideConJurisdiccion(`${otro}:CODIGO_CIVIL`, 'HN')).toBe(false);
      expect(refCoincideConJurisdiccion('HN:CODIGO_CIVIL', otro)).toBe(false);
    }
  });

  it('un id sin prefijo nunca se interpreta como HN', () => {
    expect(parsearInstrumentRef('CODIGO_CIVIL')).toEqual({ ok: false, motivo: 'FORMATO_INVALIDO' });
    expect(refCoincideConJurisdiccion('CODIGO_CIVIL', 'HN')).toBe(false);
  });

  it.each([
    ['hn:CODIGO_CIVIL', 'FORMATO_INVALIDO'],
    ['HN:codigo_civil', 'FORMATO_INVALIDO'],
    [' HN:CODIGO_CIVIL', 'FORMATO_INVALIDO'],
    ['HN:CODIGO_CIVIL ', 'FORMATO_INVALIDO'],
    ['HN: CODIGO_CIVIL', 'FORMATO_INVALIDO'],
    ['HN::CODIGO_CIVIL', 'FORMATO_INVALIDO'],
    ['HN:SV:CODIGO_CIVIL', 'FORMATO_INVALIDO'],
    ['HND:CODIGO_CIVIL', 'FORMATO_INVALIDO'],
    [':CODIGO_CIVIL', 'FORMATO_INVALIDO'],
    ['HN:', 'FORMATO_INVALIDO'],
    ['', 'FORMATO_INVALIDO'],
    ['US:CODIGO_CIVIL', 'PAIS_NO_ADMITIDO'],
    ['MX:CODIGO_CIVIL', 'PAIS_NO_ADMITIDO'],
    ['HN:CODIGO_INVENTADO', 'INSTRUMENTO_DESCONOCIDO'],
  ])('rechaza %j (%s)', (valor, motivo) => {
    expect(parsearInstrumentRef(valor)).toEqual({ ok: false, motivo });
    expect(esInstrumentRef(valor)).toBe(false);
  });

  it.each([null, undefined, 42, {}, ['HN', 'CODIGO_CIVIL']])('rechaza no-texto %j', (valor) => {
    expect(parsearInstrumentRef(valor)).toEqual({ ok: false, motivo: 'NO_ES_TEXTO' });
  });

  it('crearInstrumentRef lanza ante país o instrumento fuera de catálogo', () => {
    expect(() => crearInstrumentRef('hn', 'CODIGO_CIVIL')).toThrow(/país no admitido/);
    expect(() => crearInstrumentRef('', 'CODIGO_CIVIL')).toThrow(/país no admitido/);
    expect(() => crearInstrumentRef('BZ', 'CODIGO_CIVIL')).toThrow(/país no admitido/);
    expect(() => crearInstrumentRef('HN', 'codigo_civil')).toThrow(/instrumento desconocido/);
  });

  it('refCoincideConJurisdiccion exige igualdad exacta con la columna de la fila', () => {
    expect(refCoincideConJurisdiccion('HN:CODIGO_CIVIL', 'HN')).toBe(true);
    expect(refCoincideConJurisdiccion('SV:CODIGO_PENAL', 'SV')).toBe(true);
    for (const fila of [null, undefined, '', 'hn', 'Honduras', ' HN']) {
      expect(refCoincideConJurisdiccion('HN:CODIGO_CIVIL', fila)).toBe(false);
    }
  });

  it('la migración v3 valida la misma lista de países', () => {
    const m = readFileSync('supabase/migrations/20261115000000_multi_jurisdiction_v3.sql', 'utf8');
    const lista = /NOT IN \(([^)]*)\)/.exec(m)?.[1].match(/'([A-Z]{2})'/g)?.map((s) => s.slice(1, 3));
    expect(lista?.sort()).toEqual([...JURISDICCIONES_V3].sort());
  });
});
