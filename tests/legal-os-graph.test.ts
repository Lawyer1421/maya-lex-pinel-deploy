import { describe, expect, it } from 'vitest';
import { GraphValidationError, LegalGraph } from '@/lib/legal-os/graph';
import type { GraphEdge, GraphNode, Provenance } from '@/lib/legal-os/graph';

// Todo sintético: ningún contenido jurídico real.
const HV: Provenance = { source: 'TEST', tier: 1, verification_state: 'HUMAN_VERIFIED' };
const CAND: Provenance = { source: 'TEST', tier: 3, verification_state: 'CANDIDATE' };

const nodo = (id: string, kind: GraphNode['kind'], extra: Partial<GraphNode> = {}): GraphNode => ({ id, kind, provenance: HV, ...extra });
const arista = (id: string, kind: GraphEdge['kind'], from: string, to: string, extra: Partial<GraphEdge> = {}): GraphEdge => ({ id, kind, from, to, provenance: HV, ...extra });

function base(): LegalGraph {
  const g = new LegalGraph();
  g.addNode(nodo('TEST.LAW.A', 'LAW'));
  g.addNode(nodo('TEST.LAW.A.ART1', 'ARTICLE', { effective_from: '2000-01-01', precision: 'DIA' }));
  g.addNode(nodo('TEST.REFORM.R1', 'REFORM'));
  g.addNode(nodo('TEST.REPEAL.P1', 'REPEAL'));
  g.addNode(nodo('TEST.JUDGMENT.S1', 'JUDGMENT'));
  g.addNode(nodo('TEST.JUDGMENT.S2', 'JUDGMENT'));
  return g;
}

describe('validación', () => {
  it('rechaza nodos sin proveniencia, con tier inválido o fechas imposibles', () => {
    const g = new LegalGraph();
    expect(() => g.addNode({ id: 'x', kind: 'LAW' } as GraphNode)).toThrow(GraphValidationError);
    expect(() => g.addNode(nodo('x', 'LAW', { provenance: { source: ' ', tier: 1, verification_state: 'HUMAN_VERIFIED' } }))).toThrow(/source vacía/);
    expect(() => g.addNode(nodo('x', 'LAW', { provenance: { source: 'T', tier: 9 as never, verification_state: 'HUMAN_VERIFIED' } }))).toThrow(/tier/);
    expect(() => g.addNode(nodo('x', 'LAW', { effective_from: '2000-02-30' }))).toThrow(/ISO/);
    expect(() => g.addNode(nodo('x', 'LAW', { effective_from: '2000-05-01', effective_to: '2000-04-01' }))).toThrow(/anterior/);
    expect(() => g.addNode(nodo('x', 'LAW', { effective_from: '2000-05-01', precision: 'RANGO' }))).toThrow(/RANGO/);
    expect(() => g.addNode(nodo('x', 'LAW', { precision: 'MES' }))).toThrow(/sin effective_from/);
  });
  it('rechaza aristas con proveniencia ausente, nodos inexistentes, autorreferencia, duplicadas y orígenes de tipo erróneo', () => {
    const g = base();
    const v = (e: GraphEdge) => g.validarArista(e);
    expect(v({ id: 'e', kind: 'REFORMS', from: 'TEST.REFORM.R1', to: 'TEST.LAW.A.ART1' } as GraphEdge).errors.join()).toMatch(/proveniencia ausente/);
    expect(v(arista('e', 'REFORMS', 'NOPE', 'TEST.LAW.A.ART1')).errors.join()).toMatch(/origen inexistente/);
    expect(v(arista('e', 'REFORMS', 'TEST.REFORM.R1', 'TEST.REFORM.R1')).errors.join()).toMatch(/sí misma/);
    expect(v(arista('e', 'INTERPRETS', 'TEST.LAW.A', 'TEST.LAW.A.ART1')).errors.join()).toMatch(/no puede partir/);
    expect(v(arista('e', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1', { effective_from: '2001-13-01' })).errors.join()).toMatch(/ISO/);
    g.addEdge(arista('e1', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1', { effective_from: '2005-01-01' }));
    expect(v(arista('e1', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1')).errors.join()).toMatch(/duplicada/);
    expect(v(arista('e2', 'FOO' as never, 'TEST.REFORM.R1', 'TEST.LAW.A.ART1')).errors.join()).toMatch(/kind de arista/);
  });
});

describe('append-only', () => {
  it('una corrección es una arista nueva; la anterior queda intacta y se marca reemplazada', () => {
    const g = base();
    g.addEdge(arista('e1', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1', { effective_from: '2005-01-01', provenance: CAND }));
    const antes = JSON.stringify(g.getEdge('e1'));
    g.supersede('e1', arista('e1b', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1', { effective_from: '2005-03-01' }));
    expect(JSON.stringify(g.getEdge('e1'))).toBe(antes);
    expect(g.supersededBy('e1')).toBe('e1b');
    expect(g.getEdge('e1b')?.supersedes).toBe('e1');
    expect(g.activeEdges().map((e) => e.id)).toEqual(['e1b']);
    expect(g.allEdges()).toHaveLength(2);
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2005-02-01').providedBy).toBe('TEST.LAW.A.ART1'); // ya vale la fecha corregida
    expect(() => g.supersede('e1', arista('e1c', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1', { effective_from: '2005-04-01' }))).toThrow(/ya fue reemplazada/);
  });
  it('los objetos almacenados están congelados', () => {
    const g = base();
    expect(() => { (g.getNode('TEST.LAW.A') as { id: string }).id = 'otro'; }).toThrow();
  });
});

describe('lawOnDate', () => {
  it('antes de la promulgación: NOT_YET_ENACTED; sin eventos: vigente por el propio artículo', () => {
    const g = base();
    expect(g.lawOnDate('TEST.LAW.A.ART1', '1999-12-31').status).toBe('NOT_YET_ENACTED');
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2010-01-01')).toMatchObject({ status: 'IN_FORCE', providedBy: 'TEST.LAW.A.ART1', unverified: false });
  });
  it('reforma y derogación fechadas', () => {
    const g = base();
    g.addEdge(arista('e1', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1', { effective_from: '2005-01-01' }));
    g.addEdge(arista('e2', 'REPEALS', 'TEST.REPEAL.P1', 'TEST.LAW.A.ART1', { effective_from: '2015-06-15' }));
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2004-12-31')).toMatchObject({ status: 'IN_FORCE', providedBy: 'TEST.LAW.A.ART1' });
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2005-01-01')).toMatchObject({ status: 'IN_FORCE', providedBy: 'TEST.REFORM.R1', edgesUsed: ['e1'] });
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2015-06-15')).toMatchObject({ status: 'REPEALED', providedBy: 'TEST.REPEAL.P1', edgesUsed: ['e1', 'e2'] });
  });
  it('inconstitucionalidad por sentencia', () => {
    const g = base();
    g.addEdge(arista('e1', 'DECLARES_UNCONSTITUTIONAL', 'TEST.JUDGMENT.S1', 'TEST.LAW.A.ART1', { effective_from: '2012-01-01' }));
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2012-01-02')).toMatchObject({ status: 'UNCONSTITUTIONAL', providedBy: 'TEST.JUDGMENT.S1' });
  });
  it('NO adivina: evento sin fecha → UNKNOWN', () => {
    const g = base();
    g.addEdge(arista('e1', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1'));
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2010-01-01')).toMatchObject({ status: 'UNKNOWN', reason: 'EVENTO_SIN_FECHA', providedBy: null, edgesUsed: ['e1'] });
  });
  it('NO adivina: artículo sin fecha de inicio, inexistente, fecha inválida o nodo que no es artículo', () => {
    const g = base();
    g.addNode(nodo('TEST.LAW.A.ART2', 'ARTICLE'));
    expect(g.lawOnDate('TEST.LAW.A.ART2', '2010-01-01').reason).toBe('INICIO_DEL_ARTICULO_DESCONOCIDO');
    expect(g.lawOnDate('NOPE', '2010-01-01').reason).toBe('ARTICULO_INEXISTENTE');
    expect(g.lawOnDate('TEST.LAW.A.ART1', 'ayer').reason).toBe('FECHA_INVALIDA');
    expect(g.lawOnDate('TEST.LAW.A', '2010-01-01').reason).toBe('NO_ES_ARTICULO');
  });
  it('precisión: una fecha dentro del mes/año/rango impreciso del evento es UNKNOWN; fuera de él, determinada', () => {
    const g = base();
    g.addEdge(arista('e1', 'REPEALS', 'TEST.REPEAL.P1', 'TEST.LAW.A.ART1', { effective_from: '2010-03-01', precision: 'MES' }));
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2010-02-28')).toMatchObject({ status: 'IN_FORCE' });
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2010-03-15')).toMatchObject({ status: 'UNKNOWN', reason: 'FECHA_DENTRO_DE_LA_IMPRECISION_DE_UN_EVENTO' });
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2010-04-01')).toMatchObject({ status: 'REPEALED' });

    const h = base();
    h.addEdge(arista('e1', 'REPEALS', 'TEST.REPEAL.P1', 'TEST.LAW.A.ART1', { effective_from: '2010-03-01', effective_to: '2010-09-30', precision: 'RANGO' }));
    expect(h.lawOnDate('TEST.LAW.A.ART1', '2010-06-01').status).toBe('UNKNOWN');
    expect(h.lawOnDate('TEST.LAW.A.ART1', '2010-10-01').status).toBe('REPEALED');

    const a = base();
    a.addEdge(arista('e1', 'REPEALS', 'TEST.REPEAL.P1', 'TEST.LAW.A.ART1', { effective_from: '2010-01-01', precision: 'AÑO' }));
    expect(a.lawOnDate('TEST.LAW.A.ART1', '2010-12-31').status).toBe('UNKNOWN');
    expect(a.lawOnDate('TEST.LAW.A.ART1', '2011-01-01').status).toBe('REPEALED');
  });
  it('dos eventos distintos el mismo día → UNKNOWN por conflicto', () => {
    const g = base();
    g.addEdge(arista('e1', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1', { effective_from: '2005-01-01' }));
    g.addEdge(arista('e2', 'REPEALS', 'TEST.REPEAL.P1', 'TEST.LAW.A.ART1', { effective_from: '2005-01-01' }));
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2006-01-01')).toMatchObject({ status: 'UNKNOWN', reason: 'EVENTOS_EN_CONFLICTO_MISMA_FECHA' });
  });
  it('unverified: una arista no verificada por humano marca el resultado; no lo convierte en hecho', () => {
    const g = base();
    g.addEdge(arista('e1', 'REPEALS', 'TEST.REPEAL.P1', 'TEST.LAW.A.ART1', { effective_from: '2005-01-01', provenance: CAND }));
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2004-01-01').unverified).toBe(false); // la arista aún no cuenta
    expect(g.lawOnDate('TEST.LAW.A.ART1', '2006-01-01')).toMatchObject({ status: 'REPEALED', unverified: true });
    const n = new LegalGraph();
    n.addNode(nodo('A1', 'ARTICLE', { effective_from: '2000-01-01', provenance: { source: 'T', tier: 4, verification_state: 'UNVERIFIED' } }));
    expect(n.lawOnDate('A1', '2001-01-01').unverified).toBe(true);
  });
});

describe('whatChanged / replacedBy / judgmentsInterpreting', () => {
  it('whatChanged lista por rango, ordenado, y separa los eventos sin fecha', () => {
    const g = base();
    g.addEdge(arista('e2', 'REPEALS', 'TEST.REPEAL.P1', 'TEST.LAW.A.ART1', { effective_from: '2015-06-15' }));
    g.addEdge(arista('e1', 'REFORMS', 'TEST.REFORM.R1', 'TEST.LAW.A.ART1', { effective_from: '2005-01-01', provenance: CAND }));
    g.addNode(nodo('TEST.REFORM.R2', 'REFORM'));
    g.addEdge(arista('e3', 'REFORMS', 'TEST.REFORM.R2', 'TEST.LAW.A.ART1'));
    const r = g.whatChanged('TEST.LAW.A.ART1', '2000-01-01', '2010-01-01');
    expect(r.changes.map((e) => e.id)).toEqual(['e1']);
    expect(r.undated.map((e) => e.id)).toEqual(['e3']);
    expect(r.unverified).toBe(true);
    expect(g.whatChanged('TEST.LAW.A.ART1', '2000-01-01', '2020-01-01').changes.map((e) => e.id)).toEqual(['e1', 'e2']);
  });
  it('replacedBy sigue la cadena y marca no verificado', () => {
    const g = new LegalGraph();
    for (const id of ['L1', 'L2', 'L3']) g.addNode(nodo(id, 'LAW'));
    g.addEdge(arista('r1', 'REPLACES', 'L2', 'L1', { effective_from: '2001-01-01' }));
    g.addEdge(arista('r2', 'REPLACES', 'L3', 'L2', { effective_from: '2010-01-01', provenance: CAND }));
    expect(g.replacedBy('L1')).toEqual({ chain: ['L2', 'L3'], final: 'L3', unverified: true });
    expect(g.replacedBy('L3')).toEqual({ chain: [], final: null, unverified: false });
  });
  it('detecta y evita ciclos de REPLACES', () => {
    const g = new LegalGraph();
    for (const id of ['L1', 'L2', 'L3']) g.addNode(nodo(id, 'LAW'));
    g.addEdge(arista('r1', 'REPLACES', 'L2', 'L1'));
    g.addEdge(arista('r2', 'REPLACES', 'L3', 'L2'));
    expect(g.detectReplacesCycles()).toEqual([]);
    expect(() => g.addEdge(arista('r3', 'REPLACES', 'L1', 'L3'))).toThrow(/ciclo/);
    expect(g.detectReplacesCycles()).toEqual([]);
  });
  it('judgmentsInterpreting devuelve sentencias sin inferir carácter vinculante', () => {
    const g = base();
    g.addEdge(arista('i1', 'INTERPRETS', 'TEST.JUDGMENT.S1', 'TEST.LAW.A.ART1'));
    g.addEdge(arista('i2', 'INTERPRETS', 'TEST.JUDGMENT.S2', 'TEST.LAW.A.ART1', { provenance: CAND }));
    g.addEdge(arista('c1', 'CITES', 'TEST.JUDGMENT.S2', 'TEST.LAW.A'));
    const r = g.judgmentsInterpreting('TEST.LAW.A.ART1');
    expect(r).toEqual([
      { judgment: 'TEST.JUDGMENT.S1', edge: 'i1', unverified: false },
      { judgment: 'TEST.JUDGMENT.S2', edge: 'i2', unverified: true },
    ]);
    expect(Object.keys(r[0])).not.toContain('binding');
  });
});

describe('aislamiento', () => {
  it('el grafo no importa el gateway', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['graph.ts', 'types.ts', 'index.ts']) expect(readFileSync(`lib/legal-os/graph/${f}`, 'utf8')).not.toMatch(/ai-gateway/);
  });
});
