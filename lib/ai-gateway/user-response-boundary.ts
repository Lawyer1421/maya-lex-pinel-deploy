/**
 * Frontera de tipos entre el gateway en modo sombra y la respuesta al usuario
 * (PR-G1). La respuesta HTTP sólo se construye a partir de un
 * ProductionUserResponse; un ShadowGatewayResult no es asignable a ese tipo
 * (origin 'SHADOW' frente a 'PRODUCTION', más su marca nominal), así que no
 * compila. tests/ai-gateway-shadow.test.ts lo fija con @ts-expect-error.
 *
 * Este PR no cablea esta función en app/api/chat/route.ts: el flujo actual de
 * respuesta no se toca. Cuando el gateway salga de sombra, la ruta deberá
 * construir su respuesta sólo a través de aquí.
 */
export interface ProductionUserResponse {
  readonly origin: 'PRODUCTION';
  readonly body: Readonly<Record<string, unknown>>;
  readonly status?: number;
}

export function construirRespuestaHttpUsuario(respuesta: ProductionUserResponse): Response {
  if (respuesta.origin !== 'PRODUCTION') {
    // Defensa en tiempo de ejecución por si alguien fuerza el tipo con `as`.
    throw new Error('sólo una respuesta de producción puede llegar al usuario');
  }
  return Response.json(respuesta.body, { status: respuesta.status ?? 200 });
}
