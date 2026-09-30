import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  CanonicalLegalReference,
  Authority,
  AuthorityRelationship,
  TemporalLegalState,
  AmendmentEvent,
} from '@/lib/legal-reasoning/types';
import * as tiposLegales from '@/lib/legal-reasoning/types';
import {
  validarAuthority,
  validarAuthorityRelationship,
  validarTemporalLegalState,
  derivarVerificationStatusDesdeSenalLegado,
} from '@/lib/legal-reasoning/validators';

/**
 * LR-K7 — Authority + Temporal Qualification tests (2026-09-29). All
 * fixtures synthetic. No LLM, no embeddings, no source retrieval, no
 * ApplicableRule anywhere in this file.
 */

const FUENTE_CONSTITUCION: CanonicalLegalReference = { instrumento: 'CONSTITUCION', articulo: '16' };
const FUENTE_COMERCIO_X: CanonicalLegalReference = { instrumento: 'CODIGO_COMERCIO', articulo: '380' };
const FUENTE_COMERCIO_Y: CanonicalLegalReference = { instrumento: 'CODIGO_COMERCIO', articulo: '383' };
const FUENTE_DECRETO: CanonicalLegalReference = { instrumento: 'CODIGO_COMERCIO', articulo: 'Decreto 284-2013, Art. 37' };

function authority(overrides: Partial<Authority> = {}): Authority {
  return {
    sourceType: 'STATUTE',
    legalRole: 'PRIMARY_BINDING',
    jurisdiction: 'HN',
    provenance: FUENTE_COMERCIO_X,
    ...overrides,
  };
}

function relationship(overrides: Partial<AuthorityRelationship> = {}): AuthorityRelationship {
  return {
    source: FUENTE_DECRETO,
    target: FUENTE_COMERCIO_X,
    relation: 'REPEALS',
    verificationStatus: 'UNRESOLVED',
    evidence: [],
    ...overrides,
  };
}

function amendment(overrides: Partial<AmendmentEvent> = {}): AmendmentEvent {
  return {
    type: 'REFORMA',
    instrument: 'Decreto 284-2013',
    affectedProvision: 'Art. 380 Código de Comercio',
    evidence: [],
    verificationStatus: 'UNRESOLVED',
    ...overrides,
  };
}

function temporalState(overrides: Partial<TemporalLegalState> = {}): TemporalLegalState {
  return {
    legalStatus: 'VIGENTE',
    verificationStatus: 'UNRESOLVED',
    amendmentEvents: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORITY (1-8)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K7 — Authority', () => {
  it('1. Authority válido pasa la validación', () => {
    expect(validarAuthority(authority()).valido).toBe(true);
  });

  it('2. sourceType inválido se rechaza', () => {
    const a = authority({ sourceType: 'NOT_A_TYPE' as unknown as Authority['sourceType'] });
    expect(validarAuthority(a).valido).toBe(false);
  });

  it('3. legalRole inválido se rechaza', () => {
    const a = authority({ legalRole: 'NOT_A_ROLE' as unknown as Authority['legalRole'] });
    expect(validarAuthority(a).valido).toBe(false);
  });

  it('4. sin jurisdiction se rechaza', () => {
    const a = authority({ jurisdiction: '' });
    expect(validarAuthority(a).valido).toBe(false);
  });

  it('5. sin provenance se rechaza', () => {
    const a = authority({ provenance: undefined as unknown as CanonicalLegalReference });
    expect(validarAuthority(a).valido).toBe(false);
  });

  it('6. doctrina (ACADEMIC_DOCTRINE) no puede ser PRIMARY_BINDING -- invariante XLIII', () => {
    const a = authority({ sourceType: 'ACADEMIC_DOCTRINE', legalRole: 'PRIMARY_BINDING' });
    const r = validarAuthority(a);
    expect(r.valido).toBe(false);
    expect(r.errores.some((e) => e.includes('PRIMARY_BINDING'))).toBe(true);
  });

  it('7. doctrina (INSTITUTIONAL_COMMENTARY) tampoco puede ser PRIMARY_BINDING', () => {
    const a = authority({ sourceType: 'INSTITUTIONAL_COMMENTARY', legalRole: 'PRIMARY_BINDING' });
    expect(validarAuthority(a).valido).toBe(false);
  });

  it('8. doctrina puede ser PERSUASIVE o DISCOVERY_ONLY sin error', () => {
    expect(validarAuthority(authority({ sourceType: 'ACADEMIC_DOCTRINE', legalRole: 'PERSUASIVE' })).valido).toBe(true);
    expect(validarAuthority(authority({ sourceType: 'ACADEMIC_DOCTRINE', legalRole: 'DISCOVERY_ONLY' })).valido).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NO LEGAL EFFECT FROM SOURCE-TYPE LABEL ALONE (9-11)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K7 — no legal effect from label alone', () => {
  it('9. JURISPRUDENCE no fuerza automáticamente PRIMARY_BINDING', () => {
    const a = authority({ sourceType: 'JURISPRUDENCE', legalRole: 'INTERPRETIVE' });
    expect(validarAuthority(a).valido).toBe(true);
    expect(a.legalRole).not.toBe('PRIMARY_BINDING');
  });

  it('10. JURISPRUDENCE puede coexistir con cualquier legalRole no-doctrinal sin ser forzado', () => {
    for (const rol of ['PRIMARY_BINDING', 'INTERPRETIVE', 'PERSUASIVE', 'PRACTICE_GUIDANCE', 'DISCOVERY_ONLY'] as const) {
      expect(validarAuthority(authority({ sourceType: 'JURISPRUDENCE', legalRole: rol })).valido).toBe(true);
    }
  });

  it('11. ninguna función de este módulo deriva legalRole a partir de sourceType', () => {
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    expect(contenidoValidators).not.toMatch(/function\s+derivar\w*LegalRole/i);
    expect(contenidoValidators).not.toMatch(/function\s+derivePrevailingAuthority/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NO NUMERIC AUTHORITY HIERARCHY (12-14)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K7 — no numeric authority hierarchy', () => {
  it('12. Authority no declara ningún campo numérico de jerarquía', () => {
    expect(Object.keys(authority())).not.toContain('authorityLevel');
  });

  it('13. tipos no exportan authorityLevel en ninguna forma', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    expect(contenidoTypes).not.toMatch(/authorityLevel/i);
  });

  it('14. no existe ninguna función "ganadora automática" de jerarquía', () => {
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    expect(contenidoValidators).not.toMatch(/function\s+resolverJerarquia|function\s+ganaAutoridad|function\s+resolveWinner/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORITY RELATIONSHIP (15-24)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K7 — AuthorityRelationship', () => {
  it('15. relación UNRESOLVED sin evidencia es válida -- UNRESOLVED es legítimo, nunca un error', () => {
    expect(validarAuthorityRelationship(relationship()).valido).toBe(true);
  });

  it('16. relación VERIFIED sin evidencia se rechaza -- invariante XLII', () => {
    const r = relationship({ verificationStatus: 'VERIFIED', evidence: [] });
    const resultado = validarAuthorityRelationship(r);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('VERIFIED'))).toBe(true);
  });

  it('17. relación VERIFIED con evidencia es válida', () => {
    const r = relationship({ verificationStatus: 'VERIFIED', evidence: ['Decreto 284-2013, Art. 37, La Gaceta 33256'] });
    expect(validarAuthorityRelationship(r).valido).toBe(true);
  });

  it('18. relation inválida se rechaza', () => {
    const r = relationship({ relation: 'NOT_A_RELATION' as unknown as AuthorityRelationship['relation'] });
    expect(validarAuthorityRelationship(r).valido).toBe(false);
  });

  it('19. relation="UNKNOWN" es un valor legítimo, nunca rechazado', () => {
    expect(validarAuthorityRelationship(relationship({ relation: 'UNKNOWN' })).valido).toBe(true);
  });

  it('20. CONSTITUTIONAL_SUPREMACY es una relación explícita, no un valor por defecto', () => {
    const r = relationship({
      source: FUENTE_CONSTITUCION, target: FUENTE_COMERCIO_X,
      relation: 'CONSTITUTIONAL_SUPREMACY', verificationStatus: 'VERIFIED',
      evidence: ['Constitución de la República, Art. 16'],
    });
    expect(validarAuthorityRelationship(r).valido).toBe(true);
    // Nada en este módulo asigna CONSTITUTIONAL_SUPREMACY automáticamente --
    // el fixture la declara explícitamente, el validador solo la audita.
  });

  it('21. SPECIAL_OVER_GENERAL puede ser UNRESOLVED cuando la especialidad es discutida', () => {
    const r = relationship({ relation: 'SPECIAL_OVER_GENERAL', verificationStatus: 'UNRESOLVED', evidence: [] });
    expect(validarAuthorityRelationship(r).valido).toBe(true);
  });

  it('22. LATER_OVER_EARLIER puede ser UNRESOLVED cuando el timing es discutido', () => {
    const r = relationship({ relation: 'LATER_OVER_EARLIER', verificationStatus: 'UNRESOLVED', evidence: [] });
    expect(validarAuthorityRelationship(r).valido).toBe(true);
  });

  it('23. source sin instrumento/articulo se rechaza', () => {
    const r = relationship({ source: { instrumento: '', articulo: '' } as unknown as CanonicalLegalReference });
    expect(validarAuthorityRelationship(r).valido).toBe(false);
  });

  it('24. target sin instrumento/articulo se rechaza', () => {
    const r = relationship({ target: { instrumento: '', articulo: '' } as unknown as CanonicalLegalReference });
    expect(validarAuthorityRelationship(r).valido).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORAL LEGAL STATE / AMENDMENT EVENT (25-38)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K7 — TemporalLegalState / AmendmentEvent', () => {
  it('25. VIGENTE sin eventos es válido', () => {
    expect(validarTemporalLegalState(temporalState()).valido).toBe(true);
  });

  it('26. legalStatus y verificationStatus son independientes -- VIGENTE + UNRESOLVED es válido', () => {
    const s = temporalState({ legalStatus: 'VIGENTE', verificationStatus: 'UNRESOLVED' });
    expect(validarTemporalLegalState(s).valido).toBe(true);
  });

  it('27. legalStatus y verificationStatus son independientes -- DEROGADO backed + verificationStatus PARTIAL es válido', () => {
    const s = temporalState({
      legalStatus: 'DEROGADO',
      verificationStatus: 'PARTIAL',
      amendmentEvents: [amendment({ type: 'DEROGACION', verificationStatus: 'VERIFIED', evidence: ['Decreto 284-2013, Art. 37'] })],
    });
    expect(validarTemporalLegalState(s).valido).toBe(true);
  });

  it('28. un evento REFORMA puede coexistir con legalStatus VIGENTE', () => {
    const s = temporalState({
      legalStatus: 'VIGENTE',
      amendmentEvents: [amendment({ type: 'REFORMA', verificationStatus: 'VERIFIED', evidence: ['Decreto 284-2013, Art. 13'] })],
    });
    expect(validarTemporalLegalState(s).valido).toBe(true);
  });

  it('29. REFORMADO nunca es un valor de legalStatus -- el tipo no lo admite', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const seccionK7 = contenidoTypes.slice(contenidoTypes.indexOf('LR-K7'));
    const lineaTipo = seccionK7.match(/export type TemporalLegalStatus = [^;]+;/);
    expect(lineaTipo).not.toBeNull();
    expect(lineaTipo![0]).not.toMatch(/REFORMADO/);
  });

  it('30. DEROGADO sin ningún AmendmentEvent se rechaza -- debe ser explícito/evidence-backed', () => {
    const s = temporalState({ legalStatus: 'DEROGADO', amendmentEvents: [] });
    const r = validarTemporalLegalState(s);
    expect(r.valido).toBe(false);
    expect(r.errores.some((e) => e.includes('DEROGADO'))).toBe(true);
  });

  it('31. DEROGADO con evento DEROGACION pero sin evidencia se rechaza', () => {
    const s = temporalState({
      legalStatus: 'DEROGADO',
      amendmentEvents: [amendment({ type: 'DEROGACION', verificationStatus: 'VERIFIED', evidence: [] })],
    });
    expect(validarTemporalLegalState(s).valido).toBe(false);
  });

  it('32. DEROGADO con evento DEROGACION UNRESOLVED (no VERIFIED) se rechaza', () => {
    const s = temporalState({
      legalStatus: 'DEROGADO',
      amendmentEvents: [amendment({ type: 'DEROGACION', verificationStatus: 'UNRESOLVED', evidence: ['algo'] })],
    });
    expect(validarTemporalLegalState(s).valido).toBe(false);
  });

  it('33. DEROGADO con solo un evento REFORMA (no DEROGACION) se rechaza', () => {
    const s = temporalState({
      legalStatus: 'DEROGADO',
      amendmentEvents: [amendment({ type: 'REFORMA', verificationStatus: 'VERIFIED', evidence: ['algo'] })],
    });
    expect(validarTemporalLegalState(s).valido).toBe(false);
  });

  it('34. AmendmentEvent VERIFIED sin evidencia se rechaza -- invariante XLII', () => {
    const s = temporalState({
      legalStatus: 'VIGENTE',
      amendmentEvents: [amendment({ type: 'REFORMA', verificationStatus: 'VERIFIED', evidence: [] })],
    });
    expect(validarTemporalLegalState(s).valido).toBe(false);
  });

  it('35. AmendmentEvent sin instrument se rechaza', () => {
    const s = temporalState({ amendmentEvents: [amendment({ instrument: '' })] });
    expect(validarTemporalLegalState(s).valido).toBe(false);
  });

  it('36. AmendmentEvent sin affectedProvision se rechaza', () => {
    const s = temporalState({ amendmentEvents: [amendment({ affectedProvision: '' })] });
    expect(validarTemporalLegalState(s).valido).toBe(false);
  });

  it('37. AmendmentEvent.type inválido se rechaza', () => {
    const s = temporalState({ amendmentEvents: [amendment({ type: 'NOT_A_TYPE' as unknown as AmendmentEvent['type'] })] });
    expect(validarTemporalLegalState(s).valido).toBe(false);
  });

  it('38. legalStatus inválido se rechaza', () => {
    const s = temporalState({ legalStatus: 'NOT_A_STATUS' as unknown as TemporalLegalState['legalStatus'] });
    expect(validarTemporalLegalState(s).valido).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY VIGENCIA SIGNAL != VERIFIED (39-42)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K7 — legacy es_norma_vigente signal cannot auto-produce VERIFIED', () => {
  it('39. es_norma_vigente=true nunca produce VERIFIED', () => {
    expect(derivarVerificationStatusDesdeSenalLegado(true)).not.toBe('VERIFIED');
    expect(derivarVerificationStatusDesdeSenalLegado(true)).toBe('PARTIAL');
  });

  it('40. es_norma_vigente=false nunca produce VERIFIED (ni DEROGADO por sí solo)', () => {
    expect(derivarVerificationStatusDesdeSenalLegado(false)).not.toBe('VERIFIED');
    expect(derivarVerificationStatusDesdeSenalLegado(false)).toBe('UNRESOLVED');
  });

  it('41. ninguna otra función de este módulo acepta un parámetro booleano de vigencia legado', () => {
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    const ocurrencias = contenidoValidators.match(/esNormaVigente/g) ?? [];
    // Solo debe aparecer dentro de derivarVerificationStatusDesdeSenalLegado (firma + cuerpo).
    expect(ocurrencias.length).toBeLessThanOrEqual(2);
  });

  it('42. un TemporalLegalState construido a partir de la señal legado nunca puede declararse VERIFIED sin verificación independiente', () => {
    const estadoDerivado = derivarVerificationStatusDesdeSenalLegado(true);
    const s = temporalState({ legalStatus: 'VIGENTE', verificationStatus: estadoDerivado });
    expect(validarTemporalLegalState(s).valido).toBe(true);
    expect(s.verificationStatus).not.toBe('VERIFIED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE STATE != LEGAL VIGENCIA (43-44)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K7 — lifecycle state (V0-V5) cannot satisfy vigencia', () => {
  it('43. este módulo no importa ni referencia lib/ingesta-oficial ni V0-V5', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/ingesta-oficial/);
      expect(contenido).not.toMatch(/\bV[0-5]\b/);
    }
  });

  it('44. TemporalLegalState no tiene ningún campo de lifecycle de ingesta', () => {
    expect(Object.keys(temporalState())).not.toContain('lifecycleState');
    expect(Object.keys(temporalState())).not.toContain('vState');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORITY/TEMPORAL != APPLICABLE RULE (45-48)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K7 — Authority/Temporal qualification != ApplicableRule', () => {
  it('45. ApplicableRule no existe como valor en tiempo de ejecución (LR-K7 no lo implementa; LR-K8 lo agrega como alias de TIPO de RuleQualification, que no deja rastro en tiempo de ejecución -- ver docs/architecture/LR-1_LEGAL_REASONING.md §8)', () => {
    expect((tiposLegales as Record<string, unknown>).ApplicableRule).toBeUndefined();
  });

  it('46. sin Jurisprudence (§5.2 de la arquitectura, sigue solo-diseño)', () => {
    expect((tiposLegales as Record<string, unknown>).Jurisprudence).toBeUndefined();
  });

  it('47. sin llamada a LLM ni embeddings en la sección K7', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/from ['"].*anthropic|from ['"].*openai/i);
      expect(contenido).not.toMatch(/\bmessages\.create\(|\bchat\.completions\.create\(|\bembedQuery\(/);
    }
  });

  it('48. sin integración de ruta en tiempo de ejecución', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/from ['"]@\/app\/api\/chat/);
    }
  });
});
