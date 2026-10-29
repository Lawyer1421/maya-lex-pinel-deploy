/**
 * lib/luna/cost-counter.ts
 * Contador GLOBAL de costos de Luna, válido con varias instancias serverless. El `budget-guard` en memoria del motor NO es un límite
 * global (cada instancia lleva su propia cuenta); este contador sí, porque la reserva es atómica en un almacén compartido.
 *
 * Contrato: `reservar` suma el peor caso del día (zona America/Tegucigalpa) del plan solo si no excede el tope; `liquidar` ajusta la
 * reserva al costo real. Cualquier error del almacén = NO hay llamada (fail-closed). Montos en micro-USD enteros (sin flotantes).
 *
 * Almacén: la implementación Supabase llama a dos RPC que requieren DDL → PROPUESTA_NO_APLICADA
 * (docs/luna/PROPUESTA_NO_APLICADA_luna_costos.sql). Sin ese DDL aplicado y sin cliente inyectado, `crearContadorSupabase` falla cerrado.
 * Modo `local_canary_only` (LUNA_COST_COUNTER): contador en memoria SOLO para la cuenta de prueba de una instancia; NO es límite global
 * y queda marcado `global:false` en el registro.
 */
export interface ContadorCostos {
  readonly global: boolean;
  /** true si la reserva cupo en el tope del día/plan y quedó registrada. */
  reservar(plan: string, microUsd: number, topeMicroUsd: number): Promise<boolean>;
  /** Reemplaza la reserva por el costo real (o la deja completa si el costo real se desconoce: pasar NaN). */
  liquidar(plan: string, reservaMicroUsd: number, realMicroUsd: number): Promise<void>;
}

export const aMicroUsd = (usd: number): number => Math.ceil(usd * 1_000_000);

/** Cliente mínimo (SupabaseClient.rpc). Inyectable en pruebas. */
export interface ClienteRpc {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export const RPC_RESERVAR = 'luna_reservar_costo';
export const RPC_LIQUIDAR = 'luna_liquidar_costo';

export function crearContadorSupabase(crearCliente: () => ClienteRpc, dia: () => string): ContadorCostos {
  return {
    global: true,
    async reservar(plan, microUsd, topeMicroUsd) {
      if (![microUsd, topeMicroUsd].every((n) => Number.isFinite(n) && n >= 0) || topeMicroUsd <= 0) return false;
      try {
        const { data, error } = await crearCliente().rpc(RPC_RESERVAR, { p_dia: dia(), p_plan: plan, p_micro_usd: microUsd, p_tope_micro_usd: topeMicroUsd });
        return !error && data === true;
      } catch {
        return false;
      }
    },
    async liquidar(plan, reserva, real) {
      const delta = Number.isFinite(real) && real >= 0 ? real - reserva : 0;
      if (delta === 0) return;
      try {
        await crearCliente().rpc(RPC_LIQUIDAR, { p_dia: dia(), p_plan: plan, p_delta_micro_usd: delta });
      } catch {
        // Si falla la liquidación la reserva (peor caso) queda como gastada: nunca se subestima.
      }
    },
  };
}

/** Contador en memoria: SOLO canary de una cuenta de prueba. No es global. */
export function crearContadorLocalCanary(dia: () => string): ContadorCostos {
  const gastado = new Map<string, number>();
  const k = (plan: string) => `${dia()}|${plan}`;
  return {
    global: false,
    async reservar(plan, micro, tope) {
      if (![micro, tope].every((n) => Number.isFinite(n) && n >= 0) || tope <= 0) return false;
      const actual = gastado.get(k(plan)) ?? 0;
      if (actual + micro > tope) return false;
      gastado.set(k(plan), actual + micro);
      return true;
    },
    async liquidar(plan, reserva, real) {
      if (!Number.isFinite(real) || real < 0) return;
      gastado.set(k(plan), Math.max(0, (gastado.get(k(plan)) ?? 0) + (real - reserva)));
    },
  };
}
