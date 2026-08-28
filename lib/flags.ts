/**
 * lib/flags.ts — Feature flags server-side (Operación "Facultades Completas", Fase 0)
 *
 * Prerrequisito de R1 (toda capacidad nueva sale detrás de flag, default OFF)
 * y R2 (kill switch editable sin redeploy) — ver docs/governance/DECISION_LOG.md.
 *
 * Uso EXCLUSIVAMENTE server-side (Server Components, Route Handlers). Nunca
 * exponer la fila completa de feature_flags al cliente -- incluye la
 * allowlist de correos admin (R3), que es información operativa interna.
 *
 * Fail-closed por diseño: cualquier error de lectura, tabla ausente, fila
 * ausente, o nombre de flag desconocido se trata como DESACTIVADO. Nunca se
 * activa una capacidad por default ni por fallo silencioso -- mismo criterio
 * que ya rige el resto de esta base de código (fail-closed del RAG, gates de
 * pago).
 */
import { createServerSupabaseClient } from './supabase';

export const KNOWN_FLAGS = [
  'flag_corpus_p0',
  'flag_corpus_profesional',
  'flag_osint',
  'flag_expediente',
  'flag_voz',
  'flag_paywall',
] as const;

export type FlagName = (typeof KNOWN_FLAGS)[number];

interface FeatureFlagRow {
  enabled: boolean;
  allowed_emails: string[];
}

/**
 * ¿Está `flagName` activo para `userEmail`?
 *
 * - Flag inexistente en la tabla, o error de lectura -> false (fail-closed).
 * - enabled=false -> false, sin importar la allowlist.
 * - enabled=true y allowed_emails vacío -> true para cualquier usuario
 *   (activación amplia, posterior al grupo controlado).
 * - enabled=true y allowed_emails con contenido -> true SOLO si userEmail
 *   (normalizado trim+lowercase, mismo criterio que
 *   buildUserIdentifierFromEmail en lib/rate-limit.ts) está en la lista.
 * - userEmail null/vacío con allowlist no vacía -> false.
 */
export async function isFlagEnabledForUser(
  flagName: FlagName,
  userEmail: string | null | undefined
): Promise<boolean> {
  let row: FeatureFlagRow | null = null;
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled, allowed_emails')
      .eq('flag_name', flagName)
      .maybeSingle();

    if (error) {
      console.error(`[flags] Error leyendo ${flagName}:`, error.message);
      return false;
    }
    row = data as FeatureFlagRow | null;
  } catch (err) {
    console.error(`[flags] Excepción leyendo ${flagName}:`, err instanceof Error ? err.message : err);
    return false;
  }

  if (!row || !row.enabled) return false;

  const allowlist = row.allowed_emails ?? [];
  if (allowlist.length === 0) return true;

  const normalizado = userEmail?.trim().toLowerCase();
  if (!normalizado) return false;

  return allowlist.includes(normalizado);
}
