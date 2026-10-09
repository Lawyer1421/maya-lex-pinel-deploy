import { createHash } from 'node:crypto';
import { motivoExclusionDura } from './hard-exclusions';
import { recuperarLab, type ModoRecuperacion, type ResultadoLab } from './pipeline';
import type { LabBenchmarkQuery, LabRow, RankedCandidate } from './types';

/* ─────────────────────────── BENCHMARK A — calidad de recuperación ─────────────────────────── */

export type VarianteRecuperacion = 'A1_SEMANTIC_ONLY' | 'A2_LEXICAL_ONLY' | 'A3_HYBRID';

const MODO_DE_VARIANTE: Record<VarianteRecuperacion, ModoRecuperacion> = {
  A1_SEMANTIC_ONLY: 'SEMANTIC_ONLY',
  A2_LEXICAL_ONLY: 'LEXICAL_ONLY',
  A3_HYBRID: 'HYBRID',
};

export const INVARIANTE_BENCHMARK_SINTETICO = 'SYNTHETIC_BENCHMARK_DOES_NOT_PROVE_PRODUCTION_SUPERIORITY' as const;

const CATEGORIAS_ADVERSARIALES = new Set([
  'adversarial_semantico_negativo',
  'clo_e5_normal_excluido',
  'capa_doc_star',
  'fuente_nula',
  'no_vigente_hn',
  'sin_evidencia',
  'vocabulario_similar_no_relacionado',
]);

export interface MetricasRecuperacion {
  variante: VarianteRecuperacion;
  consultas: number;
  consultas_adversariales: number;
  recall_fuentes_relevantes_at_k: { aciertos: number; total: number; valor: number | null };
  primera_posicion_relevante: { aciertos: number; total: number; valor: number | null };
  exacto_articulo_hit_at_k: { aciertos: number; total: number; valor: number | null };
  tasa_duplicados_topk: number;
  pares_espejo_topk: number;
  fuga_exclusiones_topk: number;
  distractores_topk: number;
  tasa_resultado_vacio: number;
  diversidad_fuentes_media: number;
  latencia_media_ms: { total: number; exacto: number; lexico: number; semantico: number; fusion: number; dedup: number; ranking: number };
  reproducible: boolean;
}

export interface ResultadoBenchmarkA {
  invariante: typeof INVARIANTE_BENCHMARK_SINTETICO;
  metricas: MetricasRecuperacion[];
  llamadasRecuperacion: number;
}

function firma(res: ResultadoLab): string {
  return JSON.stringify(
    res.ranking.map((c) => [c.id, c.retrieval_channel, c.rol_recuperacion, c.retrieval_order_score]),
  );
}

function media(valores: number[]): number {
  return valores.length === 0 ? 0 : valores.reduce((s, v) => s + v, 0) / valores.length;
}

function excluidosConocidos(corpus: readonly LabRow[]): Set<string> {
  const out = new Set<string>();
  for (const f of corpus) {
    if (motivoExclusionDura(f, 'lexical') || motivoExclusionDura(f, 'semantic')) out.add(f.id);
  }
  return out;
}

export function ejecutarBenchmarkA(
  queries: readonly LabBenchmarkQuery[],
  corpus: readonly LabRow[],
  k: number,
): ResultadoBenchmarkA {
  const variantes = Object.keys(MODO_DE_VARIANTE) as VarianteRecuperacion[];
  const conocidosExcluidos = excluidosConocidos(corpus);
  let llamadas = 0;
  const metricas: MetricasRecuperacion[] = [];

  for (const variante of variantes) {
    let aciertosRel = 0;
    let totalRel = 0;
    let aciertosPrimera = 0;
    let totalPrimera = 0;
    let adversariales = 0;
    let aciertosArt = 0;
    let totalArt = 0;
    let duplicados = 0;
    let espejos = 0;
    let fugas = 0;
    let distractores = 0;
    let vacios = 0;
    const diversidad: number[] = [];
    const tiempos: Record<string, number[]> = { total: [], exacto: [], lexico: [], semantico: [], fusion: [], dedup: [], ranking: [] };
    let reproducible = true;
    let posiciones = 0;

    for (const q of queries) {
      const res = recuperarLab(q, corpus, { k, modo: MODO_DE_VARIANTE[variante] });
      llamadas++;
      const again = recuperarLab(q, corpus, { k, modo: MODO_DE_VARIANTE[variante] });
      llamadas++;
      if (firma(res) !== firma(again)) reproducible = false;

      const top: RankedCandidate[] = res.ranking;
      posiciones += top.length;
      if (top.length === 0) vacios++;

      const ids = new Set(top.map((c) => c.id));
      if (q.relevantes.length > 0) {
        totalRel++;
        if (q.relevantes.some((r) => ids.has(r))) aciertosRel++;
        totalPrimera++;
        if (top.length > 0 && q.relevantes.includes(top[0].id)) aciertosPrimera++;
      }
      if (CATEGORIAS_ADVERSARIALES.has(q.categoria)) adversariales++;
      if (q.articulo_esperado !== undefined) {
        totalArt++;
        if (top.some((c) => c.num_articulo === q.articulo_esperado)) aciertosArt++;
      }

      const hashes = new Map<string, number>();
      for (const c of top) hashes.set(c.hash, (hashes.get(c.hash) ?? 0) + 1);
      for (const n of hashes.values()) if (n > 1) duplicados += n - 1;

      for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
          const a = top[i];
          const b = top[j];
          if (a.num_articulo !== null && a.num_articulo === b.num_articulo && a.contenido === b.contenido && a.fuente !== b.fuente) {
            espejos++;
          }
        }
      }

      for (const c of top) {
        if (conocidosExcluidos.has(c.id)) fugas++;
        if (q.distractores.includes(c.id)) distractores++;
      }

      diversidad.push(new Set(top.map((c) => c.fuente)).size);

      tiempos.total.push(res.tiemposMs.total);
      tiempos.exacto.push(res.tiemposMs.exacto);
      tiempos.lexico.push(res.tiemposMs.lexico);
      tiempos.semantico.push(res.tiemposMs.semantico);
      tiempos.fusion.push(res.tiemposMs.fusion);
      tiempos.dedup.push(res.tiemposMs.dedup);
      tiempos.ranking.push(res.tiemposMs.ranking);
    }

    metricas.push({
      variante,
      consultas: queries.length,
      consultas_adversariales: adversariales,
      recall_fuentes_relevantes_at_k: { aciertos: aciertosRel, total: totalRel, valor: totalRel ? aciertosRel / totalRel : null },
      primera_posicion_relevante: { aciertos: aciertosPrimera, total: totalPrimera, valor: totalPrimera ? aciertosPrimera / totalPrimera : null },
      exacto_articulo_hit_at_k: { aciertos: aciertosArt, total: totalArt, valor: totalArt ? aciertosArt / totalArt : null },
      tasa_duplicados_topk: posiciones ? duplicados / posiciones : 0,
      pares_espejo_topk: espejos,
      fuga_exclusiones_topk: fugas,
      distractores_topk: distractores,
      tasa_resultado_vacio: queries.length ? vacios / queries.length : 0,
      diversidad_fuentes_media: media(diversidad),
      latencia_media_ms: {
        total: media(tiempos.total),
        exacto: media(tiempos.exacto),
        lexico: media(tiempos.lexico),
        semantico: media(tiempos.semantico),
        fusion: media(tiempos.fusion),
        dedup: media(tiempos.dedup),
        ranking: media(tiempos.ranking),
      },
      reproducible,
    });
  }

  return { invariante: INVARIANTE_BENCHMARK_SINTETICO, metricas, llamadasRecuperacion: llamadas };
}

/* ─────────────────────────── BENCHMARK B — calidad de modelo ─────────────────────────── */

export interface PaqueteCongelado {
  consultaId: string;
  items: { id: string; hash: string; num_articulo: string | null; fuente: string }[];
  paqueteSha256: string;
}

/** Evidencia recuperada UNA vez por consulta; todas las variantes de modelo reciben este mismo paquete. */
export function congelarPaquete(query: LabBenchmarkQuery, ranking: readonly RankedCandidate[]): PaqueteCongelado {
  const items = ranking.map((c) => ({ id: c.id, hash: c.hash, num_articulo: c.num_articulo, fuente: c.fuente }));
  const paqueteSha256 = createHash('sha256')
    .update(JSON.stringify({ consultaId: query.id, items }))
    .digest('hex');
  return { consultaId: query.id, items, paqueteSha256 };
}

export interface SalidaModelo {
  citas: string[];
  abstencion: boolean;
  afirmaciones: { texto: string; soporte: string | null }[];
  tokens: number | null;
  latenciaMs: number | null;
  costoUsd: number | null;
}

export interface MetricasModelo {
  consultaId: string;
  correccion_citas: number | null;
  afirmaciones_sin_soporte: number;
  abstencion_correcta: boolean;
  tokens: number | null;
  latenciaMs: number | null;
  costoUsd: number | null;
}

/** Métricas sin juicio de ganador: se calculan por caso contra el paquete congelado. */
export function evaluarSalidaModelo(
  paquete: PaqueteCongelado,
  abstencionEsperada: boolean,
  salida: SalidaModelo,
): MetricasModelo {
  const ids = new Set(paquete.items.map((i) => i.id));
  const citasValidas = salida.citas.filter((c) => ids.has(c)).length;
  return {
    consultaId: paquete.consultaId,
    correccion_citas: salida.citas.length === 0 ? null : citasValidas / salida.citas.length,
    afirmaciones_sin_soporte: salida.afirmaciones.filter((a) => a.soporte === null || !ids.has(a.soporte)).length,
    abstencion_correcta: abstencionEsperada === salida.abstencion,
    tokens: salida.tokens,
    latenciaMs: salida.latenciaMs,
    costoUsd: salida.costoUsd,
  };
}

export interface VarianteModelo {
  nombre: string;
  generar: (paquete: PaqueteCongelado, query: LabBenchmarkQuery) => SalidaModelo;
}

export interface ResultadoBenchmarkB {
  paquetes: PaqueteCongelado[];
  metricasPorVariante: Record<string, MetricasModelo[]>;
  llamadasRecuperacion: number;
}

export function ejecutarBenchmarkB(
  queries: readonly LabBenchmarkQuery[],
  corpus: readonly LabRow[],
  k: number,
  variantes: readonly VarianteModelo[],
): ResultadoBenchmarkB {
  let llamadas = 0;
  const paquetes: PaqueteCongelado[] = [];
  const metricasPorVariante: Record<string, MetricasModelo[]> = {};
  for (const v of variantes) metricasPorVariante[v.nombre] = [];

  for (const q of queries) {
    const res = recuperarLab(q, corpus, { k, modo: 'HYBRID' });
    llamadas++;
    const paquete = congelarPaquete(q, res.ranking);
    paquetes.push(paquete);
    for (const v of variantes) {
      const salida = v.generar(paquete, q);
      metricasPorVariante[v.nombre].push(evaluarSalidaModelo(paquete, q.abstencion_esperada, salida));
    }
  }

  return { paquetes, metricasPorVariante, llamadasRecuperacion: llamadas };
}
