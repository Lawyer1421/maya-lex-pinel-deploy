/**
 * lib/mcp/access.ts
 *
 * Autorización server-side del servidor MCP v1 «MAYA LEX — Derecho Hondureño»
 * (docs/governance/PLAN-MCP-SLICE-1.md §3.3). Espejo de lib/exequatur/access.ts
 * con su propio flag:
 *
 *   pro      + flag_mcp_enabled ON  -> ALLOW
 *   admin    + flag_mcp_enabled ON  -> ALLOW_INTERNAL  (acceso interno, no Premium)
 *   free/academico                  -> DENY
 *   flag OFF/ausente/error          -> DENY   (lanzamiento con flag OFF)
 *   fallo al resolver el tier       -> DENY
 *   token inválido/ausente          -> 401 sin cuerpo informativo (en el handler,
 *                                      antes de llamar a esta función)
 *
 * Ninguna condición basta sola: el flag nunca otorga entitlement y un tier
 * elegible sin flag queda fuera. No hay ruta MCP todavía: este módulo sólo
 * fija el contrato y sus tests.
 */
import { isFlagEnabledForUser } from '@/lib/flags';
import { resolverTierMcp, type UserTier } from '@/lib/rate-limit';

/** Clasificación de autorización -- solo semántica de acceso/auditoría, nunca de facturación. */
export type McpAuthorization = 'ALLOW' | 'ALLOW_INTERNAL' | 'DENY';

const PREMIUM_TIERS: ReadonlySet<UserTier> = new Set(['pro']);
const INTERNAL_TIERS: ReadonlySet<UserTier> = new Set(['admin']);

function clasificarTier(tier: UserTier): McpAuthorization {
  if (PREMIUM_TIERS.has(tier)) return 'ALLOW';
  if (INTERNAL_TIERS.has(tier)) return 'ALLOW_INTERNAL';
  return 'DENY';
}

export interface McpAccessResult {
  /** true para ALLOW o ALLOW_INTERNAL; false para DENY. */
  granted: boolean;
  authorization: McpAuthorization;
  /** Tier real resuelto (nunca decide por sí solo). */
  tier: UserTier;
  /** Estado de flag_mcp_enabled para este usuario. */
  flagEnabled: boolean;
  /** true si el tier por sí solo (pro o admin) calificaría. */
  eligibleTier: boolean;
}

/**
 * Resuelve la autorización MCP para un correo verificado (getVerifiedEmail).
 *
 * El tier sale de resolverTierMcp: la fila de hoy de la bolsa `mcp:email:…` o,
 * si no la hay, la suscripción activa. NO se usa resolveCurrentAccess, que sólo
 * mira la fila del chat de hoy y degradaría a free a un pro que entra por MCP
 * antes de usar el chat (Auditor @ e1c0c40, P1-1). Fail-closed: sin correo o
 * ante cualquier error, tier='free' -> DENY; el flag es la última compuerta.
 */
export async function resolveMcpAccess(userEmail: string | null | undefined): Promise<McpAccessResult> {
  let tier: UserTier = 'free';

  if (userEmail && userEmail.trim() !== '') {
    try {
      tier = await resolverTierMcp(userEmail);
    } catch (err) {
      console.error(
        '[mcp/access] Error resolviendo tier -- fail-closed (acceso denegado):',
        err instanceof Error ? err.message : err,
      );
      tier = 'free';
    }
  }

  const eligibleTier = PREMIUM_TIERS.has(tier) || INTERNAL_TIERS.has(tier);
  const flagEnabled = await isFlagEnabledForUser('flag_mcp_enabled', userEmail);
  const authorization: McpAuthorization = flagEnabled ? clasificarTier(tier) : 'DENY';

  return { granted: authorization !== 'DENY', authorization, tier, flagEnabled, eligibleTier };
}
