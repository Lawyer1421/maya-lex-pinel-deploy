/**
 * lib/ai-gateway/shadow/config.ts
 * MAYALEX AI GATEWAY v1 — PR-G2 (frontera shadow).
 *
 * Kill switch del despacho sombra. Es una constante de código, no una variable
 * de entorno: no depende de Vercel y por defecto está APAGADA. Encenderla
 * exige un cambio de código revisado en un PR posterior (dictamen CLO).
 */
export const SHADOW_GATEWAY_ENABLED: boolean = false;

/** Tiempo máximo del despacho sombra antes de abandonarlo. No afecta la respuesta HTTP. */
export const SHADOW_TIMEOUT_MS = 5000;

/** Tope de registros del registro en memoria. */
export const SHADOW_REGISTRY_MAX = 200;
