/**
 * Comparator y runner del Golden Set del gateway en modo sombra (PR-G1).
 * Corre sólo con un adaptador que no abre red (RecordedResponseAdapter): las
 * respuestas del modelo son fixtures grabados. Los casos PENDIENTE (hipótesis
 * sin cierre del CLO) nunca entran al gate.
 */
import { validarSalida, type SalidaCruda } from './citation-validator';
import type { ModoTarifa } from './pricing';
import { MODELO_GATEWAY, type ModeloGateway, type ShadowGatewayInput, type ShadowGatewayResult } from './types';

export interface ShadowModelAdapter {
  readonly modelo: ModeloGateway;
  /**
   * `opciones.signal` se aborta cuando vence el timeout del despacho: un adaptador con red debe pasarla
   * a su cliente para no seguir trabajando después. Es opcional: el adaptador falso la ignora.
   */
  responder(input: ShadowGatewayInput, opciones?: { signal?: AbortSignal }): Promise<SalidaCruda>;
}

/** Adaptador falso: devuelve la respuesta grabada para cada queryId. Sin red. */
export class RecordedResponseAdapter implements ShadowModelAdapter {
  readonly modelo = MODELO_GATEWAY;
  constructor(private readonly grabadas: Readonly<Record<string, SalidaCruda>>) {}
  async responder(input: ShadowGatewayInput): Promise<SalidaCruda> {
    const r = this.grabadas[input.queryId];
    // Sin respuesta grabada no se inventa una: es un error del fixture.
    if (!r) throw new Error(`sin respuesta grabada para ${input.queryId}`);
    return r;
  }
}

export type CategoriaGolden = 'ARTICULO_EXACTO' | 'VIGENCIA_VERSION' | 'ABSTENCION' | 'NOTARIAL' | 'REFERENCIA_CRUZADA';

export interface ArticuloEsperado {
  instrumento: string;
  articulo: string;
}

export interface GoldenCase {
  id: string;
  /** Sólo VERIFICADO entra al gate; PENDIENTE es hipótesis del CLO aún abierta. */
  estado: 'VERIFICADO' | 'PENDIENTE';
  categoria: CategoriaGolden;
  /**
   * Fecha y dictamen CLO que fija el caso (p. ej. «Dictamen CLO 21-oct-2026,
   * issue #74, …»). Sin esta referencia un caso no entra al gate.
   */
  clo_ruling_ref: string;
  /** Artículo (o unidad) exacto que fija el CLO para el caso. */
  articulo: string;
  /** Gaceta que fija el CLO para el caso; null sólo si el dictamen no cita ninguna. */
  gaceta: string | null;
  /** Texto del dictamen: instrumento, artículo y Gaceta tal como los fija el CLO. */
  referenciaCLO: string;
  input: ShadowGatewayInput;
  esperado: {
    decision: 'ANSWER' | 'ABSTAIN';
    /** Si el caso pide un artículo exacto: instrumento y artículo que debe citar. */
    articulo?: ArticuloEsperado;
    /** Instrumentos que no se pueden citar (p. ej. Código Penal para el art. 173-B). */
    instrumentosProhibidos?: string[];
  };
}

/** Un caso entra al gate sólo si es VERIFICADO y lleva una clo_ruling_ref no vacía. */
export function entraAlGate(caso: GoldenCase): boolean {
  return caso.estado === 'VERIFICADO' && typeof caso.clo_ruling_ref === 'string' && caso.clo_ruling_ref.trim() !== '';
}

export interface ComparacionCaso {
  caseId: string;
  queryId: string;
  categoria: CategoriaGolden;
  shadowStatus: ShadowGatewayResult['status'];
  produccion: 'ANSWER' | 'ABSTAIN';
  esperado: 'ANSWER' | 'ABSTAIN';
  /** El modelo sombra no coincide con producción (incluye INVALID). */
  desacuerdoConProduccion: boolean;
  /** El resultado sombra cumple lo esperado por el CLO. */
  cumpleEsperado: boolean;
  /** null si el caso no pide artículo exacto. */
  articuloExactoCorrecto: boolean | null;
  citaInstrumentoProhibido: boolean;
}

export interface Tasa {
  numerador: number;
  denominador: number;
  /** null si no hay denominador: nunca se reporta 100 % por defecto. */
  tasa: number | null;
}

export interface InformeGolden {
  modelo: ModeloGateway;
  modoTarifa: ModoTarifa;
  casosEvaluados: string[];
  casosExcluidosPendientes: string[];
  resultados: ShadowGatewayResult[];
  comparaciones: ComparacionCaso[];
  metricas: {
    exactitudArticuloExacto: Tasa;
    abstencionCorrecta: Tasa;
    citasInvalidas: Tasa;
    precisionClaimsSustentadas: Tasa;
    costoEstimadoUsd: number;
    tokens: { input: number; output: number };
  };
  desacuerdos: ComparacionCaso[];
  gate: { pasa: boolean; motivos: string[] };
}

const tasa = (numerador: number, denominador: number): Tasa => ({
  numerador,
  denominador,
  tasa: denominador === 0 ? null : numerador / denominador,
});

export function compararCaso(caso: GoldenCase, r: ShadowGatewayResult): ComparacionCaso {
  const porId = new Map(caso.input.evidence.map((e) => [e.chunk_id, e]));
  const citados = r.claims.flatMap((c) => c.citations.map((ct) => porId.get(ct.chunk_id))).filter((e) => e !== undefined);
  const prohibidos = new Set(caso.esperado.instrumentosProhibidos ?? []);
  const citaInstrumentoProhibido = citados.some((e) => prohibidos.has(e.instrumento));
  const art = caso.esperado.articulo;
  const articuloExactoCorrecto =
    art === undefined
      ? null
      : r.status === 'ANSWER' &&
        !citaInstrumentoProhibido &&
        citados.some((e) => e.instrumento === art.instrumento && e.articulo === art.articulo);
  const decisionOk = r.status === caso.esperado.decision;
  return {
    caseId: caso.id,
    queryId: caso.input.queryId,
    categoria: caso.categoria,
    shadowStatus: r.status,
    produccion: caso.input.productionOutcome.decision,
    esperado: caso.esperado.decision,
    desacuerdoConProduccion: r.status !== caso.input.productionOutcome.decision,
    cumpleEsperado: decisionOk && !citaInstrumentoProhibido && articuloExactoCorrecto !== false,
    articuloExactoCorrecto,
    citaInstrumentoProhibido,
  };
}

export async function runGoldenSet(
  casos: readonly GoldenCase[],
  adapter: ShadowModelAdapter,
  opciones: { modoTarifa?: ModoTarifa } = {},
): Promise<InformeGolden> {
  const modoTarifa = opciones.modoTarifa ?? 'standard';
  const verificados = casos.filter(entraAlGate);
  const resultados: ShadowGatewayResult[] = [];
  const comparaciones: ComparacionCaso[] = [];
  for (const caso of verificados) {
    const cruda = await adapter.responder(caso.input);
    const r = validarSalida(caso.input, cruda, modoTarifa);
    resultados.push(r);
    comparaciones.push(compararCaso(caso, r));
  }

  const conArticulo = comparaciones.filter((c) => c.articuloExactoCorrecto !== null);
  const esperanAbstencion = comparaciones.filter((c) => c.esperado === 'ABSTAIN');
  const totalCitas = resultados.reduce((s, r) => s + r.totalCitations, 0);
  const citasInvalidas = resultados.reduce((s, r) => s + r.invalidCitations, 0);
  const claimsSustentadas = resultados.reduce((s, r) => s + r.claims.length, 0);
  const claimsEmitidas = resultados.reduce((s, r) => s + r.claims.length + r.discardedClaims.length, 0);

  const metricas = {
    exactitudArticuloExacto: tasa(conArticulo.filter((c) => c.articuloExactoCorrecto === true).length, conArticulo.length),
    abstencionCorrecta: tasa(esperanAbstencion.filter((c) => c.shadowStatus === 'ABSTAIN').length, esperanAbstencion.length),
    citasInvalidas: tasa(citasInvalidas, totalCitas),
    precisionClaimsSustentadas: tasa(claimsSustentadas, claimsEmitidas),
    costoEstimadoUsd: resultados.reduce((s, r) => s + r.usage.estimatedCostUsd, 0),
    tokens: {
      input: resultados.reduce((s, r) => s + r.usage.inputTokens, 0),
      output: resultados.reduce((s, r) => s + r.usage.outputTokens, 0),
    },
  };

  const motivos: string[] = [];
  if (verificados.length === 0) motivos.push('no hay casos verificados');
  if (citasInvalidas > 0) motivos.push(`citas inválidas: ${citasInvalidas} (objetivo 0 %)`);
  for (const c of comparaciones) if (!c.cumpleEsperado) motivos.push(`${c.caseId}: no cumple lo esperado`);

  return {
    modelo: adapter.modelo,
    modoTarifa,
    casosEvaluados: verificados.map((c) => c.id),
    casosExcluidosPendientes: casos.filter((c) => !entraAlGate(c)).map((c) => c.id),
    resultados,
    comparaciones,
    metricas,
    desacuerdos: comparaciones.filter((c) => c.desacuerdoConProduccion),
    gate: { pasa: motivos.length === 0, motivos },
  };
}
