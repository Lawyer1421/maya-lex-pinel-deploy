/**
 * lib/ai-gateway/canary/cost-authorization.ts
 * G6-H: paquete de costos para la autorización del primer canary. Offline y determinista (semilla fija). No cambia el presupuesto real.
 *
 * Tarifas: SOLO las de shadow-model-config.ts (revalidadas contra las páginas oficiales el 2026-10-23). Se calcula por componente:
 *   - entrada sin caché · entrada en caché (lectura) · escritura de caché (1.25×, la caché implícita escribe prefijos ≥1,024 tokens) · salida.
 * Dos bases: NOMINAL (tarifa estándar de entrada) y CONSERVADORA (la que usa el guard de presupuesto: entrada elegible a caché a tarifa de
 * escritura). El peor caso es el TOPE DURO que el código impone (`maxInputTokens`, `maxOutputTokens`): el dispatcher no despacha por encima.
 * SUPUESTOS (no mediciones): forma de la evidencia y tokens de salida (cost-latency-sim.ts). Hay que reemplazarlos con datos del canary.
 */
import { estimarCostoConservadorUsd, estimarCostoUsd } from '../shadow/pricing';
import { SHADOW_MODEL_CONFIG } from '../shadow/shadow-model-config';
import { SUPUESTOS_SIMULACION, percentil, simularConsulta } from './cost-latency-sim';

export const ESCALAS_COSTO = [1, 5, 10, 100, 1000, 10_000] as const;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DesgloseUsd {
  entradaSinCache: number;
  entradaEnCache: number;
  escrituraCache: number;
  salida: number;
  total: number;
}

/** Costo por componente de una consulta. `fraccionEnCache` ∈ [0,1]: parte de la entrada servida desde caché (lecturas). */
export function desgloseConsulta(entradaTokens: number, salidaTokens: number, base: 'NOMINAL' | 'CONSERVADORA', fraccionEnCache = 0): DesgloseUsd {
  const T = SHADOW_MODEL_CONFIG.pricing.standard;
  const enCache = Math.floor(entradaTokens * fraccionEnCache);
  const restantes = entradaTokens - enCache;
  const elegibleACache = restantes >= SHADOW_MODEL_CONFIG.pricing.minCacheableTokens;
  const tarifaEntrada = base === 'CONSERVADORA' && elegibleACache ? Math.max(T.inputUsdPerMillion, T.cacheWrite30mUsdPerMillion) : T.inputUsdPerMillion;
  const entradaSinCache = (elegibleACache && base === 'CONSERVADORA' ? 0 : restantes) * T.inputUsdPerMillion / 1e6;
  const escrituraCache = elegibleACache && base === 'CONSERVADORA' ? (restantes * tarifaEntrada) / 1e6 : 0;
  const entradaEnCacheUsd = (enCache * T.cachedInputUsdPerMillion) / 1e6;
  const salida = (salidaTokens * T.outputUsdPerMillion) / 1e6;
  return { entradaSinCache, entradaEnCache: entradaEnCacheUsd, escrituraCache, salida, total: entradaSinCache + entradaEnCacheUsd + escrituraCache + salida };
}

export interface FilaCosto {
  consultas: number;
  esperadoUsd: number;
  p95Usd: number;
  p99Usd: number;
  peorCasoUsd: number;
  /** Desglose del esperado por componente (base conservadora, sin caché). */
  desglose: DesgloseUsd;
}

export interface PaqueteCostos {
  base: 'NOMINAL' | 'CONSERVADORA';
  fraccionEnCache: number;
  filas: FilaCosto[];
}

/** Peor caso por consulta: el tope duro del guard (entrada máxima + salida máxima), a tarifa de escritura. */
export function peorCasoPorConsultaUsd(): number {
  return estimarCostoConservadorUsd(SHADOW_MODEL_CONFIG.maxInputTokens, SHADOW_MODEL_CONFIG.maxOutputTokens);
}

export function calcularPaquete(base: 'NOMINAL' | 'CONSERVADORA', fraccionEnCache = 0): PaqueteCostos {
  const rnd = mulberry32(SUPUESTOS_SIMULACION.semilla + 6);
  const muestras = Array.from({ length: 20_000 }, () => simularConsulta(rnd)).map((m) => desgloseConsulta(m.entradaTokens, m.salidaTokens, base, fraccionEnCache));
  const costos = muestras.map((m) => m.total);
  const media = costos.reduce((a, b) => a + b, 0) / costos.length;
  const sd = Math.sqrt(costos.reduce((a, b) => a + (b - media) ** 2, 0) / costos.length);
  const desgloseMedio: DesgloseUsd = {
    entradaSinCache: muestras.reduce((a, m) => a + m.entradaSinCache, 0) / muestras.length,
    entradaEnCache: muestras.reduce((a, m) => a + m.entradaEnCache, 0) / muestras.length,
    escrituraCache: muestras.reduce((a, m) => a + m.escrituraCache, 0) / muestras.length,
    salida: muestras.reduce((a, m) => a + m.salida, 0) / muestras.length,
    total: media,
  };
  const peor = peorCasoPorConsultaUsd();
  const filas = ESCALAS_COSTO.map((n): FilaCosto => {
    let p95: number;
    let p99: number;
    if (n <= 10) {
      // Totales exactos por Monte Carlo.
      const r = mulberry32(SUPUESTOS_SIMULACION.semilla + 100 + n);
      const totales = Array.from({ length: 20_000 }, () => {
        let t = 0;
        for (let i = 0; i < n; i++) t += costos[Math.floor(r() * costos.length)];
        return t;
      });
      p95 = percentil(totales, 95);
      p99 = percentil(totales, 99);
    } else {
      // Suma de muchas consultas: aproximación normal (teorema central del límite).
      p95 = media * n + 1.6449 * sd * Math.sqrt(n);
      p99 = media * n + 2.3263 * sd * Math.sqrt(n);
    }
    return {
      consultas: n, esperadoUsd: media * n, p95Usd: p95, p99Usd: p99, peorCasoUsd: peor * n,
      desglose: { entradaSinCache: desgloseMedio.entradaSinCache * n, entradaEnCache: desgloseMedio.entradaEnCache * n, escrituraCache: desgloseMedio.escrituraCache * n, salida: desgloseMedio.salida * n, total: media * n },
    };
  });
  return { base, fraccionEnCache, filas };
}

/**
 * Presupuesto duro RECOMENDADO para el primer canary: 1.5× el peor caso de `maxSolicitudes` consultas, redondeado hacia arriba al centavo.
 * Es una recomendación, no un valor aplicado: SHADOW_BUDGET_USD sigue en 0.
 */
export function presupuestoRecomendadoUsd(maxSolicitudes: number): number {
  return Math.ceil(peorCasoPorConsultaUsd() * maxSolicitudes * 1.5 * 100) / 100;
}

const usd = (n: number) => n.toFixed(6);

export function textoPaquete(p: PaqueteCostos): string {
  const L = [
    `Base ${p.base}${p.fraccionEnCache ? `, ${(p.fraccionEnCache * 100).toFixed(0)} % de la entrada servida desde caché` : ', sin aciertos de caché (consultas únicas)'}`,
    '',
    '| Consultas | Esperado | p95 | p99 | Peor caso (tope del guard) |',
    '|---:|---:|---:|---:|---:|',
    ...p.filas.map((f) => `| ${f.consultas.toLocaleString('en-US')} | ${usd(f.esperadoUsd)} | ${usd(f.p95Usd)} | ${usd(f.p99Usd)} | ${usd(f.peorCasoUsd)} |`),
    '',
    'Desglose del esperado (USD):',
    '',
    '| Consultas | Entrada sin caché | Entrada en caché | Escritura de caché | Salida | Total |',
    '|---:|---:|---:|---:|---:|---:|',
    ...p.filas.map((f) => `| ${f.consultas.toLocaleString('en-US')} | ${usd(f.desglose.entradaSinCache)} | ${usd(f.desglose.entradaEnCache)} | ${usd(f.desglose.escrituraCache)} | ${usd(f.desglose.salida)} | ${usd(f.desglose.total)} |`),
  ];
  return L.join('\n');
}

export function documentoCostos(): string {
  const A = calcularPaquete('NOMINAL');
  const B = calcularPaquete('CONSERVADORA');
  const C = calcularPaquete('CONSERVADORA', 1 / 2);
  const peor = peorCasoPorConsultaUsd();
  const T = SHADOW_MODEL_CONFIG.pricing;
  return [
    '# Paquete de costos para la autorización del primer canary — G6-H',
    '',
    `> Generado por \`npx tsx scripts/g6-cost-authorization.ts\`. Tarifas oficiales revalidadas el ${T.verifiedAt} (fuente: ${T.modelPageUrl}). El presupuesto real sigue en 0.`,
    '> Supuestos (no mediciones): 1–5 fragmentos por consulta, salida mediana 150 tokens; se reemplazan con datos reales del canary.',
    '',
    '## Peor caso por consulta (tope duro del código)',
    '',
    `Entrada máxima ${SHADOW_MODEL_CONFIG.maxInputTokens.toLocaleString('en-US')} tokens + salida máxima ${SHADOW_MODEL_CONFIG.maxOutputTokens} tokens, a tarifa de escritura de caché: **${usd(peor)} USD**. Una solicitud mayor no se despacha (el umbral de contexto largo, ${T.longContext.thresholdInputTokens.toLocaleString('en-US')} tokens, queda muy lejos).`,
    '',
    '## Base nominal (tarifa estándar de entrada)',
    '',
    textoPaquete(A),
    '',
    '## Base conservadora (la del guard de presupuesto: escritura de caché 1.25× cuando la entrada es elegible)',
    '',
    textoPaquete(B),
    '',
    '## Referencia: base conservadora con la mitad de la entrada servida desde caché',
    '',
    textoPaquete(C),
    '',
    '## Presupuesto duro recomendado para el primer canary',
    '',
    ...[5, 10].map((n) => `- ${n} solicitudes: peor caso ${usd(peor * n)} USD → presupuesto duro recomendado **${presupuestoRecomendadoUsd(n).toFixed(2)} USD** (1.5× el peor caso, redondeado al centavo).`),
    '',
    '**Es una recomendación.** `SHADOW_BUDGET_USD` y `maxBudgetUsd` siguen en 0; subirlos exige autorización expresa de Fredy y un cambio de código revisado.',
    '',
  ].join('\n');
}
