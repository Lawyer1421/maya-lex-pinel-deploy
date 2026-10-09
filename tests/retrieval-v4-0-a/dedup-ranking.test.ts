import { describe, it, expect } from 'vitest';
import { colapsarDuplicadosExactos, DEDUP_FALSE_MERGE_POLICY } from '@/lib/legal-retrieval/lab/dedup';
import { puntuarCandidatos } from '@/lib/legal-retrieval/lab/ranking';
import { candidatoDesdeFila } from '@/lib/legal-retrieval/lab/hybrid-merge';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import type { LabCandidate, LabRow } from '@/lib/legal-retrieval/lab/types';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from './fixtures/corpus-v1';

const q = (id: string) => LAB_QUERIES_V1.find((x) => x.id === id)!;
const fila = (id: string): LabRow => LAB_CORPUS_V1.find((r) => r.id === id)!;
const CONTEXTO = { materia: null, intencion: { historicaCPC: false } };

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

  it('regresión: mismo contenido, número y fuente con vigencia distinta NO se colapsan', () => {
    const vigente = candidatoDesdeFila({ id: 'v-a', contenido: 'ARTICULO 4.- Igual.', num_articulo: '4', fuente: 'Fuente Fixture W', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, materia: null });
    const falso = { ...vigente, id: 'v-b', es_norma_vigente: false };
    const { candidatos, eventos } = colapsarDuplicadosExactos([
      { ...vigente, retrieval_channel: ['lexical'] },
      { ...falso, retrieval_channel: ['lexical'] },
    ]);
    expect(candidatos).toHaveLength(2);
    expect(eventos).toHaveLength(0);
  });

  it('misma fuente y número con texto distinto NO se colapsa; se penaliza tras las compuertas legales', () => {
    const v1: LabRow = { id: 'x-1', contenido: 'ARTICULO 500.- Versión uno.', num_articulo: '500', fuente: 'Fuente Fixture Z', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: null };
    const v2: LabRow = { ...v1, id: 'x-2', contenido: 'ARTICULO 500.- Versión dos.' };
    const cands = [candidatoDesdeFila(v1), candidatoDesdeFila(v2)].map((c) => ({
      ...c,
      retrieval_channel: ['lexical' as const],
      lexical_score: c.id === 'x-1' ? 0.9 : 0.5,
    }));
    const colapsados = colapsarDuplicadosExactos(cands);
    expect(colapsados.candidatos).toHaveLength(2);
    const { ranking, eventos } = puntuarCandidatos(colapsados.candidatos, CONTEXTO);
    expect(eventos).toEqual([{ tipo: 'PENALIZA_MISMA_FUENTE_Y_ARTICULO', conservado: 'x-1', afectado: 'x-2' }]);
    expect(ranking[0].id).toBe('x-1');
    expect(ranking[1].legal_order_key.penalizacion_espejo).toBe(-1);
    expect(ranking[0].legal_order_key.penalizacion_espejo).toBe(0);
  });
});
