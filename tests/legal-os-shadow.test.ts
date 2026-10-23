import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { despacharLegalOsShadow, ejecutarLegalOsShadow, evidenciaDeProduccion, legalOsShadowHabilitado, type ParametrosShadow } from '@/lib/legal-os/shadow';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';

const F = (over: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'f1', contenido: 'ARTICULO 173.- Texto sintético.', num_articulo: '173', fuente: 'Codigo Procesal Penal', relevancia: 0.95, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...over,
});
const P = (over: Partial<ParametrosShadow> = {}): ParametrosShadow => ({
  queryId: 'q1', pregunta: '¿Qué es la prenda sin desplazamiento?', fragmentos: [F()], decisionProduccion: 'ANSWER', retrievalState: 'SEMANTIC_SUCCESS', ...over,
});
const ON = { LEGAL_OS_SHADOW: '1' };

describe('interruptor', () => {
  it('apagado por defecto y en producción sin la segunda bandera', () => {
    expect(legalOsShadowHabilitado({})).toBe(false);
    expect(legalOsShadowHabilitado({ LEGAL_OS_SHADOW: '0' })).toBe(false);
    expect(legalOsShadowHabilitado({ LEGAL_OS_SHADOW: '1', VERCEL_ENV: 'production' })).toBe(false);
    expect(legalOsShadowHabilitado({ LEGAL_OS_SHADOW: '1', VERCEL_ENV: 'preview' })).toBe(true);
    expect(legalOsShadowHabilitado({ LEGAL_OS_SHADOW: '1', VERCEL_ENV: 'production', LEGAL_OS_SHADOW_ALLOW_PROD: '1' })).toBe(true);
  });
  it('apagado: no ejecuta ni emite nada', async () => {
    const emitidos: unknown[] = [];
    expect(await ejecutarLegalOsShadow(P(), { env: {}, emitir: (r) => emitidos.push(r) })).toBeNull();
    despacharLegalOsShadow(P(), { env: {}, emitir: (r) => emitidos.push(r) });
    await new Promise((r) => setTimeout(r, 5));
    expect(emitidos).toEqual([]);
  });
});

describe('política de fuentes del shadow', () => {
  it('excluye doctrina y la capa privada doc_*', () => {
    const { chunks, excluidas } = evidenciaDeProduccion([F(), F({ id: 'd', fuente: 'CPC_COMENTADO_ROMERO_2024' }), F({ id: 'p', fuente: 'doc_demanda_cliente' })]);
    expect(chunks.map((c) => c.id)).toEqual(['f1']);
    expect(excluidas).toBe(2);
  });
  it('vigencia nula se conserva como no verificada', () => {
    expect(evidenciaDeProduccion([F({ es_norma_vigente: null })]).chunks[0].vigente).toBeNull();
  });
});

describe('registro shadow', () => {
  it('contiene los campos de P3, model_called=false, y NO la pregunta cruda', async () => {
    const r = (await ejecutarLegalOsShadow(P({ pregunta: '¿Qué es la prenda sin desplazamiento? Mi correo es secreto@ejemplo.com' }), { env: ON, emitir: () => undefined }))!;
    for (const k of ['query_id', 'jurisdiction', 'matter', 'skill_id', 'intent', 'risk', 'retrieval_plan', 'exact_resolution', 'retrieved_sources', 'source_tier', 'evidence_status', 'model_route', 'model_id', 'model_called', 'citations', 'citation_validation', 'abstention', 'latency_ms', 'estimated_cost_usd', 'privacy_decision', 'provenance_decision', 'final_shadow_status'] as const) expect(r, k).toHaveProperty(k);
    expect(r.model_called).toBe(false);
    expect(r.provenance_decision).toMatch(/NOT_EVALUATED/);
    const json = JSON.stringify(r);
    expect(json).not.toContain('secreto@ejemplo.com');
    expect(json).not.toContain('prenda sin desplazamiento');
    expect(json).not.toContain('Texto sintético');
  });
  it('responde por qué respondió, con qué evidencia y a qué costo', async () => {
    const r = (await ejecutarLegalOsShadow(P(), { env: ON, emitir: () => undefined }))!;
    expect(r).toMatchObject({ final_shadow_status: 'SHADOW_ANSWER', model_route: 'FAST', agreement: 'MATCH', evidence_status: 'EVIDENCE_PRESENT' });
    expect(r.retrieved_sources).toEqual([{ chunk_id: 'f1', instrument: 'CODIGO_PROCESAL_PENAL', article: '173', hash: 'abcd1234' }]);
    expect(r.citations).toEqual(['f1']);
    expect(r.estimated_cost_usd).toBeGreaterThan(0);
  });
  it('por qué se abstuvo: sin evidencia', async () => {
    const r = (await ejecutarLegalOsShadow(P({ fragmentos: [], decisionProduccion: 'ABSTAIN', retrievalState: 'NO_VERIFIED_EVIDENCE' }), { env: ON, emitir: () => undefined }))!;
    expect(r).toMatchObject({ final_shadow_status: 'SHADOW_ABSTAIN', agreement: 'MATCH', evidence_status: 'NO_EVIDENCE' });
    expect(r.abstention).toEqual({ abstained: true, reason: 'SIN_EVIDENCIA' });
  });
  it('discordancias visibles: el shadow más estricto o más laxo que producción', async () => {
    const laxo = (await ejecutarLegalOsShadow(P({ decisionProduccion: 'ABSTAIN' }), { env: ON, emitir: () => undefined }))!;
    expect(laxo.agreement).toBe('SHADOW_LOOSER');
    const estricto = (await ejecutarLegalOsShadow(P({ pregunta: 'Dame una receta de baleadas' }), { env: ON, emitir: () => undefined }))!;
    expect(estricto).toMatchObject({ agreement: 'SHADOW_STRICTER', abstention: { reason: 'FUERA_DE_ALCANCE' } });
  });
  it('consulta exacta con evidencia exacta: sin modelo', async () => {
    const r = (await ejecutarLegalOsShadow(P({ pregunta: '¿Qué dice el artículo 173 del Código Procesal Penal?', retrievalState: 'EXACT_SUCCESS' }), { env: ON, emitir: () => undefined }))!;
    expect(r).toMatchObject({ model_route: 'NONE', model_id: null, estimated_cost_usd: 0, exact_resolution: { requested: true, article: '173', instrument: 'CODIGO_PROCESAL_PENAL' } });
  });
});

describe('subordinación', () => {
  it('un emisor que lanza no produce excepción ni rechazo no manejado', async () => {
    despacharLegalOsShadow(P(), { env: ON, emitir: () => { throw new Error('log caído'); } });
    await new Promise((r) => setTimeout(r, 20));
  });
  it('fragmentos malformados no lanzan al llamador', () => {
    expect(() => despacharLegalOsShadow({ ...P(), fragmentos: null as never }, { env: ON, emitir: () => undefined })).not.toThrow();
  });
  it('no hay camino a un modelo real: el módulo no importa SDK, red, entorno de claves ni el gateway', () => {
    for (const f of ['config.ts', 'record.ts', 'dispatch.ts']) {
      const t = readFileSync(join(__dirname, '..', 'lib', 'legal-os', 'shadow', f), 'utf8');
      expect(t, f).not.toMatch(/from 'openai'|\bfetch\s*\(|OPENAI_API_KEY|ai-gateway|supabase/i);
    }
  });
});

describe('skills en el shadow (P10): se ejecutan en modo evaluación y quedan en la traza', () => {
  it('una consulta de artículo con el instrumento exigido por la skill: skill_id en el registro y requisitos cumplidos', async () => {
    const r = (await ejecutarLegalOsShadow(P({ pregunta: '¿Qué dice el artículo 173 del Código Procesal Penal?', retrievalState: 'EXACT_SUCCESS' }), { env: ON, emitir: () => undefined }))!;
    expect(r.skill_id).toMatch(/^HN\./);
    expect(r.skill_evidence).toMatchObject({ met: true });
    expect(r.skill_evidence!.present_instruments).toContain('CODIGO_PROCESAL_PENAL');
  });
  it('si falta el instrumento exigido por la skill, el shadow se abstiene y lo registra (SKILL_EVIDENCE_NOT_MET), sin tocar producción', async () => {
    const r = (await ejecutarLegalOsShadow(P({ pregunta: '¿Qué dice el artículo 173 del Código Procesal Penal?', retrievalState: 'EXACT_SUCCESS', fragmentos: [F({ fuente: 'Codigo Civil', num_articulo: '173' })], decisionProduccion: 'ANSWER' }), { env: ON, emitir: () => undefined }))!;
    expect(r.final_shadow_status).toBe('SHADOW_ABSTAIN');
    expect(['INSTRUMENTO_SIN_EVIDENCIA', 'SKILL_EVIDENCE_NOT_MET']).toContain(r.abstention.reason);
    expect(r.agreement).toBe('SHADOW_STRICTER');
  });
  it('sin skill aplicable el registro lo dice con claridad: skill_id y skill_evidence nulos', async () => {
    const r = (await ejecutarLegalOsShadow(P({ pregunta: 'Dame una receta de baleadas' }), { env: ON, emitir: () => undefined }))!;
    expect(r.skill_id).toBeNull();
    expect(r.skill_evidence).toBeNull();
  });
  it('el registro no contiene texto de la pregunta ni de los fragmentos', async () => {
    const r = (await ejecutarLegalOsShadow(P({ pregunta: '¿Qué dice el artículo 173 del Código Procesal Penal?', retrievalState: 'EXACT_SUCCESS' }), { env: ON, emitir: () => undefined }))!;
    const j = JSON.stringify(r);
    expect(j).not.toContain('artículo 173 del Código');
    expect(j).not.toContain('Texto sintético');
  });
});
