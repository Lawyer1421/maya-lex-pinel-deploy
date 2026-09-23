/**
 * lib/exequatur/curriculum/vigencia-sheet.ts
 *
 * Módulo 0 -- Ruta Administrativa y Ficha de Vigencia. No es contenido
 * pedagógico (no vive en CURRICULUM_EXEQUATUR): es el checklist de
 * requisitos ante la Contraloría del Notariado para poder ejercer, cada
 * ítem anclado a una referencia real verificable en tiempo de ejecución vía
 * CanonicalLegalReferenceAdapter -- igual que cualquier LearningObjective.
 *
 * Verificado por lectura directa contra producción (2026-09-22): Código del
 * Notariado de Honduras (Decreto 353-2005) art. 7, es_norma_vigente=true.
 *
 * `fechaValidacion` es cuándo un humano confirmó manualmente que este
 * checklist sigue reflejando el art. 7 vigente -- no se actualiza sola.
 * `vigente`/`advertencia` reflejan ese último chequeo manual, no una
 * revalidación en vivo (esa la hace el adaptador al resolver la referencia).
 */
import type { VigenciaSheet } from './types';

export const VIGENCIA_SHEET_EXEQUATUR: VigenciaSheet = {
  id: 'vigencia-ruta-administrativa',
  titulo: 'Ruta Administrativa y Ficha de Vigencia',
  checklist: [
    {
      id: 'check-requisitos-ejercicio',
      descripcion: 'Cumplir los requisitos legales para obtener la autorización de ejercicio del Notariado.',
      referencia: { instrumento: 'CODIGO_NOTARIADO', articulo: '7' },
    },
    {
      id: 'check-procedimiento-autorizacion',
      descripcion: 'Completar el procedimiento de autorización de ejercicio ante la autoridad competente.',
      referencia: { instrumento: 'CODIGO_NOTARIADO', articulo: '8' },
    },
  ],
  fechaValidacion: '2026-09-22',
  vigente: true,
  advertencia: null,
};
