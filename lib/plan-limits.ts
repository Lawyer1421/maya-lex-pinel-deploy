/**
 * lib/plan-limits.ts — ÚNICA fuente de los límites y precios de los planes de pago.
 *
 * Los límites de consultas se aplican SOLO del lado del servidor (lib/rate-limit.ts → reserveRateLimit); la página de precios y las tarjetas leen
 * estas mismas constantes, así que lo que se promete en pantalla es lo que el servidor hace cumplir. Sin variables de entorno: cambiar un límite es un
 * cambio de código revisado (para los planes de pago no hay override por entorno).
 *
 * Plan «Premium» = tier interno 'pro' (así lo reconocen PayPal, la base de datos y el resto del código).
 */

export interface LimitesConsultas {
  /** Consultas por día calendario (America/Tegucigalpa). */
  diario: number;
  /** Consultas por mes calendario (America/Tegucigalpa). */
  mensual: number;
}

export const LIMITES_ACADEMICO: LimitesConsultas = Object.freeze({ diario: 20, mensual: 400 });
export const LIMITES_PREMIUM: LimitesConsultas = Object.freeze({ diario: 60, mensual: 1200 });

/** Límites por tier interno. Solo los planes de pago tienen límite mensual; free (env) y admin no pasan por aquí. */
export function limitesDePlanPago(tier: string): LimitesConsultas | null {
  if (tier === 'academico') return LIMITES_ACADEMICO;
  if (tier === 'pro') return LIMITES_PREMIUM;
  return null;
}

/** Precios mensuales SIN CAMBIO. El cobro lo fija el plan de PayPal; esto es lo que se muestra. */
export const PRECIOS_PLAN = Object.freeze({
  academico: Object.freeze({ usd: 9, lempiras: 245 }),
  premium: Object.freeze({ usd: 15, lempiras: 405 }),
});

export const formatoUsd = (usd: number): string => `USD ${usd}`;
export const formatoLempiras = (l: number): string => `L ${l}`;
export const formatoEntero = (n: number): string => n.toLocaleString('en-US');

// ── Tope de costo diario ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Tope de gasto de IA por día, en USD. */
export const TOPE_COSTO_DIARIO_USD = 5;

/**
 * ¿A quién se le aplica el tope de USD 5 al día?
 *  - 'por_usuario': cada usuario tiene su propio tope diario.
 *  - 'por_plan': el tope es compartido por TODOS los usuarios del mismo plan.
 * TODO(fundador): decisión PENDIENTE. Mientras no decida, el valor por defecto es 'por_usuario'. Cambiarlo es cambiar esta constante.
 * Nota: este PR deja la configuración y la regla de agrupación; la medición del gasto por consulta (que hoy no existe en la ruta de chat) es otra pieza.
 */
export type AlcanceTopeCosto = 'por_usuario' | 'por_plan';
export const ALCANCE_TOPE_COSTO_DIARIO: AlcanceTopeCosto = 'por_usuario';

/** Clave con la que se acumula el gasto del día según el alcance configurado. */
export function claveTopeCostoDiario(p: { userIdentifier: string; plan: string; fecha: string; alcance?: AlcanceTopeCosto }): string {
  const alcance = p.alcance ?? ALCANCE_TOPE_COSTO_DIARIO;
  return alcance === 'por_plan' ? `plan:${p.plan}:${p.fecha}` : `user:${p.userIdentifier}:${p.fecha}`;
}

/** true si el gasto acumulado ya alcanzó o superó el tope. Un gasto inválido (NaN, negativo) se trata como tope alcanzado (fail-closed). */
export function topeCostoDiarioAlcanzado(gastadoUsd: number, topeUsd: number = TOPE_COSTO_DIARIO_USD): boolean {
  if (!Number.isFinite(gastadoUsd) || gastadoUsd < 0) return true;
  return gastadoUsd >= topeUsd;
}
