import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { cargarSnapshot, RUTA_ARTEFACTO, type ModoVigencia, type RegistroSnapshot } from '../retrieval-eval-v1/snapshot';
import { PREGUNTAS_V1, resolverOro, type OroResuelto, type Categoria } from '../retrieval-eval-v1/gold';
import { ejecutarPregunta } from '../retrieval-eval-v1/variants';
import { puntuarProxy } from '../retrieval-eval-v1/proxy';
import {
  metricasDe, mrrDe, clasificarFallo, type ItemEvidencia, type ResultadoPregunta, type Variante, type ContextoFallo,
} from '../retrieval-eval-v1/metrics';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { candidatoDesdeFila } from '@/lib/legal-retrieval/lab/hybrid-merge';
import type { LabBenchmarkQuery, LabRow, RankedCandidate } from '@/lib/legal-retrieval/lab/types';
import { contextoIntencion } from './instrument-intent';
import { relevanciaV11 } from './relevance-v11';
import { recuperarV11, type ResultadoV11 } from './pipeline-v11';

export const K = 5;
const CATEGORIAS: Categoria[] = ['A_EXACTA', 'B_CONCEPTUAL', 'C_MULTI_REMISION_EXCEPCION', 'D_ADVERSARIAL', 'E_EVIDENCIA_INSUFICIENTE', 'F_HISTORICA_VIGENCIA_ROL'];
const MATERIAL = new Set(['MATERIAL', 'RESTRICTED', 'SUPPORTING']);

function itemDe(c: RankedCandidate, porId: Map<string, RegistroSnapshot>): ItemEvidencia {
  return {
    id: c.id,
    instrumento: porId.get(c.id)!.instrumento,
    num_articulo: c.num_articulo,
    hash: c.hash,
    rol: c.rol_recuperacion,
    relevancia: c.relevancia_clo,
  };
}

function consultaDe(p: OroResuelto, hits: { id: string; score: number }[]): LabBenchmarkQuery {
  return {
    id: p.id, categoria: 'adversarial_semantico_negativo', texto: p.pregunta,
    relevantes: p.acceptable_source_ids, distractores: p.forbidden_source_ids, abstencion_esperada: p.expected_abstention,
    semantic_hits: hits, validacion: 'PENDIENTE_VALIDACION_JURIDICA',
  };
}

export interface FilaPregunta {
  id: string;
  categoria: Categoria;
  exactoV11: string;
  vigenciaExacta: string | null;
  rawTopK: { id: string; forbidden: boolean }[];
  paquete: { id: string; uso: string; rol: string; relevancia: string; forbidden: boolean; instrumento: string }[];
  veredictoV11: string;
  motivoV11: string;
  multiArticulo: boolean;
  razones: Record<string, string>;
}

export interface TransicionCounts {
  FAIL_a_UNKNOWN: number;
  FAIL_a_PASS: number;
  UNKNOWN_a_PASS: number;
  PASS_a_UNKNOWN_o_FAIL: number;
  UNKNOWN_a_FAIL: number;
  sin_cambio: number;
}

export function ejecutarModoV11(modo: ModoVigencia) {
  const s = cargarSnapshot(modo);
  const oro = resolverOro(PREGUNTAS_V1, s.filas);
  const porId = new Map(s.filas.map((f) => [f.id, f] as const));
  const filasLab = s.filas as unknown as LabRow[];

  const v1: ResultadoPregunta[] = [];
  const v11: ResultadoPregunta[] = [];
  const filasSalida: FilaPregunta[] = [];
  const transiciones: TransicionCounts = { FAIL_a_UNKNOWN: 0, FAIL_a_PASS: 0, UNKNOWN_a_PASS: 0, PASS_a_UNKNOWN_o_FAIL: 0, UNKNOWN_a_FAIL: 0, sin_cambio: 0 };
  const multi = { v1FalsosRechazos: 0, v11FalsosRechazos: 0, v1CorregidosAUnknown: 0, unknownAPass: 0 };
  let exactoLocalizados = 0, exactoPrimario = 0, exactoSuficiente = 0, exactoLimitado = 0;
  let materiaSolaConClase = 0, similitudHizoPass = 0;
  const fallosV11: { id: string; categoria: Categoria; variante: Variante; causa: string }[] = [];
  const taxonomiaV11: Record<string, number> = {};

  for (const p of oro) {
    const r1 = ejecutarPregunta(p, s.filas, { k: K });
    const hits = r1.hits;
    const q = consultaDe(p, hits);
    const v1Raw = recuperarLab(q, filasLab, { k: K, modo: 'HYBRID' });
    const v1Rel = new Map(v1Raw.rawRanking.map((c) => [c.id, c.relevancia_clo] as const));
    const r11: ResultadoV11 = recuperarV11(q, filasLab, K);
    const ctxInt = contextoIntencion(p.pregunta);
    const v11Rel = new Map(r11.rawRanking.map((c) => [c.id, c.relevancia_clo] as const));

    // Resultados: A congelada en ambas; B/C de V1 y de V1.1.
    v1.push(r1.A, r1.B, r1.C);
    const itemsB11 = r11.rawRanking.slice(0, K).map((c) => itemDe(c, porId));
    const itemsC11 = r11.ranking.map((c) => itemDe(c, porId));
    const latB11 = { total: 0 };
    v11.push(
      { ...r1.A, variante: 'A_SEMANTICA_ACTUAL' },
      { pregunta: p, variante: 'B_HIBRIDA_RAW', items: itemsB11, pool: r11.rawRanking.map((c) => c.id), latenciaMs: latB11, tiempoTotalMs: 0 },
      { pregunta: p, variante: 'C_HIBRIDA_PAQUETE', items: itemsC11, pool: r11.rawRanking.map((c) => c.id), latenciaMs: latB11, tiempoTotalMs: 0 },
    );

    // Contexto de fallo V1.1: misma base V1; relevancia V1.1 para todo el corpus.
    const relV11Corpus: Record<string, 'PASS' | 'UNKNOWN' | 'FAIL'> = {};
    for (const f of s.filas) {
      relV11Corpus[f.id] = relevanciaV11(candidatoDesdeFila(f as unknown as LabRow), ctxInt).relevancia;
    }
    const ctx11: ContextoFallo = { ...r1.ctx.B_HIBRIDA_RAW, relevanciaPorId: relV11Corpus };
    const ctx11Base = ctx11;

    // Diagnóstico de fallos V1.1 (sólo B y C; A sin cambio).
    const pB: ResultadoPregunta = { pregunta: p, variante: 'B_HIBRIDA_RAW', items: itemsB11, pool: r11.rawRanking.map((c) => c.id), latenciaMs: latB11, tiempoTotalMs: 0 };
    const pC: ResultadoPregunta = { pregunta: p, variante: 'C_HIBRIDA_PAQUETE', items: itemsC11, pool: r11.rawRanking.map((c) => c.id), latenciaMs: latB11, tiempoTotalMs: 0 };
    for (const [v, res] of [['B_HIBRIDA_RAW', pB], ['C_HIBRIDA_PAQUETE', pC]] as const) {
      const causa = clasificarFallo(res, ctx11Base);
      if (causa) {
        taxonomiaV11[`${v}:${causa}`] = (taxonomiaV11[`${v}:${causa}`] ?? 0) + 1;
        fallosV11.push({ id: p.id, categoria: p.categoria, variante: v, causa });
      }
    }

    // Transiciones de relevancia sobre candidatos presentes en ambos pools.
    for (const [id, rel1] of v1Rel) {
      if (!v11Rel.has(id)) continue;
      const rel11 = v11Rel.get(id)!;
      if (rel1 === rel11) transiciones.sin_cambio++;
      else if (rel1 === 'FAIL' && rel11 === 'UNKNOWN') transiciones.FAIL_a_UNKNOWN++;
      else if (rel1 === 'FAIL' && rel11 === 'PASS') transiciones.FAIL_a_PASS++;
      else if (rel1 === 'UNKNOWN' && rel11 === 'PASS') transiciones.UNKNOWN_a_PASS++;
      else if (rel1 === 'PASS' && rel11 !== 'PASS') transiciones.PASS_a_UNKNOWN_o_FAIL++;
      else if (rel1 === 'UNKNOWN' && rel11 === 'FAIL') transiciones.UNKNOWN_a_FAIL++;
    }

    // Falsos rechazos multi-artículo.
    if (ctxInt.multiArticulo) {
      for (const id of p.acceptable_source_ids) {
        if (v1Rel.get(id) === 'FAIL') multi.v1FalsosRechazos++;
        if (v11Rel.get(id) === 'FAIL') multi.v11FalsosRechazos++;
        if (v1Rel.get(id) === 'FAIL' && v11Rel.get(id) === 'UNKNOWN') multi.v1CorregidosAUnknown++;
        if (v1Rel.get(id) !== 'PASS' && v11Rel.get(id) === 'PASS') multi.unknownAPass++;
      }
    }

    // Exacto tri-estado.
    if (r11.exactoV11 === 'EXACT_UNKNOWN') {
      exactoLocalizados++;
      if (r11.rawRanking.some((c) => c.rol_recuperacion === 'PRIMARY')) exactoPrimario++;
      if (r11.suficiencia.veredicto === 'SUFFICIENT') exactoSuficiente++;
      if (r11.suficiencia.veredicto === 'LIMITED') exactoLimitado++;
    }

    // Materia sola con clase explícita y similitud como PASS.
    for (const c of r11.rawRanking) {
      const razon = r11.razones[c.id];
      if (c.relevancia_clo === 'PASS' && ctxInt.intencion.clase !== null && (razon === 'MATERIA_ONLY' || razon === 'MATERIA_AND_ARTICLE')) materiaSolaConClase++;
      if (c.relevancia_clo === 'PASS' && !['EXACT_IDENTITY', 'INSTRUMENT_AND_ARTICLE', 'INSTRUMENT_IDENTITY', 'MATERIA_AND_ARTICLE', 'MATERIA_ONLY'].includes(razon ?? '')) similitudHizoPass++;
    }

    filasSalida.push({
      id: p.id,
      categoria: p.categoria,
      exactoV11: r11.exactoV11,
      vigenciaExacta: r11.vigenciaExacta,
      rawTopK: r11.rawRanking.slice(0, K).map((c) => ({ id: c.id, forbidden: p.forbidden_source_ids.includes(c.id) })),
      paquete: r11.ranking.map((c) => ({
        id: c.id,
        uso: c.uso_paquete,
        rol: c.rol_recuperacion,
        relevancia: c.relevancia_clo,
        forbidden: p.forbidden_source_ids.includes(c.id),
        instrumento: porId.get(c.id)!.instrumento,
      })),
      veredictoV11: r11.suficiencia.veredicto,
      motivoV11: r11.suficiencia.motivo,
      multiArticulo: ctxInt.multiArticulo,
      razones: r11.razones,
    });
  }

  const porCategoria = (rs: ResultadoPregunta[]) => Object.fromEntries(
    CATEGORIAS.map((c) => [c, Object.fromEntries(['A_SEMANTICA_ACTUAL', 'B_HIBRIDA_RAW', 'C_HIBRIDA_PAQUETE'].map((v) => [v, { ...metricasDe(rs, v as Variante, c), mrr: mrrDe(rs, v as Variante, c) }]))]),
  );
  const globalDe = (rs: ResultadoPregunta[]) => Object.fromEntries(
    ['A_SEMANTICA_ACTUAL', 'B_HIBRIDA_RAW', 'C_HIBRIDA_PAQUETE'].map((v) => [v, { ...metricasDe(rs, v as Variante), mrr: mrrDe(rs, v as Variante) }]),
  );

  const leak = {
    RAW_FORBIDDEN_SOURCE_PRESENCE: filasSalida.reduce((n, f) => n + f.rawTopK.filter((x) => x.forbidden).length, 0),
    PACKET_FORBIDDEN_SOURCE_LEAKAGE: filasSalida.reduce((n, f) => n + f.paquete.filter((x) => x.forbidden).length, 0),
    MATERIAL_FORBIDDEN_SOURCE_LEAKAGE: filasSalida.reduce((n, f) => n + f.paquete.filter((x) => x.forbidden && MATERIAL.has(x.uso)).length, 0),
    EXCLUDED_LAYER_LEAKAGE: filasSalida.reduce((n, f) => n + f.paquete.filter((x) => x.rol === 'EXCLUDED').length, 0),
  };
  const d05 = filasSalida.find((f) => f.id === 'D05')!;
  return {
    modo,
    sha256: s.sha256,
    preguntas: oro.length,
    globalV1: globalDe(v1),
    globalV11: globalDe(v11),
    porCategoriaV1: porCategoria(v1),
    porCategoriaV11: porCategoria(v11),
    taxonomiaV11,
    fallosV11,
    leakV11: leak,
    d05: {
      rawForbiddenPresencia: d05.rawTopK.filter((x) => x.forbidden).length,
      paqueteForbidden: d05.paquete.filter((x) => x.forbidden).length,
      materialForbidden: d05.paquete.filter((x) => x.forbidden && MATERIAL.has(x.uso)).length,
      paquete: d05.paquete,
      razonesTopK: d05.rawTopK.map((x) => x.id),
    },
    exactoUnknown: {
      localizados: exactoLocalizados,
      primaryCount: exactoPrimario,
      sufficientCount: exactoSuficiente,
      limitedCount: exactoLimitado,
    },
    multiArticulo: multi,
    transiciones,
    materiaSolaConClase,
    similitudHizoPass,
    filas: filasSalida,
    invariante: 'SYNTHETIC_BENCHMARK_DOES_NOT_PROVE_PRODUCTION_SUPERIORITY',
  };
}

if (process.argv[1] && process.argv[1].endsWith('run-v11.ts')) {
  const snap = cargarSnapshot('CA01');
  const oro = resolverOro(PREGUNTAS_V1, snap.filas);
  const salida = {
    version: 'V1.1',
    parent: 'b10ef8349566b10560514738c48360b86eaa3d6a',
    snapshot: { artefacto: RUTA_ARTEFACTO, sha256: snap.sha256, filas: snap.filas.length },
    oroSha256: createHash('sha256').update(JSON.stringify(oro)).digest('hex'),
    k: K,
    modos: [ejecutarModoV11('CA01'), ejecutarModoV11('DECLARADO')],
  };
  mkdirSync(join(process.cwd(), 'docs/evaluation'), { recursive: true });
  writeFileSync(join(process.cwd(), 'docs/evaluation/retrieval-challenge-v1-1.json'), JSON.stringify(salida, null, 2) + '\n', 'utf8');
  console.log('OK', salida.modos.map((m) => `${m.modo}:${m.preguntas}`).join(' '));
}
