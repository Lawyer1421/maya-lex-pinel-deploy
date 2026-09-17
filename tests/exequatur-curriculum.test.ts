import { describe, it, expect } from 'vitest';
import { CURRICULUM_EXEQUATUR } from '@/lib/exequatur/curriculum/curriculum';

// Validaciones estructurales puras sobre el contenido semilla versionado en
// el repositorio (Slice 2) -- sin DB, sin red. Objetivo: garantizar que el
// dominio de currículo respeta las restricciones de la autorización de
// Slice 2 (localizador, no identidad permanente; sin texto legal
// duplicado; toda afirmación sustantiva es verificable).

describe('CURRICULUM_EXEQUATUR — estructura mínima coherente', () => {
  it('[1] tiene al menos un módulo, y cada módulo al menos una lección', () => {
    expect(CURRICULUM_EXEQUATUR.modulos.length).toBeGreaterThan(0);
    for (const modulo of CURRICULUM_EXEQUATUR.modulos) {
      expect(modulo.lecciones.length).toBeGreaterThan(0);
    }
  });

  it('[2] todo objetivo de aprendizaje declara al menos una referencia legal', () => {
    for (const modulo of CURRICULUM_EXEQUATUR.modulos) {
      for (const leccion of modulo.lecciones) {
        expect(leccion.objetivos.length).toBeGreaterThan(0);
        for (const objetivo of leccion.objetivos) {
          expect(objetivo.referencias.length).toBeGreaterThan(0);
        }
      }
    }
  });

  const INSTRUMENTOS_VALIDOS = new Set([
    'CODIGO_PROCESAL_PENAL', 'CODIGO_PENAL', 'CODIGO_PROCESAL_CIVIL', 'CODIGO_CIVIL',
    'CODIGO_TRABAJO', 'CODIGO_FAMILIA', 'CODIGO_NOTARIADO', 'REGLAMENTO_NOTARIADO',
    'CODIGO_TRIBUTARIO', 'LEY_JUSTICIA_CONSTITUCIONAL', 'CONSTITUCION', 'CODIGO_COMERCIO',
  ]);

  it('[3] toda referencia es un localizador válido {instrumento, articulo} -- nunca un chunk id', () => {
    for (const modulo of CURRICULUM_EXEQUATUR.modulos) {
      for (const leccion of modulo.lecciones) {
        for (const objetivo of leccion.objetivos) {
          for (const ref of objetivo.referencias) {
            expect(INSTRUMENTOS_VALIDOS.has(ref.instrumento)).toBe(true);
            expect(typeof ref.articulo).toBe('string');
            expect(ref.articulo.length).toBeGreaterThan(0);
            // El localizador solo tiene estas dos claves -- ningún id de fila/chunk.
            expect(Object.keys(ref).sort()).toEqual(['articulo', 'instrumento']);
          }
        }
      }
    }
  });

  it('[4] slugs de módulo y de lección son únicos (seguridad de ruteo)', () => {
    const slugsModulo = CURRICULUM_EXEQUATUR.modulos.map((m) => m.slug);
    expect(new Set(slugsModulo).size).toBe(slugsModulo.length);
    for (const modulo of CURRICULUM_EXEQUATUR.modulos) {
      const slugsLeccion = modulo.lecciones.map((l) => l.slug);
      expect(new Set(slugsLeccion).size).toBe(slugsLeccion.length);
    }
  });

  // Guarda contra duplicación de texto legal en el repositorio: los campos
  // editoriales (título/resumen/descripción) son resúmenes pedagógicos
  // cortos, nunca una transcripción del artículo -- el texto real solo se
  // obtiene en tiempo de ejecución vía el adaptador (ver
  // tests/exequatur-canonical-reference-adapter.test.ts).
  const LIMITE_CAMPO_EDITORIAL = 300;

  it('[5] ningún campo editorial del currículo contiene texto legal transcrito (guarda de longitud)', () => {
    for (const modulo of CURRICULUM_EXEQUATUR.modulos) {
      expect(modulo.titulo.length).toBeLessThan(LIMITE_CAMPO_EDITORIAL);
      expect(modulo.descripcion.length).toBeLessThan(LIMITE_CAMPO_EDITORIAL);
      for (const leccion of modulo.lecciones) {
        expect(leccion.titulo.length).toBeLessThan(LIMITE_CAMPO_EDITORIAL);
        expect(leccion.resumen.length).toBeLessThan(LIMITE_CAMPO_EDITORIAL);
        for (const objetivo of leccion.objetivos) {
          expect(objetivo.descripcion.length).toBeLessThan(LIMITE_CAMPO_EDITORIAL);
        }
      }
    }
  });
});
