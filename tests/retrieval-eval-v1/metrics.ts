import type { RolRecuperacion, LabRow } from '@/lib/legal-retrieval/lab/types';
import type { PreguntaEvaluacion, OroResuelto, Categoria } from './gold';

export interface ItemEvidencia {
  id: string;
  instrumento: 'CODIGO_NOTARIADO' | 'REGLAMENTO_NOTARIADO';
  num_articulo: string | null;
  hash: string;
  rol: RolRecuperacion | 'NONE';
  relevancia: 'PASS' | 'UNKNOWN' | 'FAIL';
}

export type Variante = 'A_SEMANTICA_ACTUAL' | 'B_HIBRIDA_RAW' | 'C_HIBRIDA_PAQUETE';

/* ─────────── ranking ─────────── */

/** Reciprocal rank del primer acierto (1-based). 0 si no hay acierto. */
export function reciprocalRank(items: readonly ItemEvidencia[], aceptables: readonly string[]): number {
  const idx = items.findIndex((i) => aceptables.includes(i.id));
  return idx === -1 ? 0 : 1 / (idx + 1);
}

export function instrumentoHitEn(items: readonly ItemEvidencia[], instrumento: string, n: number): boolean {
  return items.slice(0, n).some((i) => i.instrumento === instrumento);
}

export function articuloHitEn(items: readonly ItemEvidencia[], instrumento: string, articulos: readonly string[], n: number): boolean {
  return items.slice(0, n).some((i) => i.instrumento === instrumento && i.num_articulo !== null && articulos.includes(i.num_articulo));
}

export function primaryPassEn(items: readonly ItemEvidencia[], aceptables: readonly string[]): boolean {
  return items.some((i) => aceptables.includes(i.id) && i.rol === 'PRIMARY' && i.relevancia === 'PASS');
}

export function abstencionPredicha(items: readonly ItemEvidencia[]): boolean {
  return !items.some((i) => i.rol === 'PRIMARY' && i.relevancia === 'PASS');
}

/* ─────────── agregados ─────────── */

export interface ResultadoPregunta {
  pregunta: OroResuelto;
  variante: Variante;
  items: ItemEvidencia[];
  pool: string[];
  latenciaMs: Record<string, number>;
  tiempoTotalMs: number;
}

export interface MetricasVariante {
  preguntas: number;
  instrumento_hit_at_1: Tasa;
  instrumento_hit_at_5: Tasa;
  articulo_hit_at_1: Tasa;
  articulo_hit_at_5: Tasa;
  primary_pass_recall: Tasa;
  forbidden_source_leakage: number;
  relevance_fail_leakage: number;
  excluded_layer_leakage: number;
  duplicate_rate: number;
  empty_result_rate: number;
  evidence_packet_empty_rate: number;
  abstention_correctness: Tasa;
  latencia_media_ms: Record<string, number>;
}

export interface Tasa {
  aciertos: number;
  total: number;
  valor: number | null;
}

function tasa(aciertos: number, total: number): Tasa {
  return { aciertos, total, valor: total ? Math.round((aciertos / total) * 1e4) / 1e4 : null };
}

function media(xs: number[]): number {
  return xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 1e3) / 1e3 : 0;
}

export function metricasDe(resultados: readonly ResultadoPregunta[], variante: Variante, filtroCategoria?: Categoria): MetricasVariante {
  const rs = resultados.filter((r) => r.variante === variante && (!filtroCategoria || r.pregunta.categoria === filtroCategoria));
  const evaluables = rs.filter((r) => r.pregunta.acceptable_source_ids.length > 0);
  const conPrimary = evaluables.filter((r) => r.pregunta.expected_primary_required);
  const todas = rs.length;
  const items = rs.flatMap((r) => r.items);
  const dupes = rs.reduce((s, r) => {
    const vistos = new Set<string>();
    let d = 0;
    for (const i of r.items) { if (vistos.has(i.hash)) d++; vistos.add(i.hash); }
    return s + d;
  }, 0);
  const lat: Record<string, number[]> = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.latenciaMs)) (lat[k] ??= []).push(v);

  return {
    preguntas: todas,
    instrumento_hit_at_1: tasa(evaluables.filter((r) => instrumentoHitEn(r.items, r.pregunta.expected_instrument, 1)).length, evaluables.length),
    instrumento_hit_at_5: tasa(evaluables.filter((r) => instrumentoHitEn(r.items, r.pregunta.expected_instrument, 5)).length, evaluables.length),
    articulo_hit_at_1: tasa(evaluables.filter((r) => articuloHitEn(r.items, r.pregunta.expected_instrument, r.pregunta.expected_articles, 1)).length, evaluables.length),
    articulo_hit_at_5: tasa(evaluables.filter((r) => articuloHitEn(r.items, r.pregunta.expected_instrument, r.pregunta.expected_articles, 5)).length, evaluables.length),
    primary_pass_recall: tasa(conPrimary.filter((r) => primaryPassEn(r.items, r.pregunta.acceptable_source_ids)).length, conPrimary.length),
    forbidden_source_leakage: rs.reduce((s, r) => s + r.items.filter((i) => r.pregunta.forbidden_source_ids.includes(i.id)).length, 0),
    relevance_fail_leakage: items.filter((i) => i.relevancia === 'FAIL').length,
    excluded_layer_leakage: items.filter((i) => i.rol === 'EXCLUDED').length,
    duplicate_rate: items.length ? Math.round((dupes / items.length) * 1e4) / 1e4 : 0,
    empty_result_rate: todas ? Math.round((rs.filter((r) => r.items.length === 0).length / todas) * 1e4) / 1e4 : 0,
    evidence_packet_empty_rate: todas ? Math.round((rs.filter((r) => r.items.length === 0).length / todas) * 1e4) / 1e4 : 0,
    abstention_correctness: tasa(rs.filter((r) => abstencionPredicha(r.items) === r.pregunta.expected_abstention).length, todas),
    latencia_media_ms: Object.fromEntries(Object.entries(lat).map(([k, v]) => [k, media(v)])),
  };
}

/** Reconstruye el MRR por separado, para evitar mezclarlo con el cálculo de tasas. */
export function mrrDe(resultados: readonly ResultadoPregunta[], variante: Variante, filtroCategoria?: Categoria): Tasa {
  const evaluables = resultados.filter((r) => r.variante === variante && r.pregunta.acceptable_source_ids.length > 0 && (!filtroCategoria || r.pregunta.categoria === filtroCategoria));
  const suma = evaluables.reduce((s, r) => s + reciprocalRank(r.items, r.pregunta.acceptable_source_ids), 0);
  return { aciertos: Math.round(suma * 1e4) / 1e4, total: evaluables.length, valor: evaluables.length ? Math.round((suma / evaluables.length) * 1e4) / 1e4 : null };
}

/* ─────────── taxonomía de fallos ─────────── */

export type CausaFallo =
  | 'LEXICAL_MISS'
  | 'SEMANTIC_MISS'
  | 'IDENTITY_MISS'
  | 'WRONG_INSTRUMENT'
  | 'WRONG_ARTICLE'
  | 'MIRROR_DUPLICATE'
  | 'RAW_LIMIT_LOSS'
  | 'ROLE_REJECTION'
  | 'RELEVANCE_REJECTION'
  | 'RELEVANCE_UNKNOWN_GATE'
  | 'GOLD_AMBIGUOUS'
  | 'CORPUS_GAP'
  | 'OTHER';

export interface ContextoFallo {
  /** Índice bruto (0-based) de cada id en el pool de candidatos brutos o semánticos. */
  posicionSemantica: Record<string, number>;
  /** Ids que aparecen en la lista léxica. */
  lexicos: Set<string>;
  /** Tope semántico activo. */
  topeSemantico: number;
  /** Ids excluidos por exclusión dura en algún canal. */
  excluidosDuros: Set<string>;
  /** Roles y relevancias de todos los candidatos evaluados. */
  rolPorId: Record<string, RolRecuperacion | 'NONE'>;
  relevanciaPorId: Record<string, 'PASS' | 'UNKNOWN' | 'FAIL'>;
  /** Estado del resolvedor exacto para la pregunta (identidad de instrumento nombrado). */
  estadoExacto: string;
}

/**
 * Asigna una sola causa por fallo, por prioridad fija. Un fallo de abstención
 * sobre un artículo que sí aparece se atribuye al gate de rol o de relevancia,
 * no a la recuperación.
 */
export function clasificarFallo(r: ResultadoPregunta, ctx: ContextoFallo): CausaFallo | null {
  const p = r.pregunta;
  const aceptables = p.acceptable_source_ids;
  const fallaAbstencion = abstencionPredicha(r.items) !== p.expected_abstention;
  const fallaArticulo = aceptables.length > 0 && !articuloHitEn(r.items, p.expected_instrument, p.expected_articles, 5);
  const fallaPrimario = p.expected_primary_required && aceptables.length > 0 && !primaryPassEn(r.items, aceptables);

  if (p.expected_instrument === 'NONE_IN_SNAPSHOT') {
    return fallaAbstencion ? 'CORPUS_GAP' : null;
  }
  if (!fallaAbstencion && !fallaArticulo && !fallaPrimario) return null;

  const top = r.items.slice(0, 5);
  if (top.some((i) => p.forbidden_source_ids.includes(i.id))) return 'WRONG_INSTRUMENT';
  if (fallaArticulo && top.some((i) => i.instrumento !== p.expected_instrument && i.num_articulo !== null && p.expected_articles.includes(i.num_articulo))) {
    return 'WRONG_INSTRUMENT';
  }
  if (r.items.length === 0 && ctx.estadoExacto === 'ABSTAIN_INSTRUMENT_OR_MATERIA' && aceptables.length > 0) return 'IDENTITY_MISS';

  if (fallaArticulo) {
    const enPool = r.pool.find((id) => aceptables.includes(id));
    if (enPool !== undefined) {
      if (ctx.relevanciaPorId[enPool] === 'FAIL') return 'RELEVANCE_REJECTION';
      if (ctx.rolPorId[enPool] === 'EXCLUDED') return 'ROLE_REJECTION';
      if (p.expected_primary_required && ctx.rolPorId[enPool] !== 'PRIMARY') return 'ROLE_REJECTION';
      return 'RAW_LIMIT_LOSS';
    }
    const objetivo = aceptables[0];
    if (ctx.excluidosDuros.has(objetivo)) return 'ROLE_REJECTION';
    const pos = ctx.posicionSemantica[objetivo];
    if (pos === undefined || pos >= ctx.topeSemantico) return 'SEMANTIC_MISS';
    if (!ctx.lexicos.has(objetivo)) return 'LEXICAL_MISS';
    return 'OTHER';
  }

  // El artículo objetivo sí aparece: la falla es de rol, relevancia o abstención.
  const duplicados = r.items.length !== new Set(r.items.map((i) => i.hash)).size;
  if (duplicados) return 'MIRROR_DUPLICATE';
  const objetivosEnLista = r.items.filter((i) => aceptables.includes(i.id));
  if (objetivosEnLista.some((i) => i.rol === 'CONTEXT' || i.rol === 'SECONDARY') && p.expected_primary_required) return 'ROLE_REJECTION';
  if (aceptables.length > 1 && r.pool.some((id) => aceptables.includes(id) && ctx.relevanciaPorId[id] === 'FAIL')) return 'RELEVANCE_REJECTION';
  if (objetivosEnLista.some((i) => i.rol === 'PRIMARY' && i.relevancia === 'UNKNOWN')) return 'RELEVANCE_UNKNOWN_GATE';
  return 'OTHER';
}
