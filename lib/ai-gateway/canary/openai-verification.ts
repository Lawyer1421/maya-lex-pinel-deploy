/**
 * lib/ai-gateway/canary/openai-verification.ts
 * G5-E: registro de verificación previa a la activación de OpenAI. SOLO DATOS: no usa credenciales, no abre red.
 *
 * Cada entrada dice: qué se verificó, contra qué fuente, cuándo, qué valor se constató y dónde vive en el código.
 * Estados (de mayor a menor fuerza):
 *   VERIFIED_OFFICIAL    contrastado con la documentación/servicio OFICIAL vigente el día indicado.
 *   VERIFIED_LOCAL       contrastado con artefactos reales instalados o con el servicio del proveedor de despliegue.
 *   THIRD_PARTY_ONLY     solo hay fuentes de terceros (no cuentan como verificación oficial).
 *   UNVERIFIED           no se pudo verificar.
 * El 2026-10-23 la documentación oficial de OpenAI (developers.openai.com) NO fue alcanzable desde el entorno de
 * ejecución (error de resolución de DNS), así que ninguna entrada que dependa de ella puede ser VERIFIED_OFFICIAL.
 * Una persona con acceso debe cerrar esas entradas antes de cualquier canary; mientras tanto el contrato queda NO_GO.
 */
export type EstadoVerificacion = 'VERIFIED_OFFICIAL' | 'VERIFIED_LOCAL' | 'THIRD_PARTY_ONLY' | 'UNVERIFIED';

export interface EntradaVerificacion {
  id: string;
  tema: string;
  sourceUrl: string;
  /** YYYY-MM-DD */
  verificationDate: string;
  verifiedValue: string;
  codeLocation: string;
  estado: EstadoVerificacion;
  nota?: string;
}

import { SHADOW_MODEL_CONFIG } from '../shadow/shadow-model-config';

const TARIFA = SHADOW_MODEL_CONFIG.pricing.standard;
const OFICIAL_NO_ALCANZABLE = 'La página oficial no fue alcanzable desde el entorno (DNS) el 2026-10-23.';

export const VERIFICACION_OPENAI: readonly EntradaVerificacion[] = [
  {
    id: 'model-availability', tema: 'Modelo gpt-6-luna disponible en la API',
    sourceUrl: 'https://developers.openai.com/api/docs/models', verificationDate: '2026-10-23',
    verifiedValue: 'Agregadores de terceros listan «GPT-6 Luna» (contexto 1M, salida máx. 128K). Sin confirmación oficial.',
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → SHADOW_MODEL_CONFIG.modelId', estado: 'THIRD_PARTY_ONLY', nota: OFICIAL_NO_ALCANZABLE,
  },
  {
    id: 'responses-api-syntax', tema: 'Sintaxis de la Responses API (model, input, instructions, store, max_output_tokens, text.format)',
    sourceUrl: 'https://developers.openai.com/api/docs/api-reference/responses', verificationDate: '2026-10-23',
    verifiedValue: 'Los tipos del SDK openai@7.43.0 declaran store, max_output_tokens y text.format json_schema (name, schema, strict).',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → construirSolicitud', estado: 'VERIFIED_LOCAL',
    nota: 'Contrastado con node_modules/openai/resources/responses/responses.d.ts, no con la documentación en línea.',
  },
  {
    id: 'structured-outputs', tema: 'Structured Outputs estricto (strict: true) con el esquema wire',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/structured-outputs', verificationDate: '2026-10-23',
    verifiedValue: 'El campo strict existe en el tipo del SDK. Las restricciones del modo estricto (additionalProperties, required) no se confirmaron en la guía oficial.',
    codeLocation: 'lib/ai-gateway/shadow/model-output-schema.ts → MODEL_OUTPUT_WIRE_JSON_SCHEMA', estado: 'UNVERIFIED', nota: OFICIAL_NO_ALCANZABLE,
  },
  {
    id: 'store-false-retention', tema: 'store:false y retención de datos',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/your-data', verificationDate: '2026-10-23',
    verifiedValue: 'El código envía store:false. Las implicaciones de retención (monitoreo de abuso, no equivale a Zero Data Retention) siguen sin reconfirmarse en la documentación oficial.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → construirSolicitud (store: false)', estado: 'UNVERIFIED', nota: OFICIAL_NO_ALCANZABLE,
  },
  {
    id: 'sdk-version', tema: 'Versión del SDK',
    sourceUrl: 'https://registry.npmjs.org/openai', verificationDate: '2026-10-23',
    verifiedValue: 'dist-tag latest = 7.43.0 (consultado con npm view); instalada y fijada en 7.43.0.',
    codeLocation: 'package.json → dependencies.openai', estado: 'VERIFIED_OFFICIAL',
  },
  {
    id: 'node-requirement', tema: 'Requisito de Node',
    sourceUrl: 'https://registry.npmjs.org/openai', verificationDate: '2026-10-23',
    verifiedValue: 'engines.node >=22.0.0 en el paquete instalado; .nvmrc = 22; el proyecto de Vercel declara nodeVersion 24.x (consulta de solo lectura al proyecto).',
    codeLocation: '.nvmrc; package.json (engines/openai)', estado: 'VERIFIED_LOCAL',
  },
  {
    id: 'sdk-retries', tema: 'Reintentos del SDK',
    sourceUrl: 'https://github.com/openai/openai-node', verificationDate: '2026-10-23',
    verifiedValue: 'El cliente acepta maxRetries (por defecto 2); el adaptador lo fija en 0 para que decida el circuit breaker.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → new OpenAI({ maxRetries: 0 })', estado: 'VERIFIED_LOCAL',
  },
  {
    id: 'abort-signal', tema: 'AbortSignal en la solicitud',
    sourceUrl: 'https://github.com/openai/openai-node', verificationDate: '2026-10-23',
    verifiedValue: 'RequestOptions declara signal?: AbortSignal; el adaptador la propaga desde el dispatcher.',
    codeLocation: 'lib/ai-gateway/shadow/openai-adapter.ts → responder(input, { signal }); dispatcher.ts → conTimeout', estado: 'VERIFIED_LOCAL',
  },
  {
    id: 'pricing-input', tema: 'Tarifa de entrada (Standard, short-context)',
    sourceUrl: 'https://developers.openai.com/api/docs/pricing', verificationDate: '2026-10-23',
    verifiedValue: `${TARIFA.inputUsdPerMillion} USD por 1M tokens según agregadores de terceros; coincide con la configuración, pero NO se revalidó en la página oficial.`,
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.standard.inputUsdPerMillion', estado: 'THIRD_PARTY_ONLY', nota: OFICIAL_NO_ALCANZABLE,
  },
  {
    id: 'pricing-cached-input', tema: 'Tarifa de entrada en caché',
    sourceUrl: 'https://developers.openai.com/api/docs/pricing', verificationDate: '2026-10-23',
    verifiedValue: `${TARIFA.cachedInputUsdPerMillion} USD por 1M tokens según una sola fuente de terceros (otra cifra de «cache write» no se usa y es dudosa). Sin confirmación oficial.`,
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.standard.cachedInputUsdPerMillion', estado: 'THIRD_PARTY_ONLY', nota: OFICIAL_NO_ALCANZABLE,
  },
  {
    id: 'pricing-output', tema: 'Tarifa de salida',
    sourceUrl: 'https://developers.openai.com/api/docs/pricing', verificationDate: '2026-10-23',
    verifiedValue: `${TARIFA.outputUsdPerMillion} USD por 1M tokens según agregadores de terceros; coincide con la configuración, NO revalidada en la página oficial.`,
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.standard.outputUsdPerMillion', estado: 'THIRD_PARTY_ONLY', nota: OFICIAL_NO_ALCANZABLE,
  },
  {
    id: 'pricing-batch', tema: 'Tarifas batch',
    sourceUrl: 'https://developers.openai.com/api/docs/pricing', verificationDate: '2026-10-23',
    verifiedValue: 'Sin fuente consultada en esta sesión: la configuración conserva las cifras del dictamen CLO del 2026-10-21 sin revalidar. No se usan en el shadow.',
    codeLocation: 'lib/ai-gateway/shadow/shadow-model-config.ts → pricing.batch', estado: 'UNVERIFIED',
  },
];

/** Vigencia máxima de una verificación antes de un canary: pasada esta edad hay que repetirla. */
export const VERIFICACION_MAX_DIAS = 7;

export function estadoVerificacionOpenAI(
  entradas: readonly EntradaVerificacion[] = VERIFICACION_OPENAI,
  ahora: Date = new Date(),
  maxDias = VERIFICACION_MAX_DIAS,
) {
  const pendientes = entradas.filter((e) => e.estado !== 'VERIFIED_OFFICIAL' && e.estado !== 'VERIFIED_LOCAL');
  const fechas = entradas.map((e) => e.verificationDate).sort();
  const masAntigua = fechas[0] ?? null;
  const edadDias = masAntigua ? (ahora.getTime() - Date.parse(`${masAntigua}T00:00:00Z`)) / 86_400_000 : Infinity;
  const vigente = Number.isFinite(edadDias) && edadDias <= maxDias;
  return {
    completa: entradas.length > 0 && pendientes.length === 0 && vigente,
    pendientes: pendientes.map((e) => e.id),
    vigente,
    fechaMasAntigua: masAntigua,
  };
}
