import { performance } from 'node:perf_hooks';
import {
  detectarArticuloExacto,
  detectarInstrumentoDesdeTexto,
  detectarMateriaSemanticaAmpliada,
} from '../exact-resolver';
import { colapsarDuplicadosExactos, type EventoDedup } from './dedup';
import { resolverExactoLab, type EstadoExactoLab } from './exact-lab';
import { intencionHistoricaCPC, type IntencionConsulta } from './clo-policy';
import { motivoExclusionDura, type MotivoExclusion } from './hard-exclusions';
import { fusionarHibrido, candidatoDesdeFila } from './hybrid-merge';
import { LexicalLabAdapter, type LexicalAdapter } from './lexical-lab';
import { puntuarCandidatos, type EventoPenalizacion } from './ranking';
import { buscarSemanticoFixture, SEMANTIC_CANDIDATE_CAP } from './semantic-fixture';
import { evaluarSuficiencia, type ResultadoSuficiencia } from './sufficiency';
import {
  RAW_CANDIDATE_LIMIT_LAB,
  seleccionarPaquete,
  type DiagnosticoSeleccion,
  type EvidenciaSeleccionada,
} from './evidence-selection';
import type {
  LabBenchmarkQuery,
  LabRow,
  RankedCandidate,
  RetrievalChannel,
} from './types';

export type ModoRecuperacion = 'SEMANTIC_ONLY' | 'LEXICAL_ONLY' | 'HYBRID';
export type RutaLab = 'FAST_EXACT' | 'STANDARD_LAB' | 'ABSTAIN';

export interface TiemposLab {
  exacto: number;
  lexico: number;
  semantico: number;
  fusion: number;
  dedup: number;
  ranking: number;
  seleccion: number;
  total: number;
}

export type MotivoExclusionLab = MotivoExclusion | 'ROL_EXCLUIDO_CLO';

/**
 * `rawRanking`: ranking bruto (hasta rawCandidateLimit). `ranking`: paquete de
 * evidencia seleccionado (packet_k). La suficiencia se evalúa sobre el mismo
 * conjunto que el paquete (`evidenciaSuficiencia` == `paqueteIds`).
 */
export interface ResultadoLab {
  ruta: RutaLab;
  estadoExacto: EstadoExactoLab;
  modo: ModoRecuperacion;
  intencion: IntencionConsulta;
  rawRanking: RankedCandidate[];
  ranking: EvidenciaSeleccionada[];
  paqueteIds: string[];
  evidenciaSuficiencia: string[];
  diagnosticos: DiagnosticoSeleccion[];
  suficiencia: ResultadoSuficiencia;
  excluidos: { id: string; canal: RetrievalChannel; motivo: MotivoExclusionLab }[];
  eventosDedup: EventoDedup[];
  eventosPenalizacion: EventoPenalizacion[];
  tiemposMs: TiemposLab;
}

export interface OpcionesLab {
  /** packet_k: capacidad del paquete de evidencia. */
  k: number;
  /** raw_candidate_limit: tamaño máximo del ranking bruto. Distinto de k. */
  rawCandidateLimit?: number;
  /** Tope semántico (espejo del RPC). Sólo para simulación de límites. */
  semanticCap?: number;
  modo?: ModoRecuperacion;
  lexico?: LexicalAdapter;
}

const ADAPTADOR_LEXICO_POR_DEFECTO = new LexicalLabAdapter();

function medir<T>(fn: () => T): { valor: T; ms: number } {
  const t = performance.now();
  const valor = fn();
  return { valor, ms: performance.now() - t };
}

export function recuperarLab(
  query: LabBenchmarkQuery,
  corpus: readonly LabRow[],
  opciones: OpcionesLab,
): ResultadoLab {
  const modo = opciones.modo ?? 'HYBRID';
  const lexico = opciones.lexico ?? ADAPTADOR_LEXICO_POR_DEFECTO;
  const rawLimite = opciones.rawCandidateLimit ?? RAW_CANDIDATE_LIMIT_LAB;
  const tTotal = performance.now();
  const intencion: IntencionConsulta = { historicaCPC: intencionHistoricaCPC(query.texto) };
  const contexto = {
    materia: detectarMateriaSemanticaAmpliada(query.texto),
    intencion,
    articulo: detectarArticuloExacto(query.texto)?.numero ?? null,
    instrumento: detectarInstrumentoDesdeTexto(query.texto),
  };
  const soporteValidado = new Set(query.soporte_validado_ids ?? []);
  const filasPorId = new Map(corpus.map((f) => [f.id, f] as const));
  const excluidos: ResultadoLab['excluidos'] = [];
  const tiempos: TiemposLab = {
    exacto: 0, lexico: 0, semantico: 0, fusion: 0, dedup: 0, ranking: 0, seleccion: 0, total: 0,
  };

  const exacto = medir(() => resolverExactoLab(query.texto, corpus));
  tiempos.exacto = exacto.ms;

  const cerrar = (
    ruta: RutaLab,
    estado: EstadoExactoLab,
    raw: RankedCandidate[],
    eventosDedup: EventoDedup[],
    eventosPenalizacion: EventoPenalizacion[],
  ): ResultadoLab => {
    const sel = medir(() => seleccionarPaquete(raw, opciones.k));
    tiempos.seleccion = sel.ms;
    const paqueteIds = sel.valor.paquete.map((c) => c.id);
    const evidenciaSuficiencia = [...paqueteIds];
    tiempos.total = performance.now() - tTotal;
    return {
      ruta,
      estadoExacto: estado,
      modo,
      intencion,
      rawRanking: raw,
      ranking: sel.valor.paquete,
      paqueteIds,
      evidenciaSuficiencia,
      diagnosticos: sel.valor.diagnosticos,
      suficiencia: evaluarSuficiencia(sel.valor.paquete, { soporteValidado }),
      excluidos,
      eventosDedup,
      eventosPenalizacion,
      tiemposMs: tiempos,
    };
  };

  if (exacto.valor.estado === 'EXACT_SUCCESS' && exacto.valor.fragmento?.id) {
    const id = exacto.valor.fragmento.id;
    const fila = filasPorId.get(id);
    if (!fila) throw new Error(`Fragmento exacto ${id} fuera del corpus`);
    const candidato = { ...candidatoDesdeFila(fila), retrieval_channel: ['exact' as const], exact_match: true };
    const rank = medir(() => puntuarCandidatos([candidato], contexto));
    tiempos.ranking = rank.ms;
    for (const c of rank.valor.excluidosPorRol) {
      excluidos.push({ id: c.id, canal: 'exact', motivo: 'ROL_EXCLUIDO_CLO' });
    }
    const raw = rank.valor.ranking.slice(0, rawLimite);
    return cerrar(raw.length === 0 ? 'ABSTAIN' : 'FAST_EXACT', exacto.valor.estado, raw, [], rank.valor.eventos);
  }

  if (exacto.valor.estado === 'AMBIGUOUS' || exacto.valor.estado === 'ABSTAIN_INSTRUMENT_OR_MATERIA') {
    return cerrar('ABSTAIN', exacto.valor.estado, [], [], []);
  }

  let hitsLexicos: ReturnType<LexicalAdapter['buscar']> = [];
  if (modo !== 'SEMANTIC_ONLY') {
    const filasLexico = corpus.filter((f) => {
      const motivo = motivoExclusionDura(f, 'lexical');
      if (motivo) {
        excluidos.push({ id: f.id, canal: 'lexical', motivo });
        return false;
      }
      return true;
    });
    const lex = medir(() => lexico.buscar(query.texto, filasLexico));
    hitsLexicos = lex.valor;
    tiempos.lexico = lex.ms;
  }

  let hitsSemanticos: ReturnType<typeof buscarSemanticoFixture> = [];
  if (modo !== 'LEXICAL_ONLY') {
    const sem = medir(() => buscarSemanticoFixture(query, corpus, opciones.semanticCap ?? SEMANTIC_CANDIDATE_CAP));
    hitsSemanticos = sem.valor.filter((h) => {
      const fila = filasPorId.get(h.id);
      if (!fila) return false;
      const motivo = motivoExclusionDura(fila, 'semantic');
      if (motivo) {
        excluidos.push({ id: h.id, canal: 'semantic', motivo });
        return false;
      }
      return true;
    });
    tiempos.semantico = sem.ms;
  }

  const fus = medir(() => fusionarHibrido(hitsLexicos, hitsSemanticos, filasPorId));
  tiempos.fusion = fus.ms;

  const dd = medir(() => colapsarDuplicadosExactos(fus.valor));
  tiempos.dedup = dd.ms;

  const rank = medir(() => puntuarCandidatos(dd.valor.candidatos, contexto));
  tiempos.ranking = rank.ms;

  for (const c of rank.valor.excluidosPorRol) {
    for (const canal of c.retrieval_channel) {
      excluidos.push({ id: c.id, canal, motivo: 'ROL_EXCLUIDO_CLO' });
    }
  }

  const raw = rank.valor.ranking.slice(0, rawLimite);
  for (const c of raw) {
    const fila = filasPorId.get(c.id);
    if (!fila) throw new Error(`Candidato ${c.id} fuera del corpus`);
    for (const canal of c.retrieval_channel) {
      if (motivoExclusionDura(fila, canal)) {
        throw new Error(`Invariante violada: ${c.id} excluido llegó al ranking por canal ${canal}`);
      }
    }
  }

  return cerrar('STANDARD_LAB', exacto.valor.estado, raw, dd.valor.eventos, rank.valor.eventos);
}
