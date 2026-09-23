/**
 * lib/exequatur/curriculum/curriculum.ts
 *
 * Contenido semilla del currículo Exequátur -- versionado en el
 * repositorio, sin base de datos.
 *
 * v2 (2026-09-22): expande la v1 (2 módulos, 3 lecciones) a 3 de los 4 ejes
 * formativos anunciados en la Landing de oferta
 * (components/v2/exequatur/OfertaExequatur.tsx): Derecho Notarial y Forma
 * Documental, Jurisdicción Voluntaria, y Régimen Disciplinario Notarial.
 *
 * v3 (2026-09-22, mismo día): incorpora la malla canónica solicitada --
 * Fe Pública (CPC art. 270), El Instrumento Público (CN arts. 14/18-22/24/28)
 * y El Protocolo Notarial / reserva (CN art. 37). El Módulo 0 (Ruta
 * Administrativa) NO vive aquí -- ver lib/exequatur/curriculum/vigencia-sheet.ts,
 * es un checklist administrativo, no contenido pedagógico. Tampoco se agregan
 * en este delta:
 *   - "Evolución histórica del Notariado" (Eje I, Módulo 1 de la malla
 *     solicitada): es contenido doctrinal/narrativo sin un artículo de
 *     derecho vigente hondureño que lo ancle -- el tipo LearningObjective
 *     exige "al menos una referencia... verificable contra el corpus real"
 *     (ver types.ts); inventar una referencia solo para cumplir la forma
 *     violaría exactamente la garantía de cero alucinaciones que este
 *     currículo existe para sostener.
 *   - "Responsabilidad Profesional" (planos civil/penal, más allá del
 *     disciplinario ya cubierto en mod-regimen-disciplinario): no se
 *     verificó un artículo específico de responsabilidad civil/penal del
 *     Notario distinto del régimen disciplinario ya citado (arts. 77/79) --
 *     agregar esto requiere una sesión de verificación propia contra
 *     Código Civil/Penal, no se improvisa aquí.
 *   - "Banco Maestro de Reactivos / Trampas Notariales" y "Simulador Oficial
 *     CSJ" (Cierre): son features de producto (temporizador, UI de examen,
 *     banco de reactivos ampliado), no contenido de currículo -- fuera de
 *     alcance de este archivo. lib/exequatur/diagnostico/banco.ts ya cubre
 *     cada objetivo con un reactivo; ampliarlo a "banco maestro" y construir
 *     un simulador cronometrado es un proyecto de ingeniería aparte.
 *
 * El cuarto eje formativo anunciado en la Landing -- Práctica Registral y
 * Mercantil -- sigue sin agregarse: el Código de Comercio (Decreto 73-1950)
 * no está vectorizado en `biblioteca_vectores` con fuente_tipo='codigo'
 * (verificado por consulta directa contra producción, 2026-09-22 -- cero
 * filas). Solo existe una tabla de staging sin terminar de ingerir
 * (`stg_codigo_comercio_1950`, RLS deshabilitado -- ver hallazgo de
 * seguridad reportado aparte). Agregar objetivos de aprendizaje citando ese
 * instrumento ahora resolvería siempre NO_VERIFICADO en
 * CanonicalLegalReferenceAdapter.
 *
 * Cada referencia nueva abajo fue verificada por lectura directa (solo
 * lectura) contra la base de producción antes de escribir este archivo --
 * Código del Notariado de Honduras (Decreto 353-2005) arts.
 * 14/18/19/20/21/22/23/24/28/37/52/56/58/76/77/78/79, y Código Procesal
 * Civil arts. 270/919 -- todas presentes con es_norma_vigente=true y con
 * encabezado real "ARTÍCULO N.-" en el corpus. El art. 27 del Código del
 * Notariado existe en el corpus pero con es_norma_vigente=false -- se omite
 * deliberadamente de este currículo (no se cita derogado como vigente). Esa
 * verificación no sustituye la resolución en vivo del adaptador: si el
 * corpus cambia, el adaptador falla cerrado a NO_VERIFICADO igual que para
 * cualquier otra referencia.
 */
import type { Curriculum } from './types';

export const CURRICULUM_EXEQUATUR: Curriculum = {
  version: 3,
  titulo: 'Preparación para el Examen de Incorporación Notarial',
  modulos: [
    {
      id: 'mod-fundamentos-notariado',
      slug: 'fundamentos-del-notariado',
      titulo: 'Derecho Notarial y Forma Documental',
      descripcion:
        'La institución del Notariado, la función notarial, los requisitos legales para ejercerla, y la forma documental de los instrumentos públicos en Honduras.',
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
        {
          id: 'lec-instrumentos-y-protocolo',
          slug: 'instrumentos-publicos-y-el-protocolo',
          titulo: 'Instrumentos públicos, actas de testimonio y el protocolo',
          resumen:
            'La forma documental de las actas notariales de testimonio por exhibición, y el deber de guarda y conservación del protocolo.',
          objetivos: [
            {
              id: 'obj-actas-testimonio-exhibicion',
              descripcion:
                'Explicar el alcance y los límites de un acta notarial de testimonio por exhibición de documentos.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '23' }],
            },
            {
              id: 'obj-guarda-protocolo',
              descripcion:
                'Describir la obligación del Notario ante la pérdida o inutilización del protocolo, y a quién debe reportarla.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '52' }],
            },
          ],
        },
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
        {
          id: 'lec-fe-publica-clases-documentos',
          slug: 'la-fe-publica-y-las-clases-de-documentos',
          titulo: 'La fe pública y las clases de documentos',
          resumen:
            'La distinción procesal entre documentos públicos y privados como base de la fe pública que ejerce el Notario.',
          objetivos: [
            {
              id: 'obj-clases-de-documentos',
              descripcion:
                'Distinguir entre documentos públicos y privados según el Código Procesal Civil, como base de la fe pública notarial.',
              referencias: [{ instrumento: 'CODIGO_PROCESAL_CIVIL', articulo: '270' }],
            },
          ],
        },
      ],
    },
    {
      id: 'mod-instrumento-publico',
      slug: 'el-instrumento-publico',
      titulo: 'El Instrumento Público',
      descripcion:
        'Las clases de instrumentos públicos que autoriza el Notario -- escritura matriz, actas notariales, protocolización y certificaciones -- y los motivos de nulidad que afectan su eficacia.',
      lecciones: [
        {
          id: 'lec-escritura-matriz-y-clases-instrumento',
          slug: 'la-escritura-matriz-y-las-clases-de-instrumento',
          titulo: 'La escritura matriz y las clases de instrumento público',
          resumen:
            'Qué cuenta como instrumento público, qué es la escritura matriz, y los requisitos del papel en que debe extenderse.',
          objetivos: [
            {
              id: 'obj-definicion-instrumento-publico',
              descripcion: 'Enumerar qué cuenta como instrumento público según el Código del Notariado.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '14' }],
            },
            {
              id: 'obj-escritura-matriz',
              descripcion: 'Definir qué es la escritura matriz y quién la redacta.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '19' }],
            },
            {
              id: 'obj-papel-especial-escrituras',
              descripcion: 'Identificar el requisito de papel especial en que deben extenderse las escrituras matrices.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '20' }],
            },
          ],
        },
        {
          id: 'lec-actas-protocolizacion-certificaciones',
          slug: 'actas-notariales-protocolizacion-y-certificaciones',
          titulo: 'Actas notariales, protocolización y certificaciones',
          resumen:
            'El acta notarial como instrumento distinto de la escritura, la protocolización de documentos ordenada por autoridad, y la facultad del Notario de certificar existencia física de personas.',
          objetivos: [
            {
              id: 'obj-definicion-acta-notarial',
              descripcion: 'Definir el acta notarial y distinguirla de la escritura matriz.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '21' }],
            },
            {
              id: 'obj-certificacion-existencia-fisica',
              descripcion: 'Explicar la facultad del Notario de certificar la existencia física de personas.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '22' }],
            },
            {
              id: 'obj-protocolizacion-documentos',
              descripcion: 'Describir en qué consiste la protocolización de documentos públicos o privados.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '24' }],
            },
            {
              id: 'obj-definicion-copia',
              descripcion: 'Definir qué es una copia como traslado literal y auténtico de la escritura.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '28' }],
            },
          ],
        },
        {
          id: 'lec-eficacia-e-impugnacion',
          slug: 'eficacia-e-impugnacion-del-instrumento',
          titulo: 'Eficacia e impugnación del instrumento público',
          resumen: 'Los motivos de nulidad que puede tener un instrumento público, más allá de los ya consignados en la Ley.',
          objetivos: [
            {
              id: 'obj-motivos-nulidad-instrumento',
              descripcion: 'Identificar los motivos de nulidad de un instrumento público reconocidos por el Código del Notariado.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '18' }],
            },
          ],
        },
      ],
    },
    {
      id: 'mod-protocolo-notarial',
      slug: 'el-protocolo-notarial',
      titulo: 'El Protocolo Notarial',
      descripcion: 'La reserva del protocolo mientras está en poder del Notario, más allá del deber de guarda ya cubierto en Derecho Notarial y Forma Documental.',
      lecciones: [
        {
          id: 'lec-reserva-del-protocolo',
          slug: 'la-reserva-del-protocolo',
          titulo: 'La reserva del protocolo',
          resumen: 'El carácter reservado del protocolo mientras permanece en poder del Notario.',
          objetivos: [
            {
              id: 'obj-reserva-protocolo',
              descripcion: 'Explicar el carácter reservado de los protocolos mientras estén en poder de los Notarios.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '37' }],
            },
          ],
        },
      ],
    },
    {
      id: 'mod-jurisdiccion-voluntaria',
      slug: 'jurisdiccion-voluntaria',
      titulo: 'Jurisdicción Voluntaria',
      descripcion:
        'La actuación notarial en los asuntos no contenciosos (jurisdicción voluntaria), su marco procesal conforme al Código Procesal Civil, y las facultades del Notario para tramitarlos.',
      lecciones: [
        {
          id: 'lec-actuacion-notarial-no-contenciosa',
          slug: 'actuacion-notarial-en-asuntos-no-contenciosos',
          titulo: 'La actuación notarial en asuntos no contenciosos',
          resumen:
            'El marco legal de la jurisdicción voluntaria notarial: a qué normas se sujeta, sus límites, y las facultades del Notario para requerir colaboración de otras autoridades.',
          objetivos: [
            {
              id: 'obj-marco-asuntos-no-contenciosos',
              descripcion:
                'Identificar a qué normas se sujeta la actuación notarial en los asuntos no contenciosos, y las consecuencias de expedir copias parciales indebidas.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '56' }],
            },
            {
              id: 'obj-requerimiento-colaboracion',
              descripcion:
                'Describir la facultad del Notario de requerir colaboración de autoridad competente para tramitar un expediente, y el procedimiento si se le niega.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '58' }],
            },
            {
              id: 'obj-remision-jurisdiccion-voluntaria-cpc',
              descripcion:
                'Explicar por qué, mientras no se apruebe una ley de Jurisdicción Voluntaria, los actos de jurisdicción voluntaria continúan rigiéndose por el Libro IV del Código de Procedimientos Civiles de 1906, según remite el Código Procesal Civil.',
              referencias: [{ instrumento: 'CODIGO_PROCESAL_CIVIL', articulo: '919' }],
            },
          ],
        },
      ],
    },
    {
      id: 'mod-regimen-disciplinario',
      slug: 'regimen-disciplinario',
      titulo: 'Régimen Disciplinario',
      descripcion:
        'La Contraloría del Notariado: su integración, atribuciones, y el régimen de sanciones aplicable a los Notarios por infracciones a la Ley.',
      lecciones: [
        {
          id: 'lec-contraloria-y-sanciones',
          slug: 'la-contraloria-del-notariado-y-las-sanciones',
          titulo: 'La Contraloría del Notariado y el régimen de sanciones',
          resumen:
            'Quién integra la Contraloría del Notariado, cuáles son sus atribuciones de supervisión y control, y las tres sanciones aplicables según la gravedad de la infracción.',
          objetivos: [
            {
              id: 'obj-atribuciones-contraloria',
              descripcion:
                'Enumerar las atribuciones de supervisión, control y vigilancia de la Contraloría del Notariado sobre el ejercicio de la función notarial.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '77' }],
            },
            {
              id: 'obj-sanciones-notariales',
              descripcion:
                'Enumerar las tres sanciones disciplinarias aplicables a los Notarios y el criterio de gravedad que determina cuál corresponde.',
              referencias: [{ instrumento: 'CODIGO_NOTARIADO', articulo: '79' }],
            },
          ],
        },
      ],
    },
  ],
};
