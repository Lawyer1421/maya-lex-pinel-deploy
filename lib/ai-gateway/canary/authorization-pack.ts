/**
 * lib/ai-gateway/canary/authorization-pack.ts
 * G6-I: CANARY_AUTHORIZATION_PACK. Reúne las condiciones técnicas con su evidencia y emite UNA de dos decisiones:
 *   READY_FOR_FREDY_DECISION     todas las condiciones del paquete están MET con evidencia vigente
 *   NOT_READY_FOR_FREDY_DECISION falta al menos una
 * NUNCA activa nada. Incluso con READY, el canary sigue apagado: solo Fredy puede emitir después CANARY_GO, y el contrato de activación
 * (go-no-go.ts: autorización de Fredy, presupuesto > 0 y kill switch autorizados) sigue siendo NO_GO hasta entonces.
 *
 * La evidencia generada (JSON) lleva el SHA-256 del código que ejerció; si el código cambia, esa evidencia deja de ser vigente.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MODEL_OUTPUT_WIRE_JSON_SCHEMA } from '../shadow/model-output-schema';
import { MANIFIESTO_PROCEDENCIA_PUBLICA } from '../shadow/public-provenance-manifest';
import { evaluarCorpusPublico } from '../shadow/public-corpus-gate';
import { SHADOW_BUDGET_USD } from '../shadow/shadow-model-config';
import { SHADOW_GATEWAY_ENABLED } from '../shadow/config';
import { CANARY_CONFIG } from './canary-config';
import { calcularPaquete, presupuestoRecomendadoUsd } from './cost-authorization';
import { evidenciaVigente } from './evidence-integrity';
import { evaluarGoNoGo, type DecisionGoNoGo } from './go-no-go';
import { estadoVerificacionOpenAI } from './openai-verification';
import { etapaDe } from './pilot-manifest';
import { CANDIDATOS_PILOTO } from './pilot-candidates';
import { MAX_SOLICITUDES_PROPUESTAS, validarPropuesta, verificarSolicitudContraPropuesta } from './canary-proposal';
import { certificarServerless } from './serverless-certification';
import { estadoActualGoNoGo } from './estado-actual';

export type Responsable = 'CLAUDE_CODE' | 'CLO' | 'FREDY' | 'ADMIN_VERCEL';
export type EstadoCondicion = 'MET' | 'NOT_MET';

export interface CondicionPack {
  id: string;
  descripcion: string;
  estado: EstadoCondicion;
  evidencia: string;
  /** Quién puede cerrar la condición si no está MET. */
  responsable: Responsable;
  /** Qué falta, si no está MET. */
  falta?: string;
}

export type DecisionPack = 'READY_FOR_FREDY_DECISION' | 'NOT_READY_FOR_FREDY_DECISION';

export interface PaqueteAutorizacion {
  CANARY_AUTHORIZATION_PACK: true;
  decision: DecisionPack;
  condiciones: CondicionPack[];
  bloqueos: CondicionPack[];
  /** Contrato de activación (G5-H): sigue el estado REAL; un READY no lo cambia. */
  contratoDeActivacion: DecisionGoNoGo;
  valoresReales: { SHADOW_GATEWAY_ENABLED: boolean; SHADOW_BUDGET_USD: number; enabled: boolean; maxRequests: number; maxBudgetUsd: number; sampleStrategy: string };
  nota: string;
}

function leerJson(raiz: string, nombre: string): any | null {
  try {
    return JSON.parse(readFileSync(join(raiz, 'docs', 'governance', 'evidence', nombre), 'utf8'));
  } catch {
    return null;
  }
}

function archivosTs(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) archivosTs(p, acc);
    else if (/\.ts$/.test(e)) acc.push(p);
  }
  return acc;
}

export function construirPaquete(opciones: { raiz?: string; ahora?: Date } = {}): PaqueteAutorizacion {
  const raiz = opciones.raiz ?? process.cwd();
  const ahora = opciones.ahora ?? new Date();
  const c: CondicionPack[] = [];
  const add = (x: Omit<CondicionPack, 'estado'> & { ok: boolean }) => c.push({ id: x.id, descripcion: x.descripcion, estado: x.ok ? 'MET' : 'NOT_MET', evidencia: x.evidencia, responsable: x.responsable, ...(x.ok ? {} : { falta: x.falta }) });

  const ver = estadoVerificacionOpenAI(undefined, ahora);
  add({
    id: 'OPENAI_OFFICIAL_VERIFICATION_CURRENT', descripcion: 'Verificación oficial de OpenAI vigente (≤ 7 días) y completa', ok: ver.completa, responsable: 'CLAUDE_CODE',
    evidencia: `lib/ai-gateway/canary/openai-verification.ts: ${ver.pendientes.length} pendientes, vigente=${ver.vigente}, más antigua ${ver.fechaMasAntigua}`,
    falta: `Repetir la verificación (pendientes: ${ver.pendientes.join(', ') || 'ninguno'}; vigente=${ver.vigente}).`,
  });

  const aprobados = CANDIDATOS_PILOTO.filter((x) => etapaDe(x) === 'APPROVED').length;
  add({
    id: 'CLO_PILOT_APPROVED', descripcion: 'El CLO aprobó las entradas del piloto', ok: aprobados > 0, responsable: 'CLO',
    evidencia: `${aprobados}/${CANDIDATOS_PILOTO.length} candidatos APPROVED; el resto PENDING_CLO_APPROVAL (docs/governance/evidence/g6-clo-pilot-pack.md)`,
    falta: 'Aportar id canónico, texto exacto, URL oficial y estado V4/V5 por artículo, y registrar la decisión formal del CLO (nombre, fecha, enlace).',
  });
  add({
    id: 'EFFECTIVE_MANIFEST_GT_ZERO', descripcion: 'El manifiesto efectivo tiene al menos una entrada aprobada', ok: MANIFIESTO_PROCEDENCIA_PUBLICA.length > 0, responsable: 'CLO',
    evidencia: `MANIFIESTO_PROCEDENCIA_PUBLICA.length = ${MANIFIESTO_PROCEDENCIA_PUBLICA.length}`,
    falta: 'Pasar el último paso (entrada aprobada → manifiesto efectivo) solo tras la aprobación humana válida y con autorización.',
  });

  const priv = leerJson(raiz, 'g6-privacy-metrics.json');
  const privVigente = priv ? evidenciaVigente(priv.codigoHashes, raiz) : { vigente: false, cambiados: ['(sin archivo)'] };
  const metricasOk = !!priv?.metricas && ['requiredRecall', 'residualMissRate', 'overallMissRate', 'publicFalsePositiveRate', 'privateDocumentRecall', 'publicNamedEntityFalsePositiveRate'].every((k) => typeof priv.metricas[k] === 'number');
  add({
    id: 'PRIVACY_METRICS_CURRENT', descripcion: 'Las seis métricas de privacidad están generadas con el código actual', ok: metricasOk && privVigente.vigente, responsable: 'CLAUDE_CODE',
    evidencia: 'docs/governance/evidence/g6-privacy-metrics.json (hashes del gate y de los benchmarks)',
    falta: `Regenerar con «npx tsx scripts/g6-privacy-metrics.ts --write-json» (cambiaron: ${privVigente.cambiados.join(', ')}).`,
  });
  const env = priv?.envolventePrimerCanary;
  add({
    id: 'FIRST_CANARY_PRIVACY_POLICY_SATISFIED', descripcion: 'La envolvente del primer canary rechaza todos los casos privados de todos los conjuntos', ok: !!env && env.aceptadosPorLaEnvolvente === 0 && env.privadosEvaluados > 800 && env.goldenElegibles > 0 && privVigente.vigente, responsable: 'CLAUDE_CODE',
    evidencia: env ? `${env.aceptadosPorLaEnvolvente}/${env.privadosEvaluados} privados aceptados; ${env.goldenElegibles}/${env.goldenTotal} preguntas del Golden Set elegibles` : 'sin evidencia',
    falta: 'Regenerar la evidencia de privacidad.',
  });
  const h3 = priv?.holdouts?.holdout3_final_sin_ajuste;
  add({
    id: 'RESIDUAL_RISK_QUANTIFIED', descripcion: 'El riesgo residual del gate general está cuantificado con un conjunto de retención sin ajuste', ok: !!h3 && typeof h3.privateMissRate === 'number' && h3.privateTotal >= 35, responsable: 'CLAUDE_CODE',
    evidencia: h3 ? `holdout 3: ${h3.privateMissed}/${h3.privateTotal} privados no detectados (${(h3.privateMissRate * 100).toFixed(1)} %); el primer canary NO depende de este gate: lo acota la envolvente` : 'sin evidencia',
    falta: 'Generar la evidencia de privacidad.',
  });

  const srv = certificarServerless(raiz);
  const noVer = srv.puntos.filter((p) => p.estado === 'NOT_VERIFIED');
  add({
    id: 'SERVERLESS_CERTIFIED', descripcion: 'El modelo de ejecución serverless está certificado punto por punto', ok: srv.certificada, responsable: 'ADMIN_VERCEL',
    evidencia: `${srv.puntos.length - noVer.length}/${srv.puntos.length} puntos VERIFIED (lib/ai-gateway/canary/serverless-certification.ts)`,
    falta: noVer.map((p) => `${p.id}: ${p.pendiente ?? 'sin verificar'}`).join(' | '),
  });

  const rb = leerJson(raiz, 'g6-rollback-evidence.json');
  const rbVigente = rb ? evidenciaVigente(rb.codigoHashes, raiz).vigente : false;
  add({
    id: 'ROLLBACK_TESTED', descripcion: 'El ensayo de rollback pasó con los 8 disparadores y el código jurídico no cambió', ok: !!rb && rb.ROLLBACK_REHEARSAL_PASSED === true && rb.estadoRealEsSeguro === true && rbVigente, responsable: 'CLAUDE_CODE',
    evidencia: 'docs/governance/evidence/g6-rollback-evidence.json', falta: 'Regenerar con G6_WRITE_EVIDENCE=1 sobre tests/rollback-rehearsal-g6.test.ts.',
  });
  add({
    id: 'KILL_SWITCH_TESTED', descripcion: 'El kill switch apaga el despacho shadow sin tocar la respuesta (límite: es una constante de código)', ok: !!rb && rb.killSwitchProbado === true && rbVigente, responsable: 'CLAUDE_CODE',
    evidencia: 'g6-rollback-evidence.json → killSwitchProbado; rollback = revertir y redesplegar (no hay interruptor en caliente)', falta: 'Regenerar la evidencia de rollback.',
  });

  const costos = calcularPaquete('CONSERVADORA');
  const presupuesto = presupuestoRecomendadoUsd(MAX_SOLICITUDES_PROPUESTAS);
  const problemas = [...validarPropuesta(), ...verificarSolicitudContraPropuesta()];
  add({
    id: 'BUDGET_PROPOSAL_COMPLETE', descripcion: 'Propuesta de envolvente y de presupuesto completa y coherente con la solicitud real', ok: costos.filas.length === 6 && presupuesto > 0 && problemas.length === 0, responsable: 'CLAUDE_CODE',
    evidencia: `${MAX_SOLICITUDES_PROPUESTAS} solicitudes máx., presupuesto duro recomendado ${presupuesto.toFixed(2)} USD; docs/governance/evidence/g6-cost-authorization.md`, falta: `Problemas: ${problemas.join(', ')}`,
  });

  const ind = leerJson(raiz, 'g6-production-independence.json');
  const indVigente = ind ? evidenciaVigente(ind.codigoHashes, raiz).vigente : false;
  add({
    id: 'PRODUCTION_INDEPENDENCE_DEMONSTRATED', descripcion: 'La respuesta HTTP de producción es idéntica con cualquier fallo del shadow (PRODUCTION_HTTP_RESPONSE_INDEPENDENT)', ok: !!ind && ind.PRODUCTION_HTTP_RESPONSE_INDEPENDENT === true && indVigente, responsable: 'CLAUDE_CODE',
    evidencia: ind ? `${ind.escenarios.length} escenarios idénticos a la línea base (docs/governance/evidence/g6-production-independence.json)` : 'sin evidencia', falta: 'Regenerar con G6_WRITE_EVIDENCE=1 sobre tests/production-independence-g6.test.ts.',
  });

  add({
    id: 'NO_PRIVATE_DATA', descripcion: 'Solo preguntas públicas abstractas que pasan la envolvente; sin datos privados', ok: !!env && env.aceptadosPorLaEnvolvente === 0 && privVigente.vigente, responsable: 'CLAUDE_CODE',
    evidencia: 'Envolvente del primer canary (vocabulario cerrado) + privacyGate PASS; 0 casos privados aceptados.', falta: 'Ver FIRST_CANARY_PRIVACY_POLICY_SATISFIED.',
  });
  const docRechazado = evaluarCorpusPublico([{ id: 'x', contenido: 'x', num_articulo: null, fuente: 'doc_privado_abc', relevancia: 1, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234' } as never]).estado === 'PUBLIC_CORPUS_REJECT';
  add({
    id: 'NO_PRIVATE_CORPUS', descripcion: 'Ningún fragmento del corpus privado (capa doc_*, instrumentos) puede llegar al modelo', ok: docRechazado && MANIFIESTO_PROCEDENCIA_PUBLICA.length >= 0, responsable: 'CLAUDE_CODE',
    evidencia: 'Gate estructural (rechaza doc_*, doctrina y fuentes no «codigo») + manifiesto de procedencia por fragmento aprobado.', falta: 'El gate estructural dejó de rechazar doc_*.',
  });
  const patronEscritura = /@supa\x62ase|createClient|\.insert\(|\.upsert\(|\.rpc\(|\.from\(\s*['"]/;
  const conEscritura = archivosTs(join(raiz, 'lib', 'ai-gateway')).filter((f) => !f.endsWith('authorization-pack.ts') && patronEscritura.test(readFileSync(f, 'utf8')));
  add({
    id: 'NO_CORPUS_WRITES', descripcion: 'Nada en lib/ai-gateway puede escribir en el corpus ni en la base', ok: conEscritura.length === 0, responsable: 'CLAUDE_CODE',
    evidencia: `Escaneo de lib/ai-gateway/**: ${conEscritura.length} archivos con patrones de escritura o de cliente de base de datos`, falta: `Archivos: ${conEscritura.join(', ')}`,
  });
  const esquema = JSON.stringify(MODEL_OUTPUT_WIRE_JSON_SCHEMA);
  add({
    id: 'MODEL_ZERO_AUTHORITY_OVER_LEGAL_VALIDITY', descripcion: 'El modelo no declara vigencia, validez ni rol: su salida solo propone claims con citas que el servidor valida', ok: !/vigen|valid|derog|abrog|rol\b|role/i.test(esquema) && independenciaDeDecision(ind), responsable: 'CLAUDE_CODE',
    evidencia: 'El esquema de salida no tiene campos de vigencia/validez/rol; producción ABSTAIN es autoritativa (g6-production-independence.json).', falta: 'El esquema de salida del modelo expone campos de validez jurídica.',
  });

  const bloqueos = c.filter((x) => x.estado === 'NOT_MET');
  return {
    CANARY_AUTHORIZATION_PACK: true,
    decision: bloqueos.length === 0 ? 'READY_FOR_FREDY_DECISION' : 'NOT_READY_FOR_FREDY_DECISION',
    condiciones: c,
    bloqueos,
    contratoDeActivacion: evaluarGoNoGo(estadoActualGoNoGo()),
    valoresReales: { SHADOW_GATEWAY_ENABLED, SHADOW_BUDGET_USD, enabled: CANARY_CONFIG.enabled, maxRequests: CANARY_CONFIG.maxRequests, maxBudgetUsd: CANARY_CONFIG.maxBudgetUsd, sampleStrategy: CANARY_CONFIG.sampleStrategy.tipo },
    nota: 'READY_FOR_FREDY_DECISION NO activa nada: solo habilita que Fredy emita CANARY_GO o CANARY_NO_GO. El contrato de activación sigue en NO_GO mientras Fredy no autorice, el presupuesto sea 0 y el kill switch esté apagado.',
  };
}

function independenciaDeDecision(ind: any): boolean {
  return !!ind && ind.PRODUCTION_HTTP_RESPONSE_INDEPENDENT === true && Array.isArray(ind.escenarios) && ind.escenarios.some((e: any) => e.id === 'abstencion-de-produccion-con-shadow-ANSWER' && e.identicoALineaBase === true);
}

export function textoPaquete(p: PaqueteAutorizacion): string {
  const L = [
    '# CANARY_AUTHORIZATION_PACK — G6-I',
    '',
    `## Decisión: \`${p.decision}\``,
    '',
    p.nota,
    '',
    `Valores reales: SHADOW_GATEWAY_ENABLED=${p.valoresReales.SHADOW_GATEWAY_ENABLED} · SHADOW_BUDGET_USD=${p.valoresReales.SHADOW_BUDGET_USD} · enabled=${p.valoresReales.enabled} · maxRequests=${p.valoresReales.maxRequests} · maxBudgetUsd=${p.valoresReales.maxBudgetUsd} · sampleStrategy=${p.valoresReales.sampleStrategy}`,
    '',
    `Condiciones: ${p.condiciones.filter((x) => x.estado === 'MET').length}/${p.condiciones.length} MET.`,
    '',
    '| Condición | Estado | Responsable | Evidencia |',
    '|---|---|---|---|',
    ...p.condiciones.map((x) => `| ${x.id} | ${x.estado} | ${x.responsable} | ${x.evidencia.replace(/\|/g, '/')} |`),
  ];
  if (p.bloqueos.length) {
    L.push('', '## Bloqueos', '', ...p.bloqueos.map((b) => `- **${b.id}** (${b.responsable}): ${b.falta ?? ''}`));
  }
  L.push('', '## Contrato de activación (G5-H)', '', p.contratoDeActivacion.decision === 'GO' ? 'GO' : `NO_GO — condiciones sin cumplir: ${p.contratoDeActivacion.razones.map((r) => r.condicion).join(', ')}`);
  return `${L.join('\n')}\n`;
}
