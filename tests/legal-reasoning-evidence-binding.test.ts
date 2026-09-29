import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  LegalProposition,
  PropositionClaim,
  CitationTrustRecord,
  IdentifiedCitationTrustRecord,
  PropositionSupportRecord,
  SupportAdjudication,
  CanonicalLegalReference,
} from '@/lib/legal-reasoning/types';
import * as tiposLegales from '@/lib/legal-reasoning/types';
import {
  validarSupportAdjudication,
  agregarAdjudicacionesPorProposicion,
  agregarSoportePorProposicion,
  esProposicionCompletamenteRespaldada,
} from '@/lib/legal-reasoning/validators';

/**
 * LR-K6.1 — Evidence Binding + Support Conflict Aggregation tests
 * (2026-09-29, final reconciled version). All fixtures synthetic. No LLM,
 * no embeddings, no source retrieval anywhere in this file -- every
 * adjudication below is instantiated by hand.
 */

const FUENTE_X: CanonicalLegalReference = { instrumento: 'CODIGO_CIVIL', articulo: 'X' };

function propuesta(overrides: Partial<LegalProposition> = {}): LegalProposition {
  return {
    id: 'P1', proposition: 'Y requires A, B and C.', sources: [FUENTE_X], citationTrust: [],
    propositionType: 'PARAPHRASED', verificationStatus: 'PARTIAL', ...overrides,
  };
}

const CLAIMS_P1: PropositionClaim[] = [
  { id: 'CLAIM-A', propositionId: 'P1', text: 'A is required.', required: true },
  { id: 'CLAIM-B', propositionId: 'P1', text: 'B is required.', required: true },
  { id: 'CLAIM-C', propositionId: 'P1', text: 'C is required.', required: true },
];

function citaVerificada(overrides: Partial<CitationTrustRecord> = {}): CitationTrustRecord {
  return {
    proposition: 'Para que proceda Y deberán concurrir A, B y C.',
    instrumento: 'CODIGO_CIVIL', articulo: 'X', fuente: 'Código Civil (fixture sintético)',
    documentVersion: 'fixture-v1', versionStatus: 'VERIFIED', verificationState: 'VERIFIED',
    hash: 'fixturehash1', ...overrides,
  };
}

const CIT_FULL: IdentifiedCitationTrustRecord = { id: 'CIT-FULL', record: citaVerificada() };
const P_VERIFICADA = propuesta({ verificationStatus: 'VERIFIED', citationTrust: [citaVerificada()] });

function adj(overrides: Partial<SupportAdjudication> = {}): SupportAdjudication {
  return {
    id: 'ADJ-A1', propositionId: 'P1', claimId: 'CLAIM-A',
    evidenceSpan: { citationTrustRecordId: 'CIT-FULL', quotedText: 'A' },
    status: 'SUPPORTS', origin: 'HUMAN', ...overrides,
  };
}

function adjudicacionesCompletas(): SupportAdjudication[] {
  return [
    adj({ id: 'ADJ-A', claimId: 'CLAIM-A', evidenceSpan: { citationTrustRecordId: 'CIT-FULL', quotedText: 'A' } }),
    adj({ id: 'ADJ-B', claimId: 'CLAIM-B', evidenceSpan: { citationTrustRecordId: 'CIT-FULL', quotedText: 'B' } }),
    adj({ id: 'ADJ-C', claimId: 'CLAIM-C', evidenceSpan: { citationTrustRecordId: 'CIT-FULL', quotedText: 'C' } }),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE BINDING (1-5)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6.1 — Evidence binding', () => {
  it('1. SUPPORTS con claim válido + EvidenceSpan + origin -> aceptada', () => {
    expect(validarSupportAdjudication(adj(), [propuesta()], CLAIMS_P1, [CIT_FULL]).valido).toBe(true);
  });

  it('2. SUPPORTS sin EvidenceSpan -> rechazada', () => {
    const a = { ...adj(), evidenceSpan: undefined } as unknown as SupportAdjudication;
    const resultado = validarSupportAdjudication(a, [propuesta()], CLAIMS_P1, [CIT_FULL]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('evidenceSpan'))).toBe(true);
  });

  it('3. EvidenceSpan con CitationTrustRecord desconocido -> rechazada', () => {
    const a = adj({ evidenceSpan: { citationTrustRecordId: 'CIT-NO-EXISTE' } });
    const resultado = validarSupportAdjudication(a, [propuesta()], CLAIMS_P1, [CIT_FULL]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('CIT-NO-EXISTE'))).toBe(true);
  });

  it('4. adjudicación sin origin -> rechazada', () => {
    const a = { ...adj(), origin: undefined } as unknown as SupportAdjudication;
    const resultado = validarSupportAdjudication(a, [propuesta()], CLAIMS_P1, [CIT_FULL]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('origin'))).toBe(true);
  });

  it('5. identidad de fuente por sí sola (hash presente) no puede establecer soporte', () => {
    // CIT_FULL está VERIFIED con hash -- pero sin ninguna SupportAdjudication
    // que clasifique explícitamente un claim, no existe soporte que agregar.
    const agregado = agregarAdjudicacionesPorProposicion('P1', [], CLAIMS_P1);
    expect(agregado.status).toBe('UNRESOLVED');
    expect(esProposicionCompletamenteRespaldada(P_VERIFICADA, CLAIMS_P1, [])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM LINKAGE (6-9)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6.1 — Claim linkage', () => {
  it('6. propositionId desconocido -> rechazada', () => {
    const a = adj({ propositionId: 'P-NO-EXISTE' });
    const resultado = validarSupportAdjudication(a, [propuesta()], CLAIMS_P1, [CIT_FULL]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('propositionId'))).toBe(true);
  });

  it('7. claimId desconocido -> rechazada', () => {
    const a = adj({ claimId: 'CLAIM-NO-EXISTE' });
    const resultado = validarSupportAdjudication(a, [propuesta()], CLAIMS_P1, [CIT_FULL]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('claimId'))).toBe(true);
  });

  it('8. la relación claim/adjudicación permanece explícita -- un claim de otra proposición no es válido aquí', () => {
    const claimDeOtraProposicion: PropositionClaim = { id: 'CLAIM-X', propositionId: 'P-OTRA', text: 'x', required: true };
    const a = adj({ claimId: 'CLAIM-X' });
    const resultado = validarSupportAdjudication(a, [propuesta()], [...CLAIMS_P1, claimDeOtraProposicion], [CIT_FULL]);
    expect(resultado.valido).toBe(false);
  });

  it('9. el soporte parcial de una proposición compuesta permanece a nivel de claim', () => {
    // A y B tienen adjudicación SUPPORTS; C fue examinado y encontrado sin
    // respaldo (DOES_NOT_SUPPORT, no simplemente ausente) -- C nunca se
    // ignora ni se "redondea hacia arriba": permanece explícitamente sin
    // soporte en notSupportedClaimIds, no oculto dentro de un SUPPORTED.
    const parcial = [
      adj({ id: 'ADJ-A', claimId: 'CLAIM-A' }),
      adj({ id: 'ADJ-B', claimId: 'CLAIM-B' }),
      adj({ id: 'ADJ-C', claimId: 'CLAIM-C', status: 'DOES_NOT_SUPPORT' }),
    ];
    const agregado = agregarAdjudicacionesPorProposicion('P1', parcial, CLAIMS_P1);
    expect(agregado.status).toBe('PARTIALLY_SUPPORTED');
    expect(agregado.supportingClaimIds.sort()).toEqual(['CLAIM-A', 'CLAIM-B']);
    expect(agregado.notSupportedClaimIds).toEqual(['CLAIM-C']);
    expect(agregado.status).not.toBe('SUPPORTED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOT_SUPPORTED / UNRESOLVED (10-13)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6.1 — NOT_SUPPORTED vs UNRESOLVED', () => {
  it('10. evidencia examinada que no respalda -> DOES_NOT_SUPPORT (a nivel de adjudicación)', () => {
    const a = adj({ status: 'DOES_NOT_SUPPORT' });
    expect(validarSupportAdjudication(a, [propuesta()], CLAIMS_P1, [CIT_FULL]).valido).toBe(true);
    const agregado = agregarAdjudicacionesPorProposicion('P1', [a], CLAIMS_P1);
    expect(agregado.notSupportedClaimIds).toContain('CLAIM-A');
  });

  it('11. evidencia insuficiente -> UNRESOLVED', () => {
    const a = adj({ status: 'UNRESOLVED' });
    const agregado = agregarAdjudicacionesPorProposicion('P1', [a], CLAIMS_P1);
    // Una adjudicación UNRESOLVED no clasifica el claim como soportado ni
    // como no-soportado -- permanece en unresolvedClaimIds.
    expect(agregado.unresolvedClaimIds).toContain('CLAIM-A');
    expect(agregado.notSupportedClaimIds).not.toContain('CLAIM-A');
  });

  it('12. DOES_NOT_SUPPORT != UNRESOLVED -- nunca se confunden', () => {
    const examinadoSinRespaldo = agregarAdjudicacionesPorProposicion('P1', [adj({ status: 'DOES_NOT_SUPPORT' })], CLAIMS_P1);
    const insuficiente = agregarAdjudicacionesPorProposicion('P1', [adj({ status: 'UNRESOLVED' })], CLAIMS_P1);
    expect(examinadoSinRespaldo.notSupportedClaimIds).toContain('CLAIM-A');
    expect(examinadoSinRespaldo.unresolvedClaimIds).not.toContain('CLAIM-A');
    expect(insuficiente.unresolvedClaimIds).toContain('CLAIM-A');
    expect(insuficiente.notSupportedClaimIds).not.toContain('CLAIM-A');
  });

  it('13. la sola ausencia de recuperación (sin ninguna adjudicación) es UNRESOLVED, nunca NOT_SUPPORTED', () => {
    // Invariante XXXV: "no se encontró autoridad en el corpus consultado"
    // nunca se convierte en "tal autoridad no existe".
    const agregado = agregarAdjudicacionesPorProposicion('P1', [], CLAIMS_P1);
    expect(agregado.status).toBe('UNRESOLVED');
    expect(agregado.status).not.toBe('NOT_SUPPORTED');
    expect(agregado.unresolvedClaimIds.sort()).toEqual(['CLAIM-A', 'CLAIM-B', 'CLAIM-C']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRARY EVIDENCE (14-16)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6.1 — Contrary evidence is preserved, never discarded', () => {
  it('14. adjudicaciones de soporte y contradictorias se preservan ambas en el agregado', () => {
    const mixtas = [
      adj({ id: 'ADJ-A', claimId: 'CLAIM-A', status: 'SUPPORTS' }),
      adj({ id: 'ADJ-B', claimId: 'CLAIM-B', status: 'CONTRADICTS' }),
    ];
    const agregado = agregarAdjudicacionesPorProposicion('P1', mixtas, CLAIMS_P1);
    // Invariante XXXII: ambas -- soportada Y contraria -- siguen visibles en
    // el resultado, ninguna se descarta solo porque la otra "gane" el status.
    expect(agregado.supportingClaimIds).toContain('CLAIM-A');
    expect(agregado.contraryClaimIds).toContain('CLAIM-B');
  });

  it('15. una adjudicación contradictoria no puede desaparecer del agregado', () => {
    const soloContradice = [adj({ id: 'ADJ-B', claimId: 'CLAIM-B', status: 'CONTRADICTS' })];
    const agregado = agregarAdjudicacionesPorProposicion('P1', soloContradice, CLAIMS_P1);
    expect(agregado.contraryClaimIds).toEqual(['CLAIM-B']);
    expect(agregado.status).toBe('CONTRADICTED');
  });

  it('16. un claim requerido contradictorio bloquea el soporte completo aunque otros estén soportados', () => {
    const mixtas = [
      adj({ id: 'ADJ-A', claimId: 'CLAIM-A', status: 'SUPPORTS' }),
      adj({ id: 'ADJ-B', claimId: 'CLAIM-B', status: 'SUPPORTS' }),
      adj({ id: 'ADJ-C', claimId: 'CLAIM-C', status: 'CONTRADICTS' }),
    ];
    expect(esProposicionCompletamenteRespaldada(P_VERIFICADA, CLAIMS_P1, mixtas)).toBe(false);
    const agregado = agregarAdjudicacionesPorProposicion('P1', mixtas, CLAIMS_P1);
    expect(agregado.status).toBe('CONTRADICTED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATION (17-22)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6.1 — Aggregation', () => {
  it('17. todos los claims requeridos con SUPPORTS y sin conflicto -> SUPPORTED', () => {
    const agregado = agregarAdjudicacionesPorProposicion('P1', adjudicacionesCompletas(), CLAIMS_P1);
    expect(agregado.status).toBe('SUPPORTED');
    expect(esProposicionCompletamenteRespaldada(P_VERIFICADA, CLAIMS_P1, adjudicacionesCompletas())).toBe(true);
  });

  it('18. cobertura parcial de claims requeridos -> no SUPPORTED', () => {
    const parcial = [adj({ id: 'ADJ-A', claimId: 'CLAIM-A' }), adj({ id: 'ADJ-B', claimId: 'CLAIM-B' })];
    expect(agregarAdjudicacionesPorProposicion('P1', parcial, CLAIMS_P1).status).not.toBe('SUPPORTED');
  });

  it('19. un claim requerido sin resolver -> no SUPPORTED', () => {
    const conUnoSinResolver = [
      adj({ id: 'ADJ-A', claimId: 'CLAIM-A' }),
      adj({ id: 'ADJ-B', claimId: 'CLAIM-B' }),
      adj({ id: 'ADJ-C', claimId: 'CLAIM-C', status: 'UNRESOLVED' }),
    ];
    const agregado = agregarAdjudicacionesPorProposicion('P1', conUnoSinResolver, CLAIMS_P1);
    expect(agregado.status).toBe('UNRESOLVED');
    expect(agregado.status).not.toBe('SUPPORTED');
  });

  it('20. existe contradicción -> no SUPPORTED', () => {
    const conContradiccion = [
      adj({ id: 'ADJ-A', claimId: 'CLAIM-A' }),
      adj({ id: 'ADJ-B', claimId: 'CLAIM-B' }),
      adj({ id: 'ADJ-C', claimId: 'CLAIM-C', status: 'CONTRADICTS' }),
    ];
    expect(agregarAdjudicacionesPorProposicion('P1', conContradiccion, CLAIMS_P1).status).toBe('CONTRADICTED');
  });

  it('21. sin soporte -> NOT_SUPPORTED cuando la evidencia fue realmente examinada', () => {
    const todasExaminadasSinRespaldo = [
      adj({ id: 'ADJ-A', claimId: 'CLAIM-A', status: 'DOES_NOT_SUPPORT' }),
      adj({ id: 'ADJ-B', claimId: 'CLAIM-B', status: 'DOES_NOT_SUPPORT' }),
      adj({ id: 'ADJ-C', claimId: 'CLAIM-C', status: 'DOES_NOT_SUPPORT' }),
    ];
    expect(agregarAdjudicacionesPorProposicion('P1', todasExaminadasSinRespaldo, CLAIMS_P1).status).toBe('NOT_SUPPORTED');
  });

  it('22. evidencia insuficiente -> UNRESOLVED', () => {
    expect(agregarAdjudicacionesPorProposicion('P1', [], CLAIMS_P1).status).toBe('UNRESOLVED');
    expect(agregarSoportePorProposicion('P1', [], CLAIMS_P1).status).toBe('UNRESOLVED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER REGRESSION (23-27) — esProposicionCompletamenteRespaldada, fail-closed
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6.1 — esProposicionCompletamenteRespaldada regression (fail-closed)', () => {
  it('23. false ante contradicción (el hallazgo original de Cursor)', () => {
    const mixtas = [
      adj({ id: 'ADJ-A', claimId: 'CLAIM-A' }),
      adj({ id: 'ADJ-B', claimId: 'CLAIM-B' }),
      adj({ id: 'ADJ-C', claimId: 'CLAIM-C', status: 'CONTRADICTS' }),
    ];
    // ANTES de la corrección: un registro SUPPORTED aislado hubiera bastado,
    // ignorando por completo la contradicción de otro registro/adjudicación.
    expect(esProposicionCompletamenteRespaldada(P_VERIFICADA, CLAIMS_P1, mixtas)).toBe(false);
  });

  it('24. false cuando un claim requerido queda sin resolver', () => {
    const conUnoSinResolver = [
      adj({ id: 'ADJ-A', claimId: 'CLAIM-A' }),
      adj({ id: 'ADJ-B', claimId: 'CLAIM-B' }),
      // CLAIM-C nunca recibe adjudicación
    ];
    expect(esProposicionCompletamenteRespaldada(P_VERIFICADA, CLAIMS_P1, conUnoSinResolver)).toBe(false);
  });

  it('25. false con soporte parcial', () => {
    const parcial = [adj({ id: 'ADJ-A', claimId: 'CLAIM-A' }), adj({ id: 'ADJ-B', claimId: 'CLAIM-B' })];
    expect(esProposicionCompletamenteRespaldada(P_VERIFICADA, CLAIMS_P1, parcial)).toBe(false);
  });

  it('26. false cuando el soporte requerido carece de EvidenceSpan resoluble', () => {
    // Una adjudicación con evidenceSpan apuntando a una citación inexistente
    // nunca pasa validarSupportAdjudication -- por tanto no debe contarse
    // como soporte real en ningún fixture bien construido. Se documenta aquí
    // como invariante de construcción: el agregado NO valida internamente
    // cada adjudicación (esa es responsabilidad de validarSupportAdjudication,
    // por separado, invariante XXX) -- structural validation != adjudication.
    const sinEvidenciaResoluble = adj({ evidenceSpan: { citationTrustRecordId: 'CIT-NO-EXISTE' } });
    expect(validarSupportAdjudication(sinEvidenciaResoluble, [propuesta()], CLAIMS_P1, [CIT_FULL]).valido).toBe(false);
  });

  it('27. true solo cuando existe soporte completo, evidence-bound, y sin conflicto', () => {
    expect(esProposicionCompletamenteRespaldada(P_VERIFICADA, CLAIMS_P1, adjudicacionesCompletas())).toBe(true);
    for (const a of adjudicacionesCompletas()) {
      expect(validarSupportAdjudication(a, [P_VERIFICADA], CLAIMS_P1, [CIT_FULL]).valido).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE ROLE (28-30)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6.1 — Evidence role extensibility (no automatic classification)', () => {
  it('28. EvidenceSpan permanece extensible para evidenceRole', () => {
    const conRol = adj({ evidenceSpan: { citationTrustRecordId: 'CIT-FULL', evidenceRole: 'STATUTORY_TEXT' } });
    expect(validarSupportAdjudication(conRol, [propuesta()], CLAIMS_P1, [CIT_FULL]).valido).toBe(true);
  });

  it('29. ninguna clasificación automática de HOLDING/RATIO/etc -- el campo es siempre opcional y nunca se infiere', () => {
    const sinRol = adj(); // evidenceSpan sin evidenceRole
    expect(sinRol.evidenceSpan.evidenceRole).toBeUndefined();
    expect(validarSupportAdjudication(sinRol, [propuesta()], CLAIMS_P1, [CIT_FULL]).valido).toBe(true);
  });

  it('30. UNKNOWN es un valor seguro si el campo se declara', () => {
    const conUnknown = adj({ evidenceSpan: { citationTrustRecordId: 'CIT-FULL', evidenceRole: 'UNKNOWN' } });
    expect(validarSupportAdjudication(conUnknown, [propuesta()], CLAIMS_P1, [CIT_FULL]).valido).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARIES (31-38)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6.1 — Boundaries', () => {
  it('31. sin llamada a LLM', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/from ['"].*anthropic|from ['"].*openai/i);
      expect(contenido).not.toMatch(/\bmessages\.create\(|\bchat\.completions\.create\(/);
    }
  });

  it('32. sin llamada a embeddings', () => {
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    expect(contenidoValidators).not.toMatch(/\bembedQuery\(/);
  });

  it('33. sin inferencia de similitud semántica', () => {
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    expect(contenidoValidators).not.toMatch(/\bcosineSimilarity\(|\brerankearFragmentos\(/);
  });

  it('34. sin evaluación de autoridad', () => {
    expect((tiposLegales as Record<string, unknown>).AuthorityDecision).toBeUndefined();
  });

  it('35. sin evaluación temporal', () => {
    expect((tiposLegales as Record<string, unknown>).TemporalDecision).toBeUndefined();
  });

  it('36. sin ApplicableRule', () => {
    expect((tiposLegales as Record<string, unknown>).ApplicableRule).toBeUndefined();
  });

  it('37. sin inferencia de corrección legal', () => {
    const a = adj();
    expect(Object.keys(a)).not.toContain('legallyCorrect');
    expect(Object.keys(a)).not.toContain('isCorrect');
  });

  it('38. sin integración de ruta en tiempo de ejecución', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/from ['"]@\/app\/api\/chat/);
    }
  });
});
