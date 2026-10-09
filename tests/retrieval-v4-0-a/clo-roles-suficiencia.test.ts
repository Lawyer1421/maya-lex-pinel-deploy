import { describe, it, expect } from 'vitest';
import {
  ADVERTENCIA_E2,
  ADVERTENCIA_E5,
  ADVERTENCIA_E6,
  DECISION_CLO,
  E2_ABIERTA,
  excepcionE2AD6b,
  intencionHistoricaCPC,
  rolRecuperacion,
} from '@/lib/legal-retrieval/lab/clo-policy';
import { evaluarSuficiencia } from '@/lib/legal-retrieval/lab/sufficiency';
import { puntuarCandidatos } from '@/lib/legal-retrieval/lab/ranking';
import { evaluarRelevancia } from '@/lib/legal-retrieval/lab/relevance';
import { motivoExclusionDura } from '@/lib/legal-retrieval/lab/hard-exclusions';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { candidatoDesdeFila } from '@/lib/legal-retrieval/lab/hybrid-merge';
import type { LabRow, RankedCandidate } from '@/lib/legal-retrieval/lab/types';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from './fixtures/corpus-v1';

const SIN_HISTORIA = { historicaCPC: false };
const CON_HISTORIA = { historicaCPC: true };
const q = (id: string) => LAB_QUERIES_V1.find((x) => x.id === id)!;
const fila = (id: string): LabRow => LAB_CORPUS_V1.find((r) => r.id === id)!;

function notariado(num: string, extra: Partial<LabRow> = {}): LabRow {
  return {
    id: `not-${num}-${extra.es_norma_vigente ?? 'x'}`,
    contenido: `ARTICULO ${num}.- Texto de prueba sintético.`,
    num_articulo: num,
    fuente: 'Código del Notariado (FIXTURE sintético)',
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: null,
    materia: '03_NOTARIAL',
    ...extra,
  };
}

describe('decisión CLO versionada (V4.0-A.2)', () => {
  it('RETRIEVAL_ROLE, RELEVANCE y SUFFICIENCY están separados; PRIMARY solo no crea suficiencia', () => {
    expect(DECISION_CLO.primary_solo_crea_suficiencia).toBe(false);
    expect(DECISION_CLO.umbral_numerico_de_relevancia_adjudicado).toBe(false);
    expect(DECISION_CLO.regla_vinculante).toContain('RETRIEVAL_ROLE ≠ RELEVANCE ≠ SUFFICIENCY');
  });

  it('la advertencia E2 es la aprobada por CLO, literal, sin referencia 31,091', () => {
    expect(ADVERTENCIA_E2).toBe(
      'Estado legal no adjudicado; posible derogación por el Decreto 77-2006, pendiente de verificación con el texto oficial de La Gaceta.',
    );
    expect(ADVERTENCIA_E2).not.toContain('31,091');
  });

  it('la advertencia E6 indica que el estado canónico y la completitud no están medidos', () => {
    expect(ADVERTENCIA_E6).toContain('no resueltos');
    expect(ADVERTENCIA_E6).toContain('no medidos');
  });
});

describe('E2 — excepción D6b cerrada por identidad de instrumento y artículo', () => {
  it('Código del Notariado arts. 72, 73, 84, 87, 93: la excepción aplica, con rol CONTEXT', () => {
    for (const num of ['72', '73', '84', '87', '93']) {
      const f = notariado(num, { es_norma_vigente: false });
      expect(excepcionE2AD6b(f)).toBe(true);
      expect(motivoExclusionDura(f, 'lexical')).toBeNull();
      expect(rolRecuperacion(f, SIN_HISTORIA).rol).toBe('CONTEXT');
    }
  });

  it('el mismo número de artículo en otro instrumento NO recibe la excepción', () => {
    const civil: LabRow = { ...notariado('72', { es_norma_vigente: false }), fuente: 'Código Civil (FIXTURE sintético)', materia: '02_CIVIL' };
    expect(excepcionE2AD6b(civil)).toBe(false);
    expect(motivoExclusionDura(civil, 'lexical')).toBe('D6B_NO_VIGENTE_HN');
  });

  it('el Reglamento del Código del Notariado con art. 72 NO recibe la excepción (identidad distinta)', () => {
    const reglamento: LabRow = { ...notariado('72', { es_norma_vigente: false }), fuente: 'Reglamento del Código del Notariado (FIXTURE sintético)' };
    expect(excepcionE2AD6b(reglamento)).toBe(false);
    expect(motivoExclusionDura(reglamento, 'lexical')).toBe('D6B_NO_VIGENTE_HN');
  });

  it('la excepción no se extiende a los artículos 11 y 27 (gobernados por E1)', () => {
    for (const num of ['11', '27']) {
      const f = notariado(num, { es_norma_vigente: false });
      expect(excepcionE2AD6b(f)).toBe(false);
      expect(motivoExclusionDura(f, 'lexical')).toBe('D6B_NO_VIGENTE_HN');
    }
  });

  it('un artículo notarial distinto de la lista E2 no recibe la excepción', () => {
    const f = notariado('100', { es_norma_vigente: false });
    expect(motivoExclusionDura(f, 'semantic')).toBe('D6B_NO_VIGENTE_HN');
  });

  it('la excepción caduca al cerrar E2', () => {
    expect(E2_ABIERTA).toBe(true);
  });

  it('E2 nunca es PRIMARY ni SECONDARY, aunque esté marcada vigente', () => {
    const asignado = rolRecuperacion(notariado('72', { es_norma_vigente: true }), SIN_HISTORIA);
    expect(asignado.rol).toBe('CONTEXT');
    expect(asignado.advertencia).toBe(ADVERTENCIA_E2);
  });

  it('Q18: la unidad E2 aparece como CONTEXT con advertencia y la respuesta no es SUFFICIENT', () => {
    const res = recuperarLab(q('Q18'), LAB_CORPUS_V1, { k: 5 });
    const e2 = res.ranking.find((c) => c.id === 'lab-not-72');
    expect(e2?.rol_recuperacion).toBe('CONTEXT');
    expect(res.suficiencia.veredicto).toBe('ABSTAIN');
    expect(res.suficiencia.advertencias).toContain(ADVERTENCIA_E2);
  });

  it('una unidad E2 marcada es_norma_vigente=false sobrevive a la consulta como CONTEXT', () => {
    const falsa: LabRow = { ...fila('lab-not-72'), id: 'lab-not-72-falso', es_norma_vigente: false };
    const res = recuperarLab(
      { ...q('Q18'), semantic_hits: [{ id: 'lab-not-72-falso', score: 0.9 }] },
      [...LAB_CORPUS_V1, falsa],
      { k: 5 },
    );
    const e2 = res.ranking.find((c) => c.id === 'lab-not-72-falso');
    expect(e2?.rol_recuperacion).toBe('CONTEXT');
    expect(res.excluidos.some((e) => e.id === 'lab-not-72-falso')).toBe(false);
  });
});

describe('E5 — CPC_TEXTO_BASE_D211-2006', () => {
  it('consulta normal: EXCLUDED', () => {
    expect(rolRecuperacion(fila('lab-cpt-10'), SIN_HISTORIA).rol).toBe('EXCLUDED');
  });

  it('consulta histórica explícita: CONTEXT con advertencia E5', () => {
    const asignado = rolRecuperacion(fila('lab-cpt-10'), CON_HISTORIA);
    expect(asignado.rol).toBe('CONTEXT');
    expect(asignado.advertencia).toBe(ADVERTENCIA_E5);
  });

  it('nunca PRIMARY en ninguna intención', () => {
    expect(rolRecuperacion(fila('lab-cpt-10'), CON_HISTORIA).rol).not.toBe('PRIMARY');
    expect(rolRecuperacion(fila('lab-cpt-10'), SIN_HISTORIA).rol).not.toBe('PRIMARY');
  });

  it('una puntuación semántica altísima no reintroduce E5 en consulta normal (Q20)', () => {
    const res = recuperarLab(q('Q20'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.map((c) => c.id).filter((id) => id.startsWith('lab-cpt'))).toEqual([]);
    expect(res.excluidos.some((e) => e.motivo === 'ROL_EXCLUIDO_CLO')).toBe(true);
  });

  it('la intención histórica requiere mención del CPC y un marcador explícito', () => {
    expect(intencionHistoricaCPC('texto original histórico del CPC_TEXTO_BASE_D211-2006 sintético')).toBe(true);
    expect(intencionHistoricaCPC('versión original del Código Procesal Civil')).toBe(true);
    expect(intencionHistoricaCPC('texto original de la ley penal')).toBe(false);
    expect(intencionHistoricaCPC('Código Procesal Civil plazo de apelación')).toBe(false);
  });

  it('sin marcador textual no hay CONTEXT E5 aunque la similitud sea muy alta', () => {
    const res = recuperarLab(
      { ...q('Q20'), texto: 'texto base sintético de ejemplo', semantic_hits: [{ id: 'lab-cpt-10', score: 0.99 }] },
      LAB_CORPUS_V1,
      { k: 5 },
    );
    expect(res.ranking.map((c) => c.id)).not.toContain('lab-cpt-10');
  });

  it('consulta histórica (Q21): E5 solo como CONTEXT y nunca suficiente por sí sola', () => {
    const res = recuperarLab(q('Q21'), LAB_CORPUS_V1, { k: 5 });
    const e5 = res.ranking.find((c) => c.id === 'lab-cpt-10');
    expect(e5?.rol_recuperacion).toBe('CONTEXT');
    const soloE5 = res.ranking.filter((c) => c.capa_clo === 'E5');
    expect(evaluarSuficiencia(soloE5).veredicto).toBe('ABSTAIN');
    expect(evaluarSuficiencia(soloE5).motivo).toBe('SOLO_CAPAS_ABIERTAS');
  });
});

describe('E6 — D.102-2018 → SECONDARY', () => {
  it('la unidad es SECONDARY con advertencia de estado canónico no medido', () => {
    const asignado = rolRecuperacion(fila('lab-102-5'), SIN_HISTORIA);
    expect(asignado.rol).toBe('SECONDARY');
    expect(asignado.advertencia).toBe(ADVERTENCIA_E6);
  });

  it('E6 y E2 solamente no producen SUFFICIENT, ni con soporte validado (Q19)', () => {
    const res = recuperarLab(
      { ...q('Q19'), soporte_validado_ids: ['lab-102-5', 'lab-not-72'] },
      LAB_CORPUS_V1,
      { k: 5 },
    );
    expect(res.suficiencia.veredicto).not.toBe('SUFFICIENT');
    expect(res.suficiencia.veredicto).toBe('ABSTAIN');
  });

  it('PRIMARY con E6 acompañante (Q22): el rol de E6 no le da ventaja de orden, y no es la fuente de suficiencia', () => {
    const res = recuperarLab({ ...q('Q22'), soporte_validado_ids: ['lab-102-5'] }, LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.find((c) => c.id === 'lab-cpp-173')?.rol_recuperacion).toBe('PRIMARY');
    expect(res.rawRanking.find((c) => c.id === 'lab-102-5')?.rol_recuperacion).toBe('SECONDARY');
    expect(res.diagnosticos.find((d) => d.id === 'lab-102-5')?.razon).toBe('NOT_SELECTED_USEFULNESS');
    expect(res.suficiencia.veredicto).not.toBe('SUFFICIENT');
  });
});

describe('RELEVANCE — gate explícito, separado del rol y de la puntuación', () => {
  it('una similitud semántica alta sin identidad no produce PASS', () => {
    const c = candidatoDesdeFila(fila('lab-cpp-173'));
    const conSimilitud = { ...c, semantic_score: 1, lexical_score: 1 };
    expect(evaluarRelevancia(conSimilitud, { articulo: null, instrumento: null, materia: null })).toBe('UNKNOWN');
  });

  it('instrumento correcto y artículo correcto producen PASS; instrumento distinto produce FAIL', () => {
    const cpp = { ...candidatoDesdeFila(fila('lab-cpp-173')), exact_match: false };
    const cc = { ...candidatoDesdeFila(fila('lab-cc-173')), exact_match: false };
    const ctx = { articulo: '173', instrumento: 'CODIGO_PROCESAL_PENAL' as const, materia: null };
    expect(evaluarRelevancia(cpp, ctx)).toBe('PASS');
    expect(evaluarRelevancia(cc, ctx)).toBe('FAIL');
  });

  it('artículo distinto produce FAIL aunque el instrumento coincida', () => {
    const cpp = candidatoDesdeFila(fila('lab-cpp-174'));
    expect(evaluarRelevancia(cpp, { articulo: '173', instrumento: 'CODIGO_PROCESAL_PENAL', materia: null })).toBe('FAIL');
  });
});

describe('SUFFICIENCY — gate de suficiencia (RETRIEVAL_ROLE ∧ RELEVANCE ∧ material_support)', () => {
  it('Q20 regresión: un PRIMARY léxico débil ya no produce SUFFICIENT (LIMITED o ABSTAIN)', () => {
    const res = recuperarLab(q('Q20'), LAB_CORPUS_V1, { k: 5 });
    expect(res.suficiencia.veredicto).not.toBe('SUFFICIENT');
    expect(['LIMITED', 'ABSTAIN']).toContain(res.suficiencia.veredicto);
    expect(res.suficiencia.motivo).toBe('SIN_PRIMARY_RELEVANTE');
  });

  it('PRIMARY solo (relevancia UNKNOWN) no produce SUFFICIENT aunque tenga soporte marcado (Q22)', () => {
    const res = recuperarLab({ ...q('Q22'), soporte_validado_ids: ['lab-cpp-173'] }, LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.find((c) => c.id === 'lab-cpp-173')?.relevancia_clo).toBe('UNKNOWN');
    expect(res.suficiencia.veredicto).toBe('LIMITED');
  });

  it('PRIMARY con relevancia PASS sin soporte validado produce LIMITED', () => {
    const res = recuperarLab(q('Q01'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking[0].relevancia_clo).toBe('PASS');
    expect(res.suficiencia.veredicto).toBe('LIMITED');
    expect(res.suficiencia.motivo).toBe('PRIMARY_PASS_SIN_SOPORTE_VALIDADO');
  });

  it('PRIMARY con relevancia PASS y soporte validado explícito produce SUFFICIENT (sólo ejercicio con marcador de prueba)', () => {
    const res = recuperarLab({ ...q('Q01'), soporte_validado_ids: ['lab-cpp-173'] }, LAB_CORPUS_V1, { k: 5 });
    expect(res.suficiencia.veredicto).toBe('SUFFICIENT');
    expect(res.suficiencia.motivo).toBe('PRIMARY_PASS_CON_SOPORTE_VALIDADO');
  });

  it('sin candidatos → ABSTAIN', () => {
    expect(evaluarSuficiencia([]).veredicto).toBe('ABSTAIN');
  });

  it('CONTEXT y SECONDARY no se acumulan para producir SUFFICIENT', () => {
    const base = (rol: RankedCandidate['rol_recuperacion'], capa: RankedCandidate['capa_clo']): RankedCandidate =>
      ({ id: `x-${rol}-${capa}`, rol_recuperacion: rol, relevancia_clo: 'PASS', capa_clo: capa, advertencia_clo: null }) as unknown as RankedCandidate;
    const r = evaluarSuficiencia([base('CONTEXT', null), base('SECONDARY', 'E6'), base('CONTEXT', 'E2')], {
      soporteValidado: new Set(['x-CONTEXT-null', 'x-SECONDARY-E6']),
    });
    expect(r.veredicto).not.toBe('SUFFICIENT');
  });
});

describe('VIGENCIA — política', () => {
  it('TRUE es elegible, pero es sólo una marca operativa, no vigencia verificada', () => {
    const r = rolRecuperacion({ fuente: 'Código Penal (FIXTURE)', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, num_articulo: '1' }, SIN_HISTORIA);
    expect(r.rol).toBe('PRIMARY');
  });

  it('UNKNOWN (null) nunca es PRIMARY: restringido a CONTEXT', () => {
    const r = rolRecuperacion({ fuente: 'Código Penal (FIXTURE)', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, num_articulo: '1' }, SIN_HISTORIA);
    expect(r.rol).toBe('CONTEXT');
  });

  it('FALSE normativo HN queda excluido de la recuperación profesional normal', () => {
    const f: LabRow = { id: 'f-1', contenido: 'ARTICULO 3.- Texto.', num_articulo: '3', fuente: 'Código de Familia (FIXTURE)', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false, materia: null };
    expect(motivoExclusionDura(f, 'lexical')).toBe('D6B_NO_VIGENTE_HN');
  });

  it('FALSE normativo de otra jurisdicción o de tipo instrumento también queda excluido', () => {
    const extranjero: LabRow = { id: 'f-2', contenido: 'ARTICULO 3.- Texto.', num_articulo: '3', fuente: 'Código X (FIXTURE)', fuente_tipo: 'codigo', jurisdiccion: 'ES', es_norma_vigente: false, materia: null };
    const instrumento: LabRow = { ...extranjero, id: 'f-3', fuente_tipo: 'instrumento', jurisdiccion: 'HN' };
    expect(motivoExclusionDura(extranjero, 'semantic')).toBe('VIGENCIA_FALSE_NORMATIVA');
    expect(motivoExclusionDura(instrumento, 'semantic')).toBe('VIGENCIA_FALSE_NORMATIVA');
  });

  it('FALSE en jurisprudencia o doctrina no se excluye por vigencia (regla de producción preservada)', () => {
    const sentencia: LabRow = { id: 'f-4', contenido: 'Sentencia.', num_articulo: null, fuente: 'Tribunal (FIXTURE)', fuente_tipo: 'sentencia', jurisdiccion: 'ES', es_norma_vigente: false, materia: null };
    expect(motivoExclusionDura(sentencia, 'semantic')).toBeNull();
  });

  it('un artículo FALSE pedido por número se localiza por el canal exacto, pero queda como CONTEXT y no crea suficiencia', () => {
    const derogado: LabRow = { id: 'f-6', contenido: 'ARTICULO 9.- Derogado.', num_articulo: '9', fuente: 'Código Penal (FIXTURE sintético)', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false, materia: '01_PENAL' };
    const cand = { ...candidatoDesdeFila(derogado), exact_match: true, retrieval_channel: ['exact' as const] };
    expect(rolRecuperacion(derogado, SIN_HISTORIA).rol).toBe('CONTEXT');
    const { ranking } = puntuarCandidatos([cand], { materia: null, intencion: SIN_HISTORIA });
    expect(ranking[0].rol_recuperacion).toBe('CONTEXT');
    expect(evaluarSuficiencia(ranking).veredicto).not.toBe('SUFFICIENT');
  });

  it('FALSE en el canal exacto conserva el comportamiento de producción (artículo derogado pedido por número)', () => {
    const f: LabRow = { id: 'f-5', contenido: 'ARTICULO 9.- Derogado.', num_articulo: '9', fuente: 'Código de Familia (FIXTURE)', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false, materia: null };
    expect(motivoExclusionDura(f, 'exact')).toBeNull();
  });
});

describe('retrieval_order_score no altera las compuertas', () => {
  it('cambiar sólo la puntuación semántica no cambia rol, relevancia ni suficiencia', () => {
    const base = recuperarLab(q('Q03'), LAB_CORPUS_V1, { k: 5 });
    const alterado = recuperarLab(
      { ...q('Q03'), semantic_hits: [{ id: 'lab-cpp-174', score: 0.0 }] },
      LAB_CORPUS_V1,
      { k: 5 },
    );
    const roles = (r: typeof base) => r.ranking.map((c) => [c.id, c.rol_recuperacion, c.relevancia_clo]);
    expect(roles(alterado)).toEqual(roles(base));
    expect(alterado.suficiencia.veredicto).toBe(base.suficiencia.veredicto);
  });

  it('una puntuación de recuperación alta no vuelve PASS una relevancia UNKNOWN', () => {
    const c = { ...candidatoDesdeFila(fila('lab-cpp-173')), lexical_score: 1, semantic_score: 1 };
    expect(evaluarRelevancia(c, { articulo: null, instrumento: null, materia: null })).toBe('UNKNOWN');
  });
});
