/**
 * lib/exequatur/access.ts
 *
 * Autorización server-side de la vertical Exequátur ("Premium" en el
 * producto — tier técnico 'pro' sin cambios en subscriptions/PayPal).
 *
 * Política final (Control Plane, tras revisión independiente de Cursor
 * sobre e5e17b0 -- SECURITY_VERDICT = PASS_AFTER_ADMIN_DELTA):
 *
 *   pro      + flag ON  -> ALLOW           (Premium real, vía PayPal)
 *   admin    + flag ON  -> ALLOW_INTERNAL  (acceso interno -- NO es Premium)
 *   free     + flag ON  -> DENY
 *   academico+ flag ON  -> DENY
 *   cualquiera + flag OFF/ausente/error -> DENY
 *   fallo al resolver el tier -> DENY
 *
 * 'admin' NO se mapea a 'pro' ni a ningún tier de facturación -- es una
 * clasificación de autorización DISTINTA (ALLOW_INTERNAL), calculada aquí
 * mismo, sin persistir nada, sin tocar subscriptions/queries_log/PayPal.
 * La distinción existe para semántica de autorización/auditoría (se puede
 * loguear/mostrar "acceso interno" vs "acceso Premium" sin ambigüedad) --
 * nunca para alterar facturación.
 *
 * Ninguna de las dos condiciones (tier, flag) basta sola:
 *   - flag ON sin tier elegible -> DENY (el flag NUNCA otorga entitlement)
 *   - tier elegible sin flag -> DENY (permite apagar la vertical entera
 *     aunque el usuario ya haya pagado Premium o sea admin -- p.ej.
 *     durante un rollout gradual o un incidente)
 */
import { resolveCurrentAccess, type AccessTier } from '@/lib/paypal/access';
import { isFlagEnabledForUser } from '@/lib/flags';

/** Clasificación de autorización -- solo semántica de acceso/auditoría, nunca de facturación. */
export type ExequaturAuthorization = 'ALLOW' | 'ALLOW_INTERNAL' | 'DENY';

// 'pro' -> ALLOW (Premium real). 'admin' -> ALLOW_INTERNAL (interno, no
// Premium). 'academico'/'free' nunca aparecen aquí -- DENY siempre.
const PREMIUM_TIERS: ReadonlySet<AccessTier> = new Set(['pro']);
const INTERNAL_TIERS: ReadonlySet<AccessTier> = new Set(['admin']);

function clasificarTier(tier: AccessTier): ExequaturAuthorization {
  if (PREMIUM_TIERS.has(tier)) return 'ALLOW';
  if (INTERNAL_TIERS.has(tier)) return 'ALLOW_INTERNAL';
  return 'DENY';
}

export interface ExequaturAccessResult {
  /** true para ALLOW o ALLOW_INTERNAL; false para DENY. Atajo derivado de `authorization`. */
  granted: boolean;
  /** Clasificación explícita -- úsese esta para distinguir Premium real de acceso interno. */
  authorization: ExequaturAuthorization;
  /** Tier real resuelto (para mensajes de UI, nunca para decidir por sí solo). */
  tier: AccessTier;
  /** Estado del flag_exq_enabled para este usuario. */
  flagEnabled: boolean;
  /** true si el tier por sí solo (pro o admin) calificaría, independientemente del flag. */
  eligibleTier: boolean;
}

/**
 * Resuelve el estado completo de autorización de Exequátur para un
 * usuario. Fail-closed en cada eslabón:
 *  - si resolveCurrentAccess falla (excepción), tier vuelve a 'free' ->
 *    clasificación DENY.
 *  - isFlagEnabledForUser ya es fail-closed internamente (cualquier error
 *    de lectura, fila ausente, o flag desconocido -> false) — no se
 *    envuelve aquí en un try/catch adicional para no ocultar ni duplicar
 *    ese comportamiento ya probado en lib/flags.ts.
 *  - el flag es la ÚLTIMA compuerta: si está OFF, la clasificación es
 *    DENY sin importar qué tier se haya resuelto (ni pro ni admin la
 *    saltan).
 */
export async function resolveExequaturAccess(
  userIdentifier: string,
  userEmail: string | null | undefined,
): Promise<ExequaturAccessResult> {
  let tier: AccessTier = 'free';

  try {
    const access = await resolveCurrentAccess(userIdentifier);
    tier = access.tier;
  } catch (err) {
    console.error(
      '[exequatur/access] Error resolviendo tier -- fail-closed (acceso denegado):',
      err instanceof Error ? err.message : err,
    );
  }

  const eligibleTier = PREMIUM_TIERS.has(tier) || INTERNAL_TIERS.has(tier);
  const flagEnabled = await isFlagEnabledForUser('flag_exq_enabled', userEmail);
  const authorization: ExequaturAuthorization = flagEnabled ? clasificarTier(tier) : 'DENY';

  return {
    granted: authorization !== 'DENY',
    authorization,
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
