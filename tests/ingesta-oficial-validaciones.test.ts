import { describe, it, expect } from 'vitest';
import {
  validarManifestCompleto,
  validarNumeracionCoherente,
  validarSinDuplicadosContraCorpusExistente,
  validarMezclaDeMaterias,
  validarSinDatosPrivados,
  validarArticulosNoVacios,
} from '@/lib/ingesta-oficial/validaciones';
import { sha256 } from '@/lib/ingesta-oficial/hash';
import type { ManifestFuenteOficial } from '@/lib/ingesta-oficial/types';

const manifestCompleto: ManifestFuenteOficial = {
  autoridad: 'Autoridad demo',
  decreto: 'DEMO-1',
  publicacion: '2026-01-01',
  materia: '99_DEMO',
  estado: 'vigente',
  checksum: 'x',
  responsableRevision: 'tester',
};

describe('validarManifestCompleto', () => {
  it('acepta un manifest con todos los campos', () => {
    expect(validarManifestCompleto(manifestCompleto)).toBeNull();
  });
  it('rechaza si falta decreto', () => {
    expect(validarManifestCompleto({ ...manifestCompleto, decreto: '' })).toMatch(/decreto/);
  });
});

describe('validarArticulosNoVacios', () => {
  it('rechaza artículos con contenido vacío', () => {
    const r = validarArticulosNoVacios([{ numArticulo: '1', contenido: '   ' }]);
    expect(r).toMatch(/vac[ií]os/);
  });
  it('acepta artículos con contenido', () => {
    expect(validarArticulosNoVacios([{ numArticulo: '1', contenido: 'texto' }])).toBeNull();
  });
});

describe('validarNumeracionCoherente', () => {
  it('rechaza numeración duplicada', () => {
    const r = validarNumeracionCoherente([
      { numArticulo: '1', contenido: 'a' },
      { numArticulo: '1', contenido: 'b' },
    ]);
    expect(r).toMatch(/repetido/);
  });
  it('rechaza numeración no numérica', () => {
    const r = validarNumeracionCoherente([{ numArticulo: 'bis', contenido: 'a' }]);
    expect(r).toMatch(/no num[eé]ricos/);
  });
  it('acepta numeración simple sin duplicados', () => {
    expect(validarNumeracionCoherente([
      { numArticulo: '1', contenido: 'a' },
      { numArticulo: '2', contenido: 'b' },
    ])).toBeNull();
  });
});

describe('validarSinDuplicadosContraCorpusExistente', () => {
  it('rechaza si el hash de un artículo ya existe', () => {
    const articulos = [{ numArticulo: '1', contenido: 'texto repetido' }];
    const hashes = new Set([sha256('texto repetido')]);
    expect(validarSinDuplicadosContraCorpusExistente(articulos, hashes, sha256)).toMatch(/duplicados/);
  });
  it('acepta si no hay coincidencia de hash', () => {
    const articulos = [{ numArticulo: '1', contenido: 'texto nuevo' }];
    expect(validarSinDuplicadosContraCorpusExistente(articulos, new Set(['otrohash']), sha256)).toBeNull();
  });
});

describe('validarMezclaDeMaterias', () => {
  it('rechaza cuando se detecta más de una materia', () => {
    expect(validarMezclaDeMaterias({ ...manifestCompleto, materia: '01_PENAL' }, ['02_CIVIL'])).toMatch(/mezcla de materias/);
  });
  it('acepta cuando todas las materias coinciden', () => {
    expect(validarMezclaDeMaterias({ ...manifestCompleto, materia: '01_PENAL' }, ['01_PENAL'])).toBeNull();
  });
});

describe('validarSinDatosPrivados', () => {
  it('rechaza artefactos de anonimización sin limpiar', () => {
    const r = validarSinDatosPrivados([{ numArticulo: '1', contenido: 'texto con [Cliente_Anonimo] presente' }]);
    expect(r).toMatch(/posibles datos privados/);
  });
  it('rechaza patrones tipo RTN', () => {
    const r = validarSinDatosPrivados([{ numArticulo: '1', contenido: 'RTN: 08011999123456' }]);
    expect(r).toMatch(/posibles datos privados/);
  });
  it('acepta texto legal normal', () => {
    const r = validarSinDatosPrivados([{ numArticulo: '1', contenido: 'El que ejecutare una acción dolosa...' }]);
    expect(r).toBeNull();
  });
});
