/**
 * lib/luna/model-validation.ts
 * El identificador del modelo es configurable y se valida contra los modelos REALMENTE disponibles en la cuenta de OpenAI
 * (GET /v1/models/{id}). Fail-closed: si no se puede confirmar, Luna no se usa y la consulta sigue por el proveedor vigente.
 * Resultado en caché (positivo 10 min, negativo 60 s) para no añadir una llamada por consulta.
 */
export interface ClienteModelos {
  models: { retrieve(modelId: string, opciones?: { signal?: AbortSignal }): Promise<{ id: string }> };
}

export type ValidacionModelo =
  | { disponible: true }
  | { disponible: false; razon: 'NO_DISPONIBLE_EN_CUENTA' | 'VERIFICACION_FALLIDA' };

const TTL_OK_MS = 10 * 60_000;
const TTL_ERROR_MS = 60_000;

export interface ValidadorModelo {
  validar(modelId: string, cliente: ClienteModelos, signal?: AbortSignal): Promise<ValidacionModelo>;
}

export function crearValidadorModelo(ahora: () => number = Date.now): ValidadorModelo {
  const cache = new Map<string, { resultado: ValidacionModelo; hasta: number }>();
  return {
    async validar(modelId, cliente, signal) {
      const previo = cache.get(modelId);
      if (previo && previo.hasta > ahora()) return previo.resultado;
      let resultado: ValidacionModelo;
      let ttl = TTL_ERROR_MS;
      try {
        const m = await cliente.models.retrieve(modelId, { signal });
        if (m && m.id === modelId) {
          resultado = { disponible: true };
          ttl = TTL_OK_MS;
        } else {
          resultado = { disponible: false, razon: 'NO_DISPONIBLE_EN_CUENTA' };
        }
      } catch (e) {
        // 404 / 403 del proveedor = el modelo no está en la cuenta; cualquier otro fallo = no se pudo verificar.
        const status = typeof e === 'object' && e !== null && 'status' in e ? Number((e as { status: unknown }).status) : NaN;
        resultado = { disponible: false, razon: status === 404 || status === 403 ? 'NO_DISPONIBLE_EN_CUENTA' : 'VERIFICACION_FALLIDA' };
      }
      cache.set(modelId, { resultado, hasta: ahora() + ttl });
      return resultado;
    },
  };
}
