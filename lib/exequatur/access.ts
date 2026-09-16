/**
 * lib/exequatur/access.ts
 *
 * Autorización server-side de la vertical Exequátur ("Premium" en el
 * producto — tier técnico 'pro' sin cambios en subscriptions/PayPal).
 *
 * exequatur.access = tier técnico elegible (hoy: solo 'pro') Y
 * flag_exq_enabled activo para ese usuario. Ninguna de las dos
 * condiciones basta sola:
 *   - flag ON sin tier elegible -> false (el flag NUNCA otorga entitlement)
 *   - tier elegible sin flag -> false (permite apagar la vertical entera
 *     por completo aunque el usuario ya haya pagado Premium — p.ej.
 *     durante un rollout gradual o un incidente)
 *
 * ADMIN_EXQ_POLICY_REQUIRES_CONTROL_PLANE_DECISION:
 * En el resto de este código, 'admin' siempre se agrupa con los tiers
 * pagados en gates GENÉRICOS de "¿tiene algo pagado?" — accessGranted en
 * lib/paypal/access.ts, PAID_TIERS en lib/rate-limit.ts, límite 9999,
 * exención en lib/paypal/document-analysis.ts. Pero ninguno de esos gates
 * distingue "Premium específicamente, no académico" — Exequátur es la
 * PRIMERA frontera de ese tipo en todo el repositorio. No existe
 * precedente directo de cómo debe comportarse 'admin' exactamente ahí. Por
 * eso, deliberadamente, 'admin' NO está en ELEGIBLE_TIERS todavía —
 * fail-closed, en vez de inventarle a 'admin' un privilegio nuevo solo
 * para Exequátur sin que el Control Plane lo decida explícitamente.
 */
import { resolveCurrentAccess, type AccessTier } from '@/lib/paypal/access';
import { isFlagEnabledForUser } from '@/lib/flags';

// Solo 'pro' hoy. 'academico' excluido a propósito: Exequátur es
// exclusivo del plan Premium, no de "cualquier plan pagado". 'admin' fuera
// hasta decisión explícita del Control Plane (ver comentario de cabecera).
const ELEGIBLE_TIERS: ReadonlySet<AccessTier> = new Set(['pro']);

export interface ExequaturAccessResult {
  /** true SOLO si tier elegible Y flag activo. Es lo único que debe usarse para autorizar. */
  granted: boolean;
  /** Tier real resuelto (para mensajes de UI, nunca para decidir por sí solo). */
  tier: AccessTier;
  /** Estado del flag_exq_enabled para este usuario. */
  flagEnabled: boolean;
  /** true si el tier por sí solo calificaría, independientemente del flag. */
  eligibleTier: boolean;
}

/**
 * Resuelve el estado completo de autorización de Exequátur para un
 * usuario. Fail-closed en cada eslabón:
 *  - si resolveCurrentAccess falla (excepción), eligibleTier=false.
 *  - isFlagEnabledForUser ya es fail-closed internamente (cualquier error
 *    de lectura, fila ausente, o flag desconocido -> false) — no se
 *    envuelve aquí en un try/catch adicional para no ocultar ni duplicar
 *    ese comportamiento ya probado en lib/flags.ts.
 */
export async function resolveExequaturAccess(
  userIdentifier: string,
  userEmail: string | null | undefined,
): Promise<ExequaturAccessResult> {
  let tier: AccessTier = 'free';
  let eligibleTier = false;

  try {
    const access = await resolveCurrentAccess(userIdentifier);
    tier = access.tier;
    eligibleTier = ELEGIBLE_TIERS.has(access.tier);
  } catch (err) {
    console.error(
      '[exequatur/access] Error resolviendo tier -- fail-closed (acceso denegado):',
      err instanceof Error ? err.message : err,
    );
  }

  const flagEnabled = await isFlagEnabledForUser('flag_exq_enabled', userEmail);

  return {
    granted: eligibleTier && flagEnabled,
    tier,
    flagEnabled,
    eligibleTier,
  };
}

/** Atajo booleano sobre resolveExequaturAccess, para el caso común de solo necesitar sí/no. */
export async function hasExequaturAccess(
  userIdentifier: string,
  userEmail: string | null | undefined,
): Promise<boolean> {
  const result = await resolveExequaturAccess(userIdentifier, userEmail);
  return result.granted;
}
