import { describe, it, expect } from 'vitest';
import { colapsarDuplicadosExactos, DEDUP_FALSE_MERGE_POLICY } from '@/lib/legal-retrieval/lab/dedup';
import { puntuarCandidatos } from '@/lib/legal-retrieval/lab/ranking';
import { candidatoDesdeFila } from '@/lib/legal-retrieval/lab/hybrid-merge';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { LAB_RANKING_WEIGHTS, type LabCandidate, type LabRow } from '@/lib/legal-retrieval/lab/types';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from './fixtures/corpus-v1';

const q = (id: string) => LAB_QUERIES_V1.find((x) => x.id === id)!;
const fila = (id: string): LabRow => LAB_CORPUS_V1.find((r) => r.id === id)!;

describe('deduplicación — política de fallo seguro', () => {
  it('declara la política FAIL_SAFE', () => {
    expect(DEDUP_FALSE_MERGE_POLICY).toBe('FAIL_SAFE');
  });

  it('duplicado determinista (mismo contenido, número y fuente) se colapsa y se registra', () => {
    const res = recuperarLab(q('Q08'), LAB_CORPUS_V1, { k: 10 });
    const ids = res.ranking.map((c) => c.id);
    expect(ids.filter((id) => id.startsWith('lab-cpp-175')).length).toBe(1);
    expect(res.eventosDedup).toEqual([
      { tipo: 'COLAPSO_DUPLICADO_EXACTO', conservado: 'lab-cpp-175-a', afectado: 'lab-cpp-175-b' },
    ]);
  });

  it('el colapso conserva la procedencia de ambos canales del duplicado', () => {
    const a: LabCandidate = { ...candidatoDesdeFila(fila('lab-cpp-175-a')), retrieval_channel: ['lexical'], lexical_score: 0.4 };
    const b: LabCandidate = { ...candidatoDesdeFila(fila('lab-cpp-175-b')), retrieval_channel: ['semantic'], semantic_score: 0.8 };
    const { candidatos } = colapsarDuplicadosExactos([a, b]);
    expect(candidatos).toHaveLength(1);
    expect(candidatos[0].retrieval_channel).toEqual(['lexical', 'semantic']);
    expect(candidatos[0].lexical_score).toBe(0.4);
    expect(candidatos[0].semantic_score).toBe(0.8);
  });

  it('espejos con fuente distinta NO se colapsan (identidad canónica no demostrada)', () => {
    const res = recuperarLab(q('Q09'), LAB_CORPUS_V1, { k: 10 });
    const ids = res.ranking.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['lab-espejo-210-a', 'lab-espejo-210-b']));
    expect(res.eventosDedup.some((e) => e.afectado.startsWith('lab-espejo') || e.conservado.startsWith('lab-espejo'))).toBe(false);
  });

  it('misma fuente y número con texto distinto NO se colapsa; se penaliza', () => {
    const v1: LabRow = { id: 'x-1', contenido: 'ARTICULO 500.- Versión uno.', num_articulo: '500', fuente: 'Fuente Fixture Z', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: null };
    const v2: LabRow = { ...v1, id: 'x-2', contenido: 'ARTICULO 500.- Versión dos.' };
    const cands = [candidatoDesdeFila(v1), candidatoDesdeFila(v2)].map((c) => ({ ...c, retrieval_channel: ['lexical' as const], lexical_score: c.id === 'x-1' ? 0.9 : 0.5 }));
    const colapsados = colapsarDuplicadosExactos(cands);
    expect(colapsados.candidatos).toHaveLength(2);
    const { ranking, eventos } = puntuarCandidatos(colapsados.candidatos, { materia: null });
    expect(eventos).toEqual([{ tipo: 'PENALIZA_MISMA_FUENTE_Y_ARTICULO', conservado: 'x-1', afectado: 'x-2' }]);
    expect(ranking[0].id).toBe('x-1');
    expect(ranking[1].ranking_components.duplicate_penalty).toBe(1);
  });
});

describe('ranking explicable', () => {
  it('cada candidato expone exactamente los siete componentes', () => {
    const res = recuperarLab(q('Q03'), LAB_CORPUS_V1, { k: 5 });
    for (const c of res.ranking) {
      expect(Object.keys(c.ranking_components).sort()).toEqual(
        ['duplicate_penalty', 'exact', 'jurisdiction', 'lexical', 'materia', 'semantic', 'source_identity'],
      );
    }
  });

  it('el compuesto es exactamente la suma de pesos explícitos por componente', () => {
    const res = recuperarLab(q('Q16'), LAB_CORPUS_V1, { k: 10 });
    for (const c of res.ranking) {
      let esperado = 0;
      for (const k of Object.keys(LAB_RANKING_WEIGHTS) as (keyof typeof LAB_RANKING_WEIGHTS)[]) {
        esperado += LAB_RANKING_WEIGHTS[k] * c.ranking_components[k];
      }
      expect(c.composite).toBeCloseTo(esperado, 6);
    }
  });

  it('el exacto domina: su peso supera la suma de todos los demás componentes máximos', () => {
    const otros = Object.entries(LAB_RANKING_WEIGHTS)
      .filter(([k]) => k !== 'exact' && k !== 'duplicate_penalty')
      .reduce((s, [, v]) => s + v, 0);
    expect(LAB_RANKING_WEIGHTS.exact).toBeGreaterThan(otros);
  });

  it('no crea campos de autoridad, estado canónico, relaciones ni prestigio', () => {
    const prohibidos = ['normative_rank', 'canonical_status', 'temporal_status', 'legal_relation', 'verified_authority', 'instrument_id', 'authority', 'confidence', 'prestige'];
    const res = recuperarLab(q('Q13'), LAB_CORPUS_V1, { k: 5 });
    for (const c of res.ranking) {
      for (const p of prohibidos) {
        expect(Object.keys(c)).not.toContain(p);
        expect(Object.keys(c.ranking_components)).not.toContain(p);
      }
    }
  });

  it('la vigencia no puntúa: null (desconocida) y true tienen el mismo compuesto', () => {
    const base = candidatoDesdeFila({ id: 'v-1', contenido: 'ARTICULO 7.- Texto.', num_articulo: '7', fuente: 'Fuente Fixture V', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: null });
    const desconocida = candidatoDesdeFila({ ...fila('lab-cpp-173'), id: 'v-2', contenido: 'ARTICULO 8.- Texto.', num_articulo: '8', fuente: 'Fuente Fixture V', es_norma_vigente: null, materia: null });
    const cands = [
      { ...base, retrieval_channel: ['lexical' as const], lexical_score: 0.5 },
      { ...desconocida, retrieval_channel: ['lexical' as const], lexical_score: 0.5 },
    ];
    const { ranking } = puntuarCandidatos(cands, { materia: null });
    const comp = ranking.map((c) => c.composite);
    expect(comp[0]).toBe(comp[1]);
    const info = ranking.map((c) => c.vigencia_informativa).sort();
    expect(info).toEqual(['TRUE', 'UNKNOWN']);
  });
});
