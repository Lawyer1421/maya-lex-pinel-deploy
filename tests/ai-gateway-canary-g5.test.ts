/**
 * G5 — preparación controlada de un canary (A pilot, C config, D dry-run, E verificación, F serverless, G costo/latencia, H contrato).
 * Todo offline: sin red, sin credenciales, sin tocar constantes reales.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import { SHADOW_GATEWAY_ENABLED } from '@/lib/ai-gateway/shadow/config';
import { SHADOW_BUDGET_USD, SHADOW_MODEL_CONFIG } from '@/lib/ai-gateway/shadow/shadow-model-config';
import { MANIFIESTO_PROCEDENCIA_PUBLICA } from '@/lib/ai-gateway/shadow/public-provenance-manifest';
import { sha256Contenido } from '@/lib/ai-gateway/shadow/public-provenance';
import {
  CANARY_CONFIG, TOPES_CANARY, canaryConfigPermiteTrafico, crearControlCanary, presupuestoEfectivoUsd, validarCanaryConfig, type CanaryConfig,
} from '@/lib/ai-gateway/canary/canary-config';
import { CONDICIONES_CANARY, evaluarGoNoGo, type CondicionCanary, type EvidenciaCondicion } from '@/lib/ai-gateway/canary/go-no-go';
import { decisionActualGoNoGo, estadoActualGoNoGo } from '@/lib/ai-gateway/canary/estado-actual';
import { VERIFICACION_OPENAI, estadoVerificacionOpenAI } from '@/lib/ai-gateway/canary/openai-verification';
import {
  aEntradaManifiesto, construirManifiestoEfectivo, etapaDe, informePiloto, registrarRevisionCLO, verificarCandidato, type CandidatoPiloto,
} from '@/lib/ai-gateway/canary/pilot-manifest';
import { CANDIDATOS_PILOTO } from '@/lib/ai-gateway/canary/pilot-candidates';
import { ESCENARIOS_DRY_RUN, ejecutarDryRun, textoReporte } from '@/lib/ai-gateway/canary/dry-run';
import { costoPeorCasoUsd, percentil, simularCosto, simularLatencia } from '@/lib/ai-gateway/canary/cost-latency-sim';
import { programarShadowDiferido } from '@/lib/ai-gateway/shadow/despacho-diferido';
import { GOLDEN_G1, PROCEDENCIA_G1 } from './golden/gateway-g1-casos';

const RAIZ = process.cwd();
const leer = (...p: string[]) => readFileSync(join(RAIZ, ...p), 'utf8');

// ── G5-C ─────────────────────────────────────────────────────────────────────
describe('G5-C configuración del canary', () => {
  it('valores reales por defecto: apagado, 0 solicitudes, 0 USD', () => {
    expect(CANARY_CONFIG.enabled).toBe(false);
    expect(CANARY_CONFIG.maxRequests).toBe(0);
    expect(CANARY_CONFIG.maxBudgetUsd).toBe(0);
    expect(CANARY_CONFIG.allowedManifestEntries).toEqual([]);
    expect(CANARY_CONFIG.sampleStrategy).toEqual({ tipo: 'NINGUNA' });
    expect(CANARY_CONFIG.model).toBe(SHADOW_MODEL_CONFIG.modelId);
    expect(CANARY_CONFIG.maxOutputTokens).toBe(SHADOW_MODEL_CONFIG.maxOutputTokens);
  });
  it('incluye todas las condiciones de parada, activas por defecto', () => {
    expect(CANARY_CONFIG).toMatchObject({
      stopOnFirstPrivacyIncident: true, stopOnFirstProvenanceMismatch: true, stopOnUnexpectedCost: true, stopOnSchemaFailure: true,
    });
    expect(CANARY_CONFIG.stopOnAdapterErrorThreshold).toBeGreaterThanOrEqual(1);
  });
  it('el objeto es inmutable y la configuración por defecto es coherente', () => {
    expect(Object.isFrozen(CANARY_CONFIG)).toBe(true);
    expect(validarCanaryConfig(CANARY_CONFIG)).toEqual([]);
    expect(canaryConfigPermiteTrafico(CANARY_CONFIG)).toBe(false);
  });
  const habilitada: CanaryConfig = {
    ...CANARY_CONFIG, enabled: true, maxRequests: 5, maxBudgetUsd: 0.01, allowedManifestEntries: ['x'], sampleStrategy: { tipo: 'PRIMERAS_N' },
  };
  it('una configuración habilitada pero coherente no basta: el presupuesto efectivo sigue en 0 por el shadow', () => {
    expect(validarCanaryConfig(habilitada)).toEqual([]);
    expect(presupuestoEfectivoUsd(habilitada)).toBe(Math.min(0.01, SHADOW_BUDGET_USD));
    expect(SHADOW_BUDGET_USD).toBe(0);
    expect(SHADOW_GATEWAY_ENABLED).toBe(false);
    expect(canaryConfigPermiteTrafico(habilitada)).toBe(false);
  });
  const INVALIDAS: Array<[string, Partial<CanaryConfig>]> = [
    ['enabled_sin_maxRequests', { maxRequests: 0 }],
    ['enabled_sin_presupuesto', { maxBudgetUsd: 0 }],
    ['enabled_sin_entradas_de_manifiesto', { allowedManifestEntries: [] }],
    ['enabled_sin_muestreo', { sampleStrategy: { tipo: 'NINGUNA' } }],
    ['stopOnFirstPrivacyIncident', { stopOnFirstPrivacyIncident: false }],
    ['stopOnFirstProvenanceMismatch', { stopOnFirstProvenanceMismatch: false }],
    ['stopOnUnexpectedCost', { stopOnUnexpectedCost: false }],
    ['stopOnSchemaFailure', { stopOnSchemaFailure: false }],
    ['maxRequests', { maxRequests: TOPES_CANARY.maxRequests + 1 }],
    ['maxBudgetUsd', { maxBudgetUsd: TOPES_CANARY.maxBudgetUsd + 1 }],
    ['timeoutMs', { timeoutMs: TOPES_CANARY.timeoutMs + 1 }],
    ['model', { model: 'otro-modelo' }],
    ['maxOutputTokens', { maxOutputTokens: SHADOW_MODEL_CONFIG.maxOutputTokens + 1 }],
    ['sampleStrategy.porcentaje', { sampleStrategy: { tipo: 'PORCENTAJE', porcentaje: 0, semilla: 1 } }],
  ];
  for (const [campo, cambio] of INVALIDAS) {
    it(`rechaza: ${campo}`, () => expect(validarCanaryConfig({ ...habilitada, ...cambio })).toContain(campo));
  }
  describe('condiciones de parada', () => {
    const cfg: CanaryConfig = { ...habilitada, maxRequests: 10, stopOnAdapterErrorThreshold: 2 };
    it('se detiene en el primer incidente de privacidad y no se reanuda', () => {
      const c = crearControlCanary(cfg);
      expect(c.registrar({ tipo: 'INCIDENTE_PRIVACIDAD' })).toEqual({ accion: 'DETENER', razon: 'INCIDENTE_PRIVACIDAD' });
      expect(c.registrar({ tipo: 'OK', costoUsd: 0, estimadoUsd: 1 })).toEqual({ accion: 'DETENER', razon: 'INCIDENTE_PRIVACIDAD' });
    });
    it('se detiene ante la primera discrepancia de procedencia y el primer fallo de esquema', () => {
      expect(crearControlCanary(cfg).registrar({ tipo: 'PROCEDENCIA_NO_COINCIDE' }).accion).toBe('DETENER');
      expect(crearControlCanary(cfg).registrar({ tipo: 'FALLO_ESQUEMA' }).accion).toBe('DETENER');
    });
    it('costo inesperado: más de unexpectedCostFactor veces lo estimado', () => {
      const c = crearControlCanary(cfg);
      expect(c.registrar({ tipo: 'OK', costoUsd: 0.0019, estimadoUsd: 0.001 }).accion).toBe('CONTINUAR');
      expect(c.registrar({ tipo: 'OK', costoUsd: 0.0021, estimadoUsd: 0.001 })).toEqual({ accion: 'DETENER', razon: 'COSTO_INESPERADO' });
    });
    it('errores de adaptador: se detiene al alcanzar el umbral', () => {
      const c = crearControlCanary(cfg);
      expect(c.registrar({ tipo: 'ERROR_ADAPTADOR' }).accion).toBe('CONTINUAR');
      expect(c.registrar({ tipo: 'ERROR_ADAPTADOR' })).toEqual({ accion: 'DETENER', razon: 'ERRORES_ADAPTADOR' });
    });
    it('no excede maxRequests', () => {
      const c = crearControlCanary({ ...cfg, maxRequests: 2 });
      c.registrar({ tipo: 'OK', costoUsd: 0, estimadoUsd: 1 }); c.registrar({ tipo: 'OK', costoUsd: 0, estimadoUsd: 1 });
      expect(c.registrar({ tipo: 'OK', costoUsd: 0, estimadoUsd: 1 })).toEqual({ accion: 'DETENER', razon: 'MAX_REQUESTS' });
    });
  });
});

// ── G5-H ─────────────────────────────────────────────────────────────────────
describe('G5-H contrato GO / NO-GO', () => {
  const todoOk = Object.fromEntries(CONDICIONES_CANARY.map((c) => [c, { cumplida: true, evidencia: `evidencia de ${c}` }])) as Record<CondicionCanary, EvidenciaCondicion>;
  it('define exactamente las 11 condiciones del mandato', () => {
    expect([...CONDICIONES_CANARY].sort()).toEqual([
      'BUDGET_GT_ZERO_EXPLICITLY_AUTHORIZED', 'CLO_PROVENANCE_PILOT_APPROVED', 'FREDY_AUTHORIZATION', 'KILL_SWITCH_EXPLICITLY_AUTHORIZED',
      'NO_CORPUS_WRITES', 'NO_MODEL_AUTHORITY_OVER_LEGAL_VALIDITY', 'NO_PRIVATE_DATA', 'OFFICIAL_API_VERIFICATION_CURRENT',
      'PRIVACY_RESIDUAL_RISK_ACCEPTED_OR_MITIGATED', 'PRODUCTION_RESPONSE_INDEPENDENT', 'ROLLBACK_TESTED',
    ]);
  });
  it('GO solo con las 11 condiciones cumplidas y con evidencia', () => {
    expect(evaluarGoNoGo(todoOk)).toEqual({ decision: 'GO', razones: [] });
  });
  for (const c of CONDICIONES_CANARY) {
    it(`NO_GO si falla ${c}`, () => {
      const d = evaluarGoNoGo({ ...todoOk, [c]: { cumplida: false, evidencia: 'x' } });
      expect(d.decision).toBe('NO_GO');
      expect(d.razones).toEqual([{ condicion: c, motivo: 'NO_CUMPLIDA' }]);
    });
  }
  it('un booleano sin evidencia, o una condición ausente, no cuenta', () => {
    expect(evaluarGoNoGo({ ...todoOk, ROLLBACK_TESTED: { cumplida: true, evidencia: '  ' } }).razones).toEqual([{ condicion: 'ROLLBACK_TESTED', motivo: 'SIN_EVIDENCIA' }]);
    const { ROLLBACK_TESTED: _omitida, ...sinRollback } = todoOk;
    expect(evaluarGoNoGo(sinRollback).razones).toEqual([{ condicion: 'ROLLBACK_TESTED', motivo: 'AUSENTE' }]);
    expect(evaluarGoNoGo({}).decision).toBe('NO_GO');
  });
  it('el estado REAL del repositorio es NO_GO: nada de lo humano se atribuye automáticamente', () => {
    const d = decisionActualGoNoGo();
    expect(d.decision).toBe('NO_GO');
    const e = estadoActualGoNoGo();
    for (const c of ['FREDY_AUTHORIZATION', 'PRIVACY_RESIDUAL_RISK_ACCEPTED_OR_MITIGATED', 'ROLLBACK_TESTED', 'NO_PRIVATE_DATA'] as const) expect(e[c].cumplida).toBe(false);
    expect(e.BUDGET_GT_ZERO_EXPLICITLY_AUTHORIZED.cumplida).toBe(false);
    expect(e.KILL_SWITCH_EXPLICITLY_AUTHORIZED.cumplida).toBe(false);
    expect(e.CLO_PROVENANCE_PILOT_APPROVED.cumplida).toBe(false);
  });
});

// ── G5-E (reemplazado por G6-A: ver tests/ai-gateway-canary-g6.test.ts) ──────
describe('G5-E registro de verificación de OpenAI (esquema G6-A)', () => {
  it('cada entrada trae fuente, fecha, valor verificado y ubicación en el código', () => {
    for (const e of VERIFICACION_OPENAI) {
      expect(e.sourceUrl, e.id).toMatch(/^https:\/\//);
      expect(e.verificationDate, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.verifiedValue.length, e.id).toBeGreaterThan(10);
      expect(e.codeLocation.length, e.id).toBeGreaterThan(3);
    }
  });
  it('una verificación completa pero vieja deja de ser vigente', () => {
    expect(estadoVerificacionOpenAI(VERIFICACION_OPENAI, new Date('2026-10-25T00:00:00Z')).completa).toBe(true);
    expect(estadoVerificacionOpenAI(VERIFICACION_OPENAI, new Date('2026-12-01T00:00:00Z')).completa).toBe(false);
  });
  it('el SDK registrado coincide con package.json', () => {
    expect(JSON.parse(leer('package.json')).dependencies.openai).toBe('7.43.0');
    expect(VERIFICACION_OPENAI.find((e) => e.id === 'sdk-version')!.verifiedValue).toContain('7.43.0');
  });
});

// ── G5-A ─────────────────────────────────────────────────────────────────────
describe('G5-A herramienta del piloto de manifiesto', () => {
  const frag: FragmentoRAG = {
    id: 'sintetico:cp_a634', contenido: 'ARTICULO 634.- Texto sintético.', num_articulo: '634', fuente: 'Codigo Penal', relevancia: 1,
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
  };
  const completo: CandidatoPiloto = {
    clave: 'T-1', descripcion: 'prueba', fragmentoId: frag.id!, fuente: frag.fuente, numArticulo: '634', contenidoSha256: sha256Contenido(frag.contenido),
    fuenteOficial: { url: 'https://example.invalid/g.pdf', gaceta: '34,940', pdfSha256: 'a'.repeat(64) }, estadoVerificacion: 'V4', nota: 'sintético', revisionCLO: null,
  };
  const revision = { decision: 'APPROVED' as const, aprobadoPor: 'Dra. Persona Revisora', aprobadoEn: '2026-10-24', referencia: 'https://example.invalid/dictamen/1' };

  it('los candidatos reales del piloto están TODOS en PENDING_CLO_APPROVAL y fuera del manifiesto efectivo', () => {
    expect(CANDIDATOS_PILOTO.length).toBeGreaterThanOrEqual(2);
    for (const c of CANDIDATOS_PILOTO) {
      expect(etapaDe(c)).toBe('PENDING_CLO_APPROVAL');
      expect(c.revisionCLO).toBeNull();
      expect(aEntradaManifiesto(c)).toBeNull();
      expect(verificarCandidato(c).faltantes.length).toBeGreaterThan(0);
    }
    const ef = construirManifiestoEfectivo(CANDIDATOS_PILOTO);
    expect(ef.entradas).toEqual([]);
    expect(ef.fueraDelManifiesto.length).toBe(CANDIDATOS_PILOTO.length);
  });
  it('no inventa datos: URL, id canónico, hash de contenido y estado V siguen nulos', () => {
    for (const c of CANDIDATOS_PILOTO) {
      expect(c.fuenteOficial.url).toBeNull();
      expect(c.fragmentoId).toBeNull();
      expect(c.contenidoSha256).toBeNull();
      expect(c.estadoVerificacion).toBeNull();
    }
  });
  it('las Gacetas y los SHA-256 de los candidatos coinciden con el Golden Set (procedencia CLO)', () => {
    const p = PROCEDENCIA_G1['G1-VIG-CODIGO-PENAL-130-2017'];
    expect(p.kind).toBe('CLO_OFFICIAL_SOURCE_RULING');
    if (p.kind !== 'CLO_OFFICIAL_SOURCE_RULING') return;
    const porGaceta = new Map(p.officialSources.map((f) => [f.number, f.sha256]));
    for (const c of CANDIDATOS_PILOTO) expect(porGaceta.get(c.fuenteOficial.gaceta!), c.clave).toBe(c.fuenteOficial.pdfSha256);
    expect(GOLDEN_G1.some((c) => c.id === 'G1-VIG-CODIGO-PENAL-130-2017')).toBe(true);
  });
  it('flujo completo: candidato completo → PENDING → revisión formal → APPROVED → entrada del manifiesto', () => {
    expect(verificarCandidato(completo, frag)).toEqual({ faltantes: [], discrepancias: [], revisable: true });
    expect(etapaDe(completo, frag)).toBe('PENDING_CLO_APPROVAL');
    expect(aEntradaManifiesto(completo, frag)).toBeNull();
    const aprobado = registrarRevisionCLO(completo, revision);
    expect(etapaDe(aprobado, frag)).toBe('APPROVED');
    expect(aEntradaManifiesto(aprobado, frag)).toMatchObject({ fragmentoId: frag.id, aprobadoPor: revision.aprobadoPor, estadoVerificacion: 'V4' });
    expect(construirManifiestoEfectivo([aprobado, ...CANDIDATOS_PILOTO]).entradas).toHaveLength(1);
  });
  it('detecta discrepancias contra el fragmento actual (contenido cambiado → ya no es APPROVED)', () => {
    const aprobado = registrarRevisionCLO(completo, revision);
    const cambiado = { ...frag, contenido: `${frag.contenido} cambio` };
    expect(verificarCandidato(aprobado, cambiado).discrepancias).toContain('contenidoSha256');
    expect(etapaDe(aprobado, cambiado)).toBe('PENDING_CLO_APPROVAL');
  });
  it('no se puede aprobar un candidato incompleto ni con una revisión informal o automática', () => {
    expect(() => registrarRevisionCLO(CANDIDATOS_PILOTO[0], revision)).toThrow(/incompleto/);
    for (const mala of [
      { ...revision, aprobadoPor: '' }, { ...revision, aprobadoPor: 'Claude' }, { ...revision, aprobadoPor: 'sistema automático' },
      { ...revision, aprobadoEn: 'ayer' }, { ...revision, referencia: 'dictamen verbal' }, { ...revision, referencia: 'http://inseguro' },
    ]) expect(() => registrarRevisionCLO(completo, mala), JSON.stringify(mala)).toThrow();
  });
  it('un rechazo del CLO deja la entrada fuera', () => {
    const r = registrarRevisionCLO(completo, { ...revision, decision: 'REJECTED' });
    expect(etapaDe(r)).toBe('REJECTED');
    expect(aEntradaManifiesto(r, frag)).toBeNull();
  });
  it('el manifiesto efectivo real sigue VACÍO y el informe lo dice', () => {
    expect(MANIFIESTO_PROCEDENCIA_PUBLICA).toEqual([]);
    expect(informePiloto(CANDIDATOS_PILOTO)).toContain('MANIFIESTO EFECTIVO: 0 entrada(s) aprobada(s)');
  });
});

// ── G5-D ─────────────────────────────────────────────────────────────────────
describe('G5-D canary dry-run', () => {
  it('cubre los 10 escenarios pedidos', () => {
    const ids = ESCENARIOS_DRY_RUN.map((e) => e.id);
    for (const id of ['valid', 'no-evidence', 'invalid-provenance', 'pii', 'residual-privacy-risk', 'budget-exhausted', 'malformed-response', 'citation-failure', 'timeout', 'adapter-error']) expect(ids).toContain(id);
  });
  it('cada escenario termina como se esperaba y el simulacro es consistente', async () => {
    const r = await ejecutarDryRun();
    for (const x of r.resultados) expect(x.veredicto, x.id).toBe(x.esperado);
    expect(r.simulacroConsistente).toBe(true);
  });
  it('el escenario válido recorre todas las etapas en orden; los bloqueos no llegan al adaptador', async () => {
    const r = await ejecutarDryRun();
    const orden = ['privacidad', 'corpus estructural', 'procedencia', 'credencial', 'breaker', 'presupuesto', 'adaptador', 'validación', 'métricas', 'decisión del canary'];
    const valido = r.resultados.find((x) => x.id === 'valid')!;
    expect(valido.etapas.map((e) => e.nombre)).toEqual(orden);
    expect(valido.etapas.every((e) => e.resultado === 'PASS')).toBe(true);
    for (const id of ['no-evidence', 'pii', 'invalid-provenance', 'budget-exhausted']) {
      expect(r.resultados.find((x) => x.id === id)!.etapas.find((e) => e.nombre === 'adaptador')!.resultado, id).toBe('SKIP');
    }
  });
  it('las paradas usan la razón correcta', async () => {
    const por = Object.fromEntries((await ejecutarDryRun()).resultados.map((x) => [x.id, x.detenidoPor]));
    expect(por['invalid-provenance']).toBe('PROCEDENCIA_NO_COINCIDE');
    expect(por['residual-privacy-risk']).toBe('INCIDENTE_PRIVACIDAD');
    expect(por['malformed-response']).toBe('FALLO_ESQUEMA');
    expect(por['timeout']).toBe('ERRORES_ADAPTADOR');
    expect(por['adapter-error']).toBe('ERRORES_ADAPTADOR');
    expect(por['valid']).toBeNull();
  });
  it('el riesgo residual de privacidad es REAL: el gate lo deja pasar y solo el oráculo del simulacro lo detiene', async () => {
    const e = ESCENARIOS_DRY_RUN.find((x) => x.id === 'residual-privacy-risk')!;
    const x = (await ejecutarDryRun([e])).resultados[0];
    expect(x.etapas.find((s) => s.nombre === 'privacidad')!.resultado).toBe('PASS');
  });
  it('la decisión del canary es NO_GO con el estado real, aunque el simulacro sea consistente', async () => {
    const r = await ejecutarDryRun();
    expect(r.simulacroConsistente).toBe(true);
    expect(r.configPermiteTrafico).toBe(false);
    expect(r.decisionCanary.decision).toBe('NO_GO');
    const texto = textoReporte(r);
    expect(texto).toContain('NO-GO');
    expect(texto).toContain('Consistencia del simulacro: SÍ');
  });
  it('con un contrato hipotético completo la maquinaria SÍ puede producir GO (solo simulación)', async () => {
    const todo = Object.fromEntries(CONDICIONES_CANARY.map((c) => [c, { cumplida: true, evidencia: 'SIMULADO' }]));
    expect((await ejecutarDryRun(ESCENARIOS_DRY_RUN, todo)).decisionCanary.decision).toBe('GO');
  });
  it('no cambia ninguna constante real', async () => {
    await ejecutarDryRun();
    expect(SHADOW_GATEWAY_ENABLED).toBe(false);
    expect(SHADOW_BUDGET_USD).toBe(0);
    expect(MANIFIESTO_PROCEDENCIA_PUBLICA).toEqual([]);
  });
});

// ── G5-G ─────────────────────────────────────────────────────────────────────
describe('G5-G simulación de costo y latencia', () => {
  const c = simularCosto();
  it('percentiles ordenados y peor caso por encima de p99', () => {
    expect(c.porConsulta.p50).toBeLessThanOrEqual(c.porConsulta.p95);
    expect(c.porConsulta.p95).toBeLessThanOrEqual(c.porConsulta.p99);
    expect(c.porConsulta.p99).toBeLessThanOrEqual(c.peorCasoPorConsultaUsd);
    expect(c.peorCasoPorConsultaUsd).toBe(costoPeorCasoUsd());
  });
  it('proyecta 100, 1,000 y 10,000 consultas, y el peor caso escala linealmente', () => {
    expect(c.proyecciones.map((p) => p.consultas)).toEqual([100, 1000, 10_000]);
    for (const p of c.proyecciones) {
      expect(p.peorCasoUsd).toBeCloseTo(c.peorCasoPorConsultaUsd * p.consultas, 10);
      expect(p.simuladoUsd).toBeLessThan(p.peorCasoUsd);
      expect(p.esperadoUsd / p.simuladoUsd).toBeGreaterThan(0.8);
      expect(p.esperadoUsd / p.simuladoUsd).toBeLessThan(1.2);
    }
  });
  it('es determinista (semilla fija)', () => expect(simularCosto()).toEqual(c));
  it('usa las tarifas centrales: el costo cambia si cambian los tokens, no hay tarifas en el módulo', () => {
    expect(leer('lib', 'ai-gateway', 'canary', 'cost-latency-sim.ts')).not.toMatch(/UsdPerMillion\s*[:=]\s*\d/);
  });
  it('no modifica el presupuesto real', () => expect(SHADOW_BUDGET_USD).toBe(0));
  it('percentil: casos borde', () => {
    expect(percentil([], 95)).toBe(0);
    expect(percentil([5], 99)).toBe(5);
    expect(percentil([1, 2, 3, 4], 50)).toBe(2);
  });
  const l = simularLatencia(50);
  it('reporta todas las etapas y marca qué es medido y qué es supuesto', () => {
    expect(Object.keys(l.etapas)).toEqual(['retrieval', 'evidence', 'privacy', 'provenance', 'adapter', 'validation']);
    expect(l.etapas.adapter.origen).toBe('SUPUESTO');
    expect(l.etapas.privacy.origen).toBe('MEDIDO');
  });
  it('total shadow: p50 ≤ p95 ≤ p99 y excluye la recuperación', () => {
    expect(l.totalShadow.p50).toBeLessThanOrEqual(l.totalShadow.p95);
    expect(l.totalShadow.p95).toBeLessThanOrEqual(l.totalShadow.p99);
    // Las etapas MEDIDAS (privacidad, etc.) varían con la carga de la máquina: el margen es su p99 sumado, no una constante.
    const medidas = Object.values(l.etapas).filter((e) => e.origen === 'MEDIDO').reduce((a, e) => a + e.p99, 0);
    expect(l.totalShadow.p50).toBeLessThan(l.etapas.adapter.p50 + 5 + medidas);
  });
});

// ── G5-F ─────────────────────────────────────────────────────────────────────
describe('G5-F despacho diferido (preparado, no conectado)', () => {
  it('solo agenda: no ejecuta nada hasta que el programador invoca la tarea', () => {
    const tareas: Array<() => Promise<void>> = [];
    programarShadowDiferido({ queryId: 'q', pregunta: 'x', fragmentos: [], decision: 'ABSTAIN', retrievalState: undefined }, (t) => tareas.push(t));
    expect(tareas).toHaveLength(1);
  });
  it('la tarea nunca rechaza (con el kill switch apagado no hace nada) y un programador roto no propaga', async () => {
    const tareas: Array<() => Promise<void>> = [];
    programarShadowDiferido({ queryId: 'q2', pregunta: 'x', fragmentos: [], decision: 'ABSTAIN', retrievalState: undefined }, (t) => tareas.push(t));
    await expect(tareas[0]()).resolves.toBeUndefined();
    expect(() => programarShadowDiferido({ queryId: 'q3', pregunta: 'x', fragmentos: [], decision: 'ABSTAIN', retrievalState: undefined }, () => { throw new Error('sin after'); })).not.toThrow();
  });
  it('NO está conectado a producción: la ruta de chat no importa nada de canary ni el despacho diferido', () => {
    const ruta = leer('app', 'api', 'chat', 'route.ts');
    expect(ruta).not.toMatch(/despacho-diferido|programarShadowDiferido|ai-gateway\/canary/);
    expect(ruta).toMatch(/despacharShadow\(/);
  });
});

// ── Aislamiento del código de canary ──────────────────────────────────────────
describe('G5 aislamiento: ningún archivo de canary ni script abre red, lee secretos o importa el SDK', () => {
  const GUARD = new RegExp([String.raw`\bfetch\s*\(`, 'XMLHttpRequest', 'OPENAI_API_KEY', String.raw`process\.env`, '@supabase',
    String.raw`(?:from|import|require)\s*\(?\s*['"](?:openai|axios|undici|(?:node:)?https?)['"]`].join('|'));
  const dir = join(RAIZ, 'lib', 'ai-gateway', 'canary');
  for (const f of readdirSync(dir)) {
    it(`canary/${f}`, () => expect(readFileSync(join(dir, f), 'utf8')).not.toMatch(GUARD));
  }
  for (const f of ['g5-manifiesto-piloto.ts', 'g5-dry-run.ts', 'g5-cost-latency.ts', 'g5-privacy-metrics.ts']) {
    it(`scripts/${f}`, () => expect(leer('scripts', f)).not.toMatch(GUARD));
  }
  it('despacho-diferido.ts', () => expect(leer('lib', 'ai-gateway', 'shadow', 'despacho-diferido.ts')).not.toMatch(GUARD));
  it('nada en la aplicación importa el módulo canary salvo él mismo, scripts y pruebas', () => {
    const ruta = (d: string): string[] => readdirSync(join(RAIZ, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() && !['node_modules', '.next'].includes(e.name) ? ruta(join(d, e.name)) : e.isFile() && /\.(ts|tsx)$/.test(e.name) ? [join(d, e.name)] : []);
    for (const f of [...ruta('app'), ...ruta('lib')].filter((x) => !x.startsWith(join('lib', 'ai-gateway', 'canary')))) {
      expect(readFileSync(join(RAIZ, f), 'utf8'), f).not.toMatch(/ai-gateway\/canary|\.\/canary\//);
    }
  });
});
