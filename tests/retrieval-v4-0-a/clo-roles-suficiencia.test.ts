import { describe, it, expect } from 'vitest';
import {
  ADVERTENCIA_E2,
  ADVERTENCIA_E5,
  ADVERTENCIA_E6,
  DECISION_CLO,
  intencionHistoricaCPC,
  rolRecuperacion,
} from '@/lib/legal-retrieval/lab/clo-policy';
import { evaluarSuficiencia } from '@/lib/legal-retrieval/lab/sufficiency';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import type { LabRow, RankedCandidate } from '@/lib/legal-retrieval/lab/types';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from './fixtures/corpus-v1';

const SIN_HISTORIA = { historicaCPC: false };
const CON_HISTORIA = { historicaCPC: true };
const q = (id: string) => LAB_QUERIES_V1.find((x) => x.id === id)!;
const fila = (id: string): LabRow => LAB_CORPUS_V1.find((r) => r.id === id)!;

describe('decisión CLO versionada', () => {
  it('registra la regla vinculante y que no se permite confianza jurídica numérica', () => {
    expect(DECISION_CLO.confianza_juridica_numerica_permitida).toBe(false);
    expect(DECISION_CLO.politica_ranking).toBe('HYBRID');
    expect(DECISION_CLO.regla_vinculante).toContain('OPEN');
  });

  it('la advertencia de E2 es la indicada por la CLO, literal', () => {
    expect(ADVERTENCIA_E2).toBe('estado legal no adjudicado; posible derogación por D.77-2006 pendiente de Gaceta 31,091');
  });
});

describe('E2 — Notariado arts. 72, 73, 84, 87, 93 → CONTEXT', () => {
  it('una unidad E2 nunca es PRIMARY aunque esté marcada vigente', () => {
    const asignado = rolRecuperacion(
      { fuente: 'Código del Notariado (FIXTURE sintético)', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, num_articulo: '72' },
      SIN_HISTORIA,
    );
    expect(asignado.rol).toBe('CONTEXT');
    expect(asignado.capa).toBe('E2');
    expect(asignado.advertencia).toBe(ADVERTENCIA_E2);
  });

  it('un artículo notarial fuera de la lista E2 sí puede ser PRIMARY', () => {
    const asignado = rolRecuperacion(fila('lab-not-100'), SIN_HISTORIA);
    expect(asignado.rol).toBe('PRIMARY');
    expect(asignado.capa).toBeNull();
  });

  it('E2 solo nunca produce SUFFICIENT (Q18)', () => {
    const res = recuperarLab(q('Q18'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.map((c) => c.id)).toContain('lab-not-72');
    expect(res.ranking.find((c) => c.id === 'lab-not-72')!.rol_recuperacion).toBe('CONTEXT');
    expect(res.suficiencia.veredicto).not.toBe('SUFFICIENT');
    expect(res.suficiencia.veredicto).toBe('ABSTAIN');
    expect(res.suficiencia.advertencias).toContain(ADVERTENCIA_E2);
  });

  it('conflicto documentado: una unidad E2 marcada es_norma_vigente=false queda excluida por D6b antes del rol', () => {
    const falsa: LabRow = { ...fila('lab-not-72'), id: 'lab-not-72-falso', es_norma_vigente: false, num_articulo: '72' };
    const res = recuperarLab(
      { ...q('Q18'), semantic_hits: [{ id: 'lab-not-72-falso', score: 0.9 }] },
      [...LAB_CORPUS_V1, falsa],
      { k: 5 },
    );
    expect(res.ranking.map((c) => c.id)).not.toContain('lab-not-72-falso');
    expect(res.excluidos.some((e) => e.id === 'lab-not-72-falso' && e.motivo === 'D6B_NO_VIGENTE_HN')).toBe(true);
  });
});

describe('E5 — CPC_TEXTO_BASE_D211-2006 → EXCLUDED normal; CONTEXT sólo con intención histórica explícita', () => {
  it('en consulta normal la unidad E5 es EXCLUDED', () => {
    expect(rolRecuperacion(fila('lab-cpt-10'), SIN_HISTORIA).rol).toBe('EXCLUDED');
  });

  it('con intención histórica explícita pasa a CONTEXT con advertencia E5', () => {
    const asignado = rolRecuperacion(fila('lab-cpt-10'), CON_HISTORIA);
    expect(asignado.rol).toBe('CONTEXT');
    expect(asignado.advertencia).toBe(ADVERTENCIA_E5);
  });

  it('E5 nunca es PRIMARY en ninguna intención', () => {
    expect(rolRecuperacion(fila('lab-cpt-10'), CON_HISTORIA).rol).not.toBe('PRIMARY');
    expect(rolRecuperacion(fila('lab-cpt-10'), SIN_HISTORIA).rol).not.toBe('PRIMARY');
  });

  it('una puntuación semántica altísima no reintroduce E5 en consulta normal (Q20)', () => {
    const res = recuperarLab(q('Q20'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.map((c) => c.id).filter((id) => id.startsWith('lab-cpt'))).toEqual([]);
    expect(res.excluidos.some((e) => e.motivo === 'ROL_EXCLUIDO_CLO')).toBe(true);
  });

  it('Q20: ningún PRIMARY derivado de E5; la suficiencia proviene de otra capa — COMPORTAMIENTO_ACTUAL_CUESTIONABLE', () => {
    const res = recuperarLab(q('Q20'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.every((c) => c.capa_clo !== 'E5')).toBe(true);
    // Las coincidencias léxicas débiles (≥0.2) bastan para un PRIMARY, y la puerta por rol lo cuenta como suficiente.
    expect(res.suficiencia.motivo).toBe('PRIMARY_PRESENTE');
  });

  it('intención histórica: requiere mención del CPC y un marcador explícito', () => {
    expect(intencionHistoricaCPC('texto original histórico del CPC_TEXTO_BASE_D211-2006 sintético')).toBe(true);
    expect(intencionHistoricaCPC('versión original del Código Procesal Civil')).toBe(true);
    expect(intencionHistoricaCPC('texto original de la ley penal')).toBe(false);
    expect(intencionHistoricaCPC('Código Procesal Civil plazo de apelación')).toBe(false);
  });

  it('la intención histórica no se infiere de la similitud: sin marcador textual no hay CONTEXT E5', () => {
    const res = recuperarLab(
      { ...q('Q20'), texto: 'texto base sintético de ejemplo', semantic_hits: [{ id: 'lab-cpt-10', score: 0.99 }] },
      LAB_CORPUS_V1,
      { k: 5 },
    );
    expect(res.ranking.map((c) => c.id)).not.toContain('lab-cpt-10');
  });

  it('consulta histórica explícita: E5 aparece sólo como CONTEXT y no basta para suficiencia (Q21)', () => {
    const res = recuperarLab(q('Q21'), LAB_CORPUS_V1, { k: 5 });
    const e5 = res.ranking.find((c) => c.id === 'lab-cpt-10');
    expect(e5).toBeDefined();
    expect(e5!.rol_recuperacion).toBe('CONTEXT');
    const soloE5 = res.ranking.filter((c) => c.capa_clo === 'E5');
    expect(evaluarSuficiencia(soloE5).veredicto).toBe('ABSTAIN');
    expect(evaluarSuficiencia(soloE5).motivo).toBe('SOLO_CAPAS_ABIERTAS');
  });
});

describe('E6 — D.102-2018 → SECONDARY', () => {
  it('la unidad E6 es SECONDARY con advertencia de estado canónico no medido', () => {
    const asignado = rolRecuperacion(fila('lab-102-5'), SIN_HISTORIA);
    expect(asignado.rol).toBe('SECONDARY');
    expect(asignado.advertencia).toBe(ADVERTENCIA_E6);
  });

  it('E6 solo no es suficiente (Q19 con E2 también)', () => {
    const res = recuperarLab(q('Q19'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.map((c) => c.id)).toEqual(expect.arrayContaining(['lab-102-5', 'lab-not-72']));
    expect(res.suficiencia.veredicto).not.toBe('SUFFICIENT');
  });

  it('PRIMARY verificado con E6: PRIMARY controla y E6 sólo complementa (Q22)', () => {
    const res = recuperarLab(q('Q22'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking[0].id).toBe('lab-cpp-173');
    expect(res.ranking[0].rol_recuperacion).toBe('PRIMARY');
    expect(res.ranking.find((c) => c.id === 'lab-102-5')!.rol_recuperacion).toBe('SECONDARY');
    expect(res.suficiencia.veredicto).toBe('SUFFICIENT');
  });
});

describe('puerta de suficiencia por roles', () => {
  const base = (rol: RankedCandidate['rol_recuperacion'], capa: RankedCandidate['capa_clo']): RankedCandidate =>
    ({
      id: `x-${rol}-${capa}`,
      rol_recuperacion: rol,
      capa_clo: capa,
      advertencia_clo: capa ? 'aviso' : null,
    }) as unknown as RankedCandidate;

  it('sin candidatos → ABSTAIN', () => {
    expect(evaluarSuficiencia([]).veredicto).toBe('ABSTAIN');
  });

  it('PRIMARY presente → SUFFICIENT', () => {
    expect(evaluarSuficiencia([base('PRIMARY', null)]).veredicto).toBe('SUFFICIENT');
  });

  it('sólo SECONDARY de capa abierta → ABSTAIN', () => {
    expect(evaluarSuficiencia([base('SECONDARY', 'E6')]).veredicto).toBe('ABSTAIN');
  });

  it('CONTEXT de capa abierta más CONTEXT ordinario → LIMITED', () => {
    expect(evaluarSuficiencia([base('CONTEXT', 'E2'), base('CONTEXT', null)]).veredicto).toBe('LIMITED');
  });

  it('E2 + E6 solamente → nunca SUFFICIENT', () => {
    const r = evaluarSuficiencia([base('CONTEXT', 'E2'), base('SECONDARY', 'E6')]);
    expect(r.veredicto).not.toBe('SUFFICIENT');
    expect(r.veredicto).toBe('ABSTAIN');
  });
});
