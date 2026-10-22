/**
 * lib/ai-gateway/shadow/adaptador-sombra.ts
 * PR-G3: único punto donde el despacho obtiene su adaptador y comprueba la credencial.
 * El adaptador es el de OpenAI, que solo se invoca si el kill switch, los gates, la credencial, el breaker y
 * el presupuesto lo permiten. Hoy el kill switch está apagado y el presupuesto es 0: nada se ejecuta.
 */
import type { ShadowModelAdapter } from './golden-runner';
import { credencialDisponible as hayCredencial, crearAdaptadorOpenAI } from './openai-adapter';

export function credencialDisponible(): boolean {
  return hayCredencial();
}

export function crearAdaptadorSombra(): ShadowModelAdapter {
  return crearAdaptadorOpenAI();
}
