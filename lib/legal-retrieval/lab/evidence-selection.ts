import type { RankedCandidate } from './types';

/**
 * Selección de evidencia (LAB / SHADOW). Opera después del ranking bruto y
 * decide qué unidades entran al paquete de evidencia. RAW RANKING ≠ EVIDENCE
 * PACKET. No modifica el orden del ranking bruto ni añade pesos numéricos a
 * rol o relevancia: el orden de cada clase conserva el orden bruto.
 */

export type UsoPaquete = 'MATERIAL' | 'RESTRICTED' | 'SUPPORTING' | 'CONTEXT_ONLY';

export type RazonDiagnostica =
  | 'SELECTED_PRIMARY'
  | 'SELECTED_SECONDARY'
  | 'SELECTED_CONTEXT'
  | 'REJECTED_RELEVANCE_FAIL'
  | 'REJECTED_ROLE'
  | 'NOT_SELECTED_CAPACITY'
  | 'NOT_SELECTED_USEFULNESS';

export interface EvidenciaSeleccionada extends RankedCandidate {
  uso_paquete: UsoPaquete;
  posicion_paquete: number;
}

export interface DiagnosticoSeleccion {
  id: string;
  razon: RazonDiagnostica;
}

export interface ResultadoSeleccion {
  paquete: EvidenciaSeleccionada[];
  diagnosticos: DiagnosticoSeleccion[];
  packet_k: number;
}

/**
 * Límite del pool bruto (laboratorio). Distinto de packet_k y del tope SQL
 * de 20 del RPC: el pool bruto puede contener más candidatos que el paquete.
 */
export const RAW_CANDIDATE_LIMIT_LAB = 50;

const ORDEN_USO: UsoPaquete[] = ['MATERIAL', 'RESTRICTED', 'SUPPORTING', 'CONTEXT_ONLY'];

export function seleccionarPaquete(
  rawRanking: readonly RankedCandidate[],
  packetK: number,
): ResultadoSeleccion {
  const diagnosticos = new Map<string, RazonDiagnostica>();
  const seleccionados: { c: RankedCandidate; uso: UsoPaquete }[] = [];
  let capacidad = Math.max(0, packetK);

  const tomar = (c: RankedCandidate, uso: UsoPaquete, razon: RazonDiagnostica): void => {
    seleccionados.push({ c, uso });
    diagnosticos.set(c.id, razon);
    capacidad--;
  };

  for (const c of rawRanking) {
    if (c.rol_recuperacion === 'EXCLUDED') diagnosticos.set(c.id, 'REJECTED_ROLE');
    else if (c.relevancia_clo === 'FAIL') diagnosticos.set(c.id, 'REJECTED_RELEVANCE_FAIL');
  }

  const candidatos = rawRanking.filter((c) => !diagnosticos.has(c.id));

  for (const c of candidatos) {
    if (c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'PASS' && capacidad > 0) {
      tomar(c, 'MATERIAL', 'SELECTED_PRIMARY');
    }
  }
  for (const c of candidatos) {
    if (c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'UNKNOWN' && capacidad > 0) {
      tomar(c, 'RESTRICTED', 'SELECTED_PRIMARY');
    }
  }
  for (const c of candidatos) {
    if (c.rol_recuperacion === 'SECONDARY' && c.relevancia_clo === 'PASS' && capacidad > 0) {
      tomar(c, 'SUPPORTING', 'SELECTED_SECONDARY');
    }
  }
  const hayMaterial = seleccionados.some((s) => s.uso === 'MATERIAL');
  for (const c of candidatos) {
    if (c.rol_recuperacion === 'SECONDARY' && c.relevancia_clo === 'UNKNOWN') {
      if (!hayMaterial) {
        diagnosticos.set(c.id, 'NOT_SELECTED_USEFULNESS');
      } else if (capacidad > 0) {
        tomar(c, 'SUPPORTING', 'SELECTED_SECONDARY');
      }
    }
  }
  for (const c of candidatos) {
    if (c.rol_recuperacion === 'CONTEXT' && capacidad > 0) {
      tomar(c, 'CONTEXT_ONLY', 'SELECTED_CONTEXT');
    }
  }

  for (const c of candidatos) {
    if (!diagnosticos.has(c.id)) diagnosticos.set(c.id, 'NOT_SELECTED_CAPACITY');
  }

  const ordenados = seleccionados
    .map((s, indiceBruto) => ({ ...s, indiceBruto }))
    .sort((a, b) => ORDEN_USO.indexOf(a.uso) - ORDEN_USO.indexOf(b.uso) || a.indiceBruto - b.indiceBruto);

  const paquete: EvidenciaSeleccionada[] = ordenados.map((s, i) => ({
    ...s.c,
    uso_paquete: s.uso,
    posicion_paquete: i + 1,
  }));

  return {
    paquete,
    diagnosticos: rawRanking.map((c) => ({ id: c.id, razon: diagnosticos.get(c.id)! })),
    packet_k: packetK,
  };
}
