/**
 * scripts/luna-verify-model.ts — PRUEBA REAL del modelo de Luna contra la API de OpenAI. NO SE EJECUTA SIN EL «SÍ» DE FREDY Y SU CLAVE DE PRUEBA.
 *
 * Verifica, con datos 100 % sintéticos y públicos (sin datos de clientes, sin corpus real):
 *   1. el modelo existe en la cuenta (GET /v1/models/{id});
 *   2. la Responses API acepta reasoning.effort = none, low y medium con el modelo;
 *   3. el JSON Schema estricto se acepta y la salida lo cumple (parseo + validador de citas del gateway);
 *   4. store:false viaja en la solicitud;
 *   5. el uso real de tokens y el costo ESTIMADO por esfuerzo (las tarifas del repo son del 2026-10-23 y vencen a los 7 días: revalidar).
 * Un esfuerzo rechazado por la API se informa como NO_SOPORTADO (no es un error del script): ese plan queda sin ese nivel hasta ajustarlo.
 *
 * Uso (cuando Fredy lo autorice y entregue la clave de PRUEBA, nunca la de producción):
 *   OPENAI_API_KEY=<clave de prueba> LUNA_VERIFY_CONFIRM=SI_FREDY npx tsx scripts/luna-verify-model.ts [--model gpt-6-luna]
 * Sin LUNA_VERIFY_CONFIRM=SI_FREDY el script NO llama a la red (sale con código 2). La clave nunca se imprime.
 */
import { validarSalida } from '../lib/ai-gateway/shadow/citation-validator';
import { credencialDisponible, crearClienteOpenAI } from '../lib/ai-gateway/shadow/openai-adapter';
import type { ShadowGatewayInput } from '../lib/ai-gateway/shadow/types';
import type { ClienteLuna } from '../lib/luna/adapter';
import { construirSolicitudLuna } from '../lib/luna/adapter';
import { MODELOS_CON_TARIFA, resolverConfigPlan, type EsfuerzoRazonamiento } from '../lib/luna/config';
import { costoRealUsd } from '../lib/luna/pricing';

export const CONFIRMACION = 'SI_FREDY';
export const ESFUERZOS: readonly EsfuerzoRazonamiento[] = ['none', 'low', 'medium'];

const ENTRADA_SINTETICA: ShadowGatewayInput = {
  queryId: 'verificacion-sintetica',
  sanitizedQuestion: '¿Qué dispone el artículo 1 del instrumento de prueba sobre la vigencia de una norma?',
  evidence: [{
    chunk_id: 'sintetico:a1', instrumento: 'Instrumento Sintetico de Prueba', articulo: '1', gaceta: null, rol: 'PRIMARY',
    clasificacionProduccion: 'NORMA_VIGENTE_HONDURAS', citable: true,
    texto: 'ARTICULO 1.- Texto sintético de prueba: la norma rige desde su publicación y hasta su derogación expresa.',
  }],
  productionOutcome: { decision: 'ANSWER', retrievalState: 'SEMANTIC_SUCCESS' },
};

export interface ResultadoEsfuerzo {
  esfuerzo: EsfuerzoRazonamiento;
  estado: 'OK' | 'NO_SOPORTADO' | 'SALIDA_INVALIDA' | 'ERROR';
  detalle?: string;
  status?: string;
  inputTokens?: number;
  outputTokens?: number;
  costoEstimadoUsd?: number;
  store?: boolean;
}

export interface InformeVerificacion {
  modelo: string;
  disponibleEnCuenta: boolean;
  tarifaRegistrada: boolean;
  esfuerzos: ResultadoEsfuerzo[];
  nota: string;
}

export async function verificarModelo(cliente: ClienteLuna, modelo: string): Promise<InformeVerificacion> {
  const informe: InformeVerificacion = {
    modelo, disponibleEnCuenta: false, tarifaRegistrada: MODELOS_CON_TARIFA.has(modelo), esfuerzos: [],
    nota: 'Costos ESTIMADOS con las tarifas del repositorio (2026-10-23, vigencia 7 días): revalidar antes de usarlos.',
  };
  try {
    informe.disponibleEnCuenta = (await cliente.models.retrieve(modelo)).id === modelo;
  } catch {
    informe.disponibleEnCuenta = false;
  }
  if (!informe.disponibleEnCuenta) return informe;
  for (const esfuerzo of ESFUERZOS) {
    const config = { ...resolverConfigPlan('premium', {}), modelId: modelo, reasoningEffort: esfuerzo };
    const solicitud = construirSolicitudLuna(ENTRADA_SINTETICA, config);
    try {
      const r = await cliente.responses.create(solicitud, {});
      if (!r.usage) { informe.esfuerzos.push({ esfuerzo, estado: 'ERROR', detalle: 'respuesta sin usage', store: solicitud.store }); continue; }
      const validada = validarSalida(ENTRADA_SINTETICA, {
        rawOutput: r.output_text,
        usage: { inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens, cachedInputTokens: r.usage.input_tokens_details?.cached_tokens ?? 0 },
        latencyMs: 0,
      });
      informe.esfuerzos.push({
        esfuerzo, estado: validada.status === 'INVALID' ? 'SALIDA_INVALIDA' : 'OK', detalle: validada.invalidReason ?? undefined, status: validada.status,
        inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens,
        costoEstimadoUsd: costoRealUsd(r.usage.input_tokens, r.usage.output_tokens, r.usage.input_tokens_details?.cached_tokens ?? 0), store: solicitud.store,
      });
    } catch (e) {
      const status = typeof e === 'object' && e !== null && 'status' in e ? Number((e as { status: unknown }).status) : NaN;
      informe.esfuerzos.push({ esfuerzo, estado: status === 400 ? 'NO_SOPORTADO' : 'ERROR', detalle: e instanceof Error ? e.name : 'desconocido', store: solicitud.store });
    }
  }
  return informe;
}

/** Punto de entrada. Devuelve el código de salida; sin confirmación o sin clave NO abre red. */
export async function main(argv: readonly string[], env: Readonly<Record<string, string | undefined>>, crear: () => ClienteLuna = () => crearClienteOpenAI() as unknown as ClienteLuna, salida: (t: string) => void = console.log): Promise<number> {
  if (env.LUNA_VERIFY_CONFIRM !== CONFIRMACION) {
    salida('DETENIDO: falta la autorización de Fredy (LUNA_VERIFY_CONFIRM=SI_FREDY). No se hizo ninguna llamada.');
    return 2;
  }
  if (!credencialDisponible()) {
    salida('DETENIDO: no hay clave de prueba configurada. No se hizo ninguna llamada.');
    return 2;
  }
  const i = argv.indexOf('--model');
  const modelo = i >= 0 && argv[i + 1] ? argv[i + 1] : resolverConfigPlan('premium', env).modelId;
  const informe = await verificarModelo(crear(), modelo);
  salida(JSON.stringify(informe, null, 2));
  return informe.disponibleEnCuenta && informe.esfuerzos.every((e) => e.estado === 'OK') ? 0 : 1;
}

if (process.argv[1] && /luna-verify-model\.ts$/.test(process.argv[1])) {
  main(process.argv.slice(2), process.env).then((c) => process.exit(c));
}
