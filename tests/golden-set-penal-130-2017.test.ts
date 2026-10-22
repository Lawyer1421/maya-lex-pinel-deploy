import { describe, expect, it } from 'vitest';
import { RecordedResponseAdapter, runGoldenSet } from '@/lib/ai-gateway/shadow/golden-runner';
import { validarSalida } from '@/lib/ai-gateway/shadow/citation-validator';
import { GOLDEN_G1, RESPUESTAS_GRABADAS_G1 } from './golden/gateway-g1-casos';

/**
 * Issue #78 — caso Penal G1-VIG-CODIGO-PENAL-130-2017 reincorporado al gate
 * (dictamen CLO 22-oct-2026, La Gaceta 34,940 y 35,247). Respuestas grabadas: sin red.
 */
const PENAL = 'G1-VIG-CODIGO-PENAL-130-2017';
const caso = GOLDEN_G1.find((c) => c.id === PENAL)!;
const grabada = RESPUESTAS_GRABADAS_G1[caso.input.queryId];
const textos = (r: ReturnType<typeof validarSalida>) => r.claims.map((c) => c.text);

/** Detecta la afirmación de que el Código Penal de 1983 (D.144-83) sigue vigente o aplicable. */
export const AFIRMA_VIGENCIA_1983 =
  /(?:c[oó]digo penal de 1983|decreto\s*144-83|\bD\.?\s*144-83)[^.]{0,80}(?:sigue vigente|a[uú]n aplica|todav[ií]a rige|contin[uú]a en vigor|sigue aplicando|sigue rigiendo)|(?:sigue vigente|a[uú]n aplica|todav[ií]a rige|contin[uú]a en vigor)[^.]{0,80}(?:c[oó]digo penal de 1983|decreto\s*144-83|\bD\.?\s*144-83)/i;

describe('caso Penal D.130-2017 en el gate', () => {
  it('está verificado, con 2 evidencias PRIMARY y la Gaceta de cada una', () => {
    expect(caso.estado).toBe('VERIFICADO');
    expect(caso.input.evidence.map((e) => [e.chunk_id, e.rol, e.gaceta])).toEqual([
      ['cp-130-2017-634', 'PRIMARY', '34,940'],
      ['d46-2020-1', 'PRIMARY', '35,247'],
    ]);
  });
  it('a. la pregunta por el art. 634 espera la derogación del D.144-83 y de todas sus reformas', () => {
    expect(caso.input.sanitizedQuestion).toMatch(/artículo 634/);
    const r = validarSalida(caso.input, grabada);
    expect(r.status).toBe('ANSWER');
    const c1 = r.claims.find((c) => c.citations.some((x) => x.chunk_id === 'cp-130-2017-634'))!;
    expect(c1.text).toMatch(/art\. 634 del Decreto 130-2017.*deroga el Decreto 144-83.*todas sus reformas/);
    expect(c1.citations).toEqual([{ chunk_id: 'cp-130-2017-634', support: 'DIRECT' }]);
  });
  it('b. la pregunta por la vigencia espera 25-jun-2020, por el art. 1 del D.46-2020', () => {
    expect(caso.input.sanitizedQuestion).toMatch(/desde cuándo está vigente/);
    const r = validarSalida(caso.input, grabada);
    const c2 = r.claims.find((c) => c.citations.some((x) => x.chunk_id === 'd46-2020-1'))!;
    expect(c2.text).toMatch(/vigente desde el 25-jun-2020/);
    expect(c2.text).toMatch(/art\. 1 del Decreto 46-2020.*reforma el art\. 635/);
  });
  it('el caso cumple lo esperado en el runner y el gate pasa', async () => {
    const informe = await runGoldenSet(GOLDEN_G1, new RecordedResponseAdapter(RESPUESTAS_GRABADAS_G1));
    expect(informe.casosEvaluados).toContain(PENAL);
    expect(informe.desacuerdos).toEqual([]);
    expect(informe.gate).toEqual({ pasa: true, motivos: [] });
  });
});

describe('c. negativo: ninguna respuesta dice que el Código Penal de 1983 sigue vigente', () => {
  it('el detector reconoce las variantes prohibidas', () => {
    for (const frase of [
      'El Código Penal de 1983 (D.144-83) sigue vigente.',
      'El Decreto 144-83 aún aplica a esos hechos.',
      'El D.144-83 todavía rige.',
      'El Código Penal de 1983 continúa en vigor.',
      'Sigue vigente el Decreto 144-83.',
      'Aún aplica el Código Penal de 1983.',
    ]) expect(frase, frase).toMatch(AFIRMA_VIGENCIA_1983);
  });
  it('no marca la respuesta correcta que habla de su derogación', () => {
    for (const t of textos(validarSalida(caso.input, grabada))) expect(t).not.toMatch(AFIRMA_VIGENCIA_1983);
  });
  it('ninguna respuesta grabada de todo el Golden Set lo afirma', () => {
    for (const [q, r] of Object.entries(RESPUESTAS_GRABADAS_G1)) {
      expect(JSON.stringify(r.rawOutput), q).not.toMatch(AFIRMA_VIGENCIA_1983);
    }
  });
  it('una respuesta que lo afirma se detecta como fallo', () => {
    const mala = { ...grabada, rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 'El D.144-83 (Código Penal de 1983) sigue vigente.', citations: [{ chunk_id: 'cp-130-2017-634', support: 'DIRECT' }] }], abstention_reason: null } };
    expect(textos(validarSalida(caso.input, mala)).some((t) => AFIRMA_VIGENCIA_1983.test(t))).toBe(true);
  });
});

describe('d. el D.119-2019 no se afirma en ninguna respuesta', () => {
  it('ni respuestas, ni evidencias, ni referencias del Golden Set mencionan contenido del D.119-2019', () => {
    const todo = JSON.stringify({ GOLDEN_G1, RESPUESTAS_GRABADAS_G1 });
    expect(todo).not.toMatch(/119-2019/);
  });
});
