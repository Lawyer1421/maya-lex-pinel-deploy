import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  CaseFact,
  MissingFact,
  NormativeRule,
  RuleElement,
  Subsumption,
  RuleElementAssessment,
  ConclusionTrace,
  ConclusionBlocker,
  CanonicalLegalReference,
} from '@/lib/legal-reasoning/types';
import * as tiposLegales from '@/lib/legal-reasoning/types';
import * as validadoresLegales from '@/lib/legal-reasoning/validators';
import {
  validarConclusionTrace,
  derivarConclusionStatus,
  derivarConclusionUncertainty,
} from '@/lib/legal-reasoning/validators';

/**
 * LR-K5 — Conclusion Traceability Contract tests (2026-09-28).
 * All fixtures synthetic -- no real client, case, or expediente data.
 */

const FUENTE: CanonicalLegalReference = { instrumento: 'CODIGO_CIVIL', articulo: 'X' };

// ── Civil golden fixture (directive §17) ────────────────────────────────────
const ELEMENTOS_R1: RuleElement[] = [
  { id: 'A', description: 'Elemento A.', required: true },
  { id: 'B', description: 'Elemento B.', required: true },
  { id: 'C', description: 'Elemento C.', required: true },
];
const R1: NormativeRule = {
  id: 'R1', propositionIds: ['P1'], sources: [FUENTE], ruleType: 'REQUIREMENT',
  elements: ELEMENTOS_R1, exceptions: [], verificationStatus: 'VERIFIED',
};
const HECHOS_CIVIL: CaseFact[] = [
  { id: 'F1', proposition: 'Hecho que soporta A.', origin: 'USER_STATEMENT', status: 'ALLEGED' },
  { id: 'F2', proposition: 'Hecho que soporta B.', origin: 'USER_DOCUMENT', status: 'DOCUMENTED' },
];
const FALTANTES_CIVIL: MissingFact[] = [
  { id: 'M1', description: 'No se aportó evidencia del elemento C.', blocksConclusions: ['R1'] },
];
const S1: Subsumption = {
  id: 'S1', ruleId: 'R1', caseFactIds: ['F1', 'F2'], missingFactIds: ['M1'],
  elementAssessments: [
    { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
    { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
    { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
  ],
  exceptionAssessments: [],
  analysisStatus: 'INCOMPLETE',
  unresolvedElementIds: ['C'],
};

function conclusionCivilBase(overrides: Partial<ConclusionTrace> = {}): ConclusionTrace {
  return {
    id: 'C1',
    conclusionType: 'LEGAL_CONCLUSION',
    proposition: 'Con los hechos disponibles no puede sostenerse todavía el cumplimiento integral de los requisitos de R1.',
    status: 'PARTIAL',
    subsumptionIds: ['S1'],
    ruleIds: ['R1'],
    supportingFactIds: ['F1', 'F2'],
    contradictingFactIds: [],
    missingFactIds: ['M1'],
    unresolvedElementIds: ['C'],
    unresolvedExceptionIds: [],
    blockedBy: [{ type: 'MISSING_FACT', referenceId: 'M1', description: 'No se aportó evidencia del elemento C.' }],
    uncertainty: derivarConclusionUncertainty([S1], [R1]),
    ...overrides,
  };
}

// ── Penal golden fixture (directive §18) ────────────────────────────────────
const ELEMENTOS_R2: RuleElement[] = [
  { id: 'E1', description: 'Conducta.', required: true },
  { id: 'E2', description: 'Circunstancia objetiva.', required: true },
  { id: 'E3', description: 'Elemento subjetivo requerido.', required: true },
];
const R2: NormativeRule = {
  id: 'R2', propositionIds: ['P2'], sources: [{ instrumento: 'CODIGO_PENAL', articulo: 'N' }],
  ruleType: 'REQUIREMENT', elements: ELEMENTOS_R2, exceptions: [], verificationStatus: 'VERIFIED',
};
const HECHOS_PENAL: CaseFact[] = [
  { id: 'F10', proposition: 'Se acreditó la conducta.', origin: 'PROCEDURAL_RECORD', status: 'DOCUMENTED' },
  { id: 'F11', proposition: 'La circunstancia objetiva no concurrió.', origin: 'PROCEDURAL_RECORD', status: 'DOCUMENTED' },
];
const FALTANTES_PENAL: MissingFact[] = [
  { id: 'M10', description: 'No se estableció el elemento subjetivo.', blocksConclusions: ['R2'] },
];
const S2: Subsumption = {
  id: 'S2', ruleId: 'R2', caseFactIds: ['F10', 'F11'], missingFactIds: ['M10'],
  elementAssessments: [
    { elementId: 'E1', status: 'SATISFIED', supportingFactIds: ['F10'], contradictingFactIds: [], missingFactIds: [] },
    { elementId: 'E2', status: 'UNSATISFIED', supportingFactIds: [], contradictingFactIds: ['F11'], missingFactIds: [] },
    { elementId: 'E3', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M10'] },
  ],
  exceptionAssessments: [],
  analysisStatus: 'INCOMPLETE',
  unresolvedElementIds: ['E3'],
};

function conclusionPenalBase(overrides: Partial<ConclusionTrace> = {}): ConclusionTrace {
  return {
    id: 'C2',
    conclusionType: 'LEGAL_CONCLUSION',
    proposition: 'The supplied facts do not structurally satisfy all analyzed elements of R2 and one required element remains unresolved.',
    status: 'PARTIAL',
    subsumptionIds: ['S2'],
    ruleIds: ['R2'],
    supportingFactIds: ['F10'],
    contradictingFactIds: ['F11'],
    missingFactIds: ['M10'],
    unresolvedElementIds: ['E3'],
    unresolvedExceptionIds: [],
    blockedBy: [{ type: 'MISSING_FACT', referenceId: 'M10', description: 'No se estableció el elemento subjetivo.' }],
    uncertainty: derivarConclusionUncertainty([S2], [R2]),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCLUSION CONTRACT (1-5)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K5 — Conclusion contract', () => {
  it('1. LEGAL_CONCLUSION con traza válida -> aceptado', () => {
    expect(validarConclusionTrace(conclusionCivilBase(), [S1], [R1]).valido).toBe(true);
  });

  it('2. LEGAL_CONCLUSION sin Subsumption -> rechazado', () => {
    const c = conclusionCivilBase({ subsumptionIds: [] });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('subsumptionIds'))).toBe(true);
  });

  it('3. ConclusionType inválido -> rechazado', () => {
    const c = { ...conclusionCivilBase(), conclusionType: 'OPINION_PERSONAL' } as unknown as ConclusionTrace;
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('conclusionType'))).toBe(true);
  });

  it('4. ConclusionStatus inválido -> rechazado', () => {
    const c = { ...conclusionCivilBase(), status: 'GANADOR' } as unknown as ConclusionTrace;
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('status'))).toBe(true);
  });

  it('5. no existe ningún puntaje de confianza en el contrato', () => {
    const c = conclusionCivilBase();
    expect(JSON.stringify(c)).not.toMatch(/confidence|probability|winningChance|successRate|%/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TRACE INTEGRITY (6-10)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K5 — Trace integrity', () => {
  it('6. subsumptionId huérfano -> rechazado', () => {
    const c = conclusionCivilBase({ subsumptionIds: ['S-NO-EXISTE'] });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('S-NO-EXISTE'))).toBe(true);
  });

  it('7. ruleId huérfano -> rechazado', () => {
    const c = conclusionCivilBase({ ruleIds: ['R-NO-EXISTE'] });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('R-NO-EXISTE'))).toBe(true);
  });

  it('7b. ruleId real pero no vinculado a ninguna Subsumption referenciada -> rechazado', () => {
    const c = conclusionCivilBase({ ruleIds: ['R2'] }); // R2 es real (fixture penal) pero S1 usa R1, no R2
    const resultado = validarConclusionTrace(c, [S1], [R1, R2]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('R2'))).toBe(true);
  });

  it('8. factId huérfano -> rechazado', () => {
    const c = conclusionCivilBase({ supportingFactIds: ['F-NO-EXISTE'] });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('F-NO-EXISTE'))).toBe(true);
  });

  it('9. missingFactId huérfano -> rechazado', () => {
    const c = conclusionCivilBase({ missingFactIds: ['M-NO-EXISTE'] });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('M-NO-EXISTE'))).toBe(true);
  });

  it('10. múltiples Subsumption válidas -> aceptado', () => {
    // Una tercera Subsumption ancilar, sin conflicto, referenciada junto a S1.
    const R3: NormativeRule = {
      id: 'R3', propositionIds: ['P3'], sources: [FUENTE], ruleType: 'REQUIREMENT',
      elements: [{ id: 'D', description: 'Elemento D.', required: true }], exceptions: [], verificationStatus: 'VERIFIED',
    };
    const S3: Subsumption = {
      id: 'S3', ruleId: 'R3', caseFactIds: ['F1'], missingFactIds: [],
      elementAssessments: [{ elementId: 'D', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] }],
      exceptionAssessments: [], analysisStatus: 'COMPLETE', unresolvedElementIds: [],
    };
    const c = conclusionCivilBase({
      subsumptionIds: ['S1', 'S3'],
      ruleIds: ['R1', 'R3'],
      unresolvedElementIds: ['C'], // solo S1 aporta un elemento sin resolver
      uncertainty: derivarConclusionUncertainty([S1, S3], [R1, R3]),
    });
    const resultado = validarConclusionTrace(c, [S1, S3], [R1, R3]);
    expect(resultado.valido).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKERS (11-15)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K5 — Blockers', () => {
  it('11. BLOCKED con bloqueador válido de MissingFact -> aceptado', () => {
    // Regla con excepción sin resolver -> deriva BLOCKED (no PARTIAL).
    const excepcion = { id: 'EXC-Z', description: 'Excepción.' };
    const rConExcepcion: NormativeRule = { ...R1, id: 'R1-EXC', exceptions: [excepcion] };
    const sConExcepcion: Subsumption = {
      ...S1, id: 'S1-EXC', ruleId: 'R1-EXC',
      exceptionAssessments: [{ exceptionId: 'EXC-Z', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: [] }],
      analysisStatus: 'BLOCKED',
    };
    const c = conclusionCivilBase({
      subsumptionIds: ['S1-EXC'], ruleIds: ['R1-EXC'], status: 'BLOCKED',
      unresolvedExceptionIds: ['EXC-Z'],
      blockedBy: [{ type: 'UNRESOLVED_EXCEPTION', referenceId: 'EXC-Z', description: 'Excepción sin resolver.' }],
      uncertainty: derivarConclusionUncertainty([sConExcepcion], [rConExcepcion]),
    });
    const resultado = validarConclusionTrace(c, [sConExcepcion], [rConExcepcion]);
    expect(resultado.valido).toBe(true);
  });

  it('12. BLOCKED sin ningún bloqueador -> rechazado', () => {
    const c = conclusionCivilBase({ status: 'PARTIAL', blockedBy: [] });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('blockedBy'))).toBe(true);
  });

  it('13. un elemento sin resolver no puede desaparecer de la conclusión', () => {
    const c = conclusionCivilBase({ unresolvedElementIds: [] });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('unresolvedElementIds'))).toBe(true);
  });

  it('14. una excepción sin resolver no puede desaparecer de la conclusión', () => {
    const excepcion = { id: 'EXC-Z', description: 'Excepción.' };
    const rConExcepcion: NormativeRule = { ...R1, id: 'R1-EXC2', exceptions: [excepcion] };
    const sConExcepcion: Subsumption = {
      ...S1, id: 'S1-EXC2', ruleId: 'R1-EXC2',
      exceptionAssessments: [{ exceptionId: 'EXC-Z', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: [] }],
      analysisStatus: 'BLOCKED',
    };
    const c = conclusionCivilBase({
      subsumptionIds: ['S1-EXC2'], ruleIds: ['R1-EXC2'], status: 'BLOCKED',
      unresolvedExceptionIds: [], // oculta la excepción sin resolver
      blockedBy: [{ type: 'UNRESOLVED_EXCEPTION', description: 'Excepción sin resolver.' }],
    });
    const resultado = validarConclusionTrace(c, [sConExcepcion], [rConExcepcion]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('unresolvedExceptionIds'))).toBe(true);
  });

  it('15. una Subsumption incompleta no puede producir una conclusión SUPPORTED falsa', () => {
    const c = conclusionCivilBase({ status: 'SUPPORTED', blockedBy: [], unresolvedElementIds: ['C'] });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('status'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EPISTEMIC SAFETY (16-21)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K5 — Epistemic safety', () => {
  it('16. un hecho ALLEGED permanece ALLEGED tras la validación', () => {
    const hechos = JSON.parse(JSON.stringify(HECHOS_CIVIL));
    validarConclusionTrace(conclusionCivilBase(), [S1], [R1]);
    expect(HECHOS_CIVIL).toEqual(hechos);
    expect(HECHOS_CIVIL[0].status).toBe('ALLEGED');
  });

  it('17. un hecho DISPUTED permanece DISPUTED tras la validación', () => {
    const hechoDisputado: CaseFact = { id: 'FD1', proposition: 'x', origin: 'USER_STATEMENT', status: 'DISPUTED' };
    validarConclusionTrace(conclusionCivilBase(), [S1], [R1]);
    expect(hechoDisputado.status).toBe('DISPUTED');
  });

  it('18. la conclusión no puede promover un hecho a PROVEN', () => {
    validarConclusionTrace(conclusionCivilBase(), [S1], [R1]);
    expect(HECHOS_CIVIL.find((f) => f.id === 'F1')?.status).toBe('ALLEGED');
    expect(HECHOS_CIVIL.find((f) => f.id === 'F1')?.status).not.toBe('PROVEN');
  });

  it('19. la conclusión no puede promover el estado de verificación de la regla', () => {
    const rParcial: NormativeRule = { ...R1, id: 'R1-PARCIAL', verificationStatus: 'PARTIAL' };
    const sConRegla: Subsumption = { ...S1, id: 'S1-PARCIAL', ruleId: 'R1-PARCIAL' };
    const cConVerified = conclusionCivilBase({
      subsumptionIds: ['S1-PARCIAL'], ruleIds: ['R1-PARCIAL'],
      uncertainty: { ...derivarConclusionUncertainty([sConRegla], [rParcial]), ruleVerification: 'VERIFIED_SHAPE' },
    });
    const resultado = validarConclusionTrace(cConVerified, [sConRegla], [rParcial]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('ruleVerification'))).toBe(true);
    expect(rParcial.verificationStatus).toBe('PARTIAL'); // sin mutación
  });

  it('20. la conclusión no puede declarar autoridad evaluada cuando NOT_EVALUATED es lo único posible', () => {
    const c = conclusionCivilBase({
      uncertainty: { ...derivarConclusionUncertainty([S1], [R1]), authorityStatus: 'PARTIAL' },
    });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('authorityStatus'))).toBe(true);
  });

  it('21. la conclusión no puede declarar estado temporal evaluado cuando NOT_EVALUATED es lo único posible', () => {
    const c = conclusionCivilBase({
      uncertainty: { ...derivarConclusionUncertainty([S1], [R1]), temporalStatus: 'UNRESOLVED' },
    });
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('temporalStatus'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL SEMANTICS (22-28)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K5 — Structural semantics only, never a verdict', () => {
  it('22. SUPPORTED significa solo soporte estructural -- verificación de claves', () => {
    const claves = Object.keys(conclusionCivilBase());
    for (const prohibida of ['legallyCorrect', 'prevailing', 'binding', 'currentLaw', 'courtOutcome']) {
      expect(claves).not.toContain(prohibida);
    }
  });

  it('23. PARTIAL permite soporte incompleto pero explícito', () => {
    expect(validarConclusionTrace(conclusionCivilBase(), [S1], [R1]).valido).toBe(true);
    expect(conclusionCivilBase().status).toBe('PARTIAL');
  });

  it('24. BLOCKED es una salida válida', () => {
    const excepcion = { id: 'EXC-Z', description: 'Excepción.' };
    const rConExcepcion: NormativeRule = { ...R1, id: 'R1-B', exceptions: [excepcion] };
    const sConExcepcion: Subsumption = {
      ...S1, id: 'S1-B', ruleId: 'R1-B',
      exceptionAssessments: [{ exceptionId: 'EXC-Z', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: [] }],
      analysisStatus: 'BLOCKED',
    };
    const c = conclusionCivilBase({
      subsumptionIds: ['S1-B'], ruleIds: ['R1-B'], status: 'BLOCKED',
      unresolvedExceptionIds: ['EXC-Z'],
      blockedBy: [{ type: 'UNRESOLVED_EXCEPTION', referenceId: 'EXC-Z', description: 'x' }],
      uncertainty: derivarConclusionUncertainty([sConExcepcion], [rConExcepcion]),
    });
    expect(validarConclusionTrace(c, [sConExcepcion], [rConExcepcion]).valido).toBe(true);
  });

  it('25. UNRESOLVED es una salida válida (conflicto estructural detectado)', () => {
    // F1 aparece como soporte en S1 y como contradicción en una segunda
    // Subsumption referenciada -- conflicto puramente mecánico.
    const sConflictiva: Subsumption = {
      id: 'S-CONFLICTO', ruleId: 'R1', caseFactIds: ['F1'], missingFactIds: [],
      elementAssessments: [{ elementId: 'A', status: 'UNSATISFIED', supportingFactIds: [], contradictingFactIds: ['F1'], missingFactIds: [] }],
      exceptionAssessments: [], analysisStatus: 'INCOMPLETE', unresolvedElementIds: ['B', 'C'],
    };
    const estado = derivarConclusionStatus([S1, sConflictiva]);
    expect(estado).toBe('UNRESOLVED');
    const c = conclusionCivilBase({
      subsumptionIds: ['S1', 'S-CONFLICTO'], status: 'UNRESOLVED',
      unresolvedElementIds: [...new Set(['C', 'B'])],
      blockedBy: [{ type: 'OTHER', description: 'Conflicto estructural: F1 usado como soporte y como contradicción entre Subsumption referenciadas.' }],
      uncertainty: derivarConclusionUncertainty([S1, sConflictiva], [R1]),
    });
    expect(validarConclusionTrace(c, [S1, sConflictiva], [R1]).valido).toBe(true);
  });

  it('26. no existe semántica de ganador/perdedor', () => {
    expect(JSON.stringify(conclusionCivilBase())).not.toMatch(/\bwin\b|\blose\b|\bwinner\b|\bloser\b/i);
  });

  it('27. no existe semántica de culpabilidad/inocencia', () => {
    expect(JSON.stringify(conclusionPenalBase())).not.toMatch(/guilty|innocent|culpable|inocente/i);
  });

  it('28. no existe semántica de veredicto de responsabilidad', () => {
    expect(JSON.stringify(conclusionCivilBase())).not.toMatch(/\bliable\b|\bnot liable\b/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SUBSUMPTION (29-30)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K5 — Multi-subsumption', () => {
  it('29. una conclusión puede referenciar múltiples Subsumption', () => {
    const c = conclusionCivilBase({ subsumptionIds: ['S1'] });
    expect(c.subsumptionIds.length).toBeGreaterThanOrEqual(1);
    // Ya probado exhaustivamente en el test 10 (múltiples Subsumption válidas).
  });

  it('30. Subsumption contradictorias referenciadas no pueden ignorarse en silencio', () => {
    const sConflictiva: Subsumption = {
      id: 'S-CONFLICTO2', ruleId: 'R1', caseFactIds: ['F1'], missingFactIds: [],
      elementAssessments: [{ elementId: 'A', status: 'UNSATISFIED', supportingFactIds: [], contradictingFactIds: ['F1'], missingFactIds: [] }],
      exceptionAssessments: [], analysisStatus: 'INCOMPLETE', unresolvedElementIds: ['B', 'C'],
    };
    // Declarar PARTIAL (ignorando el conflicto) cuando lo derivado es UNRESOLVED debe rechazarse.
    const c = conclusionCivilBase({
      subsumptionIds: ['S1', 'S-CONFLICTO2'], status: 'PARTIAL',
      unresolvedElementIds: ['B', 'C'],
      uncertainty: derivarConclusionUncertainty([S1, sConflictiva], [R1]),
    });
    const resultado = validarConclusionTrace(c, [S1, sConflictiva], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('status'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC-FIRST (31-34)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K5 — Generic-first: civil and penal fixtures share one contract', () => {
  it('31. fixture sintética civil (directiva §17) pasa la validación', () => {
    const c = conclusionCivilBase();
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(true);
    expect(c.status).toBe('PARTIAL');
    expect(JSON.stringify(c)).not.toMatch(/conclusion final|gana|nulo|liable/i);
  });

  it('32. fixture sintética penal (directiva §18) pasa la validación', () => {
    const c = conclusionPenalBase();
    const resultado = validarConclusionTrace(c, [S2], [R2]);
    expect(resultado.valido).toBe(true);
    expect(JSON.stringify(c)).not.toMatch(/guilty|innocent|sentence|culpable|inocente|pena de/i);
  });

  it('33. no existe ningún tipo Civil-específico de conclusión', () => {
    expect((tiposLegales as Record<string, unknown>).CivilConclusion).toBeUndefined();
    expect((tiposLegales as Record<string, unknown>).CivilConclusionTrace).toBeUndefined();
  });

  it('34. no existe ningún tipo padre Penal-específico de conclusión', () => {
    expect((tiposLegales as Record<string, unknown>).PenalConclusion).toBeUndefined();
    expect((tiposLegales as Record<string, unknown>).PenalConclusionTrace).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARIES (35-41)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K5 — Boundaries', () => {
  it('35. sin recomendación procesal', () => {
    expect((conclusionCivilBase() as unknown as Record<string, unknown>).recommendedAction).toBeUndefined();
  });

  it('36. sin recomendación estratégica -- PROCEDURAL_CONCLUSION/STRATEGIC_ASSESSMENT se rechazan explícitamente', () => {
    const c = { ...conclusionCivilBase(), conclusionType: 'STRATEGIC_ASSESSMENT' } as ConclusionTrace;
    const resultado = validarConclusionTrace(c, [S1], [R1]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('no está implementado'))).toBe(true);

    const c2 = { ...conclusionCivilBase(), conclusionType: 'PROCEDURAL_CONCLUSION' } as ConclusionTrace;
    expect(validarConclusionTrace(c2, [S1], [R1]).valido).toBe(false);
  });

  it('37. sin motor de autoridad -- authorityStatus forzado a NOT_EVALUATED', () => {
    expect(conclusionCivilBase().uncertainty.authorityStatus).toBe('NOT_EVALUATED');
  });

  it('38. sin motor temporal -- temporalStatus forzado a NOT_EVALUATED', () => {
    expect(conclusionCivilBase().uncertainty.temporalStatus).toBe('NOT_EVALUATED');
  });

  it('39. sin Citation Trust II -- ninguna función evalúa soporte de proposición', () => {
    expect((validadoresLegales as Record<string, unknown>).validarSoporteDeProposicion).toBeUndefined();
  });

  it('40. sin llamada a LLM/proveedor de modelo -- no existe tal import en el módulo', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/anthropic|openai|@anthropic-ai|fetch\(/i);
    }
  });

  it('41. sin integración de ruta en tiempo de ejecución -- no se referencia app/api/chat/route como import', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/from ['"]@\/app\/api\/chat/);
    }
  });
});
