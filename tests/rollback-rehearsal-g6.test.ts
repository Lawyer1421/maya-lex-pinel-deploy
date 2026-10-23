/**
 * G6-F — ENSAYO de rollback. Offline, sin red, sin credenciales. Con G6_WRITE_EVIDENCE=1 escribe docs/governance/evidence/g6-rollback-evidence.json.
 * Demuestra: (1) cada condición de parada detiene y NO reanuda; (2) el estado de rollback es el estado seguro; (3) el despacho shadow vuelve a
 * «apagado» con la misma ruta de producción; (4) el rollback no modifica el código jurídico de producción.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARCHIVOS_PRODUCCION_JURIDICA, evidenciaVigente, hashArchivos } from '@/lib/ai-gateway/canary/evidence-integrity';
import { CANARY_CONFIG, canaryConfigPermiteTrafico } from '@/lib/ai-gateway/canary/canary-config';
import { CONFIG_ENSAYO, DISPARADORES, aplicarRollback, ensayar, estadoRealEsSeguro } from '@/lib/ai-gateway/canary/rollback-rehearsal';

const RAIZ = join(__dirname, '..');
const DESTINO = join(RAIZ, 'docs', 'governance', 'evidence', 'g6-rollback-evidence.json');
const antes = hashArchivos(ARCHIVOS_PRODUCCION_JURIDICA);
let killSwitchProbado = false;

afterEach(() => vi.resetModules());

describe('G6-F rollback: cada disparador', () => {
  const resultados = DISPARADORES.map((d) => ensayar(d));
  for (const r of resultados) {
    it(`${r.disparador}: detiene, no reanuda y vuelve al estado seguro`, () => {
      expect(r.detenidoPor, r.disparador).not.toBeNull();
      expect(r.noReanuda).toBe(true);
      expect(r.estadoFinal).toEqual({ SHADOW_GATEWAY_ENABLED: false, enabled: false, maxRequests: 0, maxBudgetUsd: 0, sampleStrategy: 'NINGUNA' });
      expect(r.configFinalValida).toBe(true);
      expect(r.permiteTraficoDespues).toBe(false);
    });
  }
  it('cubre los 8 disparadores pedidos', () => {
    expect(DISPARADORES).toEqual(['ADAPTER_FAILURE', 'PRIVACY_INCIDENT', 'PROVENANCE_MISMATCH', 'SCHEMA_FAILURE', 'UNEXPECTED_COST', 'TIMEOUT', 'CIRCUIT_BREAKER_OPEN', 'MANUAL_KILL']);
  });
  it('las razones de parada son las esperadas', () => {
    const por = Object.fromEntries(resultados.map((r) => [r.disparador, r.detenidoPor]));
    expect(por.PRIVACY_INCIDENT).toBe('INCIDENTE_PRIVACIDAD');
    expect(por.PROVENANCE_MISMATCH).toBe('PROCEDENCIA_NO_COINCIDE');
    expect(por.SCHEMA_FAILURE).toBe('FALLO_ESQUEMA');
    expect(por.UNEXPECTED_COST).toBe('COSTO_INESPERADO');
    expect(por.ADAPTER_FAILURE).toBe('ERRORES_ADAPTADOR');
    expect(por.TIMEOUT).toBe('ERRORES_ADAPTADOR');
    expect(por.CIRCUIT_BREAKER_OPEN).toBe('ERRORES_ADAPTADOR');
    expect(por.MANUAL_KILL).toBe('MAX_REQUESTS');
  });
  it('la configuración ensayada SÍ estaba encendida; el rollback la deja apagada (ensayo no vacuo)', () => {
    expect(CONFIG_ENSAYO.enabled).toBe(true);
    expect(CONFIG_ENSAYO.maxRequests).toBeGreaterThan(0);
    const { config } = aplicarRollback(CONFIG_ENSAYO);
    expect(config).toEqual(CANARY_CONFIG);
    expect(canaryConfigPermiteTrafico(config)).toBe(false);
  });
  it('los valores reales del repositorio YA son el estado seguro', () => {
    expect(estadoRealEsSeguro()).toBe(true);
  });
});

describe('G6-F rollback: el despacho shadow vuelve a apagado sin tocar la respuesta de producción', () => {
  async function dispatcherConKillSwitch(enabled: boolean) {
    vi.resetModules();
    for (const m of ['dispatcher', 'config', 'shadow-model-config', 'adaptador-sombra', 'public-provenance']) vi.doUnmock(`@/lib/ai-gateway/shadow/${m}`);
    vi.doMock('@/lib/ai-gateway/shadow/config', () => ({ SHADOW_GATEWAY_ENABLED: enabled, SHADOW_TIMEOUT_MS: 50, SHADOW_REGISTRY_MAX: 200 }));
    vi.doMock('@/lib/ai-gateway/shadow/shadow-model-config', async (o) => ({ ...(await o<typeof import('@/lib/ai-gateway/shadow/shadow-model-config')>()), SHADOW_BUDGET_USD: 1 }));
    vi.doMock('@/lib/ai-gateway/shadow/public-provenance', () => ({ evaluarProcedenciaFuerte: () => ({ estado: 'PROVENANCE_PASS' }) }));
    const responder = vi.fn(async () => ({ rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 't', citations: [{ chunk_id: 'f1', support: 'DIRECT' }] }], abstention_reason: null }, usage: { inputTokens: 10, outputTokens: 5 }, latencyMs: 1 }));
    vi.doMock('@/lib/ai-gateway/shadow/adaptador-sombra', () => ({ credencialDisponible: () => true, crearAdaptadorSombra: () => ({ modelo: 'gpt-6-luna', responder }) }));
    const d = await import('@/lib/ai-gateway/shadow/dispatcher');
    return { d, responder };
  }
  const params = (id: string) => ({
    queryId: id, pregunta: '¿Qué dice el artículo 173 del Código Procesal Penal?', decision: 'ANSWER' as const, retrievalState: 'EXACT_SUCCESS' as const,
    fragmentos: [{ id: 'f1', contenido: 'ARTICULO 173.- Texto.', num_articulo: '173', fuente: 'Codigo Procesal Penal', relevancia: 1, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234' }] as never,
  });

  it('encendido despacha; tras el rollback (kill switch false) el MISMO código no despacha nada', async () => {
    const on = await dispatcherConKillSwitch(true);
    on.d.despacharShadow(params('q-on'));
    await on.d.esperarDespachos();
    expect(on.responder).toHaveBeenCalledTimes(1);
    expect(on.d.registroDespachos().map((r) => r.estado)).toContain('COMPLETED');

    const off = await dispatcherConKillSwitch(false);
    off.d.despacharShadow(params('q-off'));
    await off.d.esperarDespachos();
    expect(off.responder).not.toHaveBeenCalled();
    expect(off.d.registroDespachos()).toEqual([]);
    killSwitchProbado = true;
  });
});

describe('G6-F rollback: no modifica el código jurídico de producción', () => {
  it('retrieval, Exact Resolver, Evidence Gate y abstención tienen los mismos hashes antes y después del ensayo', () => {
    for (const d of DISPARADORES) ensayar(d);
    expect(hashArchivos(ARCHIVOS_PRODUCCION_JURIDICA)).toEqual(antes);
  });
  it('escribe la evidencia (solo con G6_WRITE_EVIDENCE=1) y la evidencia vigente coincide con el código actual', () => {
    const evidencia = {
      ROLLBACK_REHEARSAL_PASSED: DISPARADORES.map((d) => ensayar(d)).every((r) => r.noReanuda && !r.permiteTraficoDespues && r.configFinalValida && r.detenidoPor !== null),
      estadoSeguro: { SHADOW_GATEWAY_ENABLED: false, enabled: false, maxRequests: 0, maxBudgetUsd: 0, sampleStrategy: 'NINGUNA' },
      estadoRealEsSeguro: estadoRealEsSeguro(),
      killSwitchProbado,
      ensayos: DISPARADORES.map((d) => ensayar(d)),
      limiteConocido: 'El kill switch del shadow es una constante de código: el retorno a «apagado» en un despliegue real es revertir y redesplegar (promover el despliegue anterior). No hay interruptor en caliente.',
      codigoHashes: antes,
    };
    if (process.env.G6_WRITE_EVIDENCE === '1') writeFileSync(DESTINO, `${JSON.stringify(evidencia, null, 2)}\n`);
    const guardada = JSON.parse(readFileSync(DESTINO, 'utf8'));
    expect(guardada).toEqual(evidencia);
    expect(guardada.ROLLBACK_REHEARSAL_PASSED).toBe(true);
    expect(evidenciaVigente(guardada.codigoHashes)).toEqual({ vigente: true, cambiados: [] });
  });
});
