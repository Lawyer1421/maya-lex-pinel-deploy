/**
 * G6-A/B/E/G/H/I/J — pruebas offline del paquete de autorización. Sin red, sin API key, sin tráfico real.
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHADOW_MODEL_CONFIG } from '@/lib/ai-gateway/shadow/shadow-model-config';
import { MANIFIESTO_PROCEDENCIA_PUBLICA } from '@/lib/ai-gateway/shadow/public-provenance-manifest';
import { SHADOW_GATEWAY_ENABLED } from '@/lib/ai-gateway/shadow/config';
import { SHADOW_BUDGET_USD } from '@/lib/ai-gateway/shadow/shadow-model-config';
import { CANARY_CONFIG, canaryConfigPermiteTrafico } from '@/lib/ai-gateway/canary/canary-config';
import { ESTADO_ZDR_MAYALEX, VERIFICACION_OPENAI, entradaValida, estadoVerificacionOpenAI } from '@/lib/ai-gateway/canary/openai-verification';
import { CANDIDATOS_PILOTO } from '@/lib/ai-gateway/canary/pilot-candidates';
import { generarPaqueteCLO, resumenPaquete } from '@/lib/ai-gateway/canary/clo-pilot-pack';
import { certificarServerless, inspeccionarRuta } from '@/lib/ai-gateway/canary/serverless-certification';
import { ESCALAS_COSTO, calcularPaquete, documentoCostos, peorCasoPorConsultaUsd, presupuestoRecomendadoUsd } from '@/lib/ai-gateway/canary/cost-authorization';
import { MAX_SOLICITUDES_PROPUESTAS, PROPUESTA_CANARY, validarPropuesta, verificarSolicitudContraPropuesta } from '@/lib/ai-gateway/canary/canary-proposal';
import { construirPaquete, textoPaquete } from '@/lib/ai-gateway/canary/authorization-pack';
import { decisionActualGoNoGo, estadoActualGoNoGo } from '@/lib/ai-gateway/canary/estado-actual';
import { ejecutarDryRun } from '@/lib/ai-gateway/canary/dry-run';
import { ejecutarCanarySintetico, type ConfigSintetica, type SolicitudSintetica } from '@/lib/ai-gateway/canary/synthetic-canary';

const RAIZ = join(__dirname, '..');
const leer = (...p: string[]) => readFileSync(join(RAIZ, ...p), 'utf8');
const fixture = JSON.parse(leer('tests', 'fixtures', 'openai-official-2026-10-23.json'));
const AHORA = new Date('2026-10-23T12:00:00Z');

describe('G6-A verificación oficial de OpenAI', () => {
  it('toda entrada es válida y tiene fuente oficial, fecha y ubicación en el código', () => {
    for (const e of VERIFICACION_OPENAI) {
      expect(entradaValida(e), e.id).toBe(true);
      expect(e.sourceUrl).toMatch(/^https:\/\/(developers\.openai\.com\/|registry\.npmjs\.org\/openai|github\.com\/openai\/)/);
      expect(e.codeLocation.length).toBeGreaterThan(5);
    }
    expect(estadoVerificacionOpenAI(undefined, AHORA).completa).toBe(true);
  });
  it('caduca: pasados 7 días la verificación ya no está vigente', () => {
    expect(estadoVerificacionOpenAI(undefined, new Date('2026-11-05T00:00:00Z')).vigente).toBe(false);
    expect(estadoVerificacionOpenAI(undefined, new Date('2026-11-05T00:00:00Z')).completa).toBe(false);
  });
  it('una entrada NOT_VERIFIED impide la verificación completa', () => {
    const e = [...VERIFICACION_OPENAI, { ...VERIFICACION_OPENAI[0], id: 'x', estado: 'NOT_VERIFIED' as const, metodo: undefined }];
    expect(estadoVerificacionOpenAI(e, AHORA).completa).toBe(false);
  });
  it('sin deriva: la configuración coincide con lo capturado de la documentación oficial', () => {
    const P = SHADOW_MODEL_CONFIG.pricing;
    expect(SHADOW_MODEL_CONFIG.modelId).toBe(fixture.model);
    expect(P.standard.inputUsdPerMillion).toBe(fixture.standard.input);
    expect(P.standard.outputUsdPerMillion).toBe(fixture.standard.output);
    expect(P.longContext.thresholdInputTokens).toBe(fixture.longContext.thresholdInputTokens);
  });
  it('store:false no se presenta como ZDR: ZDR no está aprobado ni tiene evidencia', () => {
    expect(ESTADO_ZDR_MAYALEX).toEqual({ approved: false, evidence: null });
    const zdr = VERIFICACION_OPENAI.find((e) => e.id === 'store-false-vs-zdr');
    expect(zdr?.verifiedValue).toMatch(/NO activa ZDR/);
    expect(zdr?.nota).toMatch(/NO se declara ZDR/);
  });
});

describe('G6-B paquete del piloto para el CLO', () => {
  it('nada está aprobado y el manifiesto efectivo está vacío', () => {
    const r = resumenPaquete(CANDIDATOS_PILOTO);
    expect(r.approved).toBe(0);
    expect(r.effectiveManifestCount).toBe(0);
    expect(MANIFIESTO_PROCEDENCIA_PUBLICA).toHaveLength(0);
    expect(r.pendingCloApproval).toBe(CANDIDATOS_PILOTO.length);
  });
  it('el documento commiteado coincide con el generado (sin deriva)', () => {
    expect(leer('docs', 'governance', 'evidence', 'g6-clo-pilot-pack.md')).toBe(generarPaqueteCLO(CANDIDATOS_PILOTO));
  });
  it('no inventa datos: lo que falta aparece como pendiente', () => {
    const doc = generarPaqueteCLO(CANDIDATOS_PILOTO);
    expect(doc).toMatch(/PENDING_VERIFICATION/);
    expect(doc).toMatch(/PENDING_CLO_APPROVAL/);
  });
});

describe('G6-E certificación serverless', () => {
  const cert = certificarServerless(RAIZ);
  it('la independencia de la respuesta HTTP está demostrada y el shadow NO usa after() en producción', () => {
    expect(cert.PRODUCTION_HTTP_RESPONSE_INDEPENDENT).toBe(true);
    const ruta = inspeccionarRuta(leer('app', 'api', 'chat', 'route.ts'));
    // after() ya existe en la ruta solo para logConsulta; el despacho del shadow NO está dentro de ningún after().
    expect(/after\(\s*\(\)\s*=>\s*\{?\s*despacharShadow/.test(leer('app', 'api', 'chat', 'route.ts'))).toBe(false);
    expect(ruta.despachoShadowProtegidoConTryCatch).toBe(true);
  });
  it('no se declara certificada mientras haya puntos sin verificar (Fluid Compute / maxDuration)', () => {
    const noVer = cert.puntos.filter((p) => p.estado === 'NOT_VERIFIED');
    expect(cert.certificada).toBe(noVer.length === 0);
    for (const p of noVer) expect(p.pendiente, p.id).toBeTruthy();
  });
  it('inspeccionarRuta detecta runtime edge, maxDuration y after()', () => {
    const t = "export const runtime = 'edge';\nexport const maxDuration = 60;\nafter(() => {});";
    expect(inspeccionarRuta(t)).toMatchObject({ runtime: 'edge', exportaMaxDuration: true, usaAfter: true, llamadasAfter: 1 });
  });
});

describe('G6-H paquete de costos', () => {
  it('cubre 1/5/10/100/1000/10000 con esperado ≤ p95 ≤ p99 ≤ peor caso', () => {
    for (const base of ['NOMINAL', 'CONSERVADORA'] as const) {
      const p = calcularPaquete(base);
      expect(p.filas.map((f) => f.consultas)).toEqual([...ESCALAS_COSTO]);
      for (const f of p.filas) {
        expect(f.esperadoUsd, `${base} ${f.consultas}`).toBeLessThanOrEqual(f.p95Usd);
        expect(f.p95Usd).toBeLessThanOrEqual(f.p99Usd);
        expect(f.p99Usd).toBeLessThanOrEqual(f.peorCasoUsd);
      }
    }
  });
  it('la base conservadora nunca cuesta menos que la nominal, y la caché la reduce', () => {
    const a = calcularPaquete('NOMINAL').filas[0].esperadoUsd;
    const b = calcularPaquete('CONSERVADORA').filas[0].esperadoUsd;
    expect(b).toBeGreaterThanOrEqual(a);
    expect(calcularPaquete('CONSERVADORA', 0.5).filas[0].esperadoUsd).toBeLessThan(b);
  });
  it('el presupuesto recomendado cubre 1.5× el peor caso y NO se aplica', () => {
    expect(presupuestoRecomendadoUsd(8)).toBeGreaterThanOrEqual(peorCasoPorConsultaUsd() * 8 * 1.5);
    expect(SHADOW_BUDGET_USD).toBe(0);
    expect(CANARY_CONFIG.maxBudgetUsd).toBe(0);
  });
  it('el documento commiteado coincide con el generado', () => {
    expect(leer('docs', 'governance', 'evidence', 'g6-cost-authorization.md')).toBe(documentoCostos());
  });
});

describe('G6-G propuesta del primer canary (solo preparada)', () => {
  it('es coherente, pequeña y con lista blanca; NO es la configuración real', () => {
    expect(validarPropuesta()).toEqual([]);
    expect(PROPUESTA_CANARY.maxRequests).toBe(MAX_SOLICITUDES_PROPUESTAS);
    expect(PROPUESTA_CANARY.sampleStrategy.tipo).toBe('LISTA_BLANCA');
    expect(PROPUESTA_CANARY.allowedManifestEntries).toEqual([]);
    expect(canaryConfigPermiteTrafico(CANARY_CONFIG)).toBe(false);
    expect(CANARY_CONFIG).toMatchObject({ enabled: false, maxRequests: 0, maxBudgetUsd: 0 });
    expect(CANARY_CONFIG.sampleStrategy.tipo).toBe('NINGUNA');
  });
  it('la solicitud real al modelo cumple las restricciones (store:false, sin tools, esquema estricto, reasoning none)', () => {
    expect(verificarSolicitudContraPropuesta()).toEqual([]);
  });
  it('una propuesta fuera de rango se detecta', () => {
    expect(validarPropuesta({ ...PROPUESTA_CANARY, maxRequests: 500 })).toContain('maxRequests_fuera_de_5_10');
  });
});

describe('G6-J canary sintético (fake adapter, sin red)', () => {
  const PREG_OK = '¿Qué dice el artículo 634 del Código Penal (Decreto 130-2017)?';
  const config = (extra: Partial<ConfigSintetica> = {}, ids: string[] = ['a', 'b', 'c', 'd']): ConfigSintetica => ({
    ...PROPUESTA_CANARY, allowedManifestEntries: ['sintetico:cp_d130_a634'], sampleStrategy: { tipo: 'LISTA_BLANCA', queryIds: ids }, presupuestoSimuladoUsd: 1, ...extra,
  });
  const sol = (id: string, pregunta = PREG_OK, falloInyectado?: SolicitudSintetica['falloInyectado']): SolicitudSintetica => ({ id, pregunta, falloInyectado });

  it('camino feliz: la producción responde siempre antes y el shadow corre tarde', async () => {
    const r = await ejecutarCanarySintetico(config(), [sol('a'), sol('b')]);
    expect(r.respuestasDeProduccion).toHaveLength(2);
    expect(r.todasTardias).toBe(true);
    expect(r.registros.every((x) => x.resultado === 'COMPLETADA' || x.resultado === 'ENVOLVENTE_RECHAZA')).toBe(true);
    expect(r.rollback).toEqual({ SHADOW_GATEWAY_ENABLED: false, enabled: false, maxRequests: 0, maxBudgetUsd: 0, sampleStrategy: 'NINGUNA' });
  });
  it('lo que no está en la lista blanca no se muestrea', async () => {
    const r = await ejecutarCanarySintetico(config(), [sol('zzz')]);
    expect(r.registros[0].resultado).toBe('NO_MUESTREADA');
    expect(r.solicitudesAdmitidas).toBe(0);
  });
  it('datos privados nunca llegan al adaptador', async () => {
    const r = await ejecutarCanarySintetico(config(), [sol('a', 'Mi cliente Juan Pérez con DNI 0801-1990-12345 pregunta por el artículo 634')]);
    expect(r.solicitudesAdmitidas).toBe(0);
    expect(r.registros[0].resultado).not.toBe('COMPLETADA');
  });
  it('un fallo inyectado detiene el canary y no se reanuda', async () => {
    const r = await ejecutarCanarySintetico(config(), [sol('a', PREG_OK, 'ESQUEMA'), sol('b'), sol('c')]);
    expect(r.detenidoPor).not.toBeNull();
    expect(r.registros.filter((x) => x.resultado === 'COMPLETADA')).toHaveLength(0);
  });
  it('maxRequests se respeta', async () => {
    const r = await ejecutarCanarySintetico(config({ maxRequests: 2 }, ['a', 'b', 'c', 'd']), [sol('a'), sol('b'), sol('c'), sol('d')]);
    expect(r.solicitudesAdmitidas).toBeLessThanOrEqual(2);
  });
  it('presupuesto simulado agotado rechaza la solicitud', async () => {
    const r = await ejecutarCanarySintetico(config({ presupuestoSimuladoUsd: 0 }), [sol('a')]);
    expect(r.registros[0].resultado).toBe('PRESUPUESTO_RECHAZA');
  });
  it('el módulo sintético no hace red ni lee credenciales', () => {
    const fuente = leer('lib', 'ai-gateway', 'canary', 'synthetic-canary.ts');
    expect(fuente).not.toMatch(/process\.env|\bfetch\(|openai-adapter|crearAdaptadorSombra/);
  });
});

describe('G6-I paquete de autorización', () => {
  const p = construirPaquete({ raiz: RAIZ, ahora: AHORA });
  it('la decisión es NOT_READY mientras falten aprobación humana del CLO y certificación Vercel; los valores reales siguen apagados', () => {
    expect(p.decision).toBe('NOT_READY_FOR_FREDY_DECISION');
    const ids = p.bloqueos.map((b) => b.id).sort();
    expect(ids).toEqual(['CLO_PILOT_APPROVED', 'EFFECTIVE_MANIFEST_GT_ZERO', 'SERVERLESS_CERTIFIED']);
    expect(p.valoresReales).toEqual({ SHADOW_GATEWAY_ENABLED: false, SHADOW_BUDGET_USD: 0, enabled: false, maxRequests: 0, maxBudgetUsd: 0, sampleStrategy: 'NINGUNA' });
    expect(SHADOW_GATEWAY_ENABLED).toBe(false);
  });
  it('el contrato de activación sigue en NO_GO (READY no activa nada)', () => {
    expect(p.contratoDeActivacion.decision).not.toBe('GO');
  });
  it('los bloqueos humanos tienen responsable que no es el agente', () => {
    for (const b of p.bloqueos) expect(['CLO', 'ADMIN_VERCEL', 'FREDY']).toContain(b.responsable);
  });
  it('el documento commiteado coincide con el generado a la fecha fija (--as-of 2026-10-23)', () => {
    expect(leer('docs', 'governance', 'evidence', 'g6-authorization-pack.md')).toBe(textoPaquete(p));
    expect(JSON.parse(leer('docs', 'governance', 'evidence', 'g6-authorization-pack.json'))).toEqual(JSON.parse(JSON.stringify(p)));
  });
  it('la evidencia obsoleta invalida condiciones: sin evidencia en la raíz, el paquete no puede ser READY', () => {
    const vacio = mkdtempSync(join(tmpdir(), 'g6-pack-'));
    mkdirSync(join(vacio, 'app', 'api', 'chat'), { recursive: true });
    mkdirSync(join(vacio, 'lib', 'ai-gateway'), { recursive: true });
    writeFileSync(join(vacio, 'app', 'api', 'chat', 'route.ts'), leer('app', 'api', 'chat', 'route.ts'));
    const q = construirPaquete({ raiz: vacio, ahora: AHORA });
    expect(q.decision).toBe('NOT_READY_FOR_FREDY_DECISION');
  });
});

describe('fecha «ahora» inyectada de punta a punta (determinismo con --as-of)', () => {
  afterEach(() => { vi.useRealTimers(); });
  const RELOJES = ['2026-10-23T12:00:00Z', '2026-10-30T09:00:00Z', '2027-03-01T00:00:00Z'];

  it('el paquete con ahora fija es idéntico sin importar el reloj real (incluido el contrato de activación)', () => {
    const resultados = RELOJES.map((reloj) => {
      vi.useFakeTimers(); vi.setSystemTime(new Date(reloj));
      const pack = construirPaquete({ raiz: RAIZ, ahora: AHORA });
      vi.useRealTimers();
      return JSON.stringify(pack);
    });
    expect(new Set(resultados).size).toBe(1);
  });
  it('con ahora = 2026-10-23 la verificación oficial figura vigente en el contrato aunque el reloj real sea posterior', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2027-03-01T00:00:00Z'));
    const pack = construirPaquete({ raiz: RAIZ, ahora: AHORA });
    expect(JSON.stringify(pack.contratoDeActivacion)).not.toContain('OFFICIAL_API_VERIFICATION_CURRENT');
  });
  it('con una ahora posterior a 7 días la misma verificación deja de estar vigente (la fecha inyectada manda, no el reloj)', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    const tarde = construirPaquete({ raiz: RAIZ, ahora: new Date('2026-11-05T12:00:00Z') });
    expect(JSON.stringify(tarde.contratoDeActivacion)).toContain('OFFICIAL_API_VERIFICATION_CURRENT');
    expect(tarde.condiciones.find((x) => x.id === 'OPENAI_OFFICIAL_VERIFICATION_CURRENT')!.estado).toBe('NOT_MET');
  });
  it('estadoActualGoNoGo y decisionActualGoNoGo reciben la fecha', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2027-03-01T00:00:00Z'));
    expect(estadoActualGoNoGo(AHORA).OFFICIAL_API_VERIFICATION_CURRENT.cumplida).toBe(true);
    expect(estadoActualGoNoGo(new Date('2026-11-05T12:00:00Z')).OFFICIAL_API_VERIFICATION_CURRENT.cumplida).toBe(false);
    expect(JSON.stringify(decisionActualGoNoGo(AHORA))).not.toContain('OFFICIAL_API_VERIFICATION_CURRENT');
    expect(JSON.stringify(decisionActualGoNoGo(new Date('2026-11-05T12:00:00Z')))).toContain('OFFICIAL_API_VERIFICATION_CURRENT');
  });
  it('el dry-run también usa la fecha inyectada cuando no se le dan entradas de contrato', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2027-03-01T00:00:00Z'));
    const hoy = await ejecutarDryRun([], undefined, AHORA);
    const tarde = await ejecutarDryRun([], undefined, new Date('2026-11-05T12:00:00Z'));
    expect(JSON.stringify(hoy.decisionCanary)).not.toContain('OFFICIAL_API_VERIFICATION_CURRENT');
    expect(JSON.stringify(tarde.decisionCanary)).toContain('OFFICIAL_API_VERIFICATION_CURRENT');
  });
  it('el origen no llama a estadoActualGoNoGo() sin fecha en el paquete', () => {
    expect(leer('lib', 'ai-gateway', 'canary', 'authorization-pack.ts')).not.toMatch(/estadoActualGoNoGo\(\)/);
  });
});
