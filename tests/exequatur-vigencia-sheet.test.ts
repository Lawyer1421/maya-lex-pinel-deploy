import { describe, it, expect } from 'vitest';
import { VIGENCIA_SHEET_EXEQUATUR } from '@/lib/exequatur/curriculum/vigencia-sheet';

// Validación estructural del Módulo 0 (Ruta Administrativa) -- mismo patrón
// que tests/exequatur-curriculum.test.ts: sin DB, sin red, solo invariantes
// de forma sobre el contenido semilla versionado en el repositorio.

describe('VIGENCIA_SHEET_EXEQUATUR — estructura mínima coherente', () => {
  it('tiene al menos un ítem de checklist', () => {
    expect(VIGENCIA_SHEET_EXEQUATUR.checklist.length).toBeGreaterThan(0);
  });

  it('cada ítem del checklist declara un localizador legal válido, no un chunk id', () => {
    const INSTRUMENTOS_VALIDOS = new Set([
      'CODIGO_PROCESAL_PENAL', 'CODIGO_PENAL', 'CODIGO_PROCESAL_CIVIL', 'CODIGO_CIVIL',
      'CODIGO_TRABAJO', 'CODIGO_FAMILIA', 'CODIGO_NOTARIADO', 'REGLAMENTO_NOTARIADO',
      'CODIGO_TRIBUTARIO', 'LEY_JUSTICIA_CONSTITUCIONAL', 'CONSTITUCION', 'CODIGO_COMERCIO',
    ]);
    for (const item of VIGENCIA_SHEET_EXEQUATUR.checklist) {
      expect(INSTRUMENTOS_VALIDOS.has(item.referencia.instrumento)).toBe(true);
      expect(item.referencia.articulo.length).toBeGreaterThan(0);
      expect(Object.keys(item.referencia).sort()).toEqual(['articulo', 'instrumento']);
    }
  });

  it('ids de checklist son únicos', () => {
    const ids = VIGENCIA_SHEET_EXEQUATUR.checklist.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fechaValidacion es una fecha ISO (YYYY-MM-DD) parseable', () => {
    expect(VIGENCIA_SHEET_EXEQUATUR.fechaValidacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(VIGENCIA_SHEET_EXEQUATUR.fechaValidacion))).toBe(false);
  });

  it('si vigente=false, advertencia no puede ser null', () => {
    if (!VIGENCIA_SHEET_EXEQUATUR.vigente) {
      expect(VIGENCIA_SHEET_EXEQUATUR.advertencia).not.toBeNull();
    }
  });
});
