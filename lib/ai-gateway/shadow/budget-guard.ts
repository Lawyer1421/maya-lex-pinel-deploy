/**
 * lib/ai-gateway/shadow/budget-guard.ts
 * MAYALEX AI GATEWAY v1 — PR-G3: presupuesto fail-closed en memoria para el modo sombra.
 *
 * Antes de cada llamada se RESERVA el costo del peor caso (entrada estimada + tope de salida). Si
 * gastado + reservado + peor caso supera el presupuesto, no hay llamada. Con presupuesto <= 0 jamás hay
 * llamada. Tras la llamada se liquida con el costo real; si el costo real se desconoce (error, timeout), se
 * conserva el peor caso como gastado: no se sabe qué se facturó y se asume lo máximo.
 * Sin Redis ni base de datos: el estado vive en la instancia.
 */
export interface OpcionesBudget {
  presupuestoUsd: number;
  ventanaMs: number;
  ahora?: () => number;
}

export interface BudgetGuard {
  /** true si el peor caso cabe en el presupuesto; en ese caso queda reservado. */
  reservar(peorCasoUsd: number): boolean;
  /** Libera la reserva y registra el gasto real (o el peor caso si se desconoce). */
  liquidar(peorCasoUsd: number, realUsd: number): void;
  gastadoUsd(): number;
}

export function crearBudgetGuard(opciones: OpcionesBudget): BudgetGuard {
  const ahora = opciones.ahora ?? Date.now;
  let inicioVentana = ahora();
  let gastado = 0;
  let reservado = 0;

  const rotar = () => {
    if (ahora() - inicioVentana >= opciones.ventanaMs) {
      inicioVentana = ahora();
      gastado = 0;
    }
  };

  return {
    reservar(peorCasoUsd) {
      rotar();
      if (!Number.isFinite(opciones.presupuestoUsd) || opciones.presupuestoUsd <= 0) return false;
      if (!Number.isFinite(peorCasoUsd) || peorCasoUsd < 0) return false;
      if (gastado + reservado + peorCasoUsd > opciones.presupuestoUsd) return false;
      reservado += peorCasoUsd;
      return true;
    },
    liquidar(peorCasoUsd, realUsd) {
      reservado = Math.max(0, reservado - peorCasoUsd);
      gastado += Number.isFinite(realUsd) && realUsd >= 0 ? realUsd : peorCasoUsd;
    },
    gastadoUsd() {
      rotar();
      return gastado;
    },
  };
}
