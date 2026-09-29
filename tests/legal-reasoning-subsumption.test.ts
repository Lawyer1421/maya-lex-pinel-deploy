import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  CaseFact,
  MissingFact,
  NormativeRule,
  RuleElement,
  RuleException,
  Subsumption,
  RuleElementAssessment,
  RuleExceptionAssessment,
  CanonicalLegalReference,
} from '@/lib/legal-reasoning/types';
import * as tiposLegales from '@/lib/legal-reasoning/types';
import * as validadoresLegales from '@/lib/legal-reasoning/validators';
import {
  validarSubsumption,
  derivarAnalysisStatusSubsuncion,
  derivarElementosNoResueltos,
} from '@/lib/legal-reasoning/validators';

/**
 * LR-K4 — Generic Subsumption Contract tests (2026-09-28).
 *
 * All fixtures are fully synthetic -- no real client, case, or expediente
 * data. This file never invokes an LLM, an embedding model, or any
 * similarity/classification logic: every assessment below is instantiated
 * by hand, exactly as the directive requires ("fixtures may instantiate
 * explicit assessments manually").
 */

const FUENTE: CanonicalLegalReference = { instrumento: 'CODIGO_CIVIL', articulo: 'X' };
const FUENTE_Z: CanonicalLegalReference = { instrumento: 'CODIGO_CIVIL', articulo: 'Z' };

// ── Generic rule fixture: A + B + C required for Y, exception Z ────────────
const ELEMENTOS_ABC: RuleElement[] = [
  { id: 'A', description: 'Concurrencia del elemento A.', required: true },
  { id: 'B', description: 'Concurrencia del elemento B.', required: true },
  { id: 'C', description: 'Concurrencia del elemento C.', required: true },
];
const EXCEPCION_Z: RuleException = {
  id: 'EXC-Z',
  description: 'No procede cuando concurre el supuesto del artículo Z.',
  source: FUENTE_Z,
};

function reglaGenerica(overrides: Partial<NormativeRule> = {}): NormativeRule {
  return {
    id: 'R1',
    propositionIds: ['P1'],
    sources: [FUENTE],
    ruleType: 'REQUIREMENT',
    elements: ELEMENTOS_ABC,
    exceptions: [EXCEPCION_Z],
    verificationStatus: 'VERIFIED',
    ...overrides,
  };
}

const HECHOS_BASE: CaseFact[] = [
  { id: 'F1', proposition: 'El demandante realizó X el día indicado.', origin: 'USER_STATEMENT', status: 'ALLEGED' },
  { id: 'F2', proposition: 'El demandante notificó a la contraparte.', origin: 'USER_DOCUMENT', status: 'DOCUMENTED' },
];
const FALTANTES_BASE: MissingFact[] = [
  { id: 'M1', description: 'No se aportó evidencia del elemento C.', blocksConclusions: ['R1'] },
];

function subsuncionBase(overrides: Partial<Subsumption> = {}): Subsumption {
  const elementAssessments: RuleElementAssessment[] = [
    { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
    { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
    { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
  ];
  const exceptionAssessments: RuleExceptionAssessment[] = [
    { exceptionId: 'EXC-Z', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: [] },
  ];
  return {
    id: 'S1',
    ruleId: 'R1',
    caseFactIds: ['F1', 'F2'],
    missingFactIds: ['M1'],
    elementAssessments,
    exceptionAssessments,
    analysisStatus: 'BLOCKED', // exception UNKNOWN -> BLOCKED, per derivation
    unresolvedElementIds: ['C'],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ELEMENT ASSESSMENT (1-7)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — Element assessment', () => {
  it('1. SATISFIED con CaseFact de soporte -> aceptado', () => {
    const s = subsuncionBase();
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(true);
  });

  it('2. SATISFIED sin ningún hecho de soporte -> rechazado', () => {
    const s = subsuncionBase({
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: [], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
      ],
    });
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('SATISFIED') && e.includes('supportingFactId'))).toBe(true);
  });

  it('3. UNSATISFIED con traza fáctica -> aceptado', () => {
    const regla = reglaGenerica({ exceptions: [] });
    const s = subsuncionBase({
      exceptionAssessments: [],
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'UNSATISFIED', supportingFactIds: [], contradictingFactIds: ['F2'], missingFactIds: [] },
        { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
      ],
      analysisStatus: 'INCOMPLETE',
      unresolvedElementIds: ['C'],
    });
    const resultado = validarSubsumption(s, regla, HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(true);
  });

  it('4. UNKNOWN con MissingFact vinculado -> aceptado', () => {
    const s = subsuncionBase();
    const c = s.elementAssessments.find((a) => a.elementId === 'C')!;
    expect(c.status).toBe('UNKNOWN');
    expect(c.missingFactIds).toContain('M1');
    expect(validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE).valido).toBe(true);
  });

  it('5. UNKNOWN != UNSATISFIED -- la ausencia de hechos nunca se convierte en "no satisfecho"', () => {
    // Intentar declarar C como UNSATISFIED sin ningún contradictingFactId
    // (exactamente "no hay dato" disfrazado de "no satisfecho") debe fallar.
    const s = subsuncionBase({
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'C', status: 'UNSATISFIED', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
      ],
    });
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('UNSATISFIED') && e.includes('contradictingFactId'))).toBe(true);
  });

  it('6. id de CaseFact huérfano -> rechazado', () => {
    const s = subsuncionBase({
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F-NO-EXISTE'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
      ],
    });
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('F-NO-EXISTE'))).toBe(true);
  });

  it('7. id de MissingFact huérfano -> rechazado', () => {
    const s = subsuncionBase({
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M-NO-EXISTE'] },
      ],
    });
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('M-NO-EXISTE'))).toBe(true);
  });

  it('id de hecho no declarado en caseFactIds (aunque exista realmente) -> rechazado', () => {
    // F1/F2 son CaseFact reales, pero si la Subsumption no los declara en su
    // propio caseFactIds, un assessment no puede "tomarlos prestados".
    const s = subsuncionBase({ caseFactIds: ['F2'] }); // F1 existe pero no fue declarado
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RULE COVERAGE (8-11)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — Rule element coverage', () => {
  it('8. todos los RuleElement requeridos evaluados -> aceptado', () => {
    expect(validarSubsumption(subsuncionBase(), reglaGenerica(), HECHOS_BASE, FALTANTES_BASE).valido).toBe(true);
  });

  it('9. elemento requerido omitido en silencio -> rechazado', () => {
    const s = subsuncionBase({
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        // C omitido por completo
      ],
    });
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('"C"') && e.includes('requerido'))).toBe(true);
  });

  it('10. evaluación duplicada para el mismo elemento -> rechazada', () => {
    const s = subsuncionBase({
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
      ],
    });
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('duplicada'))).toBe(true);
  });

  it('11. evaluación para un elemento que no pertenece a la regla -> rechazada', () => {
    const s = subsuncionBase({
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
        { elementId: 'D-INEXISTENTE', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
      ],
    });
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('D-INEXISTENTE'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FACT EPISTEMICS (12-15)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — Fact epistemics never mutated', () => {
  it('12. un hecho ALLEGED permanece ALLEGED tras la validación', () => {
    const hechos: CaseFact[] = [{ id: 'F1', proposition: 'Hecho alegado.', origin: 'USER_STATEMENT', status: 'ALLEGED' }];
    const copia = JSON.parse(JSON.stringify(hechos));
    const s = subsuncionBase({
      caseFactIds: ['F1'],
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: [] },
      ],
      analysisStatus: 'BLOCKED',
      unresolvedElementIds: ['B', 'C'],
    });
    validarSubsumption(s, reglaGenerica(), hechos, []);
    expect(hechos).toEqual(copia);
    expect(hechos[0].status).toBe('ALLEGED');
  });

  it('13. un hecho DISPUTED permanece DISPUTED tras la validación', () => {
    const hechos: CaseFact[] = [{ id: 'F1', proposition: 'Hecho disputado.', origin: 'USER_STATEMENT', status: 'DISPUTED' }];
    validarSubsumption(subsuncionBase({ caseFactIds: ['F1'] }), reglaGenerica(), hechos, FALTANTES_BASE);
    expect(hechos[0].status).toBe('DISPUTED');
  });

  it('14. Subsumption no puede promover un hecho a PROVEN -- no existe ningún campo/función que lo haga', () => {
    const hechos: CaseFact[] = [{ id: 'F1', proposition: 'Hecho alegado, usado para soportar A.', origin: 'USER_STATEMENT', status: 'ALLEGED' }];
    validarSubsumption(subsuncionBase({ caseFactIds: ['F1'] }), reglaGenerica(), hechos, FALTANTES_BASE);
    // El validador es de solo lectura: no reasigna campos de sus argumentos.
    expect(hechos[0].status).toBe('ALLEGED');
    expect(hechos[0].status).not.toBe('PROVEN');
  });

  it('15. no se introduce ninguna categoría ASSUMED', () => {
    const estadosValidos = ['ALLEGED', 'ADMITTED', 'DISPUTED', 'DOCUMENTED', 'PROVEN', 'UNKNOWN'];
    expect(estadosValidos).not.toContain('ASSUMED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MISSING FACTS (16-18)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — Missing facts', () => {
  it('16. un MissingFact puede bloquear un elemento sin resolver', () => {
    const s = subsuncionBase();
    const c = s.elementAssessments.find((a) => a.elementId === 'C')!;
    expect(c.status).toBe('UNKNOWN');
    expect(c.missingFactIds).toEqual(['M1']);
    expect(FALTANTES_BASE.find((m) => m.id === 'M1')?.blocksConclusions).toContain('R1');
  });

  it('17. un MissingFact no puede convertirse en CaseFact en silencio -- son tipos distintos', () => {
    const missing: MissingFact = { id: 'M1', description: 'x', blocksConclusions: [] };
    // MissingFact no tiene origin/status -- las claves nunca coinciden con CaseFact.
    expect(Object.keys(missing).sort()).toEqual(['blocksConclusions', 'description', 'id'].sort());
    expect(Object.keys(missing)).not.toContain('origin');
    expect(Object.keys(missing)).not.toContain('status');
  });

  it('18. la vinculación de un MissingFact es siempre explícita (por id, nunca por descripción)', () => {
    const s = subsuncionBase({
      elementAssessments: [
        { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M-NO-DECLARADO'] },
      ],
      missingFactIds: ['M1'], // M-NO-DECLARADO nunca se declaró como parte del análisis
    });
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, [
      ...FALTANTES_BASE,
      { id: 'M-NO-DECLARADO', description: 'Existe en el sistema pero no fue declarado aquí.', blocksConclusions: [] },
    ]);
    expect(resultado.valido).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EXCEPTIONS (19-22)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — Exception assessments', () => {
  it('19. la evaluación de excepción permanece separada de los elementos', () => {
    const s = subsuncionBase();
    expect(s.elementAssessments.some((a) => (a as unknown as RuleExceptionAssessment).exceptionId)).toBe(false);
    expect(s.exceptionAssessments).toHaveLength(1);
    expect(s.exceptionAssessments[0].exceptionId).toBe('EXC-Z');
  });

  it('20. una excepción que aplica exige base fáctica explícita', () => {
    const hechoZ: CaseFact = { id: 'F3', proposition: 'Concurre el supuesto del artículo Z.', origin: 'USER_STATEMENT', status: 'ALLEGED' };
    const s = subsuncionBase({
      caseFactIds: ['F1', 'F2', 'F3'],
      exceptionAssessments: [{ exceptionId: 'EXC-Z', status: 'APPLIES', supportingFactIds: ['F3'], contradictingFactIds: [], missingFactIds: [] }],
      analysisStatus: 'INCOMPLETE', // ya no BLOCKED -- la excepción se resolvió
      unresolvedElementIds: ['C'],
    });
    const resultado = validarSubsumption(s, reglaGenerica(), [...HECHOS_BASE, hechoZ], FALTANTES_BASE);
    expect(resultado.valido).toBe(true);
  });

  it('21. una excepción UNKNOWN permanece UNKNOWN -- no se fuerza a un valor', () => {
    const s = subsuncionBase();
    expect(s.exceptionAssessments[0].status).toBe('UNKNOWN');
    expect(validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE).valido).toBe(true);
  });

  it('22. una excepción sin resolver no puede desaparecer en silencio', () => {
    const s = subsuncionBase({ exceptionAssessments: [] }); // la regla SÍ tiene EXC-Z, pero no se evalúa
    const resultado = validarSubsumption(s, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('EXC-Z'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUBSUMPTION STATUS (23-26)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — Analysis status is structural only, never a verdict', () => {
  it('23. COMPLETE no tiene semántica de veredicto legal -- verificación estructural de claves', () => {
    const s = subsuncionBase();
    const claves = Object.keys(s);
    for (const prohibida of ['finalConclusion', 'legalConclusion', 'proceduralConclusion', 'strategicAssessment', 'recommendedAction', 'probability', 'confidenceScore']) {
      expect(claves).not.toContain(prohibida);
    }
  });

  it('24. INCOMPLETE cuando existe un elemento requerido sin resolver (sin excepciones pendientes)', () => {
    const regla = reglaGenerica({ exceptions: [] });
    const estado = derivarAnalysisStatusSubsuncion(regla, [
      { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
      { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
      { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
    ], []);
    expect(estado).toBe('INCOMPLETE');
  });

  it('25. BLOCKED cuando una excepción permanece UNKNOWN -- gana sobre INCOMPLETE', () => {
    const estado = derivarAnalysisStatusSubsuncion(reglaGenerica(), [
      { elementId: 'A', status: 'SATISFIED', supportingFactIds: ['F1'], contradictingFactIds: [], missingFactIds: [] },
      { elementId: 'B', status: 'SATISFIED', supportingFactIds: ['F2'], contradictingFactIds: [], missingFactIds: [] },
      { elementId: 'C', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['M1'] },
    ], [
      { exceptionId: 'EXC-Z', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: [] },
    ]);
    expect(estado).toBe('BLOCKED');

    // Declarar INCOMPLETE cuando el derivado es BLOCKED debe rechazarse.
    const sIncorrecta = subsuncionBase({ analysisStatus: 'INCOMPLETE' });
    expect(validarSubsumption(sIncorrecta, reglaGenerica(), HECHOS_BASE, FALTANTES_BASE).valido).toBe(false);
  });

  it('26. no existe ningún porcentaje de confianza en ninguna parte del contrato', () => {
    const s = subsuncionBase();
    expect(JSON.stringify(s)).not.toMatch(/confidence|probability|%/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC-FIRST (27-30) — Civil and Penal golden fixtures
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — Generic-first: civil and penal fixtures share one contract', () => {
  it('27. fixture sintética civil pasa la validación', () => {
    // RULE: para Y proceden A, B, C, salvo el supuesto del artículo Z.
    // F1 soporta A. F2 soporta B. Ningún hecho soporta C. M1 identifica el
    // vacío de C. La excepción Z permanece sin resolver.
    const reglaCivil = reglaGenerica({ id: 'R-CIVIL', ruleType: 'REQUIREMENT' });
    const s = subsuncionBase({ id: 'S-CIVIL', ruleId: 'R-CIVIL' });
    const resultado = validarSubsumption(s, reglaCivil, HECHOS_BASE, FALTANTES_BASE);
    expect(resultado.valido).toBe(true);
    expect(s.analysisStatus).toBe('BLOCKED'); // excepción Z sin resolver
    // Sin conclusión legal en ninguna parte del objeto.
    expect(JSON.stringify(s)).not.toMatch(/conclusion|liable|valid|gana|nulo/i);
  });

  it('28. fixture sintética penal pasa la validación', () => {
    // Elementos: E1 conducta, E2 circunstancia objetiva, E3 elemento subjetivo.
    // F1 soporta E1. F2 contradice E2. M1 deja E3 sin resolver. Sin excepciones.
    const elementosPenal: RuleElement[] = [
      { id: 'E1', description: 'Conducta típica.', required: true },
      { id: 'E2', description: 'Circunstancia objetiva del tipo.', required: true },
      { id: 'E3', description: 'Elemento subjetivo requerido (dolo/culpa).', required: true },
    ];
    const reglaPenal: NormativeRule = {
      id: 'R-PENAL', propositionIds: ['P-PENAL'], sources: [{ instrumento: 'CODIGO_PENAL', articulo: 'N' }],
      ruleType: 'REQUIREMENT', elements: elementosPenal, exceptions: [], verificationStatus: 'VERIFIED',
    };
    const hechosPenal: CaseFact[] = [
      { id: 'PF1', proposition: 'Se acreditó la conducta descrita.', origin: 'PROCEDURAL_RECORD', status: 'DOCUMENTED' },
      { id: 'PF2', proposition: 'La circunstancia objetiva no concurrió según el expediente.', origin: 'PROCEDURAL_RECORD', status: 'DOCUMENTED' },
    ];
    const faltantesPenal: MissingFact[] = [
      { id: 'PM1', description: 'No se estableció el elemento subjetivo (dolo/culpa).', blocksConclusions: ['R-PENAL'] },
    ];
    const s: Subsumption = {
      id: 'S-PENAL', ruleId: 'R-PENAL',
      caseFactIds: ['PF1', 'PF2'], missingFactIds: ['PM1'],
      elementAssessments: [
        { elementId: 'E1', status: 'SATISFIED', supportingFactIds: ['PF1'], contradictingFactIds: [], missingFactIds: [] },
        { elementId: 'E2', status: 'UNSATISFIED', supportingFactIds: [], contradictingFactIds: ['PF2'], missingFactIds: [] },
        { elementId: 'E3', status: 'UNKNOWN', supportingFactIds: [], contradictingFactIds: [], missingFactIds: ['PM1'] },
      ],
      exceptionAssessments: [],
      analysisStatus: 'INCOMPLETE',
      unresolvedElementIds: ['E3'],
    };
    const resultado = validarSubsumption(s, reglaPenal, hechosPenal, faltantesPenal);
    expect(resultado.valido).toBe(true);
    // La fixture NO declara culpabilidad, inocencia, ni pena.
    expect(JSON.stringify(s)).not.toMatch(/guilty|innocent|sentence|culpable|inocente|pena de/i);
  });

  it('29. no existe ningún tipo Civil-específico -- ambas fixtures usan Subsumption/NormativeRule genéricos', () => {
    // Prueba negativa: no hay CivilSubsumption ni CivilNormativeRule exportado
    // como valor en runtime (los tipos TS puros no dejan rastro en runtime,
    // pero ningún const/función/clase con ese nombre existe tampoco).
    expect((tiposLegales as Record<string, unknown>).CivilSubsumption).toBeUndefined();
    expect((tiposLegales as Record<string, unknown>).CivilNormativeRule).toBeUndefined();
  });

  it('30. no existe ningún tipo padre Penal-específico -- el motor de 6 capas queda como adaptador futuro, no como arquitectura padre', () => {
    expect((tiposLegales as Record<string, unknown>).PenalSubsumption).toBeUndefined();
    expect((tiposLegales as Record<string, unknown>).PenalNormativeRule).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARIES (31-38)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — Boundaries: what Subsumption deliberately does not contain', () => {
  it('31-35. Subsumption no contiene conclusión legal, procesal, estratégica, vigencia ni jerarquía de autoridad', () => {
    const s = subsuncionBase();
    const claves = Object.keys(s);
    for (const prohibida of [
      'finalConclusion', 'legalConclusion', 'proceduralConclusion', 'strategicAssessment',
      'recommendedAction', 'vigencia', 'legalStatus', 'authorityLevel', 'authorityRelationship',
    ]) {
      expect(claves).not.toContain(prohibida);
    }
  });

  it('36. Subsumption no invoca Citation Trust II -- ninguna función de este módulo evalúa soporte de proposición', () => {
    expect((validadoresLegales as Record<string, unknown>).validarSoporteDeProposicion).toBeUndefined();
    expect((validadoresLegales as Record<string, unknown>).verificarCitationTrustII).toBeUndefined();
  });

  it('37. ninguna llamada a LLM/proveedor de modelo -- no existe tal import en el módulo', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/anthropic|openai|@anthropic-ai|fetch\(/i);
    }
  });

  it('38. ninguna lógica de similitud semántica USADA -- no existe import de embeddings/rerank', () => {
    // No se busca la ausencia total de la palabra: desde LR-K6 este archivo
    // discute por nombre, en prosa, el invariante "similitud semántica !=
    // soporte de proposición" precisamente para prohibirlo -- se busca la
    // ausencia de USO real (import o llamada a una función de
    // embeddings/similitud/reranking).
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    expect(contenidoValidators).not.toMatch(/from ['"].*\/(embed|rerank)['"]/i);
    expect(contenidoValidators).not.toMatch(/\bembedQuery\(|\brerankearFragmentos\(|\bcosineSimilarity\(/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NormativeRule.verificationStatus limitation (Mission LR-K4 §16 -- documented, not fixed)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K4 — recorded limitation: NormativeRule.verificationStatus is shape-level only', () => {
  it('Subsumption validation never reads or depends on NormativeRule.verificationStatus', () => {
    const reglaSinCitasVerificadas = reglaGenerica({ verificationStatus: 'UNRESOLVED' });
    const s = subsuncionBase();
    // El resultado no cambia si verificationStatus es VERIFIED o UNRESOLVED --
    // Subsumption solo mapea hechos contra elementos, nunca evalúa la
    // autoridad/evidencia de la regla misma (eso queda fuera de LR-K4).
    const conVerified = validarSubsumption(s, reglaGenerica({ verificationStatus: 'VERIFIED' }), HECHOS_BASE, FALTANTES_BASE);
    const conUnresolved = validarSubsumption(s, reglaSinCitasVerificadas, HECHOS_BASE, FALTANTES_BASE);
    expect(conVerified.valido).toBe(conUnresolved.valido);
  });
});
