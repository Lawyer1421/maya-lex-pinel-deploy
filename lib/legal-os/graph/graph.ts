/**
 * lib/legal-os/graph/graph.ts
 * Grafo jurídico append-only. Nunca muta nodos ni aristas; las correcciones son aristas nuevas (`supersede`).
 */
import { esFechaIso } from '../../legal-retrieval/norma-version';
import {
  EDGE_KINDS, NODE_KINDS,
  type DatePrecision, type Effective, type GraphEdge, type GraphNode, type LawOnDate, type Provenance, type ValidationResult,
} from './types';

export class GraphValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`grafo: ${errors.join('; ')}`);
  }
}

const PRECISIONES: readonly DatePrecision[] = ['DIA', 'MES', 'AÑO', 'RANGO'];
const ESTADOS = ['HUMAN_VERIFIED', 'CANDIDATE', 'UNVERIFIED'];
/** Aristas que cambian el estado de un artículo. */
const CAMBIA_ESTADO = new Set(['REFORMS', 'REPEALS', 'REPLACES', 'DECLARES_UNCONSTITUTIONAL']);
const ORIGEN_PERMITIDO: Record<string, readonly string[]> = {
  REFORMS: ['REFORM', 'DECREE', 'LAW'],
  REPEALS: ['REPEAL', 'DECREE', 'LAW'],
  INTERPRETS: ['JUDGMENT'],
  DECLARES_UNCONSTITUTIONAL: ['JUDGMENT'],
};

function validarProveniencia(p: Provenance | undefined, errores: string[]): void {
  if (!p) {
    errores.push('proveniencia ausente');
    return;
  }
  if (typeof p.source !== 'string' || p.source.trim() === '') errores.push('proveniencia.source vacía');
  if (![1, 2, 3, 4, 5].includes(p.tier)) errores.push('proveniencia.tier fuera de 1–5');
  if (!ESTADOS.includes(p.verification_state)) errores.push('proveniencia.verification_state inválido');
}

function validarFechas(e: Effective, errores: string[]): void {
  if (e.effective_from !== undefined && !esFechaIso(e.effective_from)) errores.push('effective_from no es una fecha ISO válida');
  if (e.effective_to !== undefined && !esFechaIso(e.effective_to)) errores.push('effective_to no es una fecha ISO válida');
  if (e.effective_from && e.effective_to && esFechaIso(e.effective_from) && esFechaIso(e.effective_to) && e.effective_to < e.effective_from) errores.push('effective_to anterior a effective_from');
  if (e.precision !== undefined && !PRECISIONES.includes(e.precision)) errores.push('precision inválida');
  if (e.precision && !e.effective_from) errores.push('precision sin effective_from');
  if (e.precision === 'RANGO' && !e.effective_to) errores.push('precision RANGO exige effective_to');
}

export function validarNodo(n: GraphNode): ValidationResult {
  const errores: string[] = [];
  if (!n.id || typeof n.id !== 'string') errores.push('id vacío');
  if (!NODE_KINDS.includes(n.kind)) errores.push('kind de nodo inválido');
  validarProveniencia(n.provenance, errores);
  validarFechas(n, errores);
  return { ok: errores.length === 0, errors: errores };
}

/** Ventana [inicio, fin] en la que el evento pudo ocurrir según su precisión. */
function ventana(e: Effective): [string, string] {
  const d = e.effective_from as string;
  const [y, m] = d.split('-');
  if (e.precision === 'MES') {
    const fin = new Date(Date.UTC(Number(y), Number(m), 0)).toISOString().slice(0, 10);
    return [`${y}-${m}-01`, fin];
  }
  if (e.precision === 'AÑO') return [`${y}-01-01`, `${y}-12-31`];
  if (e.precision === 'RANGO') return [d, e.effective_to ?? d];
  return [d, d];
}

export class LegalGraph {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();
  private readonly reemplazadaPor = new Map<string, string>();

  addNode(n: GraphNode): void {
    const v = validarNodo(n);
    if (this.nodes.has(n.id)) v.errors.push(`nodo duplicado: ${n.id}`);
    if (v.errors.length) throw new GraphValidationError(v.errors);
    this.nodes.set(n.id, Object.freeze({ ...n, provenance: Object.freeze({ ...n.provenance }) }) as GraphNode);
  }

  /** Valida una arista contra el grafo actual (sin insertarla). */
  validarArista(e: GraphEdge): ValidationResult {
    const errores: string[] = [];
    if (!e.id) errores.push('id de arista vacío');
    if (this.edges.has(e.id)) errores.push(`arista duplicada: ${e.id}`);
    if (!EDGE_KINDS.includes(e.kind)) errores.push('kind de arista inválido');
    if (e.from === e.to) errores.push('arista a sí misma');
    const origen = this.nodes.get(e.from);
    const destino = this.nodes.get(e.to);
    if (!origen) errores.push(`origen inexistente: ${e.from}`);
    if (!destino) errores.push(`destino inexistente: ${e.to}`);
    if (origen && ORIGEN_PERMITIDO[e.kind] && !ORIGEN_PERMITIDO[e.kind].includes(origen.kind)) errores.push(`${e.kind} no puede partir de un nodo ${origen.kind}`);
    validarProveniencia(e.provenance, errores);
    validarFechas(e, errores);
    if (e.supersedes !== undefined) {
      const vieja = this.edges.get(e.supersedes);
      if (!vieja) errores.push(`supersedes apunta a una arista inexistente: ${e.supersedes}`);
      else if (this.reemplazadaPor.has(e.supersedes)) errores.push(`la arista ${e.supersedes} ya fue reemplazada`);
      else if (vieja.kind !== e.kind) errores.push('una corrección debe ser del mismo kind');
    }
    if (e.kind === 'REPLACES' && origen && destino && errores.length === 0 && this.crearaCiclo(e)) errores.push('REPLACES crearía un ciclo');
    return { ok: errores.length === 0, errors: errores };
  }

  addEdge(e: GraphEdge): void {
    const v = this.validarArista(e);
    if (!v.ok) throw new GraphValidationError(v.errors);
    this.edges.set(e.id, Object.freeze({ ...e, provenance: Object.freeze({ ...e.provenance }) }) as GraphEdge);
    if (e.supersedes) this.reemplazadaPor.set(e.supersedes, e.id);
  }

  /** Corrección: agrega `nueva` (con `supersedes = viejaId`); la arista anterior queda intacta. */
  supersede(viejaId: string, nueva: Omit<GraphEdge, 'supersedes'>): void {
    this.addEdge({ ...nueva, supersedes: viejaId });
  }

  getNode(id: string): GraphNode | undefined { return this.nodes.get(id); }
  getEdge(id: string): GraphEdge | undefined { return this.edges.get(id); }
  supersededBy(edgeId: string): string | null { return this.reemplazadaPor.get(edgeId) ?? null; }
  allEdges(): GraphEdge[] { return [...this.edges.values()]; }

  /** Aristas vigentes (no reemplazadas por una corrección). */
  activeEdges(): GraphEdge[] { return this.allEdges().filter((e) => !this.reemplazadaPor.has(e.id)); }

  private crearaCiclo(nueva: GraphEdge): boolean {
    // REPLACES: from reemplaza a to. Ciclo si desde `to` se llega a `from` siguiendo "reemplaza a".
    const sig = new Map<string, string[]>();
    for (const e of this.activeEdges()) if (e.kind === 'REPLACES') sig.set(e.from, [...(sig.get(e.from) ?? []), e.to]);
    sig.set(nueva.from, [...(sig.get(nueva.from) ?? []), nueva.to]);
    const visto = new Set<string>();
    const pila = [nueva.to];
    while (pila.length) {
      const x = pila.pop() as string;
      if (x === nueva.from) return true;
      if (visto.has(x)) continue;
      visto.add(x);
      pila.push(...(sig.get(x) ?? []));
    }
    return false;
  }

  /** Ciclos presentes en las aristas REPLACES vigentes (vacío = sano). */
  detectReplacesCycles(): string[][] {
    const sig = new Map<string, string[]>();
    for (const e of this.activeEdges()) if (e.kind === 'REPLACES') sig.set(e.from, [...(sig.get(e.from) ?? []), e.to]);
    const ciclos: string[][] = [];
    const estado = new Map<string, 1 | 2>();
    const camino: string[] = [];
    const dfs = (u: string): void => {
      estado.set(u, 1);
      camino.push(u);
      for (const v of sig.get(u) ?? []) {
        if (estado.get(v) === 1) ciclos.push([...camino.slice(camino.indexOf(v)), v]);
        else if (!estado.has(v)) dfs(v);
      }
      camino.pop();
      estado.set(u, 2);
    };
    for (const u of sig.keys()) if (!estado.has(u)) dfs(u);
    return ciclos;
  }

  /** ¿Qué disposición regía el artículo en `fecha`? Si faltan eventos o fechas devuelve UNKNOWN: nunca adivina. */
  lawOnDate(articleId: string, fecha: string): LawOnDate {
    const unknown = (reason: string, extra: Partial<LawOnDate> = {}): LawOnDate => ({ status: 'UNKNOWN', providedBy: null, reason, unverified: true, edgesUsed: [], ...extra });
    if (!esFechaIso(fecha)) return unknown('FECHA_INVALIDA');
    const art = this.nodes.get(articleId);
    if (!art) return unknown('ARTICULO_INEXISTENTE');
    if (art.kind !== 'ARTICLE') return unknown('NO_ES_ARTICULO');
    if (!art.effective_from) return unknown('INICIO_DEL_ARTICULO_DESCONOCIDO');
    const [aIni, aFin] = ventana(art);
    const artNoVerificado = art.provenance.verification_state !== 'HUMAN_VERIFIED';
    if (fecha < aIni) return { status: 'NOT_YET_ENACTED', providedBy: null, unverified: artNoVerificado, edgesUsed: [] };
    if (fecha <= aFin && aIni !== aFin) return unknown('FECHA_DENTRO_DE_LA_IMPRECISION_DEL_ARTICULO');

    const eventos = this.activeEdges().filter((e) => e.to === articleId && CAMBIA_ESTADO.has(e.kind));
    const sinFecha = eventos.filter((e) => !e.effective_from);
    if (sinFecha.length) return unknown('EVENTO_SIN_FECHA', { edgesUsed: sinFecha.map((e) => e.id) });

    const aplicados: GraphEdge[] = [];
    for (const e of eventos) {
      const [ini, fin] = ventana(e);
      if (fecha < ini) continue; // aún no ocurre
      if (fecha <= fin && ini !== fin) return unknown('FECHA_DENTRO_DE_LA_IMPRECISION_DE_UN_EVENTO', { edgesUsed: [e.id] });
      if (e.effective_to && e.precision !== 'RANGO' && fecha > e.effective_to) continue; // efecto acotado ya terminado
      aplicados.push(e);
    }
    aplicados.sort((a, b) => (a.effective_from as string).localeCompare(b.effective_from as string));
    const usadas = aplicados.map((e) => e.id);
    const ultimo = aplicados[aplicados.length - 1];
    if (aplicados.length >= 2 && aplicados[aplicados.length - 2].effective_from === ultimo.effective_from) return unknown('EVENTOS_EN_CONFLICTO_MISMA_FECHA', { edgesUsed: usadas });

    const noVerificado = [art.provenance, ...aplicados.map((e) => e.provenance)].some((p) => p.verification_state !== 'HUMAN_VERIFIED');
    if (!ultimo) return { status: 'IN_FORCE', providedBy: art.id, unverified: noVerificado, edgesUsed: [] };
    if (ultimo.kind === 'REPEALS') return { status: 'REPEALED', providedBy: ultimo.from, unverified: noVerificado, edgesUsed: usadas };
    if (ultimo.kind === 'DECLARES_UNCONSTITUTIONAL') return { status: 'UNCONSTITUTIONAL', providedBy: ultimo.from, unverified: noVerificado, edgesUsed: usadas };
    return { status: 'IN_FORCE', providedBy: ultimo.from, unverified: noVerificado, edgesUsed: usadas };
  }

  /** Cambios que tocan `id` entre `desde` y `hasta` (inclusive). Los eventos sin fecha se listan aparte. */
  whatChanged(id: string, desde: string, hasta: string): { changes: GraphEdge[]; undated: GraphEdge[]; unverified: boolean } {
    const tocan = this.activeEdges().filter((e) => CAMBIA_ESTADO.has(e.kind) && (e.to === id || e.from === id));
    const changes = tocan.filter((e) => e.effective_from && e.effective_from >= desde && e.effective_from <= hasta)
      .sort((a, b) => (a.effective_from as string).localeCompare(b.effective_from as string));
    const undated = tocan.filter((e) => !e.effective_from);
    return { changes, undated, unverified: [...changes, ...undated].some((e) => e.provenance.verification_state !== 'HUMAN_VERIFIED') };
  }

  /** Cadena de sustitución: quién reemplazó a `id`, y a quién a su vez. */
  replacedBy(id: string): { chain: string[]; final: string | null; unverified: boolean } {
    const chain: string[] = [];
    const usadas: GraphEdge[] = [];
    const vistos = new Set<string>([id]);
    let actual = id;
    for (;;) {
      const e = this.activeEdges().find((x) => x.kind === 'REPLACES' && x.to === actual);
      if (!e || vistos.has(e.from)) break;
      vistos.add(e.from);
      chain.push(e.from);
      usadas.push(e);
      actual = e.from;
    }
    return { chain, final: chain.length ? chain[chain.length - 1] : null, unverified: usadas.some((e) => e.provenance.verification_state !== 'HUMAN_VERIFIED') };
  }

  /** Sentencias que interpretan el artículo. Que interpreten no implica que sean vinculantes: eso no se infiere aquí. */
  judgmentsInterpreting(articleId: string): Array<{ judgment: string; edge: string; unverified: boolean }> {
    return this.activeEdges().filter((e) => e.kind === 'INTERPRETS' && e.to === articleId)
      .map((e) => ({ judgment: e.from, edge: e.id, unverified: e.provenance.verification_state !== 'HUMAN_VERIFIED' }));
  }
}
