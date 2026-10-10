import { recuperarLab, type ResultadoLab } from '@/lib/legal-retrieval/lab/pipeline';
import { candidatoDesdeFila } from '@/lib/legal-retrieval/lab/hybrid-merge';
import { puntuarCandidatos } from '@/lib/legal-retrieval/lab/ranking';
import { seleccionarPaquete, type EvidenciaSeleccionada } from '@/lib/legal-retrieval/lab/evidence-selection';
import { evaluarSuficiencia, type ResultadoSuficiencia } from '@/lib/legal-retrieval/lab/sufficiency';
import { intencionHistoricaCPC } from '@/lib/legal-retrieval/lab/clo-policy';
import type { LabBenchmarkQuery, LabRow, RankedCandidate } from '@/lib/legal-retrieval/lab/types';
import { contextoIntencion } from './instrument-intent';
import { relevanciaV11, type RazonV11, type RelevanciaV11 } from './relevance-v11';
import { resolverExactoV11, type EstadoExactoV11 } from './exact-v11';

/**
 * Overlay de evaluación V1.1 sobre la pipeline de laboratorio congelada.
 * La pipeline base no se modifica. Este overlay:
 *  1. Localiza vigencia UNKNOWN por identidad exacta (tri-estado, evaluación).
 *  2. Recalcula la relevancia V1.1 sobre el ranking bruto congelado.
 *  3. Vuelve a seleccionar el paquete y a evaluar suficiencia con esa relevancia.
 * El orden del ranking bruto no cambia: la relevancia no entra en la clave legal.
 */

export interface ResultadoV11 {
  ruta: ResultadoLab['ruta'];
  exactoV11: EstadoExactoV11;
  vigenciaExacta: 'TRUE' | 'UNKNOWN' | 'FALSE' | null;
  rawRanking: RankedCandidate[];
  ranking: EvidenciaSeleccionada[];
  suficiencia: ResultadoSuficiencia;
  razones: Record<string, RazonV11>;
  relevancias: Record<string, RelevanciaV11>;
}

export function recuperarV11(query: LabBenchmarkQuery, corpus: readonly LabRow[], k: number): ResultadoV11 {
  const ctx = contextoIntencion(query.texto);
  const soporte = new Set(query.soporte_validado_ids ?? []);
  const exacto = resolverExactoV11(query.texto, corpus);

  if (exacto.fragmento?.id && (exacto.estado === 'EXACT_TRUE' || exacto.estado === 'EXACT_UNKNOWN' || exacto.estado === 'EXACT_FALSE')) {
    const fila = corpus.find((f) => f.id === exacto.fragmento!.id)!;
    const cand: RankedCandidate = {
      ...candidatoDesdeFila(fila),
      retrieval_channel: ['exact'],
      exact_match: true,
    } as RankedCandidate;
    const base = puntuarCandidatos([cand], { materia: ctx.materia, intencion: { historicaCPC: intencionHistoricaCPC(query.texto) } }).ranking[0];
    const rel = relevanciaV11(cand, ctx);
    const raw: RankedCandidate[] = base
      ? [{ ...base, relevancia_clo: rel.relevancia }]
      : [];
    const sel = seleccionarPaquete(raw, k).paquete;
    return {
      ruta: 'FAST_EXACT',
      exactoV11: exacto.estado,
      vigenciaExacta: exacto.vigencia,
      rawRanking: raw,
      ranking: sel,
      suficiencia: evaluarSuficiencia(sel, { soporteValidado: soporte }),
      razones: { [fila.id]: rel.razon },
      relevancias: { [fila.id]: rel.relevancia },
    };
  }

  const res = recuperarLab(query, corpus as LabRow[], { k, modo: 'HYBRID' });
  const razones: Record<string, RazonV11> = {};
  const relevancias: Record<string, RelevanciaV11> = {};
  const raw: RankedCandidate[] = res.rawRanking.map((c) => {
    const r = relevanciaV11(c, ctx);
    razones[c.id] = r.razon;
    relevancias[c.id] = r.relevancia;
    return { ...c, relevancia_clo: r.relevancia };
  });
  const sel = seleccionarPaquete(raw, k).paquete;
  return {
    ruta: res.ruta,
    exactoV11: exacto.estado,
    vigenciaExacta: exacto.vigencia,
    rawRanking: raw,
    ranking: sel,
    suficiencia: evaluarSuficiencia(sel, { soporteValidado: soporte }),
    razones,
    relevancias,
  };
}
