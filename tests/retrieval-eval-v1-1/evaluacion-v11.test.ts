import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cargarSnapshot, type RegistroSnapshot } from '../retrieval-eval-v1/snapshot';
import { PREGUNTAS_V1, resolverOro } from '../retrieval-eval-v1/gold';
import { candidatoDesdeFila } from '@/lib/legal-retrieval/lab/hybrid-merge';
import type { LabBenchmarkQuery, LabRow } from '@/lib/legal-retrieval/lab/types';
import { contextoIntencion, intencionInstrumento } from './instrument-intent';
import { relevanciaV11 } from './relevance-v11';
import { resolverExactoV11 } from './exact-v11';
import { recuperarV11 } from './pipeline-v11';
import { ejecutarModoV11, K } from './run-v11';

const CA01 = cargarSnapshot('CA01').filas;
const DECLARADO = cargarSnapshot('DECLARADO').filas;
const MATERIAL = new Set(['MATERIAL', 'RESTRICTED', 'SUPPORTING']);

const fila = (filas: RegistroSnapshot[], id: string): RegistroSnapshot => {
  const f = filas.find((x) => x.id === id);
  if (!f) throw new Error(`fila ausente: ${id}`);
  return f;
};
const consulta = (texto: string): LabBenchmarkQuery => ({
  id: 'T', categoria: 'adversarial_semantico_negativo', texto,
  relevantes: [], distractores: [], abstencion_esperada: false, semantic_hits: [], validacion: 'PENDIENTE_VALIDACION_JURIDICA',
});

const COD_A9 = 'mayalex_normativos:codigo_notariado_2005_a9';
const REG_A9 = 'mayalex_normativos:reglamento_notariado_2012_a9';
const TXT_D05 = 'Según el reglamento notarial, ¿qué presunción tienen las afirmaciones del notario?';
const TXT_D06 = 'Reglamento del Código del Notariado, artículo 12: ¿cómo debe ser el sello del notario?';

describe('intención instrumental', () => {
  it('"reglamento notarial" resuelve a REGLAMENTO_NOTARIADO', () => {
    const i = intencionInstrumento(TXT_D05);
    expect(i.clase).toBe('reglamento');
    expect(i.identidad).toBe('REGLAMENTO_NOTARIADO');
  });

  it('"Reglamento del Código del Notariado" resuelve a REGLAMENTO_NOTARIADO, no a CODIGO', () => {
    expect(intencionInstrumento(TXT_D06).identidad).toBe('REGLAMENTO_NOTARIADO');
  });

  it('sin clase de instrumento no hay intención explícita', () => {
    const c = contextoIntencion('¿Qué es la imparcialidad del notario?');
    expect(c.intencion.clase).toBeNull();
    expect(c.intencion.identidad).toBeNull();
  });
});

describe('relevancia V1.1', () => {
  it('candidato del Código no es PASS material cuando la consulta nombra el Reglamento', () => {
    const cand = candidatoDesdeFila(fila(CA01, COD_A9) as unknown as LabRow);
    const r = relevanciaV11(cand, contextoIntencion(TXT_D05));
    expect(r.relevancia).toBe('FAIL');
    expect(r.razon).toBe('INCOMPATIBLE_INSTRUMENT');
  });

  it('intención explícita desactiva el PASS sólo por materia', () => {
    const cand = candidatoDesdeFila(fila(CA01, REG_A9) as unknown as LabRow);
    const sinArticulo = { ...cand, num_articulo: null };
    const r = relevanciaV11(sinArticulo, contextoIntencion('Según el reglamento notarial, ¿qué dice el notario?'));
    expect(r.razon).not.toBe('MATERIA_ONLY');
    expect(r.relevancia).toBe('PASS');
    expect(r.razon).toBe('INSTRUMENT_IDENTITY');
  });

  it('instrumento explícito no resuelto deja el candidato en UNKNOWN', () => {
    const cand = candidatoDesdeFila(fila(CA01, REG_A9) as unknown as LabRow);
    const sinArticulo = { ...cand, num_articulo: null };
    const r = relevanciaV11(sinArticulo, contextoIntencion('Según el decreto sobre notarios, ¿qué dice?'));
    expect(r.relevancia).toBe('UNKNOWN');
  });

  it('sin intención explícita se conserva la regla de materia', () => {
    const cand = candidatoDesdeFila(fila(CA01, COD_A9) as unknown as LabRow);
    const texto = 'En materia notarial, ¿qué obligaciones tiene el notario?';
    const ctx = contextoIntencion(texto);
    expect(ctx.intencion.clase).toBeNull();
    expect(ctx.materia).toBe(cand.materia);
    const r = relevanciaV11({ ...cand, num_articulo: null }, ctx);
    expect(r.relevancia).toBe('PASS');
    expect(r.razon).toBe('MATERIA_ONLY');
  });

  it('discrepancia de artículo en consulta simple es FAIL', () => {
    const cand = candidatoDesdeFila(fila(CA01, COD_A9) as unknown as LabRow);
    const r = relevanciaV11(cand, contextoIntencion('¿Qué dice el artículo 12 del Código del Notariado?'));
    expect(r.relevancia).toBe('FAIL');
    expect(r.razon).toBe('ARTICLE_MISMATCH_SINGLE');
  });

  it('discrepancia de artículo en consulta multi-artículo es UNKNOWN', () => {
    const cand = candidatoDesdeFila(fila(CA01, COD_A9) as unknown as LabRow);
    const ctx = contextoIntencion('El artículo 12 se relaciona con el artículo 36 del Código del Notariado, ¿qué dice?');
    expect(ctx.multiArticulo).toBe(true);
    const r = relevanciaV11(cand, ctx);
    expect(r.relevancia).toBe('UNKNOWN');
    expect(r.razon).toBe('ARTICLE_MISMATCH_MULTI');
  });

  it('similitud semántica o léxica alta nunca produce PASS', () => {
    const cand = candidatoDesdeFila(fila(CA01, COD_A9) as unknown as LabRow);
    const ctx = contextoIntencion('¿Qué dice sobre la fe pública?');
    const r = relevanciaV11({ ...cand, num_articulo: null, materia: null, semantic_score: 0.99, lexical_score: 0.99 }, ctx);
    expect(r.relevancia).not.toBe('PASS');
  });
});

describe('overlay exacto y paquete', () => {
  it('EXACT_UNKNOWN se localiza por identidad exacta en el overlay', () => {
    const r = resolverExactoV11(TXT_D06, DECLARADO);
    expect(r.estado).toBe('EXACT_UNKNOWN');
    expect(r.vigencia).toBe('UNKNOWN');
    expect(r.fragmento?.id).toContain('reglamento_notariado_2012_a12');
  });

  it('EXACT_UNKNOWN nunca es PRIMARY y sola deja la respuesta en LIMITED', () => {
    const r = recuperarV11(consulta(TXT_D06), DECLARADO, K);
    expect(r.exactoV11).toBe('EXACT_UNKNOWN');
    expect(r.rawRanking.some((c) => c.rol_recuperacion === 'PRIMARY')).toBe(false);
    expect(r.ranking.some((c) => c.uso_paquete === 'MATERIAL')).toBe(false);
    expect(r.suficiencia.veredicto).toBe('LIMITED');
  });

  it('EXACT_FALSE no entra al paquete como material ni PRIMARY', () => {
    const r = recuperarV11(consulta('¿El artículo 27 del Código del Notariado está vigente?'), CA01, K);
    expect(r.exactoV11).toBe('EXACT_FALSE');
    expect(r.ranking.some((c) => MATERIAL.has(c.uso_paquete))).toBe(false);
    expect(r.ranking.some((c) => c.rol_recuperacion === 'PRIMARY')).toBe(false);
    expect(r.suficiencia.veredicto).not.toBe('SUFFICIENT');
  });

  it('excepción E2 se conserva: artículo notarial de capa abierta es CONTEXT', () => {
    const r = recuperarV11(consulta('¿Qué dice el artículo 72 del Código del Notariado?'), DECLARADO, K);
    expect(r.exactoV11).toBe('EXACT_UNKNOWN');
    expect(r.rawRanking[0].rol_recuperacion).toBe('CONTEXT');
  });

  it('D05: ninguna fuente prohibida llega al paquete', () => {
    const oro = resolverOro(PREGUNTAS_V1, CA01).find((p) => p.id === 'D05')!;
    const r = recuperarV11(consulta(oro.pregunta), CA01, K);
    const prohibidas = new Set(oro.forbidden_source_ids);
    expect(r.ranking.filter((c) => prohibidas.has(c.id))).toHaveLength(0);
    expect(r.ranking.filter((c) => prohibidas.has(c.id) && MATERIAL.has(c.uso_paquete))).toHaveLength(0);
  });
});

describe('congelación del challenge', () => {
  it('el set congelado sigue siendo 53 preguntas con split 32/14/7', () => {
    const oro = resolverOro(PREGUNTAS_V1, CA01);
    const conteo: Record<string, number> = {};
    for (const p of oro) conteo[p.legal_validation_status] = (conteo[p.legal_validation_status] ?? 0) + 1;
    expect(oro).toHaveLength(53);
    expect(conteo).toEqual({ TECHNICALLY_VERIFIED: 32, PENDING_LEGAL_VALIDATION: 14, GOLD_SOURCE_INSUFFICIENT: 7 });
  });

  it('la variante A coincide con el artefacto V1 en ambos modos (sin latencia)', () => {
    const v1 = JSON.parse(readFileSync(join(process.cwd(), 'docs/evaluation/retrieval-challenge-v1.json'), 'utf8')) as {
      modos: { modo: string; global: Record<string, Record<string, unknown>> }[];
    };
    for (const modo of ['CA01', 'DECLARADO'] as const) {
      const v11 = ejecutarModoV11(modo);
      const base = v1.modos.find((m) => m.modo === modo)!.global.A_SEMANTICA_ACTUAL;
      const actual = v11.globalV1.A_SEMANTICA_ACTUAL as Record<string, unknown>;
      const { latencia_media_ms: _lb, ...baseSinLat } = base;
      const { latencia_media_ms: _la, ...actualSinLat } = actual;
      expect(actualSinLat).toEqual(baseSinLat);
    }
  }, 120_000);
});
