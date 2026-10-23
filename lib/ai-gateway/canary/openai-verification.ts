/**
 * lib/ai-gateway/canary/openai-verification.ts
 * G6-A: registro de verificación previa a la activación de OpenAI. SOLO DATOS: no usa credenciales ni abre red.
 *
 * Cada entrada dice qué se verificó, contra qué URL oficial, cuándo, qué valor se constató, dónde vive en el código y el
 * estado: VERIFIED / NOT_VERIFIED. Una entrada solo es VERIFIED si tiene un método de verificación real (`metodo`).
 *
 * Métodos:
 *   OFFICIAL_PAGE_EXTRACT        contenido de la página OFICIAL de OpenAI obtenido el día indicado. El acceso directo desde el
 *                                entorno de ejecución está bloqueado (DNS), así que el texto se leyó con un servicio de extracción
 *                                de páginas (Tavily). El contenido es el de OpenAI; el intermediario es de terceros.
 *   OFFICIAL_PACKAGE_METADATA    metadatos oficiales del paquete en el registro de npm.
 *   INSTALLED_SDK_SOURCE         código y tipos del SDK oficial instalado (openai@7.43.0).
 *   PROVIDER_PROJECT_READ        lectura de solo lectura del proyecto en Vercel.
 *
 * Si la documentación oficial contradice un dato previo, prevalece la documentación oficial. Las cifras de tarifas NO se
 * repiten aquí: se leen de shadow-model-config.ts y una prueba las compara con las capturadas en tests/fixtures.
 */
import { SHADOW_MODEL_CONFIG } from '../shadow/shadow-model-config';

export type EstadoVerificacion = 'VERIFIED' | 'NOT_VERIFIED';
export type MetodoVerificacion = 'OFFICIAL_PAGE_EXTRACT' | 'OFFICIAL_PACKAGE_METADATA' | 'INSTALLED_SDK_SOURCE' | 'PROVIDER_PROJECT_READ';

export interface EntradaVerificacion {
  id: string;
  tema: string;
  sourceUrl: string;
  /** YYYY-MM-DD */
  verificationDate: string;
  verifiedValue: string;
  codeLocation: string;
  estado: EstadoVerificacion;
  /** Obligatorio para VERIFIED; ausente en NOT_VERIFIED. */
  metodo?: MetodoVerificacion;
  nota?: string;
}

const FECHA = '2026-10-23';
const P = SHADOW_MODEL_CONFIG.pricing;
const T = P.standard;
const URL_PRECIOS = 'https://developers.openai.com/api/docs/pricing';
const URL_MODELO = 'https://developers.openai.com/api/docs/models/gpt-6-luna';
const URL_DATOS = 'https://developers.openai.com/api/docs/guides/your-data';
const URL_SALIDAS = 'https://developers.openai.com/api/docs/guides/structured-outputs';
const URL_CACHE = 'https://developers.openai.com/api/docs/guides/prompt-caching';
const URL_RAZONAMIENTO = 'https://developers.openai.com/api/docs/guides/reasoning';
const PAGINA = 'OFFICIAL_PAGE_EXTRACT' as const;

const v = (e: Omit<EntradaVerificacion, 'verificationDate' | 'estado'> & { metodo: MetodoVerificacion }): EntradaVerificacion => ({
  verificationDate: FECHA,
  estado: 'VERIFIED',
  ...e,
});

export const VERIFICACION_OPENAI: readonly EntradaVerificacion[] = [
  v({
    id: 'model-availability', tema: 'Disponibilidad del model ID gpt-6-luna', sourceUrl: URL_MODELO, metodo: PAGINA,
    verifiedValue: 'Página oficial del modelo: ID «gpt-6-luna», contexto 1,050,000, salida máxima 128,000 tokens, endpoint v1/responses listado.',
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → SHADOW_MODEL_CONFIG.modelId',
  }),
  v({
    id: 'responses-api', tema: 'Responses API', sourceUrl: URL_MODELO, metodo: PAGINA,
    verifiedValue: 'v1/responses figura entre los endpoints del modelo; las guías oficiales usan client.responses.create. El SDK 7.43.0 declara model, input, instructions, store, max_output_tokens, reasoning y text.format.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → construirSolicitud',
  }),
  v({
    id: 'structured-outputs-strict', tema: 'Structured Outputs / JSON Schema estricto', sourceUrl: URL_SALIDAS, metodo: PAGINA,
    verifiedValue: 'Los ejemplos oficiales usan strict:true con todas las propiedades en required y additionalProperties:false, y documentan status «incomplete» con motivo max_output_tokens.',
    codeLocation: 'lib/ai-gateway/shadow/model-output-schema.ts → MODEL_OUTPUT_WIRE_JSON_SCHEMA',
    nota: 'Se constató la forma del esquema y el manejo de salida incompleta; el cumplimiento del esquema propio se prueba localmente. La lista completa de restricciones del modo estricto no se extrajo íntegra.',
  }),
  v({
    id: 'text-format', tema: 'text.format = json_schema', sourceUrl: URL_SALIDAS, metodo: PAGINA,
    verifiedValue: 'Sintaxis oficial: text: { format: { type: "json_schema", name, strict: true, schema } }.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → construirSolicitud (text.format)',
  }),
  v({
    id: 'store-false', tema: 'store:false', sourceUrl: URL_DATOS, metodo: PAGINA,
    verifiedValue: 'La Responses API conserva el estado de aplicación 30 días por defecto o con store=true; con store=false no se conserva estado de aplicación (salvo las excepciones listadas por OpenAI).',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → construirSolicitud (store: false)',
  }),
  v({
    id: 'retention-policy', tema: 'Política de retención (monitoreo de abuso)', sourceUrl: URL_DATOS, metodo: PAGINA,
    verifiedValue: 'Los registros de monitoreo de abuso pueden contener prompts y respuestas y se conservan hasta 30 días por defecto, salvo obligación legal o protección de terceros. /v1/responses: sin entrenamiento, 30 días de abuso, sin estado de aplicación.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts (comentario de retención)',
  }),
  v({
    id: 'store-false-vs-zdr', tema: 'Diferencia entre store:false y Zero Data Retention', sourceUrl: URL_DATOS, metodo: PAGINA,
    verifiedValue: 'ZDR es un control a nivel de ORGANIZACIÓN: con ZDR habilitado, store se trata siempre como false. Lo inverso no vale: store:false en una solicitud NO activa ZDR ni elimina la retención de abuso de 30 días.',
    codeLocation: 'docs/governance/g6-canary-authorization-pack.md; ESTADO_ZDR_MAYALEX',
    nota: 'MayaLex NO se declara ZDR: no hay evidencia de que la organización tenga ZDR aprobado (ESTADO_ZDR_MAYALEX).',
  }),
  v({
    id: 'sdk-version', tema: 'SDK utilizado', sourceUrl: 'https://registry.npmjs.org/openai', metodo: 'OFFICIAL_PACKAGE_METADATA',
    verifiedValue: 'dist-tag latest = 7.43.0 (npm view); MayaLex fija y tiene instalada la 7.43.0.',
    codeLocation: 'package.json → dependencies.openai',
  }),
  v({
    id: 'node-requirement', tema: 'Requisito de Node', sourceUrl: 'https://registry.npmjs.org/openai', metodo: 'OFFICIAL_PACKAGE_METADATA',
    verifiedValue: 'engines.node >=22.0.0 en el paquete instalado; .nvmrc = 22; el proyecto de Vercel declara nodeVersion 24.x (lectura de solo lectura, 2026-10-23).',
    codeLocation: '.nvmrc; package.json; proyecto Vercel prj_uQQ8qz… (nodeVersion)',
  }),
  v({
    id: 'sdk-retries', tema: 'Reintentos del SDK', sourceUrl: 'https://github.com/openai/openai-node', metodo: 'INSTALLED_SDK_SOURCE',
    verifiedValue: 'El cliente acepta maxRetries (por defecto 2); el adaptador lo fija en 0 para que decida el circuit breaker.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → new OpenAI({ maxRetries: 0 })',
  }),
  v({
    id: 'abort-signal', tema: 'AbortSignal', sourceUrl: 'https://github.com/openai/openai-node', metodo: 'INSTALLED_SDK_SOURCE',
    verifiedValue: 'RequestOptions declara signal?: AbortSignal; el adaptador la propaga desde el dispatcher.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → responder(input, { signal }); dispatcher.ts → conTimeout',
  }),
  v({
    id: 'reasoning-effort-default', tema: 'Esfuerzo de razonamiento por defecto', sourceUrl: URL_RAZONAMIENTO, metodo: PAGINA,
    verifiedValue: 'GPT-6 Luna razona en «medium» por defecto; reasoning.effort admite none, low, medium, high, xhigh y max. Los tokens de razonamiento cuentan como salida.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → reasoning: { effort: "none" }',
    nota: 'HALLAZGO G6-A: el adaptador de G3 no fijaba reasoning, así que el modelo habría razonado en medium y gastado max_output_tokens. Corregido en este PR.',
  }),
  v({
    id: 'pricing-input', tema: 'Tarifa de entrada sin caché', sourceUrl: URL_PRECIOS, metodo: PAGINA,
    verifiedValue: `${T.inputUsdPerMillion} USD por 1M tokens (Standard, gpt-6-luna). Coincide con la configuración.`,
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.standard.inputUsdPerMillion',
  }),
  v({
    id: 'pricing-cached-input', tema: 'Tarifa de entrada en caché (lectura)', sourceUrl: URL_PRECIOS, metodo: PAGINA,
    verifiedValue: `${T.cachedInputUsdPerMillion} USD por 1M tokens: el 10 % de la entrada sin caché (página del modelo).`,
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.standard.cachedInputUsdPerMillion',
  }),
  v({
    id: 'pricing-cache-write', tema: 'Tarifa de escritura de caché', sourceUrl: URL_CACHE, metodo: PAGINA,
    verifiedValue: `${T.cacheWrite30mUsdPerMillion} USD por 1M tokens (escritura de 30 min): 1.25× la entrada sin caché. La caché implícita escribe prefijos de al menos ${P.minCacheableTokens} tokens visibles.`,
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.standard.cacheWrite30mUsdPerMillion; pricing.ts → estimarCostoConservadorUsd',
    nota: 'HALLAZGO G6-A: con prompts de ≥1,024 tokens la entrada puede cobrarse a la tarifa de escritura. La reserva y la liquidación del presupuesto ya usan esa cota superior.',
  }),
  v({
    id: 'pricing-output', tema: 'Tarifa de salida', sourceUrl: URL_PRECIOS, metodo: PAGINA,
    verifiedValue: `${T.outputUsdPerMillion} USD por 1M tokens (incluye tokens de razonamiento).`,
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.standard.outputUsdPerMillion',
  }),
  v({
    id: 'pricing-long-context', tema: 'Condición de contexto que modifica precios', sourceUrl: URL_MODELO, metodo: PAGINA,
    verifiedValue: `Prompts de más de ${P.longContext.thresholdInputTokens.toLocaleString('en-US')} tokens de entrada cuestan ${P.longContext.inputMultiplier}× entrada y caché y ${P.longContext.outputMultiplier}× salida sobre TODA la solicitud.`,
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.longContext; maxInputTokens (tope duro mucho menor)',
  }),
  v({
    id: 'pricing-modes', tema: 'Otros modos de precio (regional, Fast, Batch)', sourceUrl: URL_MODELO, metodo: PAGINA,
    verifiedValue: 'Procesamiento regional: +10 %. Fast: 2× las tarifas. Batch y Flex: 50 % de Standard. El shadow usa Standard sin endpoint regional.',
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.batch (no usado en el shadow)',
  }),
];

/** Estado de ZDR de MayaLex. No se declara ZDR sin evidencia específica de que la organización lo tiene aprobado. */
export const ESTADO_ZDR_MAYALEX = Object.freeze({ approved: false as boolean, evidence: null as string | null });

/** Vigencia máxima de una verificación antes de un canary: pasada esta edad hay que repetirla. */
export const VERIFICACION_MAX_DIAS = 7;

export function entradaValida(e: EntradaVerificacion): boolean {
  if (e.estado === 'VERIFIED') return e.metodo !== undefined && /^https:\/\//.test(e.sourceUrl) && /^\d{4}-\d{2}-\d{2}$/.test(e.verificationDate) && e.verifiedValue.length > 10;
  return e.metodo === undefined;
}

export function estadoVerificacionOpenAI(
  entradas: readonly EntradaVerificacion[] = VERIFICACION_OPENAI,
  ahora: Date = new Date(),
  maxDias = VERIFICACION_MAX_DIAS,
) {
  const invalidas = entradas.filter((e) => !entradaValida(e)).map((e) => e.id);
  const pendientes = entradas.filter((e) => e.estado !== 'VERIFIED').map((e) => e.id);
  const fechas = entradas.map((e) => e.verificationDate).sort();
  const masAntigua = fechas[0] ?? null;
  const edadDias = masAntigua ? (ahora.getTime() - Date.parse(`${masAntigua}T00:00:00Z`)) / 86_400_000 : Infinity;
  const vigente = Number.isFinite(edadDias) && edadDias <= maxDias;
  return {
    completa: entradas.length > 0 && invalidas.length === 0 && pendientes.length === 0 && vigente,
    pendientes,
    invalidas,
    vigente,
    fechaMasAntigua: masAntigua,
  };
}
