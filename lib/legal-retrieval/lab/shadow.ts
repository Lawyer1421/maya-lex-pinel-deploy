import { recuperarLab, type OpcionesLab } from './pipeline';
import { evaluarSuficiencia, type VeredictoSuficiencia } from './sufficiency';
import type { LabBenchmarkQuery, LabRow, RankedCandidate } from './types';

/**
 * Harness de sombra (LAB). Compara:
 *   A = ranking bruto top-k (comportamiento V4.0)
 *   B = paquete de evidencia seleccionado (packet_k)
 * sobre el mismo corpus, las mismas consultas y los mismos candidatos brutos.
 * No hace llamadas a modelos ni a servicios externos.
 */

export const INVARIANTE_SHADOW = 'SHADOW_RESULTS_DO_NOT_PROVE_PRODUCTION_BENEFIT' as const;

export interface CorridaShadow {
  id: string;
  query: LabBenchmarkQuery;
  corpus: readonly LabRow[];
  k: number;
  opciones?: Partial<OpcionesLab>;
}

export interface ResultadoCorridaShadow {
  id: string;
  k: number;
  idsTopK: string[];
  idsPaquete: string[];
  primaryPassPool: number;
  primaryPassTopK: number;
  primaryPassPaquete: number;
  primaryPassDisplaced: number;
  relevanceFailPaquete: number;
  excludedPaquete: number;
  contextoTopK: number;
  contextoPaquete: number;
  secundarioTopK: number;
  secundarioPaquete: number;
  diversidadTopK: number;
  diversidadPaquete: number;
  topKVacio: boolean;
  paqueteVacio: boolean;
  suficienciaPool: VeredictoSuficiencia;
  suficienciaPaquete: VeredictoSuficiencia;
  evidenciaSuficienciaCoincide: boolean;
}

export interface AgregadoShadow {
  corridas: number;
  primaryPassDisplacedTotal: number;
  relevanceFailEnPaqueteTotal: number;
  excludedEnPaqueteTotal: number;
  primaryPassTopKTotal: number;
  primaryPassPaqueteTotal: number;
  primaryPassPoolTotal: number;
  tasaContextoTopK: number;
  tasaContextoPaquete: number;
  tasaSecundarioTopK: number;
  tasaSecundarioPaquete: number;
  diversidadMediaTopK: number;
  diversidadMediaPaquete: number;
  tasaVacioTopK: number;
  tasaVacioPaquete: number;
  suficienciaPool: Record<VeredictoSuficiencia, number>;
  suficienciaPaquete: Record<VeredictoSuficiencia, number>;
  desacuerdosSuficiencia: number;
  coincidenciaEvidenciaSuficiencia: boolean;
  reproducible: boolean;
}

export interface ResultadoShadow {
  invariante: typeof INVARIANTE_SHADOW;
  corridas: ResultadoCorridaShadow[];
  agregado: AgregadoShadow;
}

function media(valores: number[]): number {
  return valores.length === 0 ? 0 : valores.reduce((s, v) => s + v, 0) / valores.length;
}

function contarVeredictos(veredictos: readonly VeredictoSuficiencia[]): Record<VeredictoSuficiencia, number> {
  const out: Record<VeredictoSuficiencia, number> = { SUFFICIENT: 0, LIMITED: 0, ABSTAIN: 0 };
  for (const v of veredictos) out[v]++;
  return out;
}

function esPrimaryPass(c: RankedCandidate): boolean {
  return c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'PASS';
}

export function ejecutarCorrida(run: CorridaShadow): ResultadoCorridaShadow {
  const res = recuperarLab(run.query, run.corpus, { k: run.k, ...run.opciones });
  const raw = res.rawRanking;
  const topK = raw.slice(0, run.k);
  const paquete = res.ranking;
  const soporte = new Set(run.query.soporte_validado_ids ?? []);

  const primaryPassPool = raw.filter(esPrimaryPass).length;
  const primaryPassPaquete = paquete.filter(esPrimaryPass).length;
  const primaryPassDisplaced = Math.max(0, Math.min(primaryPassPool, run.k) - primaryPassPaquete);

  const idsPaquete = paquete.map((c) => c.id);
  const evidenciaSuficienciaCoincide =
    res.evidenciaSuficiencia.length === idsPaquete.length &&
    res.evidenciaSuficiencia.every((id, i) => id === idsPaquete[i]);

  return {
    id: run.id,
    k: run.k,
    idsTopK: topK.map((c) => c.id),
    idsPaquete,
    primaryPassPool,
    primaryPassTopK: topK.filter(esPrimaryPass).length,
    primaryPassPaquete,
    primaryPassDisplaced,
    relevanceFailPaquete: paquete.filter((c) => c.relevancia_clo === 'FAIL').length,
    excludedPaquete: paquete.filter((c) => c.rol_recuperacion === 'EXCLUDED').length,
    contextoTopK: topK.filter((c) => c.rol_recuperacion === 'CONTEXT').length,
    contextoPaquete: paquete.filter((c) => c.rol_recuperacion === 'CONTEXT').length,
    secundarioTopK: topK.filter((c) => c.rol_recuperacion === 'SECONDARY').length,
    secundarioPaquete: paquete.filter((c) => c.rol_recuperacion === 'SECONDARY').length,
    diversidadTopK: new Set(topK.map((c) => c.fuente)).size,
    diversidadPaquete: new Set(paquete.map((c) => c.fuente)).size,
    topKVacio: topK.length === 0,
    paqueteVacio: paquete.length === 0,
    suficienciaPool: evaluarSuficiencia(raw, { soporteValidado: soporte }).veredicto,
    suficienciaPaquete: res.suficiencia.veredicto,
    evidenciaSuficienciaCoincide,
  };
}

export function ejecutarShadow(corridas: readonly CorridaShadow[]): ResultadoShadow {
  const resultados = corridas.map(ejecutarCorrida);
  const n = resultados.length;
  const sumar = (f: (r: ResultadoCorridaShadow) => number): number => resultados.reduce((s, r) => s + f(r), 0);
  const itemsTopK = sumar((r) => r.idsTopK.length);
  const itemsPaquete = sumar((r) => r.idsPaquete.length);

  const agregado: AgregadoShadow = {
    corridas: n,
    primaryPassDisplacedTotal: sumar((r) => r.primaryPassDisplaced),
    relevanceFailEnPaqueteTotal: sumar((r) => r.relevanceFailPaquete),
    excludedEnPaqueteTotal: sumar((r) => r.excludedPaquete),
    primaryPassTopKTotal: sumar((r) => r.primaryPassTopK),
    primaryPassPaqueteTotal: sumar((r) => r.primaryPassPaquete),
    primaryPassPoolTotal: sumar((r) => r.primaryPassPool),
    tasaContextoTopK: itemsTopK ? sumar((r) => r.contextoTopK) / itemsTopK : 0,
    tasaContextoPaquete: itemsPaquete ? sumar((r) => r.contextoPaquete) / itemsPaquete : 0,
    tasaSecundarioTopK: itemsTopK ? sumar((r) => r.secundarioTopK) / itemsTopK : 0,
    tasaSecundarioPaquete: itemsPaquete ? sumar((r) => r.secundarioPaquete) / itemsPaquete : 0,
    diversidadMediaTopK: media(resultados.map((r) => r.diversidadTopK)),
    diversidadMediaPaquete: media(resultados.map((r) => r.diversidadPaquete)),
    tasaVacioTopK: n ? resultados.filter((r) => r.topKVacio).length / n : 0,
    tasaVacioPaquete: n ? resultados.filter((r) => r.paqueteVacio).length / n : 0,
    suficienciaPool: contarVeredictos(resultados.map((r) => r.suficienciaPool)),
    suficienciaPaquete: contarVeredictos(resultados.map((r) => r.suficienciaPaquete)),
    desacuerdosSuficiencia: resultados.filter((r) => r.suficienciaPool !== r.suficienciaPaquete).length,
    coincidenciaEvidenciaSuficiencia: resultados.every((r) => r.evidenciaSuficienciaCoincide),
    reproducible: false,
  };

  const segunda = corridas.map(ejecutarCorrida);
  agregado.reproducible = JSON.stringify(resultados) === JSON.stringify(segunda);

  return { invariante: INVARIANTE_SHADOW, corridas: resultados, agregado };
}
