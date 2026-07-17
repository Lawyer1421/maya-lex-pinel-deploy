/**
 * lib/entitlements.ts
 *
 * Fase 2 de la modernización de identidad. entitlements es la futura
 * ÚNICA fuente de "¿este usuario tiene acceso a X?" — independiente de
 * cómo lo obtuvo (suscripción PayPal, pago único, cortesía manual,
 * contrato institucional, o arrastrado de una migración).
 *
 * Durante la transición (esta fase): se intenta resolver el entitlement
 * PRIMERO; si no existe ninguno (caso normal hoy, la tabla nace vacía),
 * se cae al adaptador legado (lib/paypal/access.ts → resolveCurrentAccess,
 * que a su vez lee subscriptions/queries_log). El gate legado NO se
 * elimina en esta fase — solo deja de ser la primera fuente consultada.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveCurrentAccess } from './paypal/access';

export type EntitlementSourceType =
  | 'paypal_subscription'
  | 'paypal_one_time_payment'
  | 'manual_beta'
  | 'manual_comped'
  | 'institution_contract'
  | 'migration';

export type EntitlementStatus = 'active' | 'revoked' | 'expired';

export interface Entitlement {
  id:              string;
  userId:          string;
  entitlementKey:  string;
  sourceType:      EntitlementSourceType;
  sourceReference: string | null;
  status:          EntitlementStatus;
  activeFrom:      string;
  activeUntil:     string | null;
  reason:          string | null;
}

/** Mapea el plan interno al entitlement_key correspondiente. */
export const PLAN_ENTITLEMENT_KEYS: Record<string, string> = {
  pro: 'pro_access',
  academico: 'academico_access',
};

/**
 * Resuelve un entitlement activo y vigente (active_until nulo o futuro)
 * para (userId, entitlementKey). Devuelve null si no existe — NUNCA
 * lanza por "no encontrado", eso es un caso esperado durante la
 * transición.
 */
export async function resolveEntitlement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  entitlementKey: string
): Promise<Entitlement | null> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', userId)
    .eq('entitlement_key', entitlementKey)
    .eq('status', 'active')
    .or(`active_until.is.null,active_until.gt.${nowIso}`)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    entitlementKey: data.entitlement_key,
    sourceType: data.source_type,
    sourceReference: data.source_reference,
    status: data.status,
    activeFrom: data.active_from,
    activeUntil: data.active_until,
    reason: data.reason,
  };
}

/**
 * Busca el primer entitlement activo del usuario entre TODOS los planes
 * conocidos (pro, academico) — usado cuando no importa cuál plan
 * específico, solo si tiene algún acceso otorgado por entitlement.
 */
export async function resolveAnyEntitlement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<{ plan: string; entitlement: Entitlement } | null> {
  for (const [plan, key] of Object.entries(PLAN_ENTITLEMENT_KEYS)) {
    const ent = await resolveEntitlement(supabase, userId, key);
    if (ent) return { plan, entitlement: ent };
  }
  return null;
}

/**
 * Métrica de fallback — cuántas veces se tuvo que caer al adaptador
 * legado por no existir un entitlement todavía. Sin infraestructura de
 * métricas dedicada en el proyecto: se usa un log estructurado grepeable
 * como piso mínimo, ampliable a un sistema real de métricas después.
 */
export function logEntitlementFallback(userIdentifier: string, reason: string): void {
  console.log(`[ENTITLEMENTS] fallback_used user=${userIdentifier} reason=${reason}`);
}

export type AccessSourceType = EntitlementSourceType | 'legacy_queries_log' | 'none';

export interface ResolvedAccess {
  accessGranted:       boolean;
  accessLabel:         string;
  sourceType:          AccessSourceType;
  plan:                string;
  subscriptionStatus:  string | null;
  verificationPending: boolean;
  activeUntil:         string | null;
  reasonCode:          string;
}

function labelForEntitlementSource(sourceType: EntitlementSourceType): string {
  switch (sourceType) {
    case 'paypal_subscription':
    case 'paypal_one_time_payment':
      return 'Usuario Pro';
    case 'manual_beta':
      return 'Acceso beta';
    case 'manual_comped':
      return 'Acceso de cortesía';
    case 'institution_contract':
      return 'Usuario Pro';
    case 'migration':
      return 'Usuario Pro';
  }
}

/**
 * Resolución de acceso "entitlement-first, legado como fallback".
 *
 * userId es el UUID de auth.users (ya existe hoy para cada sesión de
 * Supabase Auth — no requiere haber completado la migración de
 * identidad para empezar a usarse). Si no hay userId (llamador aún no
 * migrado a pasar la sesión completa) o no existe ningún entitlement,
 * cae al adaptador legado sin romper nada.
 */
export async function resolveAccessWithEntitlements(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>;
  userId: string | null;
  userIdentifier: string;
}): Promise<ResolvedAccess> {
  if (params.userId) {
    const found = await resolveAnyEntitlement(params.supabase, params.userId);
    if (found) {
      return {
        accessGranted: true,
        accessLabel: labelForEntitlementSource(found.entitlement.sourceType),
        sourceType: found.entitlement.sourceType,
        plan: found.plan,
        subscriptionStatus: 'active',
        verificationPending: false,
        activeUntil: found.entitlement.activeUntil,
        reasonCode: 'entitlement_active',
      };
    }
  }

  logEntitlementFallback(params.userIdentifier, 'no_entitlement_row');
  const legacy = await resolveCurrentAccess(params.userIdentifier);

  const accessLabel = legacy.accessGranted
    ? 'Usuario Pro'
    : legacy.verificationPending
      ? 'Verificando tu suscripción'
      : legacy.reasonCode === 'cancelled' && legacy.subscriptionStatus
        ? 'Plan gratuito'
        : 'Plan gratuito';

  return {
    accessGranted: legacy.accessGranted,
    accessLabel,
    sourceType: legacy.accessGranted ? 'legacy_queries_log' : 'none',
    plan: legacy.tier,
    subscriptionStatus: legacy.subscriptionStatus,
    verificationPending: legacy.verificationPending,
    activeUntil: null,
    reasonCode: legacy.reasonCode,
  };
}
