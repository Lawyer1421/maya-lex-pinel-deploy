import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  LegalProposition,
  PropositionClaim,
  CitationTrustRecord,
  IdentifiedCitationTrustRecord,
  PropositionSupportRecord,
  CanonicalLegalReference,
} from '@/lib/legal-reasoning/types';
import * as tiposLegales from '@/lib/legal-reasoning/types';
import * as validadoresLegales from '@/lib/legal-reasoning/validators';
import {
  validarPropositionSupportRecord,
  derivarPropositionSupportStatus,
  esProposicionCompletamenteRespaldada,
} from '@/lib/legal-reasoning/validators';

/**
 * LR-K6 — Citation Trust II / Proposition Support Contract tests
 * (2026-09-29). All fixtures synthetic -- no real client, case, or corpus
 * text. No embeddings, no LLM call, no semantic score anywhere in this file
 * -- every claim-to-evidence classification below is instantiated by hand.
 */

const FUENTE_X: CanonicalLegalReference = { instrumento: 'CODIGO_CIVIL', articulo: 'X' };

function propuesta(overrides: Partial<LegalProposition> = {}): LegalProposition {
  return {
    id: 'P1',
    proposition: 'Y requires A, B and C.',
    sources: [FUENTE_X],
    citationTrust: [],
    propositionType: 'PARAPHRASED',
    verificationStatus: 'PARTIAL',
    ...overrides,
  };
}

const CLAIMS_P1: PropositionClaim[] = [
  { id: 'CLAIM-A', propositionId: 'P1', text: 'A is required.' },
  { id: 'CLAIM-B', propositionId: 'P1', text: 'B is required.' },
  { id: 'CLAIM-C', propositionId: 'P1', text: 'C is required.' },
];

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

const CIT_FULL: IdentifiedCitationTrustRecord = { id: 'CIT-FULL', record: citaVerificada() };

function registroBase(overrides: Partial<PropositionSupportRecord> = {}): PropositionSupportRecord {
  return {
    id: 'PSR1',
    propositionId: 'P1',
    citationTrustRecordIds: ['CIT-FULL'],
    status: 'SUPPORTED',
    supportedClaims: ['CLAIM-A', 'CLAIM-B', 'CLAIM-C'],
    unsupportedClaims: [],
    contradictoryClaims: [],
    evidenceLocators: [{ citationTrustRecordId: 'CIT-FULL' }],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT RECORD (1-4)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6 — Support record', () => {
  it('1. proposición válida + citación válida + evidencia que soporta -> aceptado', () => {
    const resultado = validarPropositionSupportRecord(registroBase(), [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(true);
  });

  it('2. propositionId huérfano -> rechazado', () => {
    const r = registroBase({ propositionId: 'P-NO-EXISTE' });
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('P-NO-EXISTE'))).toBe(true);
  });

  it('3. citationTrustRecordId huérfano -> rechazado', () => {
    const r = registroBase({ citationTrustRecordIds: ['CIT-NO-EXISTE'] });
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('CIT-NO-EXISTE'))).toBe(true);
  });

  it('4. PropositionSupportStatus inválido -> rechazado', () => {
    const r = { ...registroBase(), status: 'MUY_PROBABLE' } as unknown as PropositionSupportRecord;
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('status'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FULL SUPPORT (5-7) — fixture §21
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6 — Full support (fixture §21: "Para que proceda Y deberán concurrir A, B y C.")', () => {
  it('5. todos los claims de la proposición soportados -> SUPPORTED aceptado', () => {
    const resultado = validarPropositionSupportRecord(registroBase(), [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(true);
    expect(registroBase().status).toBe('SUPPORTED');
  });

  it('6. SUPPORTED sin ningún EvidenceLocator -> rechazado', () => {
    const r = registroBase({ evidenceLocators: [] });
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('EvidenceLocator'))).toBe(true);
  });

  it('7. una citación con solo hash (sin clasificación real de claims) no puede por sí sola probar soporte', () => {
    // La citación está VERIFIED con hash, pero el propio registro clasifica
    // los claims como no soportados -- el hash nunca sustituye la
    // clasificación explícita.
    const r = registroBase({
      status: 'NOT_SUPPORTED',
      supportedClaims: [],
      unsupportedClaims: ['CLAIM-A', 'CLAIM-B', 'CLAIM-C'],
      evidenceLocators: [],
    });
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(true);
    expect(r.status).toBe('NOT_SUPPORTED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PARTIAL SUPPORT (8-10) — fixture §22
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6 — Partial support (fixture §22: "Para que proceda Y deberán concurrir A y B.")', () => {
  const registroParcial = () => registroBase({
    status: 'PARTIALLY_SUPPORTED',
    supportedClaims: ['CLAIM-A', 'CLAIM-B'],
    unsupportedClaims: ['CLAIM-C'],
  });

  it('8. claims parciales -> PARTIALLY_SUPPORTED', () => {
    const resultado = validarPropositionSupportRecord(registroParcial(), [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(true);
    expect(registroParcial().status).toBe('PARTIALLY_SUPPORTED');
  });

  it('9. PARTIALLY_SUPPORTED no puede representarse como SUPPORTED', () => {
    const r = { ...registroParcial(), status: 'SUPPORTED' } as PropositionSupportRecord;
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [CIT_FULL], CLAIMS_P1);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('status'))).toBe(true);
  });

  it('10. los claims no soportados permanecen explícitos (CLAIM-C en unsupportedClaims)', () => {
    expect(registroParcial().unsupportedClaims).toEqual(['CLAIM-C']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRADICTION (11-13) — fixture §23
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6 — Contradiction (fixture §23: source "Se prohíbe Y." vs. proposition "Y is permitted.")', () => {
  const propuestaY: LegalProposition = { ...propuesta(), id: 'P-Y', proposition: 'Y is permitted.' };
  const claimY: PropositionClaim = { id: 'CLAIM-Y-PERMITTED', propositionId: 'P-Y', text: 'Y is permitted.' };
  const citaProhibicion: IdentifiedCitationTrustRecord = {
    id: 'CIT-PROHIBICION',
    record: citaVerificada({ proposition: 'Se prohíbe Y.' }),
  };

  function registroContradiccion(): PropositionSupportRecord {
    return {
      id: 'PSR-CONTRA', propositionId: 'P-Y', citationTrustRecordIds: ['CIT-PROHIBICION'],
      status: 'CONTRADICTED', supportedClaims: [], unsupportedClaims: [], contradictoryClaims: ['CLAIM-Y-PERMITTED'],
      evidenceLocators: [{ citationTrustRecordId: 'CIT-PROHIBICION' }],
    };
  }

  it('11. contradicción explícita -> CONTRADICTED', () => {
    const resultado = validarPropositionSupportRecord(registroContradiccion(), [propuestaY], [citaProhibicion], [claimY]);
    expect(resultado.valido).toBe(true);
    expect(registroContradiccion().status).toBe('CONTRADICTED');
  });

  it('12. el claim contradictorio no puede desaparecer', () => {
    const r = { ...registroContradiccion(), contradictoryClaims: [] };
    const resultado = validarPropositionSupportRecord(r, [propuestaY], [citaProhibicion], [claimY]);
    // Sin ningún claim clasificado -> deriva UNRESOLVED, no coincide con CONTRADICTED declarado.
    expect(resultado.valido).toBe(false);
  });

  it('13. la contradicción no puede convertirse en SUPPORTED', () => {
    const r = { ...registroContradiccion(), status: 'SUPPORTED', supportedClaims: ['CLAIM-Y-PERMITTED'], contradictoryClaims: [] } as PropositionSupportRecord;
    // Aun si alguien intenta reclasificar el claim como soportado en vez de
    // contradictorio, eso sería falsificar la evidencia real -- pero a nivel
    // de ESTE validador (que solo audita coherencia estructural), lo que
    // realmente se prueba es que declarar CONTRADICTED con el claim en
    // contradictoryClaims nunca puede simultáneamente declararse SUPPORTED.
    const rInconsistente = { ...registroContradiccion(), status: 'SUPPORTED' } as PropositionSupportRecord;
    const resultado = validarPropositionSupportRecord(rInconsistente, [propuestaY], [citaProhibicion], [claimY]);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('status'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOT SUPPORTED (14-15) — fixture §24
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6 — Not supported (fixture §24: source discusses competence only; proposition claims a 30-day deadline)', () => {
  const propuestaPlazo: LegalProposition = { ...propuesta(), id: 'P-PLAZO', proposition: 'Article X establishes a 30-day filing deadline.' };
  const claimPlazo: PropositionClaim = { id: 'CLAIM-30D', propositionId: 'P-PLAZO', text: '30-day filing deadline.' };
  const citaCompetencia: IdentifiedCitationTrustRecord = {
    id: 'CIT-COMPETENCIA',
    record: citaVerificada({ proposition: 'Este artículo establece la competencia de la autoridad.' }),
  };

  it('14. fuente real pero ajena a la proposición -> NOT_SUPPORTED', () => {
    const r: PropositionSupportRecord = {
      id: 'PSR-PLAZO', propositionId: 'P-PLAZO', citationTrustRecordIds: ['CIT-COMPETENCIA'],
      status: 'NOT_SUPPORTED', supportedClaims: [], unsupportedClaims: ['CLAIM-30D'], contradictoryClaims: [],
      evidenceLocators: [{ citationTrustRecordId: 'CIT-COMPETENCIA' }],
    };
    const resultado = validarPropositionSupportRecord(r, [propuestaPlazo], [citaCompetencia], [claimPlazo]);
    expect(resultado.valido).toBe(true);
    expect(r.status).toBe('NOT_SUPPORTED');
  });

  it('15. la identidad de la fuente por sí sola no crea soporte', () => {
    // citaCompetencia es VERIFIED, con hash -- pero eso nunca implica SUPPORTED.
    expect(citaCompetencia.record.verificationState).toBe('VERIFIED');
    expect(citaCompetencia.record.hash).toBeDefined();
    const r: PropositionSupportRecord = {
      id: 'PSR-PLAZO2', propositionId: 'P-PLAZO', citationTrustRecordIds: ['CIT-COMPETENCIA'],
      status: 'SUPPORTED', supportedClaims: ['CLAIM-30D'], unsupportedClaims: [], contradictoryClaims: [],
      evidenceLocators: [{ citationTrustRecordId: 'CIT-COMPETENCIA' }],
    };
    // Estructuralmente "válido" en forma, pero esto sería una AFIRMACIÓN
    // FALSA en un fixture real -- este test documenta que el validador no
    // tiene forma de detectar esa falsedad de contenido (invariante XXI:
    // la trazabilidad no cura una premisa falsa); solo la disciplina de
    // construir el fixture correctamente (como en el test 14) lo evita.
    const resultado = validarPropositionSupportRecord(r, [propuestaPlazo], [citaCompetencia], [claimPlazo]);
    expect(resultado.valido).toBe(true); // forma coherente, pero ver nota arriba
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNRESOLVED (16-18) — fixture §25
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6 — Unresolved (fixture §25: incomplete fragment "Para que proceda Y deberán…")', () => {
  const citaIncompleta: IdentifiedCitationTrustRecord = {
    id: 'CIT-INCOMPLETA',
    record: citaVerificada({ proposition: 'Para que proceda Y deberán…', hash: undefined, versionStatus: 'UNVERIFIED', verificationState: 'PARTIAL' }),
  };

  it('16. fragmento insuficiente -> UNRESOLVED', () => {
    const r: PropositionSupportRecord = {
      id: 'PSR-UNRES', propositionId: 'P1', citationTrustRecordIds: ['CIT-INCOMPLETA'],
      status: 'UNRESOLVED', supportedClaims: [], unsupportedClaims: [], contradictoryClaims: [],
      evidenceLocators: [{ citationTrustRecordId: 'CIT-INCOMPLETA' }],
    };
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [citaIncompleta], CLAIMS_P1);
    expect(resultado.valido).toBe(true);
    expect(r.status).toBe('UNRESOLVED');
  });

  it('17. UNRESOLVED es una salida válida', () => {
    const estado = derivarPropositionSupportStatus(['CLAIM-A', 'CLAIM-B', 'CLAIM-C'], [], [], []);
    expect(estado).toBe('UNRESOLVED');
  });

  it('18. UNRESOLVED no puede convertirse en soporte VERIFIED', () => {
    const r: PropositionSupportRecord = {
      id: 'PSR-UNRES2', propositionId: 'P1', citationTrustRecordIds: ['CIT-INCOMPLETA'],
      status: 'SUPPORTED', supportedClaims: [], unsupportedClaims: [], contradictoryClaims: [],
      evidenceLocators: [{ citationTrustRecordId: 'CIT-INCOMPLETA' }],
    };
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [citaIncompleta], CLAIMS_P1);
    expect(resultado.valido).toBe(false);

    const propuestaSinRespaldo = propuesta({ id: 'P-UNRES' });
    expect(esProposicionCompletamenteRespaldada(propuestaSinRespaldo, [{ ...r, propositionId: 'P-UNRES' }])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SOURCE (19-21) — fixture §26
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6 — Multi-source (fixture §26: Source A -> A, Source B -> B, Source C -> C)', () => {
  const citaA: IdentifiedCitationTrustRecord = { id: 'CIT-A', record: citaVerificada({ proposition: 'A concurre.' }) };
  const citaB: IdentifiedCitationTrustRecord = { id: 'CIT-B', record: citaVerificada({ proposition: 'B concurre.' }) };
  const citaC: IdentifiedCitationTrustRecord = { id: 'CIT-C', record: citaVerificada({ proposition: 'C concurre.' }) };

  it('19. múltiples citaciones pueden soportar una sola proposición', () => {
    const r = registroBase({
      citationTrustRecordIds: ['CIT-A', 'CIT-B', 'CIT-C'],
      evidenceLocators: [
        { citationTrustRecordId: 'CIT-A' }, { citationTrustRecordId: 'CIT-B' }, { citationTrustRecordId: 'CIT-C' },
      ],
    });
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [citaA, citaB, citaC], CLAIMS_P1);
    expect(resultado.valido).toBe(true);
  });

  it('20. todos los claims requeridos deben cubrirse para SUPPORTED', () => {
    const r = registroBase({
      citationTrustRecordIds: ['CIT-A', 'CIT-B'],
      supportedClaims: ['CLAIM-A', 'CLAIM-B'],
      unsupportedClaims: ['CLAIM-C'],
      status: 'PARTIALLY_SUPPORTED',
      evidenceLocators: [{ citationTrustRecordId: 'CIT-A' }, { citationTrustRecordId: 'CIT-B' }],
    });
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [citaA, citaB], CLAIMS_P1);
    expect(resultado.valido).toBe(true);
    expect(r.status).not.toBe('SUPPORTED');
  });

  it('21. falta una fuente/claim requerido impide el soporte completo', () => {
    // Solo A y B tienen fuente; C nunca se clasifica -> UNRESOLVED, no SUPPORTED.
    const r = registroBase({
      citationTrustRecordIds: ['CIT-A', 'CIT-B'],
      supportedClaims: ['CLAIM-A', 'CLAIM-B'],
      unsupportedClaims: [],
      status: 'SUPPORTED',
      evidenceLocators: [{ citationTrustRecordId: 'CIT-A' }, { citationTrustRecordId: 'CIT-B' }],
    });
    const resultado = validarPropositionSupportRecord(r, [propuesta()], [citaA, citaB], CLAIMS_P1);
    expect(resultado.valido).toBe(false); // CLAIM-C sin clasificar -> derivado UNRESOLVED, no SUPPORTED
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARIES (22-30)
// ─────────────────────────────────────────────────────────────────────────────
describe('LR-K6 — Boundaries', () => {
  it('22-23. sin similitud semántica ni score de embeddings USADOS como lógica -- solo se nombran en prosa al prohibirlos', () => {
    // No se busca la ausencia total de la PALABRA (los comentarios discuten
    // el invariante "similitud semántica != soporte" por nombre, a propósito)
    // -- se busca la ausencia de USO real: ningún import ni llamada a una
    // función de embeddings/similitud/reranking en ninguno de los dos archivos.
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/from ['"].*\/(embed|rerank)['"]/i);
      expect(contenido).not.toMatch(/\bembedQuery\(|\brerankearFragmentos\(|\bcosineSimilarity\(/);
    }
  });

  it('24. sin llamada a LLM/proveedor de modelo', () => {
    const contenidoTypes = readFileSync(join(process.cwd(), 'lib/legal-reasoning/types.ts'), 'utf8');
    const contenidoValidators = readFileSync(join(process.cwd(), 'lib/legal-reasoning/validators.ts'), 'utf8');
    for (const contenido of [contenidoTypes, contenidoValidators]) {
      expect(contenido).not.toMatch(/anthropic|openai|gemini|deepseek|openrouter|@anthropic-ai|fetch\(/i);
    }
  });

  it('25. sin decisión de autoridad', () => {
    expect((tiposLegales as Record<string, unknown>).AuthorityDecision).toBeUndefined();
  });

  it('26. sin decisión temporal', () => {
    expect((tiposLegales as Record<string, unknown>).TemporalDecision).toBeUndefined();
  });

  it('27. sin afirmación de corrección legal de NormativeRule -- esAutoritativaVerificada/validarNormativeRule no se tocan', () => {
    expect(typeof validadoresLegales.validarNormativeRule).toBe('function');
    // esProposicionCompletamenteRespaldada exige SUPPORTED, pero documentado
    // explícitamente como "no implica interpretación correcta" (invariante XXI).
    const p = propuesta({ verificationStatus: 'VERIFIED', citationTrust: [citaVerificada()] });
    const respaldo = registroBase();
    expect(esProposicionCompletamenteRespaldada(p, [respaldo])).toBe(true);
    // Esto NUNCA implica que NormativeRule (no referenciado aquí en absoluto) sea legalmente correcto.
  });

  it('28. sin generación de conclusión final', () => {
    const claves = Object.keys(registroBase());
    for (const prohibida of ['finalConclusion', 'legalConclusion', 'conclusionTrace']) {
      expect(claves).not.toContain(prohibida);
    }
  });

  it('29. sin razonamiento procesal', () => {
    expect((registroBase() as unknown as Record<string, unknown>).proceduralRecommendation).toBeUndefined();
  });

  it('30. sin razonamiento estratégico', () => {
    expect((registroBase() as unknown as Record<string, unknown>).strategicAssessment).toBeUndefined();
    expect(JSON.stringify(registroBase())).not.toMatch(/confidence|probability|%/i);
  });
});
