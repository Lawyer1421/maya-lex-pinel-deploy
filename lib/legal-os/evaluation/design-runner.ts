/**
 * lib/legal-os/evaluation/design-runner.ts
 * Ejecuta la suite DESIGN_FIXED a través de `ejecutarPipeline` con dependencias inyectadas: recuperador limpio/vacío/adversarial,
 * proveedor falso y un reloj inyectado (sin reloj de pared: la latencia es SIMULADA, en ticks). No hay red, base de datos ni claves.
 */
import { ejecutarPipeline, type ChunkEvidencia, type ResultadoRecuperacion } from '../pipeline';
import { crearProveedorFalso, type LegalModelProvider } from '../providers/provider';
import { crearSinkEnMemoria } from '../observability';
import { esFuenteOficial, puedeEstablecerTextoAutoritativo } from '../retrieval/official-sources';
import type { EscenarioDiseno, EscenarioPolitica, ModoProveedor, ModoRecuperador } from './golden/design-fixed';

export interface ResultadoEscenario {
  id: string;
  kind: string;
  matter: string;
  decision: 'ANSWER' | 'ABSTAIN';
  motivo: string | null;
  rol: 'NONE' | 'FAST' | 'DEEP';
  modeloLlamado: boolean;
  recuperadorLlamado: boolean;
  afirmacionesEntregadas: number;
  /** Todas las citas entregadas existen en la evidencia entregada. */
  citasValidas: boolean;
  citasEmitidasPorElModelo: number;
  citasRechazadas: number;
  estadoFinal: string;
  /** Ticks del reloj inyectado (SIMULADO), no milisegundos de pared. */
  latenciaTicks: number;
  costoUsd: number;
  cumple: boolean;
  fallos: string[];
}

const TEXTO_SINTETICO = 'Texto sintético de prueba (no es derecho).';

function recuperadorDe(modo: ModoRecuperador, s: EscenarioDiseno['setup']): ResultadoRecuperacion {
  if (modo === 'EMPTY') return { chunks: [], calidad: 0, confianza: 0 };
  const chunk: ChunkEvidencia = {
    id: 'syn:c1', hash: '00000000', instrumento: modo === 'ADVERSARIAL' ? 'TEST.INSTRUMENTO' : (s.instrumento ?? 'SINTETICO'), articulo: '1',
    decreto: s.decreto ?? null, texto: TEXTO_SINTETICO, vigente: null,
  };
  return { chunks: [chunk], calidad: modo === 'ADVERSARIAL' ? 1 : (s.calidad ?? 0.8), confianza: 0.8 };
}

function salidaDe(modo: ModoProveedor): unknown {
  switch (modo) {
    case 'VALID': return { decision: 'ANSWER', claims: [{ claim_id: 'a', text: 'Afirmación sintética', citation_ids: ['syn:c1'] }] };
    case 'INVALID_CITATION': return { decision: 'ANSWER', claims: [{ claim_id: 'a', text: 'Afirmación sintética', citation_ids: ['inventado'] }] };
    case 'MIXED': return { decision: 'ANSWER', claims: [{ claim_id: 'a', text: 'Buena', citation_ids: ['syn:c1'] }, { claim_id: 'b', text: 'Mala', citation_ids: ['inventado'] }] };
    case 'BAD_SCHEMA': return { foo: 'bar' };
    case 'MODEL_ABSTAINS': return { decision: 'ABSTAIN', claims: [] };
    default: return { decision: 'ANSWER', claims: [] };
  }
}

export async function ejecutarEscenario(esc: EscenarioDiseno): Promise<ResultadoEscenario> {
  let llamadasModelo = 0;
  let llamadasRecuperador = 0;
  const modo = esc.setup.proveedor ?? 'VALID';
  const proveedor: LegalModelProvider = modo === 'THROWS'
    ? { id: 'falso-lanza', disponible: () => true, generar: async () => { llamadasModelo++; throw new Error('fallo simulado del proveedor'); } }
    : crearProveedorFalso(() => { llamadasModelo++; return salidaDe(modo); });
  let t = 0;
  const sink = crearSinkEnMemoria();
  const r = await ejecutarPipeline(
    { queryId: esc.id, pregunta: esc.question, tier: esc.tier },
    {
      recuperar: async () => { llamadasRecuperador++; return recuperadorDe(esc.setup.recuperador, esc.setup); },
      proveedor, sink, reloj: () => ++t, timeoutMs: 50,
    },
  );
  const ids = new Set(r.traza.events.filter((e) => e.kind === 'retrieved_chunk').map((e) => (e as { chunk_id: string }).chunk_id));
  const citasValidas = r.afirmaciones.every((a) => a.citas.length > 0 && a.citas.every((c) => ids.has(c)));
  const citas = r.traza.events.filter((e) => e.kind === 'citation') as Array<{ support: string }>;
  const x = esc.expected;
  const fallos: string[] = [];
  if (r.decision !== x.decision) fallos.push(`decision ${r.decision} ≠ ${x.decision}`);
  if (x.motivo !== undefined && r.motivo !== x.motivo) fallos.push(`motivo ${r.motivo} ≠ ${x.motivo}`);
  if (x.rol !== undefined && r.rol !== x.rol) fallos.push(`rol ${r.rol} ≠ ${x.rol}`);
  if (x.modeloLlamado !== undefined && (llamadasModelo > 0) !== x.modeloLlamado) fallos.push(`modeloLlamado ${llamadasModelo > 0} ≠ ${x.modeloLlamado}`);
  if (x.recuperadorLlamado !== undefined && (llamadasRecuperador > 0) !== x.recuperadorLlamado) fallos.push(`recuperadorLlamado ${llamadasRecuperador > 0} ≠ ${x.recuperadorLlamado}`);
  if (x.afirmacionesEntregadas !== undefined && r.afirmaciones.length !== x.afirmacionesEntregadas) fallos.push(`entregadas ${r.afirmaciones.length} ≠ ${x.afirmacionesEntregadas}`);
  if (x.estadoFinal !== undefined && r.traza.final_status !== x.estadoFinal) fallos.push(`estado ${r.traza.final_status} ≠ ${x.estadoFinal}`);
  if (!citasValidas) fallos.push('cita entregada fuera de la evidencia');
  return {
    id: esc.id, kind: esc.kind, matter: esc.matter, decision: r.decision, motivo: r.motivo, rol: r.rol,
    modeloLlamado: llamadasModelo > 0, recuperadorLlamado: llamadasRecuperador > 0, afirmacionesEntregadas: r.afirmaciones.length, citasValidas,
    citasEmitidasPorElModelo: citas.length, citasRechazadas: citas.filter((c) => c.support === 'REJECTED').length,
    estadoFinal: r.traza.final_status, latenciaTicks: r.traza.latency_ms, costoUsd: r.costoUsd, cumple: fallos.length === 0, fallos,
  };
}

export interface ResultadoPolitica { id: string; oficial: boolean; motivo: string | null; puedeEstablecerTexto: boolean; cumple: boolean }

export function ejecutarPolitica(p: EscenarioPolitica): ResultadoPolitica {
  const c = esFuenteOficial(p.url);
  const tier = c.oficial ? c.fuente.tier : null;
  const puede = puedeEstablecerTextoAutoritativo(tier, false);
  const motivo = c.oficial ? null : c.motivo;
  const cumple = c.oficial === p.expected.oficial && (p.expected.motivo === undefined || motivo === p.expected.motivo) && puede === p.expected.puedeEstablecerTexto;
  return { id: p.id, oficial: c.oficial, motivo, puedeEstablecerTexto: puede, cumple };
}
