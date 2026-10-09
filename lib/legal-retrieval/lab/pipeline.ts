import { performance } from 'node:perf_hooks';
import { detectarMateriaSemanticaAmpliada } from '../exact-resolver';
import { colapsarDuplicadosExactos, type EventoDedup } from './dedup';
import { resolverExactoLab, type EstadoExactoLab } from './exact-lab';
import { motivoExclusionDura, type MotivoExclusion } from './hard-exclusions';
import { fusionarHibrido, candidatoDesdeFila } from './hybrid-merge';
import { LexicalLabAdapter, type LexicalAdapter } from './lexical-lab';
import { puntuarCandidatos, type EventoPenalizacion } from './ranking';
import { buscarSemanticoFixture } from './semantic-fixture';
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
  total: number;
}

export interface ResultadoLab {
  ruta: RutaLab;
  estadoExacto: EstadoExactoLab;
  modo: ModoRecuperacion;
  ranking: RankedCandidate[];
  excluidos: { id: string; canal: RetrievalChannel; motivo: MotivoExclusion }[];
  eventosDedup: EventoDedup[];
  eventosPenalizacion: EventoPenalizacion[];
  tiemposMs: TiemposLab;
}

export interface OpcionesLab {
  k: number;
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
  const tTotal = performance.now();
  const contexto = { materia: detectarMateriaSemanticaAmpliada(query.texto) };
  const filasPorId = new Map(corpus.map((f) => [f.id, f] as const));
  const excluidos: ResultadoLab['excluidos'] = [];
  const tiempos: TiemposLab = { exacto: 0, lexico: 0, semantico: 0, fusion: 0, dedup: 0, ranking: 0, total: 0 };

  const exacto = medir(() => resolverExactoLab(query.texto, corpus));
  tiempos.exacto = exacto.ms;

  const resultadoVacio = (ruta: RutaLab): ResultadoLab => {
    tiempos.total = performance.now() - tTotal;
    return {
      ruta,
      estadoExacto: exacto.valor.estado,
      modo,
      ranking: [],
      excluidos,
      eventosDedup: [],
      eventosPenalizacion: [],
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
    tiempos.total = performance.now() - tTotal;
    return {
      ruta: 'FAST_EXACT',
      estadoExacto: exacto.valor.estado,
      modo,
      ranking: rank.valor.ranking.slice(0, opciones.k),
      excluidos,
      eventosDedup: [],
      eventosPenalizacion: rank.valor.eventos,
      tiemposMs: tiempos,
    };
  }

  if (exacto.valor.estado === 'AMBIGUOUS' || exacto.valor.estado === 'ABSTAIN_INSTRUMENT_OR_MATERIA') {
    return resultadoVacio('ABSTAIN');
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
    const sem = medir(() => buscarSemanticoFixture(query, corpus));
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

  const top = rank.valor.ranking.slice(0, opciones.k);
  for (const c of top) {
    const fila = filasPorId.get(c.id);
    if (!fila) throw new Error(`Candidato ${c.id} fuera del corpus`);
    for (const canal of c.retrieval_channel) {
      if (motivoExclusionDura(fila, canal)) {
        throw new Error(`Invariante violada: ${c.id} excluido llegó al ranking por canal ${canal}`);
      }
    }
  }

  tiempos.total = performance.now() - tTotal;
  return {
    ruta: 'STANDARD_LAB',
    estadoExacto: exacto.valor.estado,
    modo,
    ranking: top,
    excluidos,
    eventosDedup: dd.valor.eventos,
    eventosPenalizacion: rank.valor.eventos,
    tiemposMs: tiempos,
  };
}
