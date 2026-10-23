/**
 * lib/ai-gateway/canary/canary-proposal.ts
 * G6-G: PROPUESTA (hipótesis para auditoría) del primer canary. PREPARAR SOLAMENTE, NO ACTIVAR.
 *
 * Nada importa este módulo en producción y CANARY_CONFIG (los valores reales) sigue en: enabled=false, maxRequests=0, maxBudgetUsd=0,
 * sampleStrategy=NINGUNA. Esta propuesta es un objeto aparte, validable y comparable con el cuerpo de solicitud real del adaptador.
 */
import { construirSolicitud } from '../shadow/openai-adapter';
import { MODEL_OUTPUT_WIRE_JSON_SCHEMA } from '../shadow/model-output-schema';
import { SHADOW_MODEL_CONFIG } from '../shadow/shadow-model-config';
import type { ShadowGatewayInput } from '../shadow/types';
import { CANARY_CONFIG, validarCanaryConfig, type CanaryConfig } from './canary-config';
import { presupuestoRecomendadoUsd } from './cost-authorization';

export const MAX_SOLICITUDES_PROPUESTAS = 8;

/** Configuración propuesta. Es una HIPÓTESIS: `allowedManifestEntries` queda vacía hasta que el CLO apruebe entradas reales. */
export const PROPUESTA_CANARY: Readonly<CanaryConfig> = Object.freeze({
  ...CANARY_CONFIG,
  enabled: true,
  maxRequests: MAX_SOLICITUDES_PROPUESTAS,
  maxBudgetUsd: presupuestoRecomendadoUsd(MAX_SOLICITUDES_PROPUESTAS),
  allowedManifestEntries: Object.freeze([]) as readonly string[],
  stopOnFirstPrivacyIncident: true,
  stopOnFirstProvenanceMismatch: true,
  stopOnUnexpectedCost: true,
  unexpectedCostFactor: 2,
  stopOnSchemaFailure: true,
  stopOnAdapterErrorThreshold: 2,
  timeoutMs: 8_000,
  // Solo consultas de la lista blanca (preguntas por artículo exacto/vigencia que acepta la envolvente y cuyos fragmentos aprobó el CLO).
  sampleStrategy: Object.freeze({ tipo: 'LISTA_BLANCA' as const, queryIds: Object.freeze([]) as readonly string[] }),
});

export interface RestriccionesPropuestas {
  soloPreguntasPublicasAbstractas: true;
  soloFragmentosAprobadosPorElCLO: true;
  modeloUnico: string;
  sinTools: true;
  sinWeb: true;
  sinFileSearch: true;
  sinAgents: true;
  sinArchivos: true;
  sinCorpusPrivado: true;
  storeFalse: true;
  structuredOutputsEstrictos: true;
  citasObligatorias: true;
  razonamiento: 'none';
  respuestaDeProduccionIndependiente: true;
}

export const RESTRICCIONES_PROPUESTAS: Readonly<RestriccionesPropuestas> = Object.freeze({
  soloPreguntasPublicasAbstractas: true,
  soloFragmentosAprobadosPorElCLO: true,
  modeloUnico: SHADOW_MODEL_CONFIG.modelId,
  sinTools: true,
  sinWeb: true,
  sinFileSearch: true,
  sinAgents: true,
  sinArchivos: true,
  sinCorpusPrivado: true,
  storeFalse: true,
  structuredOutputsEstrictos: true,
  citasObligatorias: true,
  razonamiento: 'none',
  respuestaDeProduccionIndependiente: true,
});

/** Paradas inmediatas de la propuesta, en el orden del mandato. */
export const PARADAS_PROPUESTAS = [
  { condicion: 'primer incidente de privacidad', campo: 'stopOnFirstPrivacyIncident' },
  { condicion: 'primera discrepancia de procedencia', campo: 'stopOnFirstProvenanceMismatch' },
  { condicion: 'costo inesperado', campo: 'stopOnUnexpectedCost' },
  { condicion: 'fallo de esquema', campo: 'stopOnSchemaFailure' },
  { condicion: 'umbral de errores del adaptador', campo: 'stopOnAdapterErrorThreshold' },
  { condicion: 'timeout anómalo (cuenta como error del adaptador)', campo: 'timeoutMs' },
] as const;

/** Problemas de la propuesta (vacío = coherente). Se valida como configuración habilitada con una lista blanca de ejemplo. */
export function validarPropuesta(p: CanaryConfig = PROPUESTA_CANARY): string[] {
  const problemas: string[] = [];
  if (p.maxRequests < 5 || p.maxRequests > 10) problemas.push('maxRequests_fuera_de_5_10');
  if (p.maxBudgetUsd <= 0 || p.maxBudgetUsd > 0.2) problemas.push('maxBudgetUsd_no_minimo');
  if (p.sampleStrategy.tipo !== 'LISTA_BLANCA') problemas.push('muestreo_no_es_lista_blanca');
  if (p.model !== SHADOW_MODEL_CONFIG.modelId) problemas.push('modelo');
  // La configuración es coherente cuando se completan las listas vacías (que el CLO llena); el resto de reglas se valida igual.
  const conEjemplo: CanaryConfig = { ...p, allowedManifestEntries: ['ejemplo'], sampleStrategy: { tipo: 'LISTA_BLANCA', queryIds: ['q-ejemplo'] } };
  problemas.push(...validarCanaryConfig(conEjemplo));
  return problemas;
}

const INPUT_EJEMPLO: ShadowGatewayInput = {
  queryId: 'q-propuesta', sanitizedQuestion: '¿Qué dice el artículo 634 del Código Penal (Decreto 130-2017)?',
  evidence: [{ chunk_id: 'f1', instrumento: 'CODIGO_PENAL_D130_2017', articulo: '634', gaceta: '34,940', rol: null, citable: true, texto: 'Derogar el Decreto No 144-83.' }],
  productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
};

/** Compara el cuerpo REAL de la solicitud al modelo con las restricciones de la propuesta. Devuelve las que NO se cumplen. */
export function verificarSolicitudContraPropuesta(): string[] {
  const cuerpo = construirSolicitud(INPUT_EJEMPLO) as unknown as Record<string, unknown>;
  const fallos: string[] = [];
  if (cuerpo.model !== RESTRICCIONES_PROPUESTAS.modeloUnico) fallos.push('modelo');
  if (cuerpo.store !== false) fallos.push('store');
  if (JSON.stringify(cuerpo.reasoning) !== JSON.stringify({ effort: 'none' })) fallos.push('reasoning');
  const fmt = (cuerpo.text as { format?: { type?: string; strict?: boolean; schema?: unknown } } | undefined)?.format;
  if (fmt?.type !== 'json_schema' || fmt.strict !== true || fmt.schema !== (MODEL_OUTPUT_WIRE_JSON_SCHEMA as unknown)) fallos.push('structured_outputs_estricto');
  for (const prohibido of ['tools', 'tool_choice', 'previous_response_id', 'conversation', 'background', 'file_ids', 'metadata', 'parallel_tool_calls', 'include', 'web_search', 'file_search', 'agent', 'prompt', 'attachments', 'vector_store_ids']) {
    if (prohibido in cuerpo) fallos.push(`campo_prohibido:${prohibido}`);
  }
  if (typeof cuerpo.max_output_tokens !== 'number' || cuerpo.max_output_tokens > SHADOW_MODEL_CONFIG.maxOutputTokens) fallos.push('max_output_tokens');
  const instrucciones = String(cuerpo.instructions ?? '');
  if (!/chunk_id/.test(instrucciones)) fallos.push('citas_obligatorias_en_instrucciones');
  return fallos;
}
