/**
 * Lookups puros sobre CURRICULUM_EXEQUATUR.
 * Un objetivo solo se resuelve si su id existe en el módulo/lección que lo declara.
 * Un id desconocido no “cae” en otro registro.
 */
import { CURRICULUM_EXEQUATUR } from './curriculum';
import type { LearningObjective, Lesson, Module } from './types';

export interface ObjetivoLocalizado {
  modulo: Module;
  leccion: Lesson;
  objetivo: LearningObjective;
}

export function localizarObjetivo(objetivoId: string): ObjetivoLocalizado | null {
  if (!objetivoId) return null;
  for (const modulo of CURRICULUM_EXEQUATUR.modulos) {
    for (const leccion of modulo.lecciones) {
      const objetivo = leccion.objetivos.find((o) => o.id === objetivoId);
      if (objetivo) return { modulo, leccion, objetivo };
    }
  }
  return null;
}

export function idsObjetivosCurriculo(): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const modulo of CURRICULUM_EXEQUATUR.modulos) {
    for (const leccion of modulo.lecciones) {
      for (const objetivo of leccion.objetivos) {
        ids.add(objetivo.id);
      }
    }
  }
  return ids;
}
