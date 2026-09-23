/**
 * Banco semilla Slice 3 — ítems de colocación, no un examen notarial completo.
 * Cada enunciado/opción es pedagógico (sobre el objetivo de la lección).
 * El texto legal se lee en la lección vía CanonicalLegalReferenceAdapter.
 */
import type { BancoDiagnostico } from './types';

export const BANCO_DIAGNOSTICO_EXEQUATUR: BancoDiagnostico = {
  version: 1,
  titulo: 'Diagnóstico de colocación',
  items: [
    {
      id: 'item-notariado-institucion',
      objetivoId: 'obj-definicion-notariado',
      enunciado: 'En esta lección, el Notariado se estudia principalmente como:',
      opciones: [
        { id: 'a', texto: 'Una institución del Estado.' },
        { id: 'b', texto: 'Una empresa mercantil privada.' },
        { id: 'c', texto: 'Un tribunal penal de sentencia.' },
      ],
      respuestaCorrectaId: 'a',
    },
    {
      id: 'item-funcion-notarial',
      objetivoId: 'obj-definicion-funcion-notarial',
      enunciado: 'La función notarial, en el objetivo de esta lección, se caracteriza por:',
      opciones: [
        { id: 'a', texto: 'Un interés exclusivamente particular del otorgante.' },
        { id: 'b', texto: 'Su naturaleza de interés público y social.' },
        { id: 'c', texto: 'Sustituir al juez en todo juicio civil.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-requisitos-notario',
      objetivoId: 'obj-requisitos-legales',
      enunciado: 'Esta lección pide que el estudiante sea capaz de:',
      opciones: [
        { id: 'a', texto: 'Enumerar los requisitos legales para ser Notario.' },
        { id: 'b', texto: 'Fijar aranceles unilaterales de la notaría.' },
        { id: 'c', texto: 'Derogar un artículo del Código del Notariado.' },
      ],
      respuestaCorrectaId: 'a',
    },
    {
      id: 'item-autorizacion-ejercicio',
      objetivoId: 'obj-procedimiento-autorizacion',
      enunciado: 'El procedimiento que esta lección describe es el de:',
      opciones: [
        { id: 'a', texto: 'Ejecución de sentencia penal.' },
        { id: 'b', texto: 'Obtener la autorización de ejercicio del Notariado.' },
        { id: 'c', texto: 'Inscripción mercantil de una sociedad anónima.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-actas-testimonio',
      objetivoId: 'obj-actas-testimonio-exhibicion',
      enunciado: 'El acta notarial de testimonio por exhibición, según esta lección, da fe de:',
      opciones: [
        { id: 'a', texto: 'La veracidad absoluta del contenido del documento exhibido.' },
        { id: 'b', texto: 'La exactitud de la copia material del texto, sin asumir responsabilidad por su veracidad.' },
        { id: 'c', texto: 'La validez legal del acto jurídico contenido en el documento.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-guarda-protocolo',
      objetivoId: 'obj-guarda-protocolo',
      enunciado: 'Si se pierde o inutiliza el protocolo, esta lección exige que el Notario:',
      opciones: [
        { id: 'a', texto: 'Dé cuenta inmediata a la Contraloría del Notariado.' },
        { id: 'b', texto: 'Reconstruya el protocolo de memoria sin notificar a nadie.' },
        { id: 'c', texto: 'Espere a que un cliente lo reclame para informar la pérdida.' },
      ],
      respuestaCorrectaId: 'a',
    },
    {
      id: 'item-definicion-ley',
      objetivoId: 'obj-definicion-de-ley',
      enunciado: 'En el módulo civil, el primer objetivo pide identificar:',
      opciones: [
        { id: 'a', texto: 'Cómo define la ley el Código Civil de Honduras.' },
        { id: 'b', texto: 'La lista de delitos del Código Penal.' },
        { id: 'c', texto: 'Las tasas de la Dirección de Notariado.' },
      ],
      respuestaCorrectaId: 'a',
    },
    {
      id: 'item-documento-publico',
      objetivoId: 'obj-actos-en-documento-publico',
      enunciado: 'El segundo objetivo civil pide enumerar:',
      opciones: [
        { id: 'a', texto: 'Los recursos de casación en materia penal.' },
        { id: 'b', texto: 'Los actos que la ley exige que consten en documento público.' },
        { id: 'c', texto: 'Los feriados judiciales del año en curso.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-clases-de-documentos',
      objetivoId: 'obj-clases-de-documentos',
      enunciado: 'Según el Código Procesal Civil, los documentos se clasifican principalmente en:',
      opciones: [
        { id: 'a', texto: 'Civiles o mercantiles.' },
        { id: 'b', texto: 'Públicos o privados.' },
        { id: 'c', texto: 'Originales o fotocopias.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-definicion-instrumento-publico',
      objetivoId: 'obj-definicion-instrumento-publico',
      enunciado: 'Según esta lección, son instrumentos públicos:',
      opciones: [
        { id: 'a', texto: 'Únicamente los contratos privados legalizados.' },
        { id: 'b', texto: 'Solo los documentos inscritos en el Registro de la Propiedad.' },
        { id: 'c', texto: 'Las escrituras públicas y los demás que el Código del Notariado enumera.' },
      ],
      respuestaCorrectaId: 'c',
    },
    {
      id: 'item-escritura-matriz',
      objetivoId: 'obj-escritura-matriz',
      enunciado: 'La escritura matriz, según esta lección, es:',
      opciones: [
        { id: 'a', texto: 'Una copia certificada por el Registro.' },
        { id: 'b', texto: 'El borrador previo a la firma de las partes.' },
        { id: 'c', texto: 'La original redactada por el Notario.' },
      ],
      respuestaCorrectaId: 'c',
    },
    {
      id: 'item-papel-especial-escrituras',
      objetivoId: 'obj-papel-especial-escrituras',
      enunciado: 'Esta lección exige que las escrituras matrices se extiendan en:',
      opciones: [
        { id: 'a', texto: 'Papel especial, según lo determina la Ley.' },
        { id: 'b', texto: 'Cualquier papel, sin requisito de formato.' },
        { id: 'c', texto: 'Papel membretado del despacho del Notario.' },
      ],
      respuestaCorrectaId: 'a',
    },
    {
      id: 'item-definicion-acta-notarial',
      objetivoId: 'obj-definicion-acta-notarial',
      enunciado: 'Esta lección distingue el acta notarial de la escritura matriz porque el acta es:',
      opciones: [
        { id: 'a', texto: 'Un instrumento público distinto, con su propio objeto.' },
        { id: 'b', texto: 'Un tipo de escritura matriz sin firma de las partes.' },
        { id: 'c', texto: 'Un documento privado que el Notario solo revisa.' },
      ],
      respuestaCorrectaId: 'a',
    },
    {
      id: 'item-certificacion-existencia-fisica',
      objetivoId: 'obj-certificacion-existencia-fisica',
      enunciado: 'Según esta lección, el Notario puede certificar:',
      opciones: [
        { id: 'a', texto: 'La solvencia económica de una persona.' },
        { id: 'b', texto: 'La existencia física de personas.' },
        { id: 'c', texto: 'La inocencia de una persona en un proceso penal.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-protocolizacion-documentos',
      objetivoId: 'obj-protocolizacion-documentos',
      enunciado: 'La protocolización, según esta lección, ocurre cuando:',
      opciones: [
        { id: 'a', texto: 'El Notario destruye un documento vencido.' },
        { id: 'b', texto: 'Un cliente solicita copia simple de su escritura.' },
        { id: 'c', texto: 'Se incorpora al protocolo un documento por orden de autoridad competente.' },
      ],
      respuestaCorrectaId: 'c',
    },
    {
      id: 'item-definicion-copia',
      objetivoId: 'obj-definicion-copia',
      enunciado: "Esta lección define 'copia' como:",
      opciones: [
        { id: 'a', texto: 'Cualquier fotocopia simple del documento.' },
        { id: 'b', texto: 'El traslado literal y auténtico de la escritura.' },
        { id: 'c', texto: 'Un resumen notarial del contenido del documento.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-motivos-nulidad-instrumento',
      objetivoId: 'obj-motivos-nulidad-instrumento',
      enunciado: 'Esta lección aborda:',
      opciones: [
        { id: 'a', texto: 'Los honorarios notariales máximos permitidos.' },
        { id: 'b', texto: 'Los motivos de nulidad que puede tener un instrumento público.' },
        { id: 'c', texto: 'El procedimiento penal por falsedad documental.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-reserva-protocolo',
      objetivoId: 'obj-reserva-protocolo',
      enunciado: 'Según esta lección, mientras el protocolo está en poder del Notario, tiene carácter:',
      opciones: [
        { id: 'a', texto: 'Público, accesible a cualquier persona sin restricción.' },
        { id: 'b', texto: 'Exclusivamente electrónico.' },
        { id: 'c', texto: 'Reservado.' },
      ],
      respuestaCorrectaId: 'c',
    },
    {
      id: 'item-no-contenciosos-limite',
      objetivoId: 'obj-marco-asuntos-no-contenciosos',
      enunciado: 'En los asuntos no contenciosos, esta lección prohíbe al Notario:',
      opciones: [
        { id: 'a', texto: 'Cobrar honorarios por la tramitación del expediente.' },
        { id: 'b', texto: 'Actuar sin la presencia de un juez de paz.' },
        { id: 'c', texto: 'Expedir copias parciales que omitan una parte que afecte a terceros.' },
      ],
      respuestaCorrectaId: 'c',
    },
    {
      id: 'item-requerimiento-colaboracion',
      objetivoId: 'obj-requerimiento-colaboracion',
      enunciado: 'Si una autoridad se niega injustificadamente a colaborar con el Notario, esta lección indica que él puede:',
      opciones: [
        { id: 'a', texto: 'Imponer directamente una multa a la autoridad.' },
        { id: 'b', texto: 'Acudir ante el Juez competente, tras dos requerimientos y tres días.' },
        { id: 'c', texto: 'Suspender el trámite del expediente de forma indefinida.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-remision-cpc',
      objetivoId: 'obj-remision-jurisdiccion-voluntaria-cpc',
      enunciado: 'Mientras no se apruebe una ley de Jurisdicción Voluntaria, esta lección explica que esos actos se rigen por:',
      opciones: [
        { id: 'a', texto: 'El Código Penal vigente.' },
        { id: 'b', texto: 'Un reglamento interno de cada notaría.' },
        { id: 'c', texto: 'El Libro IV del Código de Procedimientos Civiles de 1906.' },
      ],
      respuestaCorrectaId: 'c',
    },
    {
      id: 'item-atribuciones-contraloria',
      objetivoId: 'obj-atribuciones-contraloria',
      enunciado: 'Según esta lección, la Contraloría del Notariado tiene la atribución de:',
      opciones: [
        { id: 'a', texto: 'Legislar reformas al Código del Notariado.' },
        { id: 'b', texto: 'Practicar inspecciones a los protocolos de los Notarios.' },
        { id: 'c', texto: 'Sustituir al Notario en la autorización de instrumentos.' },
      ],
      respuestaCorrectaId: 'b',
    },
    {
      id: 'item-sanciones-notariales',
      objetivoId: 'obj-sanciones-notariales',
      enunciado: 'Esta lección enumera las sanciones al Notario según la gravedad de la infracción; la más grave es:',
      opciones: [
        { id: 'a', texto: 'Una multa económica fija.' },
        { id: 'b', texto: 'La suspensión automática de por vida.' },
        { id: 'c', texto: 'La cancelación del Exequátur.' },
      ],
      respuestaCorrectaId: 'c',
    },
  ],
};
