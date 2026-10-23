/**
 * G4-A — procedencia pública FUERTE (manifiesto aprobado + SHA-256 de contenido). Offline, sin red.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import {
  evaluarProcedenciaFuerte, validarManifiesto, proponerEntradaManifiesto, sha256Contenido, type EntradaProcedencia,
} from '@/lib/ai-gateway/shadow/public-provenance';
import { MANIFIESTO_PROCEDENCIA_PUBLICA } from '@/lib/ai-gateway/shadow/public-provenance-manifest';

const RAIZ = process.cwd();
const frag = (x: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'mayalex_normativos:cpp_a173', contenido: 'ARTICULO 173.- Texto de prueba.', num_articulo: '173', fuente: 'Codigo Procesal Penal',
  relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...x,
});
const OFICIAL = { url: 'https://example.invalid/gaceta/35000.pdf', gaceta: '35,000', pdfSha256: 'a'.repeat(64) };
const APROB = { estadoVerificacion: 'V4' as const, aprobadoPor: 'CLO', aprobadoEn: '2026-10-23' };
const entrada = (f = frag(), x: Partial<EntradaProcedencia> = {}): EntradaProcedencia => ({ ...proponerEntradaManifiesto(f, OFICIAL, APROB), ...x });

describe('G4-A manifiesto de procedencia', () => {
  it('el manifiesto entregado está VACÍO y es válido: nada tiene prueba fuerte todavía', () => {
    expect(MANIFIESTO_PROCEDENCIA_PUBLICA).toEqual([]);
    expect(validarManifiesto(MANIFIESTO_PROCEDENCIA_PUBLICA)).toEqual([]);
  });
  it('con el manifiesto real (vacío) todo fragmento se rechaza', () => {
    expect(evaluarProcedenciaFuerte([frag()])).toEqual({ estado: 'PROVENANCE_REJECT', razon: 'fragmento_sin_manifiesto' });
  });
  it('PASS cuando id, fuente, artículo y hash de contenido coinciden con una entrada válida', () => {
    expect(evaluarProcedenciaFuerte([frag()], [entrada()])).toEqual({ estado: 'PROVENANCE_PASS' });
  });
  it('lista vacía → sin_evidencia', () => {
    expect(evaluarProcedenciaFuerte([], [entrada()])).toEqual({ estado: 'PROVENANCE_REJECT', razon: 'sin_evidencia' });
  });
  it('contenido alterado → contenido_sha256 (la colección no basta; el texto debe ser el aprobado)', () => {
    expect(evaluarProcedenciaFuerte([frag({ contenido: 'ARTICULO 173.- Otro texto.' })], [entrada()])).toEqual({ estado: 'PROVENANCE_REJECT', razon: 'contenido_sha256' });
  });
  it('fuente o artículo distinto → rechazo por nombre de campo', () => {
    expect(evaluarProcedenciaFuerte([frag({ fuente: 'Otro Codigo' })], [entrada()])).toMatchObject({ razon: 'fuente' });
    expect(evaluarProcedenciaFuerte([frag({ num_articulo: '174' })], [entrada()])).toMatchObject({ razon: 'num_articulo' });
  });
  it('TODOS los fragmentos deben estar aprobados: uno sin entrada rechaza el lote', () => {
    const f2 = frag({ id: 'mayalex_normativos:cpp_a174', num_articulo: '174' });
    expect(evaluarProcedenciaFuerte([frag(), f2], [entrada()])).toMatchObject({ razon: 'fragmento_sin_manifiesto' });
    expect(evaluarProcedenciaFuerte([frag(), f2], [entrada(), entrada(f2)])).toEqual({ estado: 'PROVENANCE_PASS' });
  });
  const INVALIDAS: Array<[string, Partial<EntradaProcedencia>]> = [
    ['contenidoSha256', { contenidoSha256: 'xyz' }],
    ['fuenteOficial.url', { fuenteOficial: { ...OFICIAL, url: 'http://inseguro' } }],
    ['fuenteOficial.pdfSha256', { fuenteOficial: { ...OFICIAL, pdfSha256: 'abc' } }],
    ['fuenteOficial.gaceta', { fuenteOficial: { ...OFICIAL, gaceta: ' ' } }],
    ['estadoVerificacion', { estadoVerificacion: 'V3' as never }],
    ['aprobadoPor', { aprobadoPor: '' }],
    ['aprobadoEn', { aprobadoEn: 'ayer' }],
  ];
  for (const [campo, cambio] of INVALIDAS) {
    it(`entrada con ${campo} inválido → manifiesto_invalido (fail-closed)`, () => {
      expect(validarManifiesto([entrada(frag(), cambio)])[0]).toContain(campo);
      expect(evaluarProcedenciaFuerte([frag()], [entrada(frag(), cambio)])).toEqual({ estado: 'PROVENANCE_REJECT', razon: 'manifiesto_invalido' });
    });
  }
  it('ids duplicados en el manifiesto lo invalidan', () => {
    expect(validarManifiesto([entrada(), entrada()])[0]).toContain('duplicado');
  });
  it('nunca lanza ante basura y el rechazo no revela valores', () => {
    expect(evaluarProcedenciaFuerte(undefined as never)).toMatchObject({ estado: 'PROVENANCE_REJECT' });
    expect(evaluarProcedenciaFuerte([null as never], [entrada()])).toMatchObject({ estado: 'PROVENANCE_REJECT' });
    const r = evaluarProcedenciaFuerte([frag({ contenido: 'secreto' })], [entrada()]);
    expect(JSON.stringify(r)).not.toMatch(/secreto|Texto de prueba/);
  });
  it('proponerEntradaManifiesto calcula el SHA-256 real del contenido', () => {
    expect(entrada().contenidoSha256).toBe(sha256Contenido(frag().contenido));
    expect(entrada().contenidoSha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it('el módulo no abre red, no lee entorno y no toca la base', () => {
    for (const n of ['public-provenance.ts', 'public-provenance-manifest.ts']) {
      expect(readFileSync(join(RAIZ, 'lib', 'ai-gateway', 'shadow', n), 'utf8'), n).not.toMatch(/\bfetch\s*\(|process\.env|@supabase|OPENAI_API_KEY/);
    }
  });
});

describe('G4-A integración con el dispatcher (evaluador real)', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  async function cargar(manifiesto: readonly EntradaProcedencia[]) {
    vi.resetModules();
    vi.doMock('@/lib/ai-gateway/shadow/config', () => ({ SHADOW_GATEWAY_ENABLED: true, SHADOW_TIMEOUT_MS: 40, SHADOW_REGISTRY_MAX: 200 }));
    vi.doMock('@/lib/ai-gateway/shadow/shadow-model-config', async (o) => ({ ...(await o<typeof import('@/lib/ai-gateway/shadow/shadow-model-config')>()), SHADOW_BUDGET_USD: 1 }));
    vi.doMock('@/lib/ai-gateway/shadow/public-provenance-manifest', () => ({ MANIFIESTO_PROCEDENCIA_PUBLICA: manifiesto }));
    const responder = vi.fn(async () => ({
      rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 't', citations: [{ chunk_id: 'mayalex_normativos:cpp_a173', support: 'DIRECT' }] }], abstention_reason: null },
      usage: { inputTokens: 100, outputTokens: 10 }, latencyMs: 3,
    }));
    vi.doMock('@/lib/ai-gateway/shadow/adaptador-sombra', () => ({ credencialDisponible: () => true, crearAdaptadorSombra: () => ({ modelo: 'gpt-6-luna', responder }) }));
    const d = await import('@/lib/ai-gateway/shadow/dispatcher');
    return { d, responder };
  }
  const P = (id: string) => ({ queryId: id, pregunta: '¿Qué dice el artículo 173 del Código Procesal Penal?', fragmentos: [frag()], decision: 'ANSWER' as const, retrievalState: 'EXACT_SUCCESS' as const });

  it('manifiesto vacío (real): SKIPPED_PUBLIC_PROVENANCE y el adaptador NO se invoca', async () => {
    const { d, responder } = await cargar([]);
    d.despacharShadow(P('q-g4-1'));
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos().map((r) => r.estado)).toEqual(['SKIPPED_PUBLIC_PROVENANCE']);
  });
  it('con entrada aprobada para el fragmento, el despacho llega al adaptador', async () => {
    const { d, responder } = await cargar([entrada()]);
    d.despacharShadow(P('q-g4-2'));
    await d.esperarDespachos();
    expect(responder).toHaveBeenCalledTimes(1);
  });
});
