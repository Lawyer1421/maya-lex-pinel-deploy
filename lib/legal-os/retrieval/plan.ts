/**
 * lib/legal-os/retrieval/plan.ts
 * Planificador PURO de recuperación híbrida. No ejecuta nada ni toca la base. Orden:
 *   referencia exacta → búsqueda estructurada → léxica (BM25/texto completo) → semántica → rerank (solo si hace falta) → fallback oficial.
 * Una consulta determinista (referencia exacta resoluble) nunca planifica pasos semánticos, de rerank ni de LLM.
 */
import type { CountryCode, IntentResult } from '../types';

export type PasoKind = 'EXACT_REFERENCE' | 'STRUCTURED_LOOKUP' | 'LEXICAL' | 'SEMANTIC' | 'RERANK' | 'OFFICIAL_FALLBACK';

export interface FiltrosMetadatos {
  country: CountryCode;
  jurisdiction: string;
  matter: string | null;
  instrument: string | null;
  /** Fecha de vigencia solicitada (ISO); null = hoy. */
  asOfDate: string | null;
}

export interface PasoRecuperacion {
  kind: PasoKind;
  enabled: boolean;
  reason: string;
  budgetMs: number;
}

export interface PlanRecuperacion {
  filtros: FiltrosMetadatos;
  pasos: PasoRecuperacion[];
  /** El plan es determinista: no usa vectores, rerank ni modelo. */
  determinista: boolean;
}

export interface OpcionesPlan {
  instrument?: string | null;
  asOfDate?: string | null;
  /** Candidatos esperados; el rerank solo se activa por encima de este umbral. */
  maxCandidatosSinRerank?: number;
  candidatosEsperados?: number;
  /** Margen entre el 1.º y el 2.º candidato; bajo = ambiguo → rerank. */
  margenTop?: number;
  margenMinimo?: number;
  rerankDisponible?: boolean;
  fallbackOficialPermitido?: boolean;
  budgetTotalMs?: number;
}

const paso = (kind: PasoKind, enabled: boolean, reason: string, budgetMs: number): PasoRecuperacion => ({ kind, enabled, reason, budgetMs: enabled ? budgetMs : 0 });

export function planificarRecuperacion(intent: IntentResult, o: OpcionesPlan = {}): PlanRecuperacion {
  const total = o.budgetTotalMs ?? 3_000;
  const filtros: FiltrosMetadatos = {
    country: intent.jurisdiction.country,
    jurisdiction: intent.jurisdiction.jurisdiction,
    matter: intent.matter,
    instrument: o.instrument ?? null,
    asOfDate: o.asOfDate ?? null,
  };
  const exacta = intent.hasExactReference;
  const determinista = exacta && intent.task === 'EXACT_LOOKUP';

  const necesitaRerank =
    !determinista && (o.rerankDisponible ?? true) && ((o.candidatosEsperados ?? 0) > (o.maxCandidatosSinRerank ?? 8) || (o.margenTop !== undefined && o.margenTop < (o.margenMinimo ?? 0.05)));

  const pasos: PasoRecuperacion[] = [
    paso('EXACT_REFERENCE', exacta, exacta ? 'la consulta nombra un artículo/instrumento' : 'sin referencia exacta', Math.round(total * 0.1)),
    paso('STRUCTURED_LOOKUP', true, 'filtros de país/jurisdicción/materia/instrumento/fecha siempre presentes', Math.round(total * 0.15)),
    paso('LEXICAL', !determinista, determinista ? 'consulta determinista: no se necesita' : 'BM25/texto completo para términos y números', Math.round(total * 0.2)),
    paso('SEMANTIC', !determinista, determinista ? 'consulta determinista: sin vectores' : 'vectores para formulaciones en lenguaje natural', Math.round(total * 0.3)),
    paso('RERANK', necesitaRerank, necesitaRerank ? 'muchos candidatos o margen bajo' : 'no hace falta rerank', Math.round(total * 0.15)),
    paso('OFFICIAL_FALLBACK', !determinista && (o.fallbackOficialPermitido ?? true), 'solo tras evidencia interna insuficiente y únicamente en fuentes oficiales verificadas', Math.round(total * 0.1)),
  ];
  return { filtros, pasos, determinista };
}

export interface CandidatoRanking {
  id: string;
}

/** Fusión por rango recíproco (RRF): score = Σ 1/(k + rango). Determinista; empates por id. */
export function fusionRRF(listas: ReadonlyArray<readonly CandidatoRanking[]>, k = 60): Array<{ id: string; score: number }> {
  const acumulado = new Map<string, number>();
  for (const lista of listas) {
    const vistos = new Set<string>();
    lista.forEach((c, i) => {
      if (vistos.has(c.id)) return; // un id duplicado en la misma lista cuenta una vez
      vistos.add(c.id);
      acumulado.set(c.id, (acumulado.get(c.id) ?? 0) + 1 / (k + i + 1));
    });
  }
  return [...acumulado.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
