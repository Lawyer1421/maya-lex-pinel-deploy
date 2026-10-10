import { performance } from 'node:perf_hooks';
import { recuperarLab, type ResultadoLab } from '@/lib/legal-retrieval/lab/pipeline';
import { resolverExactoLab } from '@/lib/legal-retrieval/lab/exact-lab';
import { buscarSemanticoFixture, SEMANTIC_CANDIDATE_CAP } from '@/lib/legal-retrieval/lab/semantic-fixture';
import { motivoExclusionDura } from '@/lib/legal-retrieval/lab/hard-exclusions';
import { candidatoDesdeFila } from '@/lib/legal-retrieval/lab/hybrid-merge';
import { rolRecuperacion, intencionHistoricaCPC } from '@/lib/legal-retrieval/lab/clo-policy';
import { evaluarRelevancia } from '@/lib/legal-retrieval/lab/relevance';
import { LexicalLabAdapter } from '@/lib/legal-retrieval/lab/lexical-lab';
import { detectarArticuloExacto, detectarInstrumentoDesdeTexto, detectarMateriaSemanticaAmpliada } from '@/lib/legal-retrieval/exact-resolver';
import { seleccionarPaquete, type EvidenciaSeleccionada, type UsoPaquete } from '@/lib/legal-retrieval/lab/evidence-selection';
import type { LabRow, RankedCandidate, RolRecuperacion } from '@/lib/legal-retrieval/lab/types';
import { puntuarProxy } from './proxy';
import type { RegistroSnapshot } from './snapshot';
import type { ItemEvidencia, ResultadoPregunta, ContextoFallo, Variante } from './metrics';
import type { OroResuelto } from './gold';

export interface OpcionesEval {
  k: number;
  semanticCap?: number;
  rawCandidateLimit?: number;
}

const LEXICO = new LexicalLabAdapter();

function itemDesdeFila(fila: RegistroSnapshot, texto: string, exacto: boolean): ItemEvidencia {
  const cand = { ...candidatoDesdeFila(fila), exact_match: exacto };
  const rol: RolRecuperacion | 'NONE' = rolRecuperacion(cand, { historicaCPC: intencionHistoricaCPC(texto) }).rol;
  const relevancia = evaluarRelevancia(cand, {
    articulo: detectarArticuloExacto(texto)?.numero ?? null,
    instrumento: detectarInstrumentoDesdeTexto(texto),
    materia: detectarMateriaSemanticaAmpliada(texto),
  });
  return { id: fila.id, instrumento: fila.instrumento, num_articulo: fila.num_articulo, hash: cand.hash, rol, relevancia };
}

function itemDesdeRanking(c: RankedCandidate, filasPorId: Map<string, RegistroSnapshot>): ItemEvidencia {
  const fila = filasPorId.get(c.id)!;
  return { id: c.id, instrumento: fila.instrumento, num_articulo: c.num_articulo, hash: c.hash, rol: c.rol_recuperacion, relevancia: c.relevancia_clo };
}

/**
 * Ejecuta A, B y C sobre la misma pregunta y el mismo snapshot.
 * - A: semántica actual. Exacto de producción; luego similitud semántica
 *   (proxy local) con exclusiones duras; sin orden legal ni paquete.
 * - B: híbrido V4 raw (léxico + proxy semántico), top-k del ranking bruto.
 * - C: híbrido V4 + selección de evidencia (paquete).
 */
export function ejecutarPregunta(
  p: OroResuelto,
  filas: RegistroSnapshot[],
  opciones: OpcionesEval,
): { A: ResultadoPregunta; B: ResultadoPregunta; C: ResultadoPregunta; ctx: Record<Variante, ContextoFallo>; exactoFalso: boolean; hits: { id: string; score: number }[] } {
  const cap = opciones.semanticCap ?? SEMANTIC_CANDIDATE_CAP;
  const hits = puntuarProxy(p.pregunta, filas);
  const query = {
    id: p.id, categoria: 'adversarial_semantico_negativo' as const, texto: p.pregunta,
    relevantes: p.acceptable_source_ids, distractores: p.forbidden_source_ids, abstencion_esperada: p.expected_abstention,
    semantic_hits: hits, validacion: 'PENDIENTE_VALIDACION_JURIDICA' as const,
  };
  const filasPorId = new Map(filas.map((f) => [f.id, f] as const));
  const filasLabel = filas as unknown as LabRow[];

  // Contexto de fallo compartido por las tres variantes.
  const posicionSemantica = Object.fromEntries(hits.map((h, i) => [h.id, i]));
  const lexicos = new Set(LEXICO.buscar(p.pregunta, filasLabel).map((h) => h.id));
  const excluidosDuros = new Set(filas.filter((f) => motivoExclusionDura(f, 'semantic') !== null).map((f) => f.id));
  const rolPorId: Record<string, RolRecuperacion | 'NONE'> = {};
  const relevanciaPorId: Record<string, 'PASS' | 'UNKNOWN' | 'FAIL'> = {};
  for (const f of filas) {
    const it = itemDesdeFila(f, p.pregunta, false);
    rolPorId[f.id] = it.rol;
    relevanciaPorId[f.id] = it.relevancia;
  }

  // A — semántica actual
  const tA0 = performance.now();
  const exacto = resolverExactoLab(p.pregunta, filasLabel);
  const tExacto = performance.now() - tA0;
  let itemsA: ItemEvidencia[];
  let poolA: string[];
  const tS0 = performance.now();
  if (exacto.estado === 'EXACT_SUCCESS' && exacto.fragmento?.id) {
    const fila = filasPorId.get(exacto.fragmento.id)!;
    itemsA = [itemDesdeFila(fila, p.pregunta, true)];
    poolA = [fila.id];
  } else if (exacto.estado === 'AMBIGUOUS' || exacto.estado === 'ABSTAIN_INSTRUMENT_OR_MATERIA') {
    itemsA = [];
    poolA = [];
  } else {
    const sem = buscarSemanticoFixture(query, filasLabel, cap);
    const sinExcluidos = sem.filter((h) => {
      const fila = filasPorId.get(h.id)!;
      return motivoExclusionDura(fila, 'semantic') === null;
    });
    poolA = sinExcluidos.map((h) => h.id);
    itemsA = sinExcluidos.slice(0, opciones.k).map((h) => itemDesdeFila(filasPorId.get(h.id)!, p.pregunta, false));
  }
  const tSemA = performance.now() - tS0;
  const A: ResultadoPregunta = {
    pregunta: p, variante: 'A_SEMANTICA_ACTUAL', items: itemsA, pool: poolA,
    latenciaMs: { exacto: tExacto, semantico: tSemA, total: tExacto + tSemA },
    tiempoTotalMs: tExacto + tSemA,
  };

  // B y C — híbrido V4 raw y con paquete
  const res: ResultadoLab = recuperarLab(query, filasLabel, { k: opciones.k, semanticCap: cap, rawCandidateLimit: opciones.rawCandidateLimit, modo: 'HYBRID' });
  const poolBC = res.rawRanking.map((c) => c.id);
  const itemsB = res.rawRanking.slice(0, opciones.k).map((c) => itemDesdeRanking(c, filasPorId));
  const itemsC = res.ranking.map((c) => itemDesdeRanking(c, filasPorId));
  const latBC = { exacto: res.tiemposMs.exacto, lexico: res.tiemposMs.lexico, semantico: res.tiemposMs.semantico, fusion: res.tiemposMs.fusion, dedup: res.tiemposMs.dedup, ranking: res.tiemposMs.ranking, seleccion: res.tiemposMs.seleccion, total: res.tiemposMs.total };
  const B: ResultadoPregunta = { pregunta: p, variante: 'B_HIBRIDA_RAW', items: itemsB, pool: poolBC, latenciaMs: latBC, tiempoTotalMs: res.tiemposMs.total };
  const C: ResultadoPregunta = { pregunta: p, variante: 'C_HIBRIDA_PAQUETE', items: itemsC, pool: poolBC, latenciaMs: latBC, tiempoTotalMs: res.tiemposMs.total };

  const base = { posicionSemantica, lexicos, topeSemantico: cap, excluidosDuros, rolPorId, relevanciaPorId, estadoExacto: exacto.estado };
  const exactoFalso = exacto.estado === 'EXACT_SUCCESS' && exacto.fragmento !== null && filasPorId.get(exacto.fragmento.id!)!.es_norma_vigente === false;
  return {
    A, B, C,
    ctx: { A_SEMANTICA_ACTUAL: base, B_HIBRIDA_RAW: base, C_HIBRIDA_PAQUETE: base },
    exactoFalso,
    hits,
  };
}

/* ─────────── simulación de políticas X / Y (sólo evaluación) ─────────── */

/**
 * X = orden congelado: MATERIAL, RESTRICTED (PRIMARY+UNKNOWN), SUPPORTING (SECONDARY+PASS), CONTEXT.
 * Y = SECONDARY+PASS antes que PRIMARY+UNKNOWN. Sólo simulación: no reemplaza la selección congelada.
 */
export function seleccionarPoliticaSimulada(raw: readonly RankedCandidate[], k: number, politica: 'X' | 'Y'): EvidenciaSeleccionada[] {
  type Pred = (c: RankedCandidate, elegidos: EvidenciaSeleccionada[]) => boolean;
  const material: Pred = (c) => c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'PASS';
  const restringido: Pred = (c) => c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'UNKNOWN';
  const secundarioPass: Pred = (c) => c.rol_recuperacion === 'SECONDARY' && c.relevancia_clo === 'PASS';
  const secundarioUnknown: Pred = (c, el) => c.rol_recuperacion === 'SECONDARY' && c.relevancia_clo === 'UNKNOWN' && el.some((e) => e.uso_paquete === 'MATERIAL');
  const contexto: Pred = (c) => c.rol_recuperacion === 'CONTEXT' && c.relevancia_clo !== 'FAIL';
  const clases: { uso: UsoPaquete; pred: Pred }[] = politica === 'X'
    ? [
      { uso: 'MATERIAL', pred: material },
      { uso: 'RESTRICTED', pred: restringido },
      { uso: 'SUPPORTING', pred: secundarioPass },
      { uso: 'SUPPORTING', pred: secundarioUnknown },
      { uso: 'CONTEXT_ONLY', pred: contexto },
    ]
    : [
      { uso: 'MATERIAL', pred: material },
      { uso: 'SUPPORTING', pred: secundarioPass },
      { uso: 'RESTRICTED', pred: restringido },
      { uso: 'SUPPORTING', pred: secundarioUnknown },
      { uso: 'CONTEXT_ONLY', pred: contexto },
    ];
  const elegidos: EvidenciaSeleccionada[] = [];
  const usados = new Set<string>();
  for (const { uso, pred } of clases) {
    for (const c of raw) {
      if (elegidos.length >= k) break;
      if (usados.has(c.id) || c.rol_recuperacion === 'EXCLUDED' || c.relevancia_clo === 'FAIL') continue;
      if (pred(c, elegidos)) {
        usados.add(c.id);
        elegidos.push({ ...c, uso_paquete: uso, posicion_paquete: elegidos.length + 1 });
      }
    }
  }
  return elegidos;
}

/** Selección congelada, sin modificar. Usada como referencia para verificar que X es idéntica. */
export function seleccionCongelada(raw: readonly RankedCandidate[], k: number): EvidenciaSeleccionada[] {
  return seleccionarPaquete(raw, k).paquete;
}
