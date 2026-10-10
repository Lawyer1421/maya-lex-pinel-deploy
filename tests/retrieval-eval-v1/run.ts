import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { cargarSnapshot, RUTA_ARTEFACTO, type ModoVigencia } from './snapshot';
import { PREGUNTAS_V1, resolverOro, type Categoria } from './gold';
import { ejecutarPregunta, seleccionarPoliticaSimulada, seleccionCongelada } from './variants';
import { metricasDe, mrrDe, clasificarFallo, primaryPassEn, type ResultadoPregunta, type Variante, type CausaFallo, type ContextoFallo } from './metrics';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { INVARIANTE_BENCHMARK_SINTETICO } from '@/lib/legal-retrieval/lab/benchmark';
import type { LabBenchmarkQuery, LabRow } from '@/lib/legal-retrieval/lab/types';

export const K = 5;
const VARIANTES: Variante[] = ['A_SEMANTICA_ACTUAL', 'B_HIBRIDA_RAW', 'C_HIBRIDA_PAQUETE'];
const CATEGORIAS: Categoria[] = [
  'A_EXACTA', 'B_CONCEPTUAL', 'C_MULTI_REMISION_EXCEPCION', 'D_ADVERSARIAL', 'E_EVIDENCIA_INSUFICIENTE', 'F_HISTORICA_VIGENCIA_ROL',
];

export interface EjecucionModo {
  modo: ModoVigencia;
  sha256: string;
  preguntas: number;
  global: Record<Variante, ReturnType<typeof metricasDe> & { mrr: ReturnType<typeof mrrDe> }>;
  porCategoria: Record<string, Record<Variante, ReturnType<typeof metricasDe> & { mrr: ReturnType<typeof mrrDe> }>>;
  taxonomia: Record<Variante, Record<string, number>>;
  fallos: { id: string; categoria: Categoria; variante: Variante; causa: CausaFallo }[];
  exactoFalso: { id: string; articulo: string; vigenciaSnapshot: string; resultadoC: string }[];
  sensibilidadLimite: { tope: number; primaryPassPreguntas: number; fueraDelPool: number; fueraDelPaquete: number }[];  // fueraDelPool = objetivo ausente del pool; fueraDelPaquete = sin PRIMARY+PASS en el pool
  politicas: { X_igual_congelada: boolean; preguntasConRestringidoYSecundario: number; diferenciasXY: number; primaryPassXIds: number; primaryPassYIds: number };
  invariante: string;
}

function ctxDe(r: ReturnType<typeof ejecutarPregunta>, v: Variante): ContextoFallo {
  return r.ctx[v];
}

export function ejecutarModo(modo: ModoVigencia): EjecucionModo {
  const s = cargarSnapshot(modo);
  const oro = resolverOro(PREGUNTAS_V1, s.filas);
  const resultados: ResultadoPregunta[] = [];
  const fallosCausas: EjecucionModo['fallos'] = [];
  const taxonomia = Object.fromEntries(VARIANTES.map((v) => [v, {} as Record<string, number>])) as Record<Variante, Record<string, number>>;
  const exactoFalso: EjecucionModo['exactoFalso'] = [];
  const porPregunta: Record<string, ReturnType<typeof ejecutarPregunta>> = {};

  for (const p of oro) {
    const r = ejecutarPregunta(p, s.filas, { k: K });
    porPregunta[p.id] = r;
    for (const x of [r.A, r.B, r.C]) resultados.push(x);
    if (r.exactoFalso) {
      const f = s.filas.find((x) => x.id === r.C.items[0]?.id) ?? s.filas.find((x) => x.num_articulo === p.expected_articles[0] && x.instrumento === p.expected_instrument);
      exactoFalso.push({ id: p.id, articulo: p.expected_articles.join(','), vigenciaSnapshot: String(f?.es_norma_vigente), resultadoC: r.C.items.map((i) => `${i.rol}/${i.relevancia}`).join(' ') || 'sin_items' });
    }
    for (const v of VARIANTES) {
      const res = v === 'A_SEMANTICA_ACTUAL' ? r.A : v === 'B_HIBRIDA_RAW' ? r.B : r.C;
      const causa = clasificarFallo(res, ctxDe(r, v));
      if (causa) {
        taxonomia[v][causa] = (taxonomia[v][causa] ?? 0) + 1;
        fallosCausas.push({ id: p.id, categoria: p.categoria, variante: v, causa });
      }
    }
  }

  const global = Object.fromEntries(VARIANTES.map((v) => [v, { ...metricasDe(resultados, v), mrr: mrrDe(resultados, v) }])) as EjecucionModo['global'];
  const porCategoria: EjecucionModo['porCategoria'] = {};
  for (const c of CATEGORIAS) {
    porCategoria[c] = Object.fromEntries(VARIANTES.map((v) => [v, { ...metricasDe(resultados, v, c), mrr: mrrDe(resultados, v, c) }])) as EjecucionModo['porCategoria'][string];
  }

  // Sensibilidad al límite bruto (simulación; RPC no modificado).
  // Se mide por separado: (a) el objetivo aparece en el pool bruto; (b) hay PRIMARY+PASS en el pool.
  const sensibilidadLimite: EjecucionModo['sensibilidadLimite'] = [];
  for (const tope of [20, 25, 50]) {
    let evaluables = 0, objetivoFuera = 0, primaryPassFuera = 0;
    for (const p of oro) {
      if (!p.expected_primary_required || p.acceptable_source_ids.length === 0) continue;
      evaluables++;
      const q: LabBenchmarkQuery = {
        id: p.id, categoria: 'adversarial_semantico_negativo', texto: p.pregunta,
        relevantes: p.acceptable_source_ids, distractores: [], abstencion_esperada: p.expected_abstention,
        semantic_hits: porPregunta[p.id].hits,
        validacion: 'PENDIENTE_VALIDACION_JURIDICA',
      };
      const res = recuperarLab(q, s.filas as LabRow[], { k: K, semanticCap: tope, rawCandidateLimit: tope, modo: 'HYBRID' });
      if (!res.rawRanking.some((c) => p.acceptable_source_ids.includes(c.id))) objetivoFuera++;
      if (!res.rawRanking.some((c) => p.acceptable_source_ids.includes(c.id) && c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'PASS')) primaryPassFuera++;
    }
    sensibilidadLimite.push({ tope, primaryPassPreguntas: evaluables, fueraDelPool: objetivoFuera, fueraDelPaquete: primaryPassFuera });
  }

  // Políticas X e Y (simulación; la selección congelada no se modifica).
  let X_igual = true, conRestringidoYSecundario = 0, diferencias = 0, pX = 0, pY = 0;
  for (const p of oro) {
    const q: LabBenchmarkQuery = {
      id: p.id, categoria: 'adversarial_semantico_negativo', texto: p.pregunta,
      relevantes: p.acceptable_source_ids, distractores: [], abstencion_esperada: p.expected_abstention,
      semantic_hits: porPregunta[p.id].hits,
      validacion: 'PENDIENTE_VALIDACION_JURIDICA',
    };
    const res = recuperarLab(q, s.filas as LabRow[], { k: K, modo: 'HYBRID' });
    const congelada = seleccionCongelada(res.rawRanking, K).map((c) => `${c.id}:${c.uso_paquete}`).join('|');
    const X = seleccionarPoliticaSimulada(res.rawRanking, K, 'X').map((c) => `${c.id}:${c.uso_paquete}`).join('|');
    const Y = seleccionarPoliticaSimulada(res.rawRanking, K, 'Y').map((c) => `${c.id}:${c.uso_paquete}`).join('|');
    if (congelada !== X) X_igual = false;
    if (X !== Y) diferencias++;
    const tieneRestringido = res.rawRanking.some((c) => c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'UNKNOWN');
    const tieneSecundario = res.rawRanking.some((c) => c.rol_recuperacion === 'SECONDARY' && c.relevancia_clo === 'PASS');
    if (tieneRestringido && tieneSecundario) conRestringidoYSecundario++;
    const enX = seleccionarPoliticaSimulada(res.rawRanking, K, 'X');
    const enY = seleccionarPoliticaSimulada(res.rawRanking, K, 'Y');
    if (enX.some((c) => p.acceptable_source_ids.includes(c.id) && c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'PASS')) pX++;
    if (enY.some((c) => p.acceptable_source_ids.includes(c.id) && c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'PASS')) pY++;
  }

  return {
    modo,
    sha256: s.sha256,
    preguntas: oro.length,
    global,
    porCategoria,
    taxonomia,
    fallos: fallosCausas,
    exactoFalso,
    sensibilidadLimite,
    politicas: { X_igual_congelada: X_igual, preguntasConRestringidoYSecundario: conRestringidoYSecundario, diferenciasXY: diferencias, primaryPassXIds: pX, primaryPassYIds: pY },
    invariante: INVARIANTE_BENCHMARK_SINTETICO,
  };
}

if (process.argv[1] && process.argv[1].endsWith('run.ts')) {
  const snap = cargarSnapshot('CA01');
  const oro = resolverOro(PREGUNTAS_V1, snap.filas).map((p) => ({
    id: p.id, categoria: p.categoria, pregunta: p.pregunta, materia: p.materia,
    expected_instrument: p.expected_instrument, expected_articles: p.expected_articles,
    acceptable_source_ids: p.acceptable_source_ids, forbidden_source_ids: p.forbidden_source_ids,
    expected_primary_required: p.expected_primary_required, expected_secondary_allowed: p.expected_secondary_allowed,
    expected_context_allowed: p.expected_context_allowed, expected_abstention: p.expected_abstention,
    legal_validation_status: p.legal_validation_status, legal_gold: p.legal_gold, notes: p.notes,
  }));
  const salida = { snapshot: { artefacto: RUTA_ARTEFACTO, sha256: snap.sha256, filas: snap.filas.length }, k: K, oro, modos: [ejecutarModo('CA01'), ejecutarModo('DECLARADO')] };
  mkdirSync(join(process.cwd(), 'docs/evaluation'), { recursive: true });
  writeFileSync(join(process.cwd(), 'docs/evaluation/retrieval-challenge-v1.json'), JSON.stringify(salida, null, 2) + '\n', 'utf8');
  console.log('OK', salida.modos.map((m) => `${m.modo}:${m.preguntas}`).join(' '));
}
