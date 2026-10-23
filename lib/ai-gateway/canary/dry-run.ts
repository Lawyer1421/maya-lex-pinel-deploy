/**
 * lib/ai-gateway/canary/dry-run.ts
 * G5-D: simulacro COMPLETAMENTE offline de un canary. Recorre las mismas compuertas que el dispatcher real, en el
 * mismo orden y con los mismos componentes puros, pero con credencial, presupuesto y adaptador SIMULADOS.
 * No abre red, no lee entorno, no toca el estado global del dispatcher y no cambia ninguna constante.
 *
 *   pregunta → privacidad → corpus estructural → procedencia → credencial → breaker → presupuesto
 *            → adaptador falso → salida estructurada → validación de citas → métricas → decisión del canary
 *
 * Hay DOS veredictos distintos y no se mezclan:
 *   - consistencia del simulacro: cada escenario terminó como se esperaba (la maquinaria funciona);
 *   - decisión del canary GO / NO-GO: la del contrato (go-no-go.ts) sobre el estado REAL del repositorio.
 */
import type { FragmentoRAG } from '../../legal-retrieval/types';
import { crearBudgetGuard } from '../shadow/budget-guard';
import { crearCircuitBreaker } from '../shadow/circuit-breaker';
import type { SalidaCruda } from '../shadow/citation-validator';
import { validarSalida } from '../shadow/citation-validator';
import { aEvidencia, conTimeout, peorCasoUsd } from '../shadow/dispatcher';
import { privacyGate } from '../shadow/privacy-gate';
import { evaluarCorpusPublico } from '../shadow/public-corpus-gate';
import { evaluarProcedenciaFuerte, proponerEntradaManifiesto, type EntradaProcedencia } from '../shadow/public-provenance';
import type { ShadowGatewayInput } from '../shadow/types';
import { CANARY_CONFIG, canaryConfigPermiteTrafico, crearControlCanary, type CanaryConfig, type EventoCanary } from './canary-config';
import { evaluarGoNoGo, textoGoNoGo, type DecisionGoNoGo, type EntradasGoNoGo } from './go-no-go';
import { estadoActualGoNoGo } from './estado-actual';

export type Veredicto = 'OK' | 'BLOQUEADO_POR_COMPUERTA' | 'DETENER' | 'DEGRADADO';

export interface EscenarioDryRun {
  id: string;
  descripcion: string;
  pregunta: string;
  fragmentos: readonly FragmentoRAG[];
  manifiesto: readonly EntradaProcedencia[];
  /** Adaptador SIMULADO. Recibe la señal de aborto como el real. */
  adaptador: (input: ShadowGatewayInput, signal: AbortSignal) => Promise<SalidaCruda>;
  credencialSimulada?: boolean;
  presupuestoSimuladoUsd?: number;
  timeoutMs?: number;
  /** Oráculo del simulacro: la pregunta contiene datos personales reales aunque el gate no los vea. */
  oraculoPiiReal?: boolean;
  esperado: Veredicto;
}

export interface EtapaDryRun { nombre: string; resultado: 'PASS' | 'FAIL' | 'SKIP'; detalle: string | null; ms: number }

export interface ResultadoEscenario {
  id: string;
  etapas: EtapaDryRun[];
  veredicto: Veredicto;
  esperado: Veredicto;
  coincide: boolean;
  motivo: string | null;
  estadoSombra: string | null;
  costoUsd: number;
  latenciaAdaptadorMs: number | null;
  detenidoPor: string | null;
}

/** Configuración HIPOTÉTICA solo para el simulacro; nunca se exporta como configuración real. */
const CONFIG_SIMULADA: CanaryConfig = Object.freeze({
  ...CANARY_CONFIG, enabled: true, maxRequests: 10, maxBudgetUsd: 0.04,
  allowedManifestEntries: Object.freeze(['SIMULADO']), sampleStrategy: Object.freeze({ tipo: 'PRIMERAS_N' as const }),
});

const medir = <T>(f: () => T): [T, number] => { const t = performance.now(); const r = f(); return [r, performance.now() - t]; };

export async function ejecutarEscenario(e: EscenarioDryRun): Promise<ResultadoEscenario> {
  const etapas: EtapaDryRun[] = [];
  const control = crearControlCanary(CONFIG_SIMULADA);
  const anotar = (nombre: string, resultado: EtapaDryRun['resultado'], detalle: string | null, ms = 0) => etapas.push({ nombre, resultado, detalle, ms });
  const fin = (veredicto: Veredicto, motivo: string | null, extra: Partial<ResultadoEscenario> = {}, evento?: EventoCanary): ResultadoEscenario => {
    let v = veredicto;
    let detenidoPor: string | null = null;
    if (evento) {
      const d = control.registrar(evento);
      if (d.accion === 'DETENER') { v = 'DETENER'; detenidoPor = d.razon; }
    }
    const rest = ['privacidad', 'corpus estructural', 'procedencia', 'credencial', 'breaker', 'presupuesto', 'adaptador', 'validación'];
    for (const n of rest) if (!etapas.some((x) => x.nombre === n)) anotar(n, 'SKIP', null);
    anotar('métricas', 'PASS', null);
    anotar('decisión del canary', v === 'OK' || v === 'BLOQUEADO_POR_COMPUERTA' ? 'PASS' : 'FAIL', v);
    return { id: e.id, etapas, veredicto: v, esperado: e.esperado, coincide: v === e.esperado, motivo, estadoSombra: null, costoUsd: 0, latenciaAdaptadorMs: null, detenidoPor, ...extra };
  };

  // 1. Privacidad.
  const [priv, msPriv] = medir(() => privacyGate(e.pregunta));
  if (priv.estado !== 'PASS') { anotar('privacidad', 'FAIL', `${priv.etapa}:${priv.razon}`, msPriv); return fin('BLOQUEADO_POR_COMPUERTA', `privacidad ${priv.etapa}`); }
  anotar('privacidad', 'PASS', null, msPriv);
  if (e.oraculoPiiReal) {
    // La compuerta dejó pasar datos personales reales (riesgo residual): en un canary real esto sería un incidente.
    return fin('DETENER', 'INCIDENTE_PRIVACIDAD (riesgo residual)', {}, { tipo: 'INCIDENTE_PRIVACIDAD' });
  }

  // 2. Corpus estructural.
  const [corpus, msCorpus] = medir(() => evaluarCorpusPublico(e.fragmentos));
  if (corpus.estado !== 'PUBLIC_CORPUS_PASS') { anotar('corpus estructural', 'FAIL', corpus.razon, msCorpus); return fin('BLOQUEADO_POR_COMPUERTA', `corpus ${corpus.razon}`); }
  anotar('corpus estructural', 'PASS', null, msCorpus);

  // 3. Procedencia fuerte.
  const [prov, msProv] = medir(() => evaluarProcedenciaFuerte(e.fragmentos, e.manifiesto));
  if (prov.estado !== 'PROVENANCE_PASS') {
    anotar('procedencia', 'FAIL', prov.razon, msProv);
    return fin('BLOQUEADO_POR_COMPUERTA', `procedencia ${prov.razon}`, {}, prov.razon === 'fragmento_sin_manifiesto' || prov.razon === 'sin_evidencia' ? undefined : { tipo: 'PROCEDENCIA_NO_COINCIDE' });
  }
  anotar('procedencia', 'PASS', null, msProv);

  // 4. Credencial (simulada).
  if (e.credencialSimulada === false) { anotar('credencial', 'FAIL', 'simulada ausente'); return fin('BLOQUEADO_POR_COMPUERTA', 'sin credencial'); }
  anotar('credencial', 'PASS', 'simulada');

  // 5. Breaker.
  const breaker = crearCircuitBreaker();
  if (!breaker.permitir()) { anotar('breaker', 'FAIL', 'abierto'); return fin('BLOQUEADO_POR_COMPUERTA', 'breaker abierto'); }
  anotar('breaker', 'PASS', null);

  const input: ShadowGatewayInput = {
    queryId: e.id, sanitizedQuestion: e.pregunta, evidence: aEvidencia(e.fragmentos),
    productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
  };

  // 6. Presupuesto (simulado).
  const presupuesto = crearBudgetGuard({ presupuestoUsd: e.presupuestoSimuladoUsd ?? 0.04, ventanaMs: 86_400_000 });
  const reserva = peorCasoUsd(input);
  if (!presupuesto.reservar(reserva)) { breaker.cancelarSonda(); anotar('presupuesto', 'FAIL', 'agotado'); return fin('BLOQUEADO_POR_COMPUERTA', 'presupuesto agotado'); }
  anotar('presupuesto', 'PASS', `reserva ${reserva.toFixed(6)} USD`);

  // 7. Adaptador falso.
  const t0 = performance.now();
  let cruda: SalidaCruda;
  try {
    cruda = await conTimeout((signal) => e.adaptador(input, signal), e.timeoutMs ?? CONFIG_SIMULADA.timeoutMs);
  } catch (err) {
    breaker.fallo();
    presupuesto.liquidar(reserva, Number.NaN);
    const esTimeout = err instanceof Error && err.message === 'TIMEOUT';
    anotar('adaptador', 'FAIL', esTimeout ? 'TIMEOUT' : 'ERROR', performance.now() - t0);
    return fin('DETENER', esTimeout ? 'timeout del adaptador' : 'error del adaptador', { costoUsd: reserva }, { tipo: 'ERROR_ADAPTADOR' });
  }
  const msAd = performance.now() - t0;
  breaker.exito();
  anotar('adaptador', 'PASS', null, msAd);

  // 8–9. Salida estructurada + validación de citas + métricas.
  const [res, msVal] = medir(() => validarSalida(input, cruda));
  presupuesto.liquidar(reserva, res.usage.estimatedCostUsd);
  const base = { estadoSombra: res.status, costoUsd: res.usage.estimatedCostUsd, latenciaAdaptadorMs: cruda.latencyMs };
  if (res.status === 'INVALID') {
    anotar('validación', 'FAIL', res.invalidReason ?? 'INVALID', msVal);
    return fin('DETENER', `salida inválida: ${res.invalidReason ?? 'INVALID'}`, base, { tipo: 'FALLO_ESQUEMA' });
  }
  if (res.discardedClaims.length > 0 || res.invalidCitations > 0) {
    anotar('validación', 'FAIL', `claims descartadas: ${res.discardedClaims.length}`, msVal);
    return fin('DEGRADADO', 'fallo de citas', base, { tipo: 'OK', costoUsd: res.usage.estimatedCostUsd, estimadoUsd: reserva });
  }
  anotar('validación', 'PASS', res.status, msVal);
  return fin('OK', null, base, { tipo: 'OK', costoUsd: res.usage.estimatedCostUsd, estimadoUsd: reserva });
}

// ── Escenarios sintéticos ──────────────────────────────────────────────────────
const TEXTO = 'ARTICULO 173.- El plazo de prescripción es el señalado en este Código.';
const frag = (x: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'sintetico:cpp_a173', contenido: TEXTO, num_articulo: '173', fuente: 'Codigo Procesal Penal', relevancia: 0.9,
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...x,
});
const OFICIAL = { url: 'https://example.invalid/gaceta/sintetica.pdf', gaceta: '00,000', pdfSha256: '0'.repeat(64) };
const manifiestoSintetico = (f = frag()): EntradaProcedencia[] => [proponerEntradaManifiesto(f, OFICIAL, { estadoVerificacion: 'V4', aprobadoPor: 'Persona de Prueba', aprobadoEn: '2026-10-23' })];
const salidaParcial = (): SalidaCruda => ({
  rawOutput: {
    decision: 'ANSWER',
    claims: [
      { claim_id: 'c1', text: 'El art. 173 fija el plazo.', citations: [{ chunk_id: 'sintetico:cpp_a173', support: 'DIRECT' }] },
      { claim_id: 'c2', text: 'Afirmación con cita inexistente.', citations: [{ chunk_id: 'chunk-inexistente', support: 'DIRECT' }] },
    ],
    abstention_reason: null,
  },
  usage: { inputTokens: 900, outputTokens: 120 }, latencyMs: 1300,
});
const salidaValida = (chunk = 'sintetico:cpp_a173'): SalidaCruda => ({
  rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 'El art. 173 fija el plazo.', citations: [{ chunk_id: chunk, support: 'DIRECT' }] }], abstention_reason: null },
  usage: { inputTokens: 900, outputTokens: 80 }, latencyMs: 1200,
});
const P_OK = '¿Qué dice el artículo 173 del Código Procesal Penal sobre la prescripción?';

export const ESCENARIOS_DRY_RUN: readonly EscenarioDryRun[] = [
  { id: 'valid', descripcion: 'Pregunta pública, evidencia con procedencia probada, respuesta correcta', pregunta: P_OK, fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: async () => salidaValida(), esperado: 'OK' },
  { id: 'no-evidence', descripcion: 'Sin fragmentos recuperados', pregunta: P_OK, fragmentos: [], manifiesto: manifiestoSintetico(), adaptador: async () => salidaValida(), esperado: 'BLOQUEADO_POR_COMPUERTA' },
  { id: 'invalid-provenance', descripcion: 'El contenido recuperado difiere del aprobado en el manifiesto', pregunta: P_OK, fragmentos: [frag({ contenido: `${TEXTO} (alterado)` })], manifiesto: manifiestoSintetico(), adaptador: async () => salidaValida(), esperado: 'DETENER' },
  { id: 'pii', descripcion: 'La pregunta trae un correo electrónico', pregunta: 'Mi correo es juan.perez@example.com, ¿qué dice el artículo 173?', fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: async () => salidaValida(), esperado: 'BLOQUEADO_POR_COMPUERTA' },
  { id: 'residual-privacy-risk', descripcion: 'Nombre en minúscula fuera del diccionario: el gate lo deja pasar (riesgo residual conocido)', pregunta: '¿qué dice el artículo 173 sobre zacarias quiroz?', fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: async () => salidaValida(), oraculoPiiReal: true, esperado: 'DETENER' },
  { id: 'budget-exhausted', descripcion: 'El presupuesto simulado no cubre el peor caso', pregunta: P_OK, fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: async () => salidaValida(), presupuestoSimuladoUsd: 0.000001, esperado: 'BLOQUEADO_POR_COMPUERTA' },
  { id: 'malformed-response', descripcion: 'El adaptador devuelve algo que no es el esquema', pregunta: P_OK, fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: async () => ({ rawOutput: { foo: 'bar' }, usage: { inputTokens: 900, outputTokens: 20 }, latencyMs: 800 }), esperado: 'DETENER' },
  { id: 'citation-failure', descripcion: 'Una de dos claims cita un chunk que no está en la evidencia (se descarta; la otra se conserva)', pregunta: P_OK, fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: async () => salidaParcial(), esperado: 'DEGRADADO' },
  { id: 'citation-failure-total', descripcion: 'Ninguna claim queda sustentada en la evidencia', pregunta: P_OK, fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: async () => salidaValida('chunk-inexistente'), esperado: 'DETENER' },
  { id: 'timeout', descripcion: 'El adaptador no responde dentro del timeout', pregunta: P_OK, fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: () => new Promise(() => {}), timeoutMs: 20, esperado: 'DETENER' },
  { id: 'adapter-error', descripcion: 'El adaptador lanza un error', pregunta: P_OK, fragmentos: [frag()], manifiesto: manifiestoSintetico(), adaptador: async () => { throw new Error('fallo simulado'); }, esperado: 'DETENER' },
];

export interface ReporteDryRun {
  resultados: ResultadoEscenario[];
  simulacroConsistente: boolean;
  configPermiteTrafico: boolean;
  decisionCanary: DecisionGoNoGo;
}

export async function ejecutarDryRun(
  escenarios: readonly EscenarioDryRun[] = ESCENARIOS_DRY_RUN,
  entradasContrato: Partial<EntradasGoNoGo> = estadoActualGoNoGo(),
): Promise<ReporteDryRun> {
  const resultados: ResultadoEscenario[] = [];
  for (const e of escenarios) resultados.push(await ejecutarEscenario(e));
  return {
    resultados,
    simulacroConsistente: resultados.every((r) => r.coincide),
    configPermiteTrafico: canaryConfigPermiteTrafico(CANARY_CONFIG),
    decisionCanary: evaluarGoNoGo(entradasContrato),
  };
}

export function textoReporte(r: ReporteDryRun): string {
  const marca = { PASS: '✔', FAIL: '✘', SKIP: '·' } as const;
  const L: string[] = ['CANARY DRY-RUN (offline, sin red, sin credenciales reales)', ''];
  for (const x of r.resultados) {
    L.push(`[${x.coincide ? 'OK' : 'INESPERADO'}] ${x.id}: ${x.veredicto}${x.motivo ? ` — ${x.motivo}` : ''}${x.detenidoPor ? ` (parada: ${x.detenidoPor})` : ''}`);
    L.push(`    ${x.etapas.map((s) => `${marca[s.resultado]} ${s.nombre}`).join('  ')}`);
  }
  L.push('', `Consistencia del simulacro: ${r.simulacroConsistente ? 'SÍ (todos los escenarios terminaron como se esperaba)' : 'NO'}`);
  L.push(`CANARY_CONFIG permite tráfico: ${r.configPermiteTrafico ? 'SÍ' : 'NO'}`);
  L.push(`Decisión del canary: ${textoGoNoGo(r.decisionCanary)}`);
  return L.join('\n');
}
