import { describe, it, expect } from 'vitest';
import { ejecutarBenchmarkA, ejecutarBenchmarkB, type SalidaModelo, type VarianteModelo } from '@/lib/legal-retrieval/lab/benchmark';
import * as pipeline from '@/lib/legal-retrieval/lab/pipeline';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from './fixtures/corpus-v1';

describe('BENCHMARK A — calidad de recuperación (cada variante recupera por sí misma)', () => {
  it('A1, A2 y A3 producen métricas independientes con recuperación propia por consulta', () => {
    const { metricas, llamadasRecuperacion } = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    expect(metricas.map((m) => m.variante)).toEqual(['A1_SEMANTIC_ONLY', 'A2_LEXICAL_ONLY', 'A3_HYBRID']);
    // 3 variantes × 17 consultas × 2 ejecuciones (reproducibilidad)
    expect(llamadasRecuperacion).toBe(3 * LAB_QUERIES_V1.length * 2);
  });

  it('ninguna variante deja pasar fuga de exclusiones duras', () => {
    const { metricas } = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    for (const m of metricas) expect(m.fuga_exclusiones_topk).toBe(0);
  });

  it('el top-k no contiene duplicados por hash tras la deduplicación', () => {
    const { metricas } = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    for (const m of metricas) expect(m.tasa_duplicados_topk).toBe(0);
  });

  it('los resultados son reproducibles entre ejecuciones', () => {
    const { metricas } = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    for (const m of metricas) expect(m.reproducible).toBe(true);
  });

  it('documenta el límite del tope SQL: en Q17, A1 pierde la fuente relevante y A3 la recupera', () => {
    const q17 = LAB_QUERIES_V1.find((x) => x.id === 'Q17')!;
    const a1 = pipeline.recuperarLab(q17, LAB_CORPUS_V1, { k: 5, modo: 'SEMANTIC_ONLY' });
    const a3 = pipeline.recuperarLab(q17, LAB_CORPUS_V1, { k: 5, modo: 'HYBRID' });
    expect(a1.ranking.map((c) => c.id)).not.toContain('lab-cpp-173');
    expect(a3.ranking.map((c) => c.id)).toContain('lab-cpp-173');
  });

  it('las métricas de latencia se reportan por etapa', () => {
    const { metricas } = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    for (const m of metricas) {
      expect(Object.keys(m.latencia_media_ms).sort()).toEqual(
        ['dedup', 'exacto', 'fusion', 'lexico', 'ranking', 'semantico', 'total'],
      );
    }
  });
});

describe('BENCHMARK A — anti-sobreajuste', () => {
  it('declara la invariante de que el benchmark sintético no prueba superioridad en producción', () => {
    const { invariante } = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    expect(invariante).toBe('SYNTHETIC_BENCHMARK_DOES_NOT_PROVE_PRODUCTION_SUPERIORITY');
  });

  it('reporta las tres variantes de forma independiente, sin campo de ganador', () => {
    const resultado = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    expect(resultado).not.toHaveProperty('ganador');
    for (const m of resultado.metricas) {
      expect(m).not.toHaveProperty('ganador');
      expect(m.primera_posicion_relevante.total).toBeGreaterThan(0);
    }
  });

  it('incluye casos adversariales explícitos (negativos de alta similitud, doc_*, E5, sin evidencia)', () => {
    const { metricas } = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    expect(metricas[0].consultas_adversariales).toBeGreaterThanOrEqual(5);
  });

});

describe('BENCHMARK B — evidencia congelada una sola vez, mismo paquete para todas las variantes de modelo', () => {
  const variantesFalsas: VarianteModelo[] = [
    { nombre: 'modelo-x', generar: (p) => ({ citas: p.items.slice(0, 1).map((i) => i.id), abstencion: p.items.length === 0, afirmaciones: [{ texto: 'a', soporte: p.items[0]?.id ?? null }], tokens: null, latenciaMs: null, costoUsd: null }) },
    { nombre: 'modelo-y', generar: (p) => ({ citas: ['id-inexistente'], abstencion: true, afirmaciones: [{ texto: 'b', soporte: null }], tokens: null, latenciaMs: null, costoUsd: null }) },
  ];

  it('recupera una sola vez por consulta y reutiliza el paquete para todas las variantes', () => {
    const { paquetes, llamadasRecuperacion, metricasPorVariante } = ejecutarBenchmarkB(LAB_QUERIES_V1, LAB_CORPUS_V1, 5, variantesFalsas);
    expect(llamadasRecuperacion).toBe(LAB_QUERIES_V1.length);
    expect(paquetes).toHaveLength(LAB_QUERIES_V1.length);
    expect(metricasPorVariante['modelo-x']).toHaveLength(LAB_QUERIES_V1.length);
  });

  it('las métricas por variante no declaran ganador; sólo describen cada caso', () => {
    const { metricasPorVariante } = ejecutarBenchmarkB(LAB_QUERIES_V1, LAB_CORPUS_V1, 5, variantesFalsas);
    expect(Object.keys(metricasPorVariante).sort()).toEqual(['modelo-x', 'modelo-y']);
    for (const lista of Object.values(metricasPorVariante)) expect(lista).toHaveLength(LAB_QUERIES_V1.length);
  });

  it('una cita a un id fuera del paquete baja la corrección de citas', () => {
    const { metricasPorVariante } = ejecutarBenchmarkB(LAB_QUERIES_V1, LAB_CORPUS_V1, 5, variantesFalsas);
    const yConCita = metricasPorVariante['modelo-y'].find((m) => m.correccion_citas !== null);
    expect(yConCita?.correccion_citas).toBe(0);
  });

  it('costo, tokens y latencia quedan en null: V4.0-A no realiza llamadas a modelos', () => {
    const { metricasPorVariante } = ejecutarBenchmarkB(LAB_QUERIES_V1, LAB_CORPUS_V1, 5, variantesFalsas);
    for (const lista of Object.values(metricasPorVariante)) {
      for (const m of lista) {
        expect(m.costoUsd).toBeNull();
        expect(m.tokens).toBeNull();
        expect(m.latenciaMs).toBeNull();
      }
    }
  });

  it('el mismo paquete tiene el mismo sha256 en cada ejecución', () => {
    const r1 = ejecutarBenchmarkB(LAB_QUERIES_V1, LAB_CORPUS_V1, 5, variantesFalsas);
    const r2 = ejecutarBenchmarkB(LAB_QUERIES_V1, LAB_CORPUS_V1, 5, variantesFalsas);
    expect(r1.paquetes.map((p) => p.paqueteSha256)).toEqual(r2.paquetes.map((p) => p.paqueteSha256));
  });

  it('los protocolos A y B son distintos: A ejecuta tres recuperaciones por consulta, B una', () => {
    const a = ejecutarBenchmarkA(LAB_QUERIES_V1, LAB_CORPUS_V1, 5);
    const b = ejecutarBenchmarkB(LAB_QUERIES_V1, LAB_CORPUS_V1, 5, variantesFalsas);
    expect(a.llamadasRecuperacion).toBeGreaterThan(b.llamadasRecuperacion);
    expect(b.llamadasRecuperacion).toBe(LAB_QUERIES_V1.length);
  });

  it('abstención: la variante que siempre cita se marca incorrecta donde debe abstenerse', () => {
    const siempreCita: VarianteModelo = {
      nombre: 'siempre-cita',
      generar: (p): SalidaModelo => ({ citas: p.items.slice(0, 1).map((i) => i.id), abstencion: false, afirmaciones: [], tokens: null, latenciaMs: null, costoUsd: null }),
    };
    const { metricasPorVariante } = ejecutarBenchmarkB(LAB_QUERIES_V1, LAB_CORPUS_V1, 5, [siempreCita]);
    const q14 = metricasPorVariante['siempre-cita'].find((m) => m.consultaId === 'Q14');
    expect(q14?.abstencion_correcta).toBe(false);
  });
});
