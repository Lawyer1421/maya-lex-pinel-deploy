/**
 * lib/exequatur/curriculum/types.ts
 *
 * Tipos del dominio de currículo educativo de Exequátur (Slice 2).
 * Repositorio-versionado, sin tabla ni migración de base de datos -- ver
 * MAYALEX_EXEQUATUR_V1_CONTRACT.md.
 *
 * Una `CanonicalLegalReference` es un LOCALIZADOR (instrumento + número de
 * artículo), nunca un identificador permanente de fragmento/chunk. No
 * apunta a ninguna fila concreta de `biblioteca_vectores` ni almacena su
 * `id` -- la resolución contra evidencia real ocurre en tiempo de
 * ejecución vía CanonicalLegalReferenceAdapter, nunca en este archivo.
 */
import type { InstrumentoNormalizado } from '@/lib/rag/search';

/** Localizador de una referencia legal -- no un identificador de chunk ni contenido citado. */
export interface CanonicalLegalReference {
  instrumento: InstrumentoNormalizado;
  articulo: string;
}

export interface LearningObjective {
  id: string;
  descripcion: string;
  /** Al menos una referencia -- todo objetivo de aprendizaje debe ser verificable contra el corpus real. */
  referencias: CanonicalLegalReference[];
}

export interface Lesson {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  objetivos: LearningObjective[];
}

export interface Module {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  lecciones: Lesson[];
}

export interface Curriculum {
  /** Versión del contenido semilla -- incrementar al modificar módulos/lecciones/objetivos. */
  version: number;
  titulo: string;
  modulos: Module[];
}

/** Un ítem verificable del checklist administrativo -- mismo contrato que un objetivo de aprendizaje: siempre ancla a una referencia real. */
export interface VigenciaChecklistItem {
  id: string;
  descripcion: string;
  referencia: CanonicalLegalReference;
}

/**
 * Ficha de vigencia (Módulo 0): estado administrativo de la ruta hacia el
 * Exequátur -- requisitos y checklist ante la Contraloría del Notariado --
 * separado del currículo pedagógico porque no es "aprenda esto", es "verifique
 * esto". `fechaValidacion` es la fecha en que un humano confirmó manualmente
 * que el checklist sigue vigente contra el corpus real (no un timestamp de
 * build). `advertencia` se muestra en UI cuando `vigente=false` o cuando
 * fechaValidacion supera el umbral de revalidación que decida el producto --
 * este archivo no calcula esa lógica, solo declara el dato.
 */
export interface VigenciaSheet {
  id: string;
  titulo: string;
  checklist: VigenciaChecklistItem[];
  fechaValidacion: string;
  vigente: boolean;
  advertencia: string | null;
}
