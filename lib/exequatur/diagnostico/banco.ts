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
  ],
};
