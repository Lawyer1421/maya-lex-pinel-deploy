import { describe, it, expect } from 'vitest';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { seleccionarPaquete, RAW_CANDIDATE_LIMIT_LAB } from '@/lib/legal-retrieval/lab/evidence-selection';
import { evaluarSuficiencia } from '@/lib/legal-retrieval/lab/sufficiency';
import { compararOrdenLegal, puntuarCandidatos } from '@/lib/legal-retrieval/lab/ranking';
import { candidatoDesdeFila } from '@/lib/legal-retrieval/lab/hybrid-merge';
import { ejecutarShadow, INVARIANTE_SHADOW } from '@/lib/legal-retrieval/lab/shadow';
import { CASOS_SHADOW, FILAS_SHADOW } from './fixtures/shadow-cases';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from '../retrieval-v4-0-a/fixtures/corpus-v1';

const caso = (id: string) => CASOS_SHADOW.find((c) => c.id.startsWith(id))!;
const correr = (id: string) => {
  const c = caso(id);
  return { caso: c, res: recuperarLab(c.query, c.corpus, { k: c.k }) };
};
const razon = (res: ReturnType<typeof recuperarLab>, id: string) => res.diagnosticos.find((d) => d.id === id)?.razon;
const uso = (res: ReturnType<typeof recuperarLab>, id: string) => res.ranking.find((c) => c.id === id)?.uso_paquete;

describe('RAW RANKING ≠ EVIDENCE PACKET', () => {
  it('el ranking bruto puede contener más candidatos que el paquete', () => {
    const { res } = correr('C07');
    expect(res.rawRanking.length).toBeGreaterThan(res.ranking.length);
    expect(res.ranking.length).toBeLessThanOrEqual(2);
  });

  it('raw_candidate_limit es distinto de packet_k y su valor de laboratorio es 50', () => {
    expect(RAW_CANDIDATE_LIMIT_LAB).toBe(50);
    const { caso: c } = correr('C07');
    const r = recuperarLab(c.query, c.corpus, { k: 1, rawCandidateLimit: 3 });
    expect(r.rawRanking.length).toBeLessThanOrEqual(3);
    expect(r.ranking.length).toBeLessThanOrEqual(1);
  });

  it('el ranking bruto respeta el orden legal: no contiene campos de rol ni relevancia como orden', () => {
    const { res } = correr('C01');
    for (const c of res.rawRanking) {
      expect(Object.keys(c.legal_order_key)).not.toContain('rol_gate');
      expect(Object.keys(c.legal_order_key)).not.toContain('relevancia');
    }
  });

  it('el selector no muta el ranking bruto de entrada', () => {
    const { res } = correr('C01');
    const antes = JSON.stringify(res.rawRanking);
    seleccionarPaquete(res.rawRanking, 1);
    expect(JSON.stringify(res.rawRanking)).toBe(antes);
  });
});

describe('PRIMARY + PASS protegido del desplazamiento', () => {
  it('C01: un SECONDARY con puntuación superior no desplaza al PRIMARY + PASS', () => {
    const { res } = correr('C01');
    expect(res.rawRanking[0].rol_recuperacion).toBe('SECONDARY');
    expect(res.ranking.map((c) => c.id)).toEqual(['sh-civ40']);
    expect(uso(res, 'sh-civ40')).toBe('MATERIAL');
    expect(razon(res, 'sh-adop5')).toBe('NOT_SELECTED_CAPACITY');
  });

  it('C02: un CONTEXT con puntuación superior no desplaza al PRIMARY + PASS', () => {
    const { res } = correr('C02');
    expect(res.rawRanking[0].rol_recuperacion).toBe('CONTEXT');
    expect(res.ranking.map((c) => c.id)).toEqual(['sh-cpp10a']);
    expect(razon(res, 'sh-instr-penal')).toBe('NOT_SELECTED_CAPACITY');
  });

  it('C07: un PRIMARY + PASS fuera del top-k bruto entra al paquete', () => {
    const { res, caso: c } = correr('C07');
    const topK = res.rawRanking.slice(0, c.k).map((x) => x.id);
    expect(topK).not.toContain('sh-civ40');
    expect(res.ranking.map((x) => x.id)).toContain('sh-civ40');
    expect(uso(res, 'sh-civ40')).toBe('MATERIAL');
  });

  it('C08: varios PRIMARY + PASS compiten por capacidad; el desplazamiento por clase inferior es cero', () => {
    const { res, caso: c } = correr('C08');
    const primarios = res.rawRanking.filter((x) => x.rol_recuperacion === 'PRIMARY' && x.relevancia_clo === 'PASS');
    expect(primarios).toHaveLength(2);
    expect(res.ranking).toHaveLength(1);
    expect(razon(res, 'sh-cpp10a')).toBe('NOT_SELECTED_CAPACITY');
    const sh = ejecutarShadow([c]);
    expect(sh.agregado.primaryPassDisplacedTotal).toBe(0);
  });
});

describe('exclusión de FAIL y EXCLUDED del paquete material', () => {
  it('C03: relevancia FAIL con puntuación máxima se rechaza del paquete', () => {
    const { res } = correr('C03');
    expect(res.rawRanking[0].relevancia_clo).toBe('FAIL');
    expect(razon(res, 'sh-instr-penal')).toBe('REJECTED_RELEVANCE_FAIL');
    expect(res.ranking.map((c) => c.id)).not.toContain('sh-instr-penal');
  });

  it('C06: sólo FAIL → paquete vacío y ABSTAIN', () => {
    const { res } = correr('C06');
    expect(res.ranking).toHaveLength(0);
    expect(res.suficiencia.veredicto).toBe('ABSTAIN');
    expect(razon(res, 'sh-civ40')).toBe('REJECTED_RELEVANCE_FAIL');
  });

  it('C11a: E5 normal no entra al ranking bruto ni al paquete', () => {
    const { res } = correr('C11a');
    expect(res.rawRanking.map((c) => c.id)).not.toContain('sh-cpt10');
    expect(res.ranking.map((c) => c.id)).not.toContain('sh-cpt10');
  });

  it('ningún paquete del laboratorio contiene relevancia FAIL ni EXCLUDED', () => {
    const sh = ejecutarShadow(CASOS_SHADOW.map((c) => ({ ...c, id: c.id })));
    expect(sh.agregado.relevanceFailEnPaqueteTotal).toBe(0);
    expect(sh.agregado.excludedEnPaqueteTotal).toBe(0);
  });
});

describe('políticas CLO preservadas en el paquete', () => {
  it('E2 es CONTEXT_ONLY y nunca MATERIAL, aunque compita con un PRIMARY verificado', () => {
    const { res } = correr('C09');
    expect(uso(res, 'sh-not100')).toBe('MATERIAL');
    expect(uso(res, 'sh-not72')).toBe('CONTEXT_ONLY');
    expect(res.ranking.filter((c) => c.capa_clo === 'E2').every((c) => c.uso_paquete !== 'MATERIAL')).toBe(true);
  });

  it('E6 es SUPPORTING y nunca MATERIAL', () => {
    const { res } = correr('C10');
    expect(uso(res, 'sh-adop5')).toBe('SUPPORTING');
    expect(uso(res, 'sh-civ40')).toBe('MATERIAL');
  });

  it('E5 aparece sólo tras consulta histórica explícita, como CONTEXT_ONLY', () => {
    expect(correr('C11a').res.ranking.map((c) => c.id)).not.toContain('sh-cpt10');
    const { res } = correr('C11b');
    expect(uso(res, 'sh-cpt10')).toBe('CONTEXT_ONLY');
    expect(res.suficiencia.veredicto).not.toBe('SUFFICIENT');
  });

  it('exact FALSE localizado queda CONTEXT_ONLY y no crea suficiencia (C12)', () => {
    const { res } = correr('C12');
    expect(res.ruta).toBe('FAST_EXACT');
    expect(uso(res, 'sh-fam9f')).toBe('CONTEXT_ONLY');
    expect(res.ranking.some((c) => c.uso_paquete === 'MATERIAL')).toBe(false);
    expect(res.suficiencia.veredicto).not.toBe('SUFFICIENT');
  });
});

describe('suficiencia sobre el paquete seleccionado', () => {
  it('la suficiencia usa exactamente el conjunto del paquete', () => {
    for (const c of CASOS_SHADOW) {
      const r = recuperarLab(c.query, c.corpus, { k: c.k });
      expect(r.evidenciaSuficiencia).toEqual(r.paqueteIds);
      expect(r.paqueteIds).toEqual(r.ranking.map((x) => x.id));
      const recalculada = evaluarSuficiencia(r.ranking, { soporteValidado: new Set(c.query.soporte_validado_ids ?? []) });
      expect(r.suficiencia.veredicto).toBe(recalculada.veredicto);
    }
  });

  it('evidencia fuera del paquete no puede volver SUFFICIENT una respuesta (C07 con soporte marcado)', () => {
    const { caso: c } = correr('C07');
    const r = recuperarLab({ ...c.query, soporte_validado_ids: ['sh-instr-civil'] }, c.corpus, { k: 1 });
    expect(r.ranking.map((x) => x.id)).not.toContain('sh-instr-civil');
    expect(r.suficiencia.veredicto).not.toBe('SUFFICIENT');
  });

  it('suficiencia antes y después coinciden cuando el PRIMARY + PASS con soporte está fuera del top-k (C07)', () => {
    const { caso: c } = correr('C07');
    const r = recuperarLab({ ...c.query, soporte_validado_ids: ['sh-civ40'] }, c.corpus, { k: c.k });
    const antes = evaluarSuficiencia(r.rawRanking, { soporteValidado: new Set(['sh-civ40']) }).veredicto;
    expect(r.ranking.map((x) => x.id)).toContain('sh-civ40');
    expect(r.suficiencia.veredicto).toBe(antes);
    expect(r.suficiencia.veredicto).toBe('SUFFICIENT');
  });

  it('C04 solo SECONDARY → ABSTAIN; C05 solo CONTEXT → LIMITED; C13 sin evidencia → ABSTAIN', () => {
    expect(correr('C04').res.suficiencia.veredicto).toBe('ABSTAIN');
    expect(correr('C05').res.suficiencia.veredicto).toBe('LIMITED');
    const c13 = correr('C13').res;
    expect(c13.ranking).toHaveLength(0);
    expect(c13.suficiencia.veredicto).toBe('ABSTAIN');
  });
});

describe('diagnósticos', () => {
  it('cada candidato bruto tiene exactamente un diagnóstico con razón', () => {
    for (const c of CASOS_SHADOW) {
      const r = recuperarLab(c.query, c.corpus, { k: c.k });
      expect(r.diagnosticos.map((d) => d.id).sort()).toEqual(r.rawRanking.map((x) => x.id).sort());
    }
  });

  it('las razones tienen los valores previstos en los casos adversariales', () => {
    expect(razon(correr('C04').res, 'sh-adop5')).toBe('SELECTED_SECONDARY');
    expect(razon(correr('C05').res, 'sh-instr-penal')).toBe('SELECTED_CONTEXT');
    expect(razon(correr('C07').res, 'sh-instr-civil')).toBe('NOT_SELECTED_CAPACITY');
    expect(razon(correr('C10').res, 'sh-civ40')).toBe('SELECTED_PRIMARY');
  });

  it('un SECONDARY con relevancia UNKNOWN sin material útil queda NOT_SELECTED_USEFULNESS', () => {
    const r = recuperarLab(
      {
        id: 'U1', categoria: 'adversarial_semantico_negativo', texto: 'caducidad', relevantes: [], distractores: [],
        abstencion_esperada: false, validacion: 'PENDIENTE_VALIDACION_JURIDICA',
        semantic_hits: [{ id: 'sh-adop5', score: 0.9 }],
      },
      [FILAS_SHADOW.adop5],
      { k: 3 },
    );
    expect(r.diagnosticos.find((d) => d.id === 'sh-adop5')?.razon).toBe('NOT_SELECTED_USEFULNESS');
    expect(r.ranking).toHaveLength(0);
  });
});

describe('determinismo y capacidad', () => {
  it('la selección del paquete es determinista', () => {
    const a = correr('C07').res.paqueteIds;
    const b = correr('C07').res.paqueteIds;
    expect(a).toEqual(b);
  });

  it('el paquete nunca excede packet_k', () => {
    for (const c of CASOS_SHADOW) {
      const r = recuperarLab(c.query, c.corpus, { k: c.k });
      expect(r.ranking.length).toBeLessThanOrEqual(c.k);
    }
  });

  it('los candidatos del paquete se ordenan por clase de uso y luego por orden bruto', () => {
    const { res } = correr('C09');
    expect(res.ranking.map((c) => c.uso_paquete)).toEqual(['MATERIAL', 'CONTEXT_ONLY']);
  });

  it('puntuarCandidatos sigue funcionando sin contexto de articulo ni instrumento', () => {
    const c = candidatoDesdeFila(LAB_CORPUS_V1[0]);
    const { ranking } = puntuarCandidatos([c], { materia: null, intencion: { historicaCPC: false } });
    expect(ranking).toHaveLength(1);
  });
});

describe('harness de sombra — criterios de éxito del laboratorio', () => {
  const corridas = [
    ...LAB_QUERIES_V1.map((q) => ({ id: q.id, query: q, corpus: LAB_CORPUS_V1, k: 5 })),
    ...CASOS_SHADOW.map((c) => ({ ...c })),
  ];
  const resultado = ejecutarShadow(corridas);

  it('invariante explícita de laboratorio', () => {
    expect(resultado.invariante).toBe(INVARIANTE_SHADOW);
    expect(INVARIANTE_SHADOW).toBe('SHADOW_RESULTS_DO_NOT_PROVE_PRODUCTION_BENEFIT');
  });

  it('PRIMARY_PASS_DISPLACED = 0', () => {
    expect(resultado.agregado.primaryPassDisplacedTotal).toBe(0);
  });

  it('RELEVANCE_FAIL_IN_MATERIAL_PACKET = 0', () => {
    expect(resultado.agregado.relevanceFailEnPaqueteTotal).toBe(0);
  });

  it('EXCLUDED_IN_PACKET = 0', () => {
    expect(resultado.agregado.excludedEnPaqueteTotal).toBe(0);
  });

  it('SUFFICIENCY_EVIDENCE_SET_MATCHES_PACKET = YES', () => {
    expect(resultado.agregado.coincidenciaEvidenciaSuficiencia).toBe(true);
  });

  it('la comparación es reproducible', () => {
    expect(resultado.agregado.reproducible).toBe(true);
  });

  it('el harness reporta A y B por separado, sin campo de ganador', () => {
    expect(resultado.agregado).not.toHaveProperty('ganador');
    expect(resultado.agregado.tasaContextoTopK).toBeGreaterThanOrEqual(0);
    expect(resultado.agregado.tasaContextoPaquete).toBeGreaterThanOrEqual(0);
  });
});
