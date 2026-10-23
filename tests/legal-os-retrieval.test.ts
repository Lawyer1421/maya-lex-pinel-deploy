import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { clasificarIntencion } from '@/lib/legal-os/router/intent';
import { decidirFallbackOficial, esFuenteOficial, fusionRRF, planificarRecuperacion, puedeEstablecerTextoAutoritativo } from '@/lib/legal-os/retrieval';

const kinds = (p: ReturnType<typeof planificarRecuperacion>) => p.pasos.filter((x) => x.enabled).map((x) => x.kind);

describe('planificarRecuperacion', () => {
  it('consulta exacta: plan determinista sin semántica, rerank ni fallback', () => {
    const p = planificarRecuperacion(clasificarIntencion('¿Qué dice el artículo 173 del Código Procesal Penal?'), { candidatosEsperados: 50, margenTop: 0 });
    expect(p.determinista).toBe(true);
    expect(kinds(p)).toEqual(['EXACT_REFERENCE', 'STRUCTURED_LOOKUP']);
  });
  it('investigación: léxica + semántica + fallback; sin rerank si no hace falta', () => {
    const p = planificarRecuperacion(clasificarIntencion('¿Qué es la prenda sin desplazamiento?'), { candidatosEsperados: 3 });
    expect(kinds(p)).toEqual(['STRUCTURED_LOOKUP', 'LEXICAL', 'SEMANTIC', 'OFFICIAL_FALLBACK']);
  });
  it('rerank solo con muchos candidatos o margen bajo, y solo si está disponible', () => {
    const i = clasificarIntencion('¿Qué es la prenda sin desplazamiento?');
    expect(kinds(planificarRecuperacion(i, { candidatosEsperados: 20 }))).toContain('RERANK');
    expect(kinds(planificarRecuperacion(i, { margenTop: 0.01 }))).toContain('RERANK');
    expect(kinds(planificarRecuperacion(i, { candidatosEsperados: 20, rerankDisponible: false }))).not.toContain('RERANK');
  });
  it('los filtros de metadatos siempre están presentes y el presupuesto de pasos apagados es 0', () => {
    const p = planificarRecuperacion(clasificarIntencion('¿Qué dice el artículo 173 del Código Procesal Penal?'), { instrument: 'CPP', asOfDate: '2020-01-01' });
    expect(p.filtros).toMatchObject({ country: 'HN', jurisdiction: 'NACIONAL', matter: 'penal', instrument: 'CPP', asOfDate: '2020-01-01' });
    for (const s of p.pasos.filter((x) => !x.enabled)) expect(s.budgetMs).toBe(0);
  });
  it('orden fijo de los pasos', () => {
    expect(planificarRecuperacion(clasificarIntencion('hola')).pasos.map((x) => x.kind)).toEqual(['EXACT_REFERENCE', 'STRUCTURED_LOOKUP', 'LEXICAL', 'SEMANTIC', 'RERANK', 'OFFICIAL_FALLBACK']);
  });
  it('el fallback oficial puede desactivarse', () => {
    expect(kinds(planificarRecuperacion(clasificarIntencion('¿Qué es la hipoteca?'), { fallbackOficialPermitido: false }))).not.toContain('OFFICIAL_FALLBACK');
  });
});

describe('esFuenteOficial', () => {
  it('acepta solo hosts verificados por https', () => {
    expect(esFuenteOficial('https://legislacion.poderjudicial.gob.hn/sistemalegislacion/inicio.aspx')).toMatchObject({ oficial: true, fuente: { tier: 2, autoritativa: true } });
    expect(esFuenteOficial('https://www.tsc.gob.hn/')).toMatchObject({ oficial: true, fuente: { tier: 4, automatizable: false } });
  });
  it('rechaza http, hosts desconocidos, parecidos y credenciales embebidas', () => {
    expect(esFuenteOficial('http://legislacion.poderjudicial.gob.hn/x')).toEqual({ oficial: false, motivo: 'NO_HTTPS' });
    expect(esFuenteOficial('https://evil.example.com/legislacion.poderjudicial.gob.hn')).toMatchObject({ oficial: false });
    expect(esFuenteOficial('https://legislacion.poderjudicial.gob.hn.evil.com/')).toMatchObject({ oficial: false });
    expect(esFuenteOficial('https://usuario:clave@legislacion.poderjudicial.gob.hn/')).toMatchObject({ oficial: false });
    expect(esFuenteOficial('no es url')).toEqual({ oficial: false, motivo: 'URL_INVALIDA' });
  });
  it('lagaceta.hn (medio privado) está excluido; los dominios no verificados de Gaceta/Congreso no se aceptan', () => {
    expect(esFuenteOficial('https://www.lagaceta.hn/')).toEqual({ oficial: false, motivo: 'HOST_EXCLUIDO' });
    for (const u of ['https://www.lagaceta.gob.hn', 'https://www.congresonacional.hn', 'https://www.cn.gob.hn', 'https://sij.poderjudicial.gob.hn/index']) {
      expect(esFuenteOficial(u), u).toMatchObject({ oficial: false, motivo: 'HOST_NO_VERIFICADO' });
    }
  });
  it('los hosts del registro figuran en el documento de fuentes verificadas', () => {
    const doc = readFileSync(join(__dirname, '..', 'docs', 'retrieval', 'OFFICIAL_HONDURAS_SOURCE_REGISTRY.md'), 'utf8');
    for (const h of ['legislacion.poderjudicial.gob.hn', 'sejeinfo.poderjudicial.gob.hn', 'www.tsc.gob.hn']) expect(doc).toContain(h);
  });
  it('una fuente secundaria nunca establece texto autoritativo', () => {
    expect(puedeEstablecerTextoAutoritativo(null, true)).toBe(false);
    expect(puedeEstablecerTextoAutoritativo(null, false)).toBe(false);
    expect(puedeEstablecerTextoAutoritativo(2, true)).toBe(true);
  });
});

describe('decidirFallbackOficial', () => {
  const e = (state: Parameters<typeof decidirFallbackOficial>[0]['state'], x: object = {}) => decidirFallbackOficial({ state, fallbackIntentado: false, evidenciaOficialVerificada: false, ...x });
  it('con evidencia interna suficiente no se sale a la web', () => {
    expect(e('EXACT_SUCCESS')).toBe('USE_INTERNAL');
    expect(e('SEMANTIC_SUCCESS')).toBe('USE_INTERNAL');
    expect(e('NOT_REQUIRED')).toBe('USE_INTERNAL');
  });
  it('evidencia interna insuficiente → intenta fuentes oficiales', () => {
    for (const s of ['NO_VERIFIED_EVIDENCE', 'OFFICIAL_FALLBACK_REQUIRED', 'RETRIEVAL_ERROR', 'CONFIGURATION_ERROR'] as const) expect(e(s), s).toBe('TRY_OFFICIAL');
    expect(e('SEMANTIC_SUCCESS', { evidenciaParcial: true })).toBe('TRY_OFFICIAL');
  });
  it('tras el fallback sin evidencia oficial verificada: ABSTAIN o QUALIFY, nunca responder', () => {
    expect(e('NO_VERIFIED_EVIDENCE', { fallbackIntentado: true })).toBe('ABSTAIN');
    expect(e('NO_VERIFIED_EVIDENCE', { fallbackIntentado: true, evidenciaParcial: true })).toBe('QUALIFY');
    expect(e('NO_VERIFIED_EVIDENCE', { fallbackIntentado: true, evidenciaOficialVerificada: true })).toBe('USE_INTERNAL');
  });
  it('no hay bucle: tras intentar el fallback nunca vuelve a pedirlo', () => {
    for (const s of ['NOT_REQUIRED', 'EXACT_SUCCESS', 'SEMANTIC_SUCCESS', 'OFFICIAL_FALLBACK_REQUIRED', 'NO_VERIFIED_EVIDENCE', 'CONFIGURATION_ERROR', 'RETRIEVAL_ERROR'] as const) {
      expect(e(s, { fallbackIntentado: true }), s).not.toBe('TRY_OFFICIAL');
    }
  });
});

describe('fusionRRF', () => {
  it('premia lo que aparece en ambas listas y es determinista', () => {
    const L = [[{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ id: 'b' }, { id: 'a' }, { id: 'd' }]];
    const r = fusionRRF(L);
    expect(r.map((x) => x.id).slice(0, 2).sort()).toEqual(['a', 'b']);
    expect(r).toEqual(fusionRRF(L));
    expect(r.find((x) => x.id === 'a')!.score).toBeCloseTo(1 / 61 + 1 / 62, 12);
  });
  it('un id duplicado dentro de una lista cuenta una sola vez; listas vacías → vacío; empates por id', () => {
    expect(fusionRRF([[{ id: 'a' }, { id: 'a' }]])).toEqual([{ id: 'a', score: 1 / 61 }]);
    expect(fusionRRF([[], []])).toEqual([]);
    expect(fusionRRF([[{ id: 'z' }], [{ id: 'a' }]]).map((x) => x.id)).toEqual(['a', 'z']);
  });
  it('el módulo no importa el gateway', () => {
    for (const f of ['official-sources', 'plan', 'fallback', 'index']) {
      expect(readFileSync(join(__dirname, '..', 'lib', 'legal-os', 'retrieval', `${f}.ts`), 'utf8')).not.toMatch(/from\s+['"][^'"]*ai-gateway/);
    }
  });
});
