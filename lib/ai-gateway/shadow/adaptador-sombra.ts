/**
 * lib/ai-gateway/shadow/adaptador-sombra.ts
 * PR-G2: único punto donde el despacho obtiene su adaptador. Sigue siendo el
 * falso de G1 (sin red, sin clave): no hay adaptador real en este PR.
 */
import { RecordedResponseAdapter, type ShadowModelAdapter } from './golden-runner';

export function crearAdaptadorSombra(): ShadowModelAdapter {
  return new RecordedResponseAdapter({});
}
