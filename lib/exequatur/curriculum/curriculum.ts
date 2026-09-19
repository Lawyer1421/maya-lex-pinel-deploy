/**
 * lib/exequatur/curriculum/curriculum.ts
 *
 * Contenido semilla del currículo Exequátur v1 -- versionado en el
 * repositorio, sin base de datos. Deliberadamente mínimo (2 módulos, 3
 * lecciones): esta slice construye el dominio y su verificación contra
 * evidencia real, no un temario completo.
 *
 * NO contiene texto legal citado literalmente en ningún campo: cada
 * LearningObjective declara solo la referencia {instrumento, articulo} que
 * CanonicalLegalReferenceAdapter resuelve en vivo contra
 * lib/rag/search.ts. Las referencias abajo fueron verificadas por lectura
 * directa (solo lectura) contra la base de producción antes de escribir
 * este archivo -- Código del Notariado de Honduras (Decreto 353-2005) arts.
 * 2/3/7/8, y Código Civil de Honduras (1906) arts. 1/1575 -- todas vigentes
 * y con encabezado real "Artículo N." en el corpus. Esa verificación no
 * sustituye la resolución en vivo del adaptador: si el corpus cambia, el
 * adaptador falla cerrado a NO_VERIFICADO igual que para cualquier otra
 * referencia.
 */
import type { Curriculum } from './types';

export const CURRICULUM_EXEQUATUR: Curriculum = {
  version: 1,
  titulo: 'Preparación para el Examen de Incorporación Notarial',
  modulos: [
    {
      id: 'mod-fundamentos-notariado',
      slug: 'fundamentos-del-notariado',
      titulo: 'Fundamentos del Notariado',
      descripcion:
        'La institución del Notariado, la función notarial y los requisitos legales para ejercerla en Honduras.',
      lecciones: [
        {
          id: 'lec-institucion-y-funcion-notarial',
          slug: 'la-institucion-del-notariado',
          titulo: 'La institución del Notariado y la función notarial',
          resumen:
            'Qué es el Notariado como institución del Estado y en qué consiste la función notarial que ejerce el Notario.',
          objetivos: [
            {
              id: 'obj-definicion-notariado',
              descripcion: 'Explicar qué es el Notariado como institución del Estado.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '2' }],
            },
            {
              id: 'obj-definicion-funcion-notarial',
              descripcion: 'Definir la función notarial y su naturaleza de interés público y social.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '3' }],
            },
          ],
        },
        {
          id: 'lec-requisitos-para-ser-notario',
          slug: 'requisitos-para-ser-notario',
          titulo: 'Requisitos para ser Notario',
          resumen:
            'Los requisitos legales para obtener la autorización de ejercicio del Notariado en Honduras.',
          objetivos: [
            {
              id: 'obj-requisitos-legales',
              descripcion: 'Enumerar los requisitos legales para ser Notario.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '7' }],
            },
            {
              id: 'obj-procedimiento-autorizacion',
              descripcion: 'Describir el procedimiento para obtener la autorización de ejercicio.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '8' }],
            },
          ],
        },
      ],
    },
    {
      id: 'mod-actos-y-contratos-civiles',
      slug: 'actos-y-contratos-civiles',
      titulo: 'Actos y Contratos Civiles Relevantes al Notariado',
      descripcion:
        'Nociones civiles generales que el Notario aplica al calificar y autorizar instrumentos públicos.',
      lecciones: [
        {
          id: 'lec-ley-y-documento-publico',
          slug: 'la-ley-y-el-documento-publico',
          titulo: 'La ley civil y los actos que deben constar en documento público',
          resumen:
            'Cómo se define la ley en el Código Civil y qué actos exige la ley que consten en documento público.',
          objetivos: [
            {
              id: 'obj-definicion-de-ley',
              descripcion: 'Identificar cómo define la ley el Código Civil de Honduras.',
              referencias: [{ instrumento: 'CODIGO_CIVIL', articulo: '1' }],
            },
            {
              id: 'obj-actos-en-documento-publico',
              descripcion: 'Enumerar los actos que la ley exige que consten en documento público.',
              referencias: [{ instrumento: 'CODIGO_CIVIL', articulo: '1575' }],
            },
          ],
        },
      ],
    },
  ],
};
