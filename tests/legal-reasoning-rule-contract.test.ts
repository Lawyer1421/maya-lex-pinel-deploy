import { describe, it, expect } from 'vitest';
import type {
  LegalProposition,
  NormativeRule,
  RuleException,
  CitationTrustRecord,
  CanonicalLegalReference,
} from '@/lib/legal-reasoning/types';
import {
  validarLegalProposition,
  esProposicionConFuenteVerificada,
  validarNormativeRule,
  validarCitationTrustRecord,
  esAutoritativaVerificada,
} from '@/lib/legal-reasoning/validators';

/**
 * LR-K3 — LegalProposition + NormativeRule contract tests (2026-09-28).
 *
 * Synthetic fixture (per directive §8), fully fabricated -- no real client
 * or corpus text:
 *
 *   Art. X: "Para que proceda Y deberán concurrir A, B y C, salvo el
 *   supuesto previsto en el artículo Z."
 *
 *   Source X -> LegalProposition P1 -> NormativeRule R1 (elements A, B, C)
 *            -> Exception linked to Source Z
 *
 * This kernel never determines whether A/B/C are satisfied by any case, and
 * no CaseFact or conclusion is used anywhere in this file.
 */

const FUENTE_X: CanonicalLegalReference = { instrumento: 'CODIGO_CIVIL', articulo: 'X' };
const FUENTE_Z: CanonicalLegalReference = { instrumento: 'CODIGO_CIVIL', articulo: 'Z' };

function citaVerificada(overrides: Partial<CitationTrustRecord> = {}): CitationTrustRecord {
  return {
    proposition: 'Para que proceda Y deberán concurrir A, B y C.',
    instrumento: 'CODIGO_CIVIL',
    articulo: 'X',
    fuente: 'Código Civil (fixture sintético)',
    documentVersion: 'fixture-v1',
    versionStatus: 'VERIFIED',
    verificationState: 'VERIFIED',
    hash: 'fixturehash1',
    ...overrides,
  };
}

function proposicionBase(overrides: Partial<LegalProposition> = {}): LegalProposition {
  return {
    id: 'P1',
    proposition: 'Para que proceda Y deberán concurrir A, B y C.',
    sources: [FUENTE_X],
    citationTrust: [citaVerificada()],
    propositionType: 'TEXTUAL',
    verificationStatus: 'VERIFIED',
    ...overrides,
  };
}

describe('LR-K3 — LegalProposition', () => {
  it('1. proposición con fuente válida -> aceptada', () => {
    const p1 = proposicionBase();
    const resultado = validarLegalProposition(p1);
    expect(resultado.valido).toBe(true);
    expect(esProposicionConFuenteVerificada(p1)).toBe(true);
  });

  it('2. proposición sin fuente -> rechazada', () => {
    const p = proposicionBase({ sources: [] });
    const resultado = validarLegalProposition(p);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('sources'))).toBe(true);
  });

  it('3. propositionType inválido -> rechazado', () => {
    const p = { ...proposicionBase(), propositionType: 'LITERAL_APROX' } as unknown as LegalProposition;
    const resultado = validarLegalProposition(p);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('propositionType'))).toBe(true);
  });

  it('4. TEXTUAL/PARAPHRASED/INTERPRETIVE permanecen distintos', () => {
    const textual = proposicionBase({ propositionType: 'TEXTUAL' });
    const parafraseada = proposicionBase({
      id: 'P1-para',
      proposition: 'Y requiere el cumplimiento conjunto de tres condiciones.',
      propositionType: 'PARAPHRASED',
    });
    const interpretativa = proposicionBase({
      id: 'P1-interp',
      proposition: 'La concurrencia de A, B y C sugiere una naturaleza acumulativa, no alternativa.',
      propositionType: 'INTERPRETIVE',
    });
    expect(textual.propositionType).toBe('TEXTUAL');
    expect(parafraseada.propositionType).toBe('PARAPHRASED');
    expect(interpretativa.propositionType).toBe('INTERPRETIVE');
    expect(new Set([textual.propositionType, parafraseada.propositionType, interpretativa.propositionType]).size).toBe(3);
    // Las tres son estructuralmente válidas -- el tipo no determina validez.
    expect(validarLegalProposition(textual).valido).toBe(true);
    expect(validarLegalProposition(parafraseada).valido).toBe(true);
    expect(validarLegalProposition(interpretativa).valido).toBe(true);
  });

  it('5. una proposición UNRESOLVED puede existir legítimamente', () => {
    const p = proposicionBase({
      id: 'P1-unresolved',
      citationTrust: [citaVerificada({ verificationState: 'UNRESOLVED', versionStatus: 'UNVERIFIED', hash: undefined })],
      verificationStatus: 'UNRESOLVED',
    });
    const resultado = validarLegalProposition(p);
    expect(resultado.valido).toBe(true);
    expect(esProposicionConFuenteVerificada(p)).toBe(false);
  });

  it('6. una proposición UNRESOLVED no puede aparentar ser VERIFIED', () => {
    const p = proposicionBase({
      id: 'P1-fake-verified',
      citationTrust: [citaVerificada({ verificationState: 'UNRESOLVED', versionStatus: 'UNVERIFIED', hash: undefined })],
      verificationStatus: 'VERIFIED', // reclama VERIFIED sin respaldo real
    });
    const resultado = validarLegalProposition(p);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('VERIFIED'))).toBe(true);
    expect(esProposicionConFuenteVerificada(p)).toBe(false);
  });
});

describe('LR-K3 — NormativeRule', () => {
  const elementosABC = [
    { id: 'A', description: 'Concurrencia del elemento A.', required: true },
    { id: 'B', description: 'Concurrencia del elemento B.', required: true },
    { id: 'C', description: 'Concurrencia del elemento C.', required: true },
  ];

  function reglaBase(overrides: Partial<NormativeRule> = {}): NormativeRule {
    return {
      id: 'R1',
      propositionIds: ['P1'],
      sources: [FUENTE_X],
      ruleType: 'REQUIREMENT',
      elements: elementosABC,
      exceptions: [],
      verificationStatus: 'VERIFIED',
      ...overrides,
    };
  }

  it('7. regla sin fuente -> rechazada', () => {
    const r = reglaBase({ sources: [] });
    const resultado = validarNormativeRule(r);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('sources'))).toBe(true);
  });

  it('8. regla con una sola fuente -> aceptada', () => {
    const r = reglaBase({ sources: [FUENTE_X] });
    expect(validarNormativeRule(r).valido).toBe(true);
  });

  it('9. regla con múltiples fuentes -> aceptada (una regla no es 1:1 con un artículo)', () => {
    const r = reglaBase({ sources: [FUENTE_X, FUENTE_Z] });
    const resultado = validarNormativeRule(r);
    expect(resultado.valido).toBe(true);
    expect(r.sources).toHaveLength(2);
  });

  it('10. un mismo artículo puede producir múltiples reglas sintéticas', () => {
    // Dos reglas DISTINTAS, ambas derivadas del mismo Art. X -- prueba
    // estructural de que ARTICLE != NORMATIVE RULE.
    const r1 = reglaBase({ id: 'R1', ruleType: 'REQUIREMENT', elements: elementosABC });
    const r2 = reglaBase({
      id: 'R1-consecuencia',
      ruleType: 'LEGAL_CONSEQUENCE',
      elements: [],
      propositionIds: ['P1'],
    });
    expect(validarNormativeRule(r1).valido).toBe(true);
    expect(validarNormativeRule(r2).valido).toBe(true);
    expect(r1.id).not.toBe(r2.id);
    expect(r1.sources).toEqual(r2.sources); // mismo Art. X, dos reglas distintas
  });

  it('11. la excepción permanece distinta de la regla principal', () => {
    const excepcionZ: RuleException = {
      id: 'EXC-Z',
      description: 'No procede cuando concurre el supuesto del artículo Z.',
      source: FUENTE_Z,
    };
    const r1 = reglaBase({ exceptions: [excepcionZ] });
    const resultado = validarNormativeRule(r1);
    expect(resultado.valido).toBe(true);
    // La excepción es un objeto separado -- no se fusiona dentro de `elements`.
    expect(r1.elements.some((e) => e.id === excepcionZ.id)).toBe(false);
    expect(r1.exceptions[0]).toEqual(excepcionZ);
    expect(r1.exceptions[0].source).toEqual(FUENTE_Z);
  });

  it('12. ruleType inválido -> rechazado', () => {
    const r = { ...reglaBase(), ruleType: 'SUGERENCIA' } as unknown as NormativeRule;
    const resultado = validarNormativeRule(r);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('ruleType'))).toBe(true);
  });

  it('13. elements vacío se comporta según el contrato explícito (no es error por sí solo)', () => {
    const definicion = reglaBase({ id: 'R-def', ruleType: 'DEFINITION', elements: [] });
    const resultado = validarNormativeRule(definicion);
    expect(resultado.valido).toBe(true);
    expect(definicion.elements).toEqual([]);
  });

  it('14. NormativeRule no depende de CaseFact -- verificación estructural de claves', () => {
    const r = reglaBase();
    const claves = Object.keys(r).sort();
    expect(claves).toEqual(
      ['elements', 'exceptions', 'id', 'propositionIds', 'ruleType', 'sources', 'verificationStatus'].sort(),
    );
    expect(claves).not.toContain('caseFacts');
    expect(claves).not.toContain('caseFact');
  });

  it('15. NormativeRule no depende de Subsumption -- verificación estructural de claves', () => {
    const r = reglaBase();
    const claves = Object.keys(r);
    expect(claves).not.toContain('subsumption');
    expect(claves).not.toContain('satisfiedElements');
    expect(claves).not.toContain('unsatisfiedElements');
    expect(claves).not.toContain('missingElements');
    // Los propios RuleElement tampoco cargan satisfacción -- eso es LR-K4.
    for (const el of r.elements) {
      expect(Object.keys(el)).not.toContain('satisfied');
    }
  });
});

describe('LR-K3 — límites (structural validation != legal correctness / evidence binding)', () => {
  it('16. la validación estructural no afirma corrección jurídica', () => {
    // Proposición estructuralmente perfecta -- pero una afirmación jurídica
    // categórica de este tipo sería, en la vida real, casi con certeza
    // incorrecta o al menos gravemente incompleta. El validador no tiene
    // forma de saberlo, y no debe pretender que lo sabe: solo audita forma.
    const proposicionDudosa = proposicionBase({
      id: 'P-dudosa',
      proposition: 'Los contratos verbales son siempre nulos en Honduras.',
      propositionType: 'INTERPRETIVE',
    });
    const resultado = validarLegalProposition(proposicionDudosa);
    expect(resultado.valido).toBe(true); // pasa forma...
    // ...pero esto NUNCA debe leerse como "esta afirmación es correcta".
    // No existe ningún campo/función en este módulo que evalúe eso.
  });

  it('17. la sola presencia de hash no se representa como prueba de evidencia vinculada', () => {
    const citaConHashPeroSinVersionConfirmada = {
      proposition: 'Texto citado.',
      instrumento: 'CODIGO_CIVIL',
      articulo: '1',
      fuente: 'Fixture',
      documentVersion: 'v1',
      versionStatus: 'UNVERIFIED' as const, // la versión NO está confirmada...
      verificationState: 'PARTIAL' as const,
      hash: 'tieneHashPeroNoBasta', // ...aunque haya un hash presente
    };
    const resultado = validarCitationTrustRecord(citaConHashPeroSinVersionConfirmada);
    expect(resultado.valido).toBe(true); // PARTIAL es coherente consigo mismo
    expect(esAutoritativaVerificada(citaConHashPeroSinVersionConfirmada)).toBe(false);

    // Intentar reclamar VERIFIED con ese mismo hash pero sin versión
    // confirmada debe fallar -- el hash por sí solo nunca basta.
    const intentoVerified = { ...citaConHashPeroSinVersionConfirmada, verificationState: 'VERIFIED' as const };
    expect(validarCitationTrustRecord(intentoVerified).valido).toBe(false);
  });
});
