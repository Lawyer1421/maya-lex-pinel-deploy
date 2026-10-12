import { describe, it, expect } from 'vitest';
import { clasificarIntencionInstrumental } from '@/lib/legal-retrieval/instrument-gate';
import { detectarIdentidadesDesdeTexto } from '@/lib/legal-retrieval/exact-resolver';

/**
 * Tabla de estados de la intención instrumental, con polisemia de
 * "constitución", solapamientos y uniones. Las frases son de uso general, no
 * identificadores de pregunta del challenge.
 */

const casos: [string, string, string[]][] = [
  // [consulta, estado esperado, identidades esperadas]

  // Genéricos: NONE
  ['Conforme a la resolución aplicable, ¿qué procede?', 'NONE', []],
  ['Según el acuerdo correspondiente, ¿qué procede?', 'NONE', []],
  ['Qué dispone la ley aplicable en este caso', 'NONE', []],
  ['Según el código aplicable, ¿qué procede?', 'NONE', []],
  ['Conforme al reglamento aplicable, ¿qué procede?', 'NONE', []],

  // Ley con ámbito territorial o nacional: NONE (sólo para la clase ley)
  ['Qué dispone la ley de la República', 'NONE', []],
  ['Según la ley de Honduras, ¿qué procede?', 'NONE', []],
  ['Según la ley nacional, ¿qué procede?', 'NONE', []],
  ['Conforme a la ley hondureña aplicable, ¿qué procede?', 'NONE', []],

  // Jurisdicción y tema (sin título): NONE
  ['¿Qué dispone la ley hondureña sobre el divorcio?', 'NONE', []],
  ['Según la ley de Honduras sobre el divorcio, ¿qué procede?', 'NONE', []],

  // Título específico tras jurisdicción: específica
  // Título particular ("ley de X") no resuelto: SPECIFIC_UNRESOLVED aunque no esté en el léxico
  ['¿Qué dispone la ley hondureña de adopciones?', 'SPECIFIC_UNRESOLVED', []],
  ['Según la ley de Inquilinato, ¿qué procede?', 'SPECIFIC_UNRESOLVED', []],
  ['Según la ley de las 8 horas, ¿qué procede?', 'SPECIFIC_UNRESOLVED', []],
  // Clase + sobre/acerca de + tema: NONE, para cualquier clase
  ['Conforme al decreto sobre vivienda, ¿qué procede?', 'NONE', []],
  ['Según la ley acerca del divorcio, ¿qué procede?', 'NONE', []],
  // Un año contextual no identifica un instrumento
  ['Según la ley de 2018, ¿qué procede?', 'NONE', []],
  // Actos jurídicos y materia genérica: NONE
  ['Según la resolución del contrato, ¿qué procede?', 'NONE', []],
  ['Según el acuerdo de pago, ¿qué procede?', 'NONE', []],
  // Tema sin jurisdicción: NONE (decisión aprobada: "ley sobre X" con sólo tema no es título)
  ['Según la ley sobre el divorcio, ¿qué procede?', 'NONE', []],
  ['Según la ley sobre adopciones, ¿qué procede?', 'NONE', []],
  // Título reconocido (notarial) tiene precedencia sobre la materia
  ['Según la ley notarial, ¿qué procede?', 'SPECIFIC_UNRESOLVED', []],

  // Ley con calificador propio: específica, no se extiende el ámbito
  ['Según la ley notarial hondureña, ¿qué procede?', 'SPECIFIC_UNRESOLVED', []],
  ['Según la ley de adopciones, ¿qué procede?', 'SPECIFIC_UNRESOLVED', []],
  ['Según el decreto hondureño, ¿qué procede?', 'NONE', []],

  // B1 — seis consultas reproducidas por el auditor: temáticas, sin referencia específica
  ['¿Cómo apelar una resolución judicial en materia penal?', 'NONE', []],
  ['arrendamiento ley civil', 'NONE', []],
  ['el código dice algo sobre la herencia', 'NONE', []],
  ['resolución del contrato de arrendamiento', 'NONE', []],
  ['¿un acuerdo de pago extingue la deuda?', 'NONE', []],
  ['el acuerdo de las partes en un contrato', 'NONE', []],

  // Títulos e identificadores reconocidos tienen precedencia sobre verbos y conectores
  ['El Código Civil establece el arrendamiento.', 'SPECIFIC_RESOLVED', ['CODIGO_CIVIL']],

  // El número de un artículo no identifica al instrumento
  ['Qué dispone la ley aplicable en el artículo 5', 'NONE', []],

  // Referencia inequívocamente identificada pero no resuelta: sigue específica
  ['la resolución PCSJ-17-2012 del Consejo', 'SPECIFIC_UNRESOLVED', []],
  ['el acuerdo 45-2019 de la Corte', 'SPECIFIC_UNRESOLVED', []],

  // Referencia específica sin resolver
  ['Según el decreto 130-2017, ¿qué dispone?', 'SPECIFIC_UNRESOLVED', []],
  ['Ley Especial de Adopciones de 2018', 'SPECIFIC_UNRESOLVED', []],
  ['Código Penal y decreto 130-2017', 'SPECIFIC_UNRESOLVED', ['CODIGO_PENAL']],

  // Alias notariales (C10 y D05)
  ['¿Prevalece la nulidad prevista en otras leyes sobre la nulidad de la ley notarial?', 'SPECIFIC_UNRESOLVED', []],
  ['Según el reglamento notarial, ¿qué presunción tienen las afirmaciones del notario?', 'SPECIFIC_RESOLVED', ['REGLAMENTO_NOTARIADO']],

  // Solapamiento: gana el match más largo
  ['artículo 1 del Reglamento del Código del Notariado', 'SPECIFIC_RESOLVED', ['REGLAMENTO_NOTARIADO']],

  // Unión de identidades (comparación)
  ['Código Penal y Código Procesal Penal', 'MULTI_SPECIFIC_RESOLVED', ['CODIGO_PENAL', 'CODIGO_PROCESAL_PENAL']],
  ['Código Penal y Código de Comercio', 'MULTI_SPECIFIC_RESOLVED', ['CODIGO_PENAL', 'CODIGO_COMERCIO']],

  // Constitución: el instrumento frente al acto jurídico
  ['según la constitución, ¿qué dispone?', 'SPECIFIC_RESOLVED', ['CONSTITUCION']],
  ['artículo 1 de la Constitución de la República de Honduras', 'SPECIFIC_RESOLVED', ['CONSTITUCION']],
  ['requisitos de constitución de sociedad anónima', 'NONE', []],
  ['constitución de hipoteca sobre inmueble', 'NONE', []],
  ['Según la constitución en mora, ¿qué procede?', 'NONE', []],
  ['constitución en mora', 'NONE', []],
  ['Según la Constitución Política de Honduras, ¿qué procede?', 'SPECIFIC_RESOLVED', ['CONSTITUCION']],
  ['¿Qué dice la Constitución sobre el artículo 11?', 'SPECIFIC_RESOLVED', ['CONSTITUCION']],

  // Ley sobre justicia constitucional: la identidad cubre la clase; "constitucional" no es Constitución
  ['ley sobre justicia constitucional', 'SPECIFIC_RESOLVED', ['LEY_JUSTICIA_CONSTITUCIONAL']],

  // Sin instrumento
  ['¿Qué es la fe pública?', 'NONE', []],
];

describe('clasificarIntencionInstrumental — tabla de estados', () => {
  it.each(casos)('%s → %s', (consulta, estado, identidades) => {
    const i = clasificarIntencionInstrumental(consulta);
    expect(i.estado).toBe(estado);
    expect(i.identidades).toEqual(identidades);
  });
});

describe('detectarIdentidadesDesdeTexto — todas las identidades, sin solapamientos', () => {
  it('detecta dos identidades no solapadas, en orden de aparición', () => {
    const ids = detectarIdentidadesDesdeTexto('código penal y código de comercio');
    expect(ids.map((i) => i.instrumento)).toEqual(['CODIGO_PENAL', 'CODIGO_COMERCIO']);
  });

  it('elimina el solapamiento: el Reglamento consume al Código contenido', () => {
    const ids = detectarIdentidadesDesdeTexto('reglamento del código del notariado');
    expect(ids.map((i) => i.instrumento)).toEqual(['REGLAMENTO_NOTARIADO']);
  });
});
