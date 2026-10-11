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
