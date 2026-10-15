import { describe, it, expect } from 'vitest';
import { clasificarIntencionInstrumental } from '@/lib/legal-retrieval/instrument-gate';
import fixture from '@/lib/legal-retrieval/fixtures/clo-pr62-denominaciones-v2.json';

/**
 * CLO_PR62_DENOMINACIONES_V2: lista cerrada de denominaciones adjudicada por la CLO.
 * Alcance: sólo la denominación que sigue a resolución/acuerdo (de/del); un órgano sin clase no activa el fixture.
 * Institucionales → SPECIFIC_UNRESOLVED; genéricos y todo lo que no esté en la lista → NONE.
 * Comparación insensible a mayúsculas y tildes, por palabra completa, sólo contra el
 * fixture. Ninguna entrada da identidad: ésta sólo sale del registro canónico.
 */

const estado = (q: string) => clasificarIntencionInstrumental(q).estado;
const norm = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

describe('fixture CLO_PR62_DENOMINACIONES_V2: metadatos y cierre', () => {
  it('declara id, versión y fuente CLO', () => {
    expect(fixture.id).toBe('CLO_PR62_DENOMINACIONES_V2');
    expect(fixture.version).toBe(2);
    expect(fixture.fuente).toMatch(/CLO/);
  });

  it('lista cerrada: cualquier entrada nueva cambia estos conteos y exige revisión CLO', () => {
    expect(fixture.institucionales.siglas).toHaveLength(18);
    expect(fixture.institucionales.nombres).toHaveLength(25);
    expect(fixture.genericos).toHaveLength(33);
  });

  it('ninguna entrada es institucional y genérica a la vez', () => {
    const inst = new Set([...fixture.institucionales.siglas, ...fixture.institucionales.nombres].map(norm));
    for (const g of fixture.genericos) expect(inst.has(norm(g))).toBe(false);
  });
});

describe('genéricos → NONE', () => {
  it.each([
    '¿CÓMO IMPUGNAR LA RESOLUCIÓN DEL JUEZ?',
    '¿QUÉ ES UN ACUERDO DE VOLUNTADES?',
    'ACUERDO DE VOLUNTADES',
    'resolución del contrato de arrendamiento',
    'Acuerdo de la Junta de Socios',
  ])('%s', (q) => {
    expect(estado(q)).toBe('NONE');
  });

  it.each(fixture.genericos)('el genérico «%s» solo no bloquea', (g) => {
    expect(estado(`la ${g}`)).toBe('NONE');
    expect(estado(`resolución de la ${g}`)).toBe('NONE');
  });
});

describe('institucionales tras resolución/acuerdo → SPECIFIC_UNRESOLVED', () => {
  it.each([
    'resolución de la CNBS',
    '¿Qué dice la RESOLUCIÓN DE LA CNBS?',
    'acuerdo del Consejo de Ministros',
    'acuerdo de paz de esquipulas',
    'Acuerdo de Paz de Esquipulas',
    'el Acuerdo de Escazú',
    'Resolución de la CSJ sobre amparo',
    'resolución de la Sala de lo Constitucional',
    'acuerdo del Banco Central de Honduras',
    'resolución del Tribunal Superior de Cuentas',
    'Acuerdo Ejecutivo 679-2014',
    'resolución del Ministerio Público',
    'acuerdo de la Secretaría de Finanzas',
    'acuerdo del Colegio de Abogados',
    'resolución de la Unión de Notarios',
    'resolución de la Presidencia de la CSJ',
  ])('%s', (q) => {
    expect(estado(q)).toBe('SPECIFIC_UNRESOLVED');
  });

  it.each([...fixture.institucionales.siglas, ...fixture.institucionales.nombres])('«%s» tras la clase (cualquier caja y sin tildes)', (e) => {
    expect(estado(`¿Qué dispone la resolución de la ${e}?`)).toBe('SPECIFIC_UNRESOLVED');
    expect(estado(`ACUERDO DEL ${e.toUpperCase()}`)).toBe('SPECIFIC_UNRESOLVED');
    expect(estado(`acuerdo de ${norm(e)}`)).toBe('SPECIFIC_UNRESOLVED');
  });

  it('no resuelve identidad: se conservan sólo las identidades del registro canónico', () => {
    expect(clasificarIntencionInstrumental('resolución de la CNBS').identidades).toEqual([]);
  });
});

describe('alcance V2: órgano sin clase de instrumento → el fixture no aplica', () => {
  it.each([
    '¿Cómo presento un amparo ante la Sala de lo Constitucional?',
    '¿Qué es el principio de legalidad según la CSJ?',
    '¿Qué es una dirección IP en un contrato?',
    'cnbs',
    'consejo de ministros',
    'Sala de lo Constitucional',
    'ESQUIPULAS',
    'Escazú',
  ])('%s → NONE', (q) => {
    expect(estado(q)).toBe('NONE');
  });

  it('conserva la identidad detectada junto al órgano', () => {
    const a = clasificarIntencionInstrumental('Según el Código Penal, ¿qué facultades tiene el Ministerio Público?');
    expect(a.estado).toBe('SPECIFIC_RESOLVED');
    expect(a.identidades).toEqual(['CODIGO_PENAL']);
    const b = clasificarIntencionInstrumental('¿Qué dice el artículo 1 del Código Penal sobre el MP?');
    expect(b.estado).toBe('SPECIFIC_RESOLVED');
    expect(b.identidades).toEqual(['CODIGO_PENAL']);
  });

  it('las entradas que contienen la clase o «Paz de Esquipulas» se detectan solas', () => {
    expect(estado('Acuerdo de Escazú')).toBe('SPECIFIC_UNRESOLVED');
    expect(estado('la Paz de Esquipulas')).toBe('SPECIFIC_UNRESOLVED');
  });
});

describe('reglas de coincidencia', () => {
  it('una palabra en mayúsculas que no está en la lista NO es sigla', () => {
    expect(estado('resolución de la XYZ')).toBe('NONE');
    expect(estado('RESOLUCIÓN DE LA ABCD')).toBe('NONE');
    expect(estado('acuerdo de Paz de Centroamérica')).toBe('NONE');
  });

  it('palabra completa: "IP" y "MP" no coinciden dentro de otra palabra', () => {
    expect(estado('el tipo de contrato y el campo mpg')).toBe('NONE');
    expect(estado('la participación del campeón')).toBe('NONE');
    expect(estado('sarcasmo y desarrollo')).toBe('NONE');
  });

  it('lo que no está en ninguna lista es NONE', () => {
    expect(estado('¿cómo se computa el plazo de prescripción?')).toBe('NONE');
  });

  it('conflicto: gana la coincidencia más larga', () => {
    expect(estado('resolución de la Sala de lo Constitucional')).toBe('SPECIFIC_UNRESOLVED');
    expect(estado('resolución de la sala')).toBe('NONE');
    expect(estado('resolución del Tribunal Superior de Cuentas')).toBe('SPECIFIC_UNRESOLVED');
    expect(estado('resolución del tribunal')).toBe('NONE');
    expect(estado('resolución de la Presidencia de la Corte Suprema de Justicia')).toBe('SPECIFIC_UNRESOLVED');
  });
});

describe('identidad canónica no se anula por palabras genéricas ni se fabrica por el fixture', () => {
  it('PCSJ-17-2012 → REGLAMENTO_NOTARIADO', () => {
    const i = clasificarIntencionInstrumental('PCSJ-17-2012');
    expect(i.estado).toBe('SPECIFIC_RESOLVED');
    expect(i.identidades).toEqual(['REGLAMENTO_NOTARIADO']);
  });

  it('«Resolución del Código del Notariado» → CODIGO_NOTARIADO', () => {
    const i = clasificarIntencionInstrumental('Resolución del Código del Notariado');
    expect(i.estado).toBe('SPECIFIC_RESOLVED');
    expect(i.identidades).toEqual(['CODIGO_NOTARIADO']);
  });

  it('palabras genéricas alrededor no anulan un título o número reconocido', () => {
    expect(clasificarIntencionInstrumental('resolución del juez según el Código del Notariado').identidades).toEqual([
      'CODIGO_NOTARIADO',
    ]);
    expect(estado('el notario y el registrador según PCSJ-17-2012')).toBe('SPECIFIC_RESOLVED');
  });

  it('una denominación institucional junto a una identidad resuelta conserva ambas', () => {
    const i = clasificarIntencionInstrumental('resolución de la CNBS y el Código del Notariado');
    expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
    expect(i.identidades).toEqual(['CODIGO_NOTARIADO']);
  });

  it.each([
    ['resolución del Código del Notariado de la CNBS', 'CODIGO_NOTARIADO'],
    ['acuerdo del Código Penal del Consejo de Ministros', 'CODIGO_PENAL'],
  ])('conflicto institucional tras identidad: «%s» → UNRESOLVED [%s]', (q, id) => {
    const i = clasificarIntencionInstrumental(q);
    expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
    expect(i.identidades).toEqual([id]);
  });
});
