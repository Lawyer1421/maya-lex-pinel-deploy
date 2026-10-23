/**
 * lib/legal-os/providers/provider.ts
 * Abstracción de proveedor de modelo: MayaLex no queda acoplado a un proveedor. Los proveedores reales (OpenAI Responses) se
 * implementan detrás de esta interfaz y su activación en producción exige autorización expresa (ver kill switch del gateway).
 */
export interface ProviderRequest {
  modelId: string;
  instructions: string;
  input: string;
  maxOutputTokens: number;
  reasoningEffort: 'none' | 'low' | 'medium' | 'high';
  /** Esquema JSON estricto de la salida estructurada. */
  outputSchema: object;
  signal?: AbortSignal;
}

export interface ProviderResponse {
  rawOutput: unknown;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

export interface LegalModelProvider {
  readonly id: string;
  /** Falso si no hay credenciales o el proveedor está apagado. */
  disponible(): boolean;
  generar(req: ProviderRequest): Promise<ProviderResponse>;
}

/** Proveedor determinista para pruebas y simulacros: nunca abre red. */
export function crearProveedorFalso(respuesta: (req: ProviderRequest) => unknown, opciones: { id?: string; latenciaMs?: number } = {}): LegalModelProvider {
  return {
    id: opciones.id ?? 'fake',
    disponible: () => true,
    async generar(req) {
      return { rawOutput: respuesta(req), usage: { inputTokens: Math.ceil(req.input.length / 4), outputTokens: 50 }, latencyMs: opciones.latenciaMs ?? 1 };
    },
  };
}
