import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generarCandidatos, senalDeFeedback, senalesDesdeRegistro, type RegistroObservable } from '@/lib/legal-os/learning';
import { ejecutarLegalOsShadow } from '@/lib/legal-os/shadow';

const AT = '2026-10-23T12:00:00.000Z';
const R = (o: Partial<RegistroObservable> = {}): RegistroObservable => ({
  query_id: 'q1', jurisdiction: { country: 'HN' }, matter: 'penal', evidence_status: 'EVIDENCE_PRESENT', abstention: { abstained: false, reason: null },
  citation_validation: { rejected: 0 }, latency_ms: 10, estimated_cost_usd: 0.0001, question: { sha256_16: 'abcdef0123456789' }, production_decision: 'ANSWER', ...o,
});
const kinds = (r: RegistroObservable) => senalesDesdeRegistro(r, AT).map((s) => s.id.split(':')[1]);

describe('señales desde el registro del shadow', () => {
  it('una consulta sana no genera señales', () => expect(kinds(R())).toEqual([]));
  it('RETRIEVAL_MISS + ABSTENTION cuando no hay evidencia', () => expect(kinds(R({ abstention: { abstained: true, reason: 'SIN_EVIDENCIA' } }))).toEqual(['ABSTENTION', 'RETRIEVAL_MISS']));
  it('MISSING_INSTRUMENT cuando el instrumento nombrado no tiene evidencia', () => {
    const s = senalesDesdeRegistro(R({ abstention: { abstained: true, reason: 'INSTRUMENTO_SIN_EVIDENCIA' } }), AT);
    expect(s.map((x) => x.kind)).toEqual(['ABSTENTION', 'CORPUS_GAP']);
    expect(s[1].reasonCode).toBe('MISSING_INSTRUMENT');
  });
  it('INVALID_CITATION, LOW_EVIDENCE, HIGH_LATENCY y HIGH_COST', () => {
    expect(kinds(R({ citation_validation: { rejected: 2 } }))).toEqual(['INVALID_CITATION']);
    expect(kinds(R({ evidence_status: 'EVIDENCE_VALIDITY_UNVERIFIED' }))).toEqual(['LOW_EVIDENCE']);
    expect(kinds(R({ latency_ms: 20_000 }))).toEqual(['HIGH_LATENCY']);
    expect(kinds(R({ estimated_cost_usd: 0.5 }))).toEqual(['HIGH_COST']);
  });
  it('USER_NEGATIVE_FEEDBACK', () => expect(senalDeFeedback({ queryId: 'q1', queryHash: 'abcdef0123456789', country: 'HN', rating: 'DOWN', at: AT })).toMatchObject({ kind: 'USER_FEEDBACK', feedback: 'DOWN', reasonCode: 'USER_NEGATIVE_FEEDBACK' }));
  it('las señales no llevan texto libre: solo huella y códigos cerrados', () => {
    const s = senalesDesdeRegistro(R({ abstention: { abstained: true, reason: 'SIN_EVIDENCIA' } }), AT);
    for (const x of s) expect(JSON.stringify(x)).toMatch(/^[\x20-\x7e]*$/);
  });
});

describe('candidatos de mejora: observar y proponer, nunca aplicar', () => {
  it('ordena por prioridad y cada propuesta es PENDING_CLO_REVIEW sin pregunta ni respuesta esperada', () => {
    const c = generarCandidatos([...senalesDesdeRegistro(R({ abstention: { abstained: true, reason: 'SIN_EVIDENCIA' } }), AT), ...senalesDesdeRegistro(R({ query_id: 'q2', citation_validation: { rejected: 1 } }), AT)]);
    expect(c[0].clasificacion.priority).toBe('P0');
    for (const x of c) {
      expect(x.etapa).toBe('PROPOSE');
      expect(x.propuesta).toMatchObject({ review_state: 'PENDING_CLO_REVIEW', question: null, expected: null });
    }
  });
  it('no existe ninguna función exportada que mute prompts, corpus, validez, skills o política de recuperación', async () => {
    const m = await import('@/lib/legal-os/learning');
    expect(Object.keys(m).filter((k) => /(aplicar|apply|mutar|mutate|desplegar|deploy|promover|promote|actualizar|update|escribir|write)/i.test(k))).toEqual([]);
    const t = readFileSync(join(__dirname, '..', 'lib', 'legal-os', 'learning', 'from-shadow.ts'), 'utf8');
    expect(t).not.toMatch(/node:fs|fetch\(|process\.env|supabase|ai-gateway/i);
  });
});

describe('cableado en el shadow', () => {
  it('el shadow emite señales para una abstención y un fallo del emisor de señales no afecta al registro', async () => {
    const vistas: unknown[] = [];
    const r = await ejecutarLegalOsShadow({ queryId: 'q1', pregunta: '¿Qué es la prenda sin desplazamiento?', fragmentos: [], decisionProduccion: 'ABSTAIN', retrievalState: 'NO_VERIFIED_EVIDENCE' }, {
      env: { LEGAL_OS_SHADOW: '1' }, emitir: () => undefined, emitirSenales: (c) => vistas.push(c),
    });
    expect(r?.final_shadow_status).toBe('SHADOW_ABSTAIN');
    expect(vistas).toHaveLength(1);
    const r2 = await ejecutarLegalOsShadow({ queryId: 'q2', pregunta: '¿Qué es la prenda sin desplazamiento?', fragmentos: [], decisionProduccion: 'ABSTAIN', retrievalState: 'NO_VERIFIED_EVIDENCE' }, {
      env: { LEGAL_OS_SHADOW: '1' }, emitir: () => undefined, emitirSenales: () => { throw new Error('log caído'); },
    });
    expect(r2?.final_shadow_status).toBe('SHADOW_ABSTAIN');
  });
});
