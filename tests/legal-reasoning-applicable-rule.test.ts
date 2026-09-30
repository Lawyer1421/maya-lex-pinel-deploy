import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  CanonicalLegalReference,
  NormativeRule,
  Authority,
  AuthorityRelationship,
  TemporalLegalState,
  RuleQualification,
  RuleQualificationBlocker,
  ApplicableRule,
} from '@/lib/legal-reasoning/types';
import * as tiposLegales from '@/lib/legal-reasoning/types';
import {
  validarRuleQualification,
  derivarRuleQualificationStatus,
} from '@/lib/legal-reasoning/validators';

/**
 * LR-K8 — RuleQualification / ApplicableRule tests (2026-09-29). All
 * fixtures synthetic. No LLM, no embeddings, no source retrieval, no
 * automatic winner engine anywhere in this file.
 */

const FUENTE_COMERCIO_X: CanonicalLegalReference = { instrumento: 'CODIGO_COMERCIO', articulo: '380' };
const FUENTE_COMERCIO_ESPECIAL: CanonicalLegalReference = { instrumento: 'CODIGO_COMERCIO', articulo: '380-A (ley especial)' };

const REGLA: NormativeRule = {
  id: 'RULE-1',
  propositionIds: [],
  sources: [FUENTE_COMERCIO_X],
  ruleType: 'REQUIREMENT',
  elements: [],
  exceptions: [],
  verificationStatus: 'VERIFIED',
};

function authority(overrides: Partial<Authority> = {}): Authority {
  return {
    sourceType: 'STATUTE', legalRole: 'PRIMARY_BINDING', jurisdiction: 'HN',
    provenance: FUENTE_COMERCIO_X, ...overrides,
  };
}

function temporalVigente(overrides: Partial<TemporalLegalState> = {}): TemporalLegalState {
  return { legalStatus: 'VIGENTE', verificationStatus: 'VERIFIED', amendmentEvents: [], ...overrides };
}

function relacion(overrides: Partial<AuthorityRelationship> = {}): AuthorityRelationship {
  return {
    source: FUENTE_COMERCIO_ESPECIAL, target: FUENTE_COMERCIO_X,
    relation: 'SPECIAL_OVER_GENERAL', verificationStatus: 'VERIFIED',
    evidence: ['Ley especial de comercio, Art. 1'], ...overrides,
  };
}

function qualification(overrides: Partial<RuleQualification> = {}): RuleQualification {
  return {
    id: 'RQ-1', ruleId: 'RULE-1', authority: authority(), temporalState: temporalVigente(),
    relationships: [], qualificationStatus: 'APPLICABLE', blockers: [], ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICABLE — vigente + verified temporal + no blocker (1-4)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — APPLICABLE baseline', () => {
  it('1. VIGENTE + VERIFIED + sin blockers deriva APPLICABLE', () => {
    expect(derivarRuleQualificationStatus(authority(), temporalVigente(), [], [])).toBe('APPLICABLE');
  });

  it('2. RuleQualification válida con status=APPLICABLE pasa la validación', () => {
    expect(validarRuleQualification(qualification(), [REGLA]).valido).toBe(true);
  });

  it('3. un evento REFORMA en el TemporalLegalState no impide APPLICABLE -- invariante L', () => {
    const temporal = temporalVigente({
      amendmentEvents: [{
        type: 'REFORMA', instrument: 'Decreto 284-2013', affectedProvision: 'Art. 380 Código de Comercio',
        evidence: ['Decreto 284-2013, Art. 13'], verificationStatus: 'VERIFIED',
      }],
    });
    expect(derivarRuleQualificationStatus(authority(), temporal, [], [])).toBe('APPLICABLE');
    expect(validarRuleQualification(qualification({ temporalState: temporal }), [REGLA]).valido).toBe(true);
  });

  it('4. APPLICABLE con algún blocker declarado se rechaza', () => {
    const blockers: RuleQualificationBlocker[] = [{ type: 'OTHER', description: 'nota irrelevante' }];
    const q = qualification({ qualificationStatus: 'APPLICABLE', blockers });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DEROGADO CANNOT QUALIFY APPLICABLE (5-8)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — DEROGADO cannot qualify APPLICABLE (invariant XLVI)', () => {
  const temporalDerogado = temporalVigente({
    legalStatus: 'DEROGADO',
    amendmentEvents: [{
      type: 'DEROGACION', instrument: 'Decreto 284-2013', affectedProvision: 'Art. 380 Código de Comercio',
      evidence: ['Decreto 284-2013, Art. 37'], verificationStatus: 'VERIFIED',
    }],
  });

  it('5. DEROGADO deriva DISPLACED, nunca APPLICABLE', () => {
    expect(derivarRuleQualificationStatus(authority(), temporalDerogado, [], [])).toBe('DISPLACED');
  });

  it('6. RuleQualification con temporalState DEROGADO y qualificationStatus=APPLICABLE se rechaza', () => {
    const q = qualification({ temporalState: temporalDerogado, qualificationStatus: 'APPLICABLE', blockers: [] });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('7. RuleQualification con temporalState DEROGADO y qualificationStatus=DISPLACED (con blocker) es válida', () => {
    const q = qualification({
      temporalState: temporalDerogado, qualificationStatus: 'DISPLACED',
      blockers: [{ type: 'RULE_NOT_VIGENTE', description: 'Derogado por Decreto 284-2013, Art. 37' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(true);
  });

  it('8. DEROGADO gana sobre cualquier blocker LIMITING_RELATIONSHIP declarado -- sigue siendo DISPLACED', () => {
    const rel = relacion();
    const status = derivarRuleQualificationStatus(authority(), temporalDerogado, [rel], [
      { type: 'LIMITING_RELATIONSHIP', relationship: rel, description: 'limitación por especialidad' },
    ]);
    expect(status).toBe('DISPLACED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORAL UNRESOLVED PREVENTS FULL APPLICABILITY (9-12)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — temporal UNRESOLVED prevents full applicability (invariant XLVII)', () => {
  it('9. verificationStatus="UNRESOLVED" deriva UNRESOLVED, nunca APPLICABLE', () => {
    const temporal = temporalVigente({ verificationStatus: 'UNRESOLVED' });
    expect(derivarRuleQualificationStatus(authority(), temporal, [], [])).toBe('UNRESOLVED');
  });

  it('10. RuleQualification con verificationStatus UNRESOLVED y qualificationStatus=APPLICABLE se rechaza', () => {
    const temporal = temporalVigente({ verificationStatus: 'UNRESOLVED' });
    const q = qualification({ temporalState: temporal, qualificationStatus: 'APPLICABLE', blockers: [] });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('11. legalStatus="UNKNOWN" también deriva UNRESOLVED', () => {
    const temporal = temporalVigente({ legalStatus: 'UNKNOWN' });
    expect(derivarRuleQualificationStatus(authority(), temporal, [], [])).toBe('UNRESOLVED');
  });

  it('12. RuleQualification UNRESOLVED con blocker explícito es válida', () => {
    const temporal = temporalVigente({ verificationStatus: 'UNRESOLVED' });
    const q = qualification({
      temporalState: temporal, qualificationStatus: 'UNRESOLVED',
      blockers: [{ type: 'TEMPORAL_VERIFICATION_UNRESOLVED', description: 'vigencia sin confirmar' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LR-K8.1 — AUTHORITY ELIGIBILITY FOR FULL APPLICABILITY (12a-12h)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8.1 — non-PRIMARY_BINDING authority cannot qualify APPLICABLE (invariant LII)', () => {
  it('12a. legalRole="INTERPRETIVE" deriva LIMITED, nunca APPLICABLE', () => {
    expect(derivarRuleQualificationStatus(authority({ legalRole: 'INTERPRETIVE' }), temporalVigente(), [], [])).toBe('LIMITED');
  });

  it('12b. legalRole="PERSUASIVE" deriva LIMITED', () => {
    expect(derivarRuleQualificationStatus(authority({ legalRole: 'PERSUASIVE' }), temporalVigente(), [], [])).toBe('LIMITED');
  });

  it('12c. legalRole="PRACTICE_GUIDANCE" deriva LIMITED', () => {
    expect(derivarRuleQualificationStatus(authority({ legalRole: 'PRACTICE_GUIDANCE' }), temporalVigente(), [], [])).toBe('LIMITED');
  });

  it('12d. legalRole="DISCOVERY_ONLY" deriva LIMITED, nunca UNRESOLVED (es un hecho conocido sobre la fuente, no una laguna evidentiaria)', () => {
    expect(derivarRuleQualificationStatus(authority({ legalRole: 'DISCOVERY_ONLY' }), temporalVigente(), [], [])).toBe('LIMITED');
  });

  it('12e. legalRole="PRIMARY_BINDING" es el único que sostiene APPLICABLE (junto con temporal VIGENTE+VERIFIED y sin blockers)', () => {
    expect(derivarRuleQualificationStatus(authority({ legalRole: 'PRIMARY_BINDING' }), temporalVigente(), [], [])).toBe('APPLICABLE');
  });

  it('12f. RuleQualification con legalRole no primario y qualificationStatus=APPLICABLE se rechaza', () => {
    const q = qualification({ authority: authority({ legalRole: 'INTERPRETIVE' }), qualificationStatus: 'APPLICABLE', blockers: [] });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('12g. RuleQualification con legalRole no primario y qualificationStatus=LIMITED (con blocker AUTHORITY_NOT_PRIMARY_BINDING) es válida', () => {
    const q = qualification({
      authority: authority({ legalRole: 'PERSUASIVE' }), qualificationStatus: 'LIMITED',
      blockers: [{ type: 'AUTHORITY_NOT_PRIMARY_BINDING', description: 'fuente persuasiva, no vinculante primaria' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(true);
  });

  it('12h. legalRole no primario gana sobre DEROGADO no aplica -- DEROGADO sigue siendo DISPLACED, nunca LIMITED, sin importar la autoridad', () => {
    const temporalDerogado = temporalVigente({
      legalStatus: 'DEROGADO',
      amendmentEvents: [{
        type: 'DEROGACION', instrument: 'Decreto X', affectedProvision: 'Art. 1',
        evidence: ['evidencia'], verificationStatus: 'VERIFIED',
      }],
    });
    const status = derivarRuleQualificationStatus(authority({ legalRole: 'INTERPRETIVE' }), temporalDerogado, [], []);
    expect(status).toBe('DISPLACED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LR-K8.1 — TEMPORAL VERIFICATION SUFFICIENCY FOR FULL APPLICABILITY (12i-12n)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8.1 — PARTIAL temporal verification cannot qualify APPLICABLE (invariant LIII)', () => {
  it('12i. verificationStatus="PARTIAL" deriva LIMITED, nunca APPLICABLE', () => {
    const temporal = temporalVigente({ verificationStatus: 'PARTIAL' });
    expect(derivarRuleQualificationStatus(authority(), temporal, [], [])).toBe('LIMITED');
  });

  it('12j. verificationStatus="UNRESOLVED" permanece UNRESOLVED -- no se confunde con PARTIAL/LIMITED', () => {
    const temporal = temporalVigente({ verificationStatus: 'UNRESOLVED' });
    expect(derivarRuleQualificationStatus(authority(), temporal, [], [])).toBe('UNRESOLVED');
  });

  it('12k. solo verificationStatus="VERIFIED" sostiene APPLICABLE', () => {
    const temporal = temporalVigente({ verificationStatus: 'VERIFIED' });
    expect(derivarRuleQualificationStatus(authority(), temporal, [], [])).toBe('APPLICABLE');
  });

  it('12l. RuleQualification con verificationStatus PARTIAL y qualificationStatus=APPLICABLE se rechaza', () => {
    const temporal = temporalVigente({ verificationStatus: 'PARTIAL' });
    const q = qualification({ temporalState: temporal, qualificationStatus: 'APPLICABLE', blockers: [] });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('12m. RuleQualification con verificationStatus PARTIAL y qualificationStatus=LIMITED (con blocker TEMPORAL_VERIFICATION_PARTIAL) es válida', () => {
    const temporal = temporalVigente({ verificationStatus: 'PARTIAL' });
    const q = qualification({
      temporalState: temporal, qualificationStatus: 'LIMITED',
      blockers: [{ type: 'TEMPORAL_VERIFICATION_PARTIAL', description: 'vigencia confirmada parcialmente, no al estándar de aserción profesional' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(true);
  });

  it('12n. un evento REFORMA junto a verificationStatus PARTIAL no cambia nada -- sigue siendo LIMITED por PARTIAL, no por el evento (invariante L)', () => {
    const temporal = temporalVigente({
      verificationStatus: 'PARTIAL',
      amendmentEvents: [{
        type: 'REFORMA', instrument: 'Decreto 284-2013', affectedProvision: 'Art. 380 Código de Comercio',
        evidence: ['Decreto 284-2013, Art. 13'], verificationStatus: 'VERIFIED',
      }],
    });
    expect(derivarRuleQualificationStatus(authority(), temporal, [], [])).toBe('LIMITED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNVERIFIED RELATIONSHIP CANNOT DECIDE DISPLACEMENT (13-18)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — unverified/UNKNOWN relationship cannot decide displacement (invariant XLVIII)', () => {
  it('13. relación SPECIAL_OVER_GENERAL sin verificar no produce DISPLACED', () => {
    const rel = relacion({ verificationStatus: 'UNRESOLVED', evidence: [] });
    const status = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], [
      { type: 'DISPLACING_RELATIONSHIP', relationship: rel, description: 'candidato sin verificar' },
    ]);
    expect(status).toBe('UNRESOLVED');
  });

  it('14. relación relation="UNKNOWN" verificada tampoco produce DISPLACED', () => {
    const rel = relacion({ relation: 'UNKNOWN', verificationStatus: 'VERIFIED', evidence: ['algo'] });
    const status = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], [
      { type: 'DISPLACING_RELATIONSHIP', relationship: rel, description: 'relación sin resolver' },
    ]);
    expect(status).toBe('UNRESOLVED');
  });

  it('15. RuleQualification que declara DISPLACED con relación sin verificar se rechaza', () => {
    const rel = relacion({ verificationStatus: 'UNRESOLVED', evidence: [] });
    const q = qualification({
      relationships: [rel], qualificationStatus: 'DISPLACED',
      blockers: [{ type: 'DISPLACING_RELATIONSHIP', relationship: rel, description: 'no debería bastar' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('16. blocker *_RELATIONSHIP sin relationship se rechaza -- invariante XLIX', () => {
    const q = qualification({
      qualificationStatus: 'UNRESOLVED',
      blockers: [{ type: 'DISPLACING_RELATIONSHIP', description: 'sin relationship adjunta' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('17. blocker que referencia una relationship NO declarada en relationships[] se rechaza -- no se puede tomar prestada', () => {
    const relNoDeclarada = relacion();
    const q = qualification({
      relationships: [], qualificationStatus: 'UNRESOLVED',
      blockers: [{ type: 'DISPLACING_RELATIONSHIP', relationship: relNoDeclarada, description: 'relación no declarada' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('18. relación no utilizable puede documentarse con RELATIONSHIP_UNVERIFIED_OR_UNKNOWN y aun así derivar UNRESOLVED de forma válida', () => {
    const rel = relacion({ verificationStatus: 'PARTIAL', evidence: [] });
    const q = qualification({
      relationships: [rel], qualificationStatus: 'UNRESOLVED',
      blockers: [{ type: 'RELATIONSHIP_UNVERIFIED_OR_UNKNOWN', relationship: rel, description: 'relación candidata, aún sin verificar' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SPECIAL_OVER_GENERAL / LATER_OVER_EARLIER -- explicit fixture decides (19-26)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — verified relations qualify only from explicit, caller-classified fixture', () => {
  it('19. SPECIAL_OVER_GENERAL verificada clasificada como DISPLACING_RELATIONSHIP produce DISPLACED', () => {
    const rel = relacion({ relation: 'SPECIAL_OVER_GENERAL', verificationStatus: 'VERIFIED' });
    const status = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], [
      { type: 'DISPLACING_RELATIONSHIP', relationship: rel, description: 'la ley especial desplaza por completo' },
    ]);
    expect(status).toBe('DISPLACED');
  });

  it('20. la MISMA relación SPECIAL_OVER_GENERAL verificada clasificada como LIMITING_RELATIONSHIP produce LIMITED, nunca DISPLACED', () => {
    const rel = relacion({ relation: 'SPECIAL_OVER_GENERAL', verificationStatus: 'VERIFIED' });
    const status = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], [
      { type: 'LIMITING_RELATIONSHIP', relationship: rel, description: 'la ley especial solo limita el alcance' },
    ]);
    expect(status).toBe('LIMITED');
  });

  it('21. el TIPO de relación (SPECIAL_OVER_GENERAL) nunca decide DISPLACED/LIMITED por sí solo -- lo decide el blocker que el fixture declaró (invariante XLV)', () => {
    const rel = relacion({ relation: 'SPECIAL_OVER_GENERAL', verificationStatus: 'VERIFIED' });
    const comoDesplazante = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], [
      { type: 'DISPLACING_RELATIONSHIP', relationship: rel, description: 'a' },
    ]);
    const comoLimitante = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], [
      { type: 'LIMITING_RELATIONSHIP', relationship: rel, description: 'b' },
    ]);
    expect(comoDesplazante).not.toBe(comoLimitante);
  });

  it('22. LATER_OVER_EARLIER sin ninguna relación declarada nunca produce DISPLACED/LIMITED', () => {
    const status = derivarRuleQualificationStatus(authority(), temporalVigente(), [], []);
    expect(status).toBe('APPLICABLE');
  });

  it('23. LATER_OVER_EARLIER verificada y explícitamente clasificada como DISPLACING_RELATIONSHIP produce DISPLACED', () => {
    const rel = relacion({ relation: 'LATER_OVER_EARLIER', verificationStatus: 'VERIFIED' });
    const status = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], [
      { type: 'DISPLACING_RELATIONSHIP', relationship: rel, description: 'la norma posterior desplaza' },
    ]);
    expect(status).toBe('DISPLACED');
  });

  it('24. CONSTITUTIONAL_SUPREMACY sin verificar no puede decidir nada -- deriva UNRESOLVED', () => {
    const rel = relacion({ relation: 'CONSTITUTIONAL_SUPREMACY', verificationStatus: 'UNRESOLVED', evidence: [] });
    const status = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], [
      { type: 'DISPLACING_RELATIONSHIP', relationship: rel, description: 'inconstitucionalidad alegada, no confirmada' },
    ]);
    expect(status).toBe('UNRESOLVED');
  });

  it('25. relación no clasificada en ningún blocker no afecta el resultado -- se ignora, no se infiere', () => {
    const rel = relacion();
    const status = derivarRuleQualificationStatus(authority(), temporalVigente(), [rel], []);
    expect(status).toBe('APPLICABLE');
  });

  it('26. RuleQualification válida con status=LIMITED y relación verificada explícita', () => {
    const rel = relacion({ relation: 'SPECIAL_OVER_GENERAL', verificationStatus: 'VERIFIED' });
    const q = qualification({
      relationships: [rel], qualificationStatus: 'LIMITED',
      blockers: [{ type: 'LIMITING_RELATIONSHIP', relationship: rel, description: 'alcance limitado por ley especial' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL BOUNDARIES (27-32)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — structural boundaries', () => {
  it('27. ruleId huérfano se rechaza', () => {
    const q = qualification({ ruleId: 'RULE-NO-EXISTE' });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('28. Authority internamente inválida invalida la RuleQualification completa', () => {
    const q = qualification({ authority: authority({ legalRole: 'NOT_A_ROLE' as unknown as Authority['legalRole'] }) });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('29. TemporalLegalState internamente inválido invalida la RuleQualification completa', () => {
    const q = qualification({ temporalState: temporalVigente({ legalStatus: 'NOT_A_STATUS' as unknown as TemporalLegalState['legalStatus'] }) });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('30. AuthorityRelationship internamente inválida en relationships[] invalida la RuleQualification completa', () => {
    const relInvalida = relacion({ relation: 'NOT_A_RELATION' as unknown as AuthorityRelationship['relation'] });
    const q = qualification({ relationships: [relInvalida] });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('31. qualificationStatus inválido se rechaza', () => {
    const q = qualification({ qualificationStatus: 'NOT_A_STATUS' as unknown as RuleQualification['qualificationStatus'] });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });

  it('32. blocker.type inválido se rechaza', () => {
    const q = qualification({
      qualificationStatus: 'UNRESOLVED',
      blockers: [{ type: 'NOT_A_TYPE' as unknown as RuleQualificationBlocker['type'], description: 'x' }],
    });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NO NUMERIC HIERARCHY / NO COURT-LABEL INFERENCE / NO SILENT WINNER (33-38)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — no numeric hierarchy, no court-label inference, no silent winner', () => {
  it('33. RuleQualification no declara ningún campo numérico de jerarquía', () => {
    expect(Object.keys(qualification())).not.toContain('authorityLevel');
    expect(Object.keys(qualification())).not.toContain('priority');
    expect(Object.keys(qualification())).not.toContain('rank');
  });

  it('34. tipos no exportan ningún campo numérico de jerarquía en la sección K8', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const seccionK8 = contenidoTypes.slice(contenidoTypes.indexOf('LR-K8'));
    expect(seccionK8).not.toMatch(/authorityLevel|priority\s*:\s*number|rank\s*:\s*number/i);
  });

  it('35a. sourceType="JURISPRUDENCE" con legalRole="PRIMARY_BINDING" explícito no impide APPLICABLE por sí solo (el sourceType no decide, el legalRole sí -- invariante LII)', () => {
    const q = qualification({ authority: authority({ sourceType: 'JURISPRUDENCE', legalRole: 'PRIMARY_BINDING' }) });
    expect(validarRuleQualification(q, [REGLA]).valido).toBe(true);
    expect(q.qualificationStatus).toBe('APPLICABLE');
  });

  it('35b. el mismo resultado (LIMITED) ocurre con legalRole="INTERPRETIVE" sin importar el sourceType -- STATUTE y JURISPRUDENCE se comportan igual (invariante LII decide por legalRole, nunca por sourceType)', () => {
    const estadoStatute = derivarRuleQualificationStatus(authority({ sourceType: 'STATUTE', legalRole: 'INTERPRETIVE' }), temporalVigente(), [], []);
    const estadoJurisprudencia = derivarRuleQualificationStatus(authority({ sourceType: 'JURISPRUDENCE', legalRole: 'INTERPRETIVE' }), temporalVigente(), [], []);
    expect(estadoStatute).toBe('LIMITED');
    expect(estadoJurisprudencia).toBe('LIMITED');
  });

  it('36. derivarRuleQualificationStatus nunca lee Authority.sourceType', () => {
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    const inicio = contenidoValidators.indexOf('export function derivarRuleQualificationStatus');
    const fin = contenidoValidators.indexOf('\n}', inicio);
    const cuerpo = contenidoValidators.slice(inicio, fin);
    expect(cuerpo).not.toMatch(/sourceType/);
  });

  it('37. no existe ninguna función "motor ganador automático" -- invariante XLV', () => {
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    expect(contenidoValidators).not.toMatch(/function\s+resolverReglaAplicable|function\s+seleccionarReglaGanadora|function\s+resolveWinningRule/i);
  });

  it('38. ninguna función deriva DISPLACED/LIMITED únicamente a partir del literal del AuthorityRelationType -- siempre depende del blocker que el llamador clasificó', () => {
    const rel1 = relacion({ relation: 'SPECIAL_OVER_GENERAL' });
    const rel2 = relacion({ relation: 'LATER_OVER_EARLIER' });
    // Sin ningún blocker que las clasifique, ninguna de las dos decide nada por sí sola.
    expect(derivarRuleQualificationStatus(authority(), temporalVigente(), [rel1, rel2], [])).toBe('APPLICABLE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RULE QUALIFICATION != SUBSUMPTION != LEGAL CONCLUSION (39-42)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — RuleQualification != Subsumption != LegalConclusion', () => {
  it('39. RuleQualification no tiene campos de Subsumption', () => {
    const claves = Object.keys(qualification());
    expect(claves).not.toContain('elementAssessments');
    expect(claves).not.toContain('exceptionAssessments');
    expect(claves).not.toContain('analysisStatus');
  });

  it('40. RuleQualification no tiene campos de ConclusionTrace', () => {
    const claves = Object.keys(qualification());
    expect(claves).not.toContain('subsumptionIds');
    expect(claves).not.toContain('uncertainty');
    expect(claves).not.toContain('conclusionType');
  });

  it('41. ApplicableRule es un alias de tipo de RuleQualification -- misma forma en tiempo de compilación', () => {
    const q: ApplicableRule = qualification();
    const r: RuleQualification = q;
    expect(r.id).toBe(q.id);
  });

  it('42. ConclusionUncertainty.authorityStatus/temporalStatus siguen NOT_EVALUATED -- sin cambios de esta fase', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    expect(contenidoTypes).toMatch(/authorityStatus: EngineNotYetImplementedStatus/);
    expect(contenidoTypes).toMatch(/temporalStatus: EngineNotYetImplementedStatus/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARIES: no LLM, no embeddings, no runtime wiring (43-46)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K8 — Boundaries', () => {
  it('43. sin llamada a LLM ni embeddings', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/from ['"].*anthropic|from ['"].*openai/i);
      expect(contenido).not.toMatch(/\bmessages\.create\(|\bchat\.completions\.create\(|\bembedQuery\(/);
    }
  });

  it('44. sin integración de ruta en tiempo de ejecución', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/from ['"]@\/app\/api\/chat/);
    }
  });

  it('45. sin Jurisprudence (sigue solo-diseño)', () => {
    expect((tiposLegales as Record<string, unknown>).Jurisprudence).toBeUndefined();
  });

  it('46. este módulo no importa ni referencia lib/ingesta-oficial ni etiquetas de ciclo de vida de la ingesta', () => {
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    expect(contenidoValidators).not.toMatch(/ingesta-oficial/);
  });
});
