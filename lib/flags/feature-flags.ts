/**
 * lib/flags/feature-flags.ts
 *
 * Feature flag utilities for Maya Lex hardening canary deployment.
 * Uses stable user identity to ensure cohort consistency across requests.
 *
 * Flag: maya-lex-hybrid-router-v2
 *   OFF (false): Legacy parallel RAG+Web orchestration
 *   ON (true):  Hardened sequential orchestration
 *
 * Evaluation is server-side (no client flag leakage).
 */

/**
 * Extract stable user entity ID for Vercel Flags targeting.
 * Returns deterministic identifier suitable for targeting rules.
 *
 * Priority:
 * 1. Supabase auth UUID (most stable)
 * 2. Hashed authenticated identifier (session-based)
 * 3. Anonymous fallback
 */
export function getStableEntityId(context: {
  supabaseUserId?: string;
  authenticatedHash?: string;
}): string {
  if (context.supabaseUserId) {
    return context.supabaseUserId;
  }
  if (context.authenticatedHash) {
    return context.authenticatedHash;
  }
  return 'anonymous';
}

/**
 * Extract stable user identity from request context (for logging/telemetry).
 * Uses authenticated email or anonymous session identifier.
 *
 * Returns consistent identity across requests for the same user.
 */
export function getStableUserIdentity(context: {
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
}): string {
  // Prefer authenticated email (most stable)
  if (context.userEmail) {
    return `user:${context.userEmail}`;
  }
  // Fallback to session ID
  if (context.sessionId) {
    return `session:${context.sessionId}`;
  }
  // Last resort: IP address
  if (context.ipAddress) {
    return `ip:${context.ipAddress}`;
  }
  // Should not reach here in normal operation
  return 'anonymous:unknown';
}

/**
 * Determine if hardened orchestration should be used for this request.
 *
 * Currently: manually evaluated via Vercel Flags dashboard.
 * In future: can accept `flags` SDK object for direct evaluation.
 *
 * SAFE DEFAULTS:
 *   - If flag evaluation fails: return false (use legacy path)
 *   - If flag undefined: return false (use legacy path)
 *   - If user not targeted: return false (use legacy path)
 */
export function shouldUseHardenedOrchestration(
  flagValue?: boolean,
  fallbackToLegacy: boolean = true
): boolean {
  // Failsafe: if flag is undefined or evaluation failed, use legacy path
  if (flagValue === undefined) {
    return fallbackToLegacy ? false : false;
  }

  // Explicit flag value
  return flagValue === true;
}

/**
 * Metadata for request context (logging/telemetry).
 */
export interface OrchestrationContext {
  stable_identity: string;
  flag_value: boolean;
  orchestration_type: 'legacy' | 'hardened';
  timestamp: string;
}

export function createOrchestrationContext(
  userEmail: string | undefined,
  sessionId: string | undefined,
  flagValue: boolean | undefined
): OrchestrationContext {
  const stable_identity = getStableUserIdentity({
    userEmail,
    sessionId,
  });

  const orchestration_type = shouldUseHardenedOrchestration(flagValue)
    ? 'hardened'
    : 'legacy';

  return {
    stable_identity,
    flag_value: flagValue ?? false,
    orchestration_type,
    timestamp: new Date().toISOString(),
  };
}
