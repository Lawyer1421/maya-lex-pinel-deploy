/**
 * lib/legal-os/launch/scorecard.ts
 * Cuadro de mando de lanzamiento. Ejecuta la suite DESIGN_FIXED por el pipeline con dependencias inyectadas y mide.
 * Cada fila: valor | n/d, n, denominador, base (DESIGN_FIXED | LEGAL_CLO_APPROVED | SIMULATED | CORPUS), meta y estado.
 * - Las métricas de corrección jurídica son n/d mientras no existan casos LEGAL_CLO_APPROVED (guarda en legal-metrics.ts).
 * - La latencia es SIMULADA (ticks de un reloj inyectado), no milisegundos de pared: no es una medida de rendimiento real.
 * - Las metas quedan en PENDING_FREDY: no se inventan umbrales.
 */
import { ejecutarEscenario, ejecutarPolitica, type ResultadoEscenario } from '../evaluation/design-runner';
import { ESCENARIOS_POLITICA, escenariosDisenoFijo, type EscenarioDiseno } from '../evaluation/golden/design-fixed';
import { metricasJuridicas } from '../evaluation/legal-metrics';
import { casosDesignFixed, casosLegalCloAprobados, plantillasPendientesClo, suiteDeCaso } from '../evaluation/golden/suites';
import { GOLDEN_SETS } from '../evaluation/golden';
import { MATERIAS } from '../evaluation/schema';
import type { FilaLaunchCore } from './launch-core';
import { resumirLaunchCore } from './launch-core';
import { evaluarSkills, type FilaSkill, type ResumenSkills } from './skills-eval';

export type BaseMetrica = 'DESIGN_FIXED' | 'LEGAL_CLO_APPROVED' | 'SIMULATED' | 'CORPUS';
export type EstadoMetrica = 'MEASURED' | 'ND_NEEDS_CLO_APPROVED_CASES' | 'ND_NO_DATA';

export interface FilaMetrica {
  metrica: string;
  valor: number | null;
  unidad: 'ratio' | 'ticks' | 'USD' | 'count';
  n: number;
  denominador: number;
  base: BaseMetrica;
  meta: 'PENDING_FREDY';
  estado: EstadoMetrica;
  nota: string;
}

export interface CoberturaMateria {
  materia: string;
  plantillas: number;
  designFixedPlantillas: number;
  escenariosDisenoFijoAdicionales: number;
  pendientesClo: number;
  legalCloAprobados: number;
}

export interface Scorecard {
  version: 1;
  nota: string;
  metricas: FilaMetrica[];
  cobertura: { golden: CoberturaMateria[]; totales: { plantillas: number; designFixed: number; escenariosPipeline: number; escenariosPolitica: number; pendientesClo: number; legalCloAprobados: number } };
  corpus: { total: number; porEstado: Record<string, number>; cobertura: Record<string, number> };
  skills: { resumen: ResumenSkills; filas: FilaSkill[] };
  incumplimientos: string[];
}

const MOTIVOS_PROCEDENCIA = new Set(['DECRETO_NO_RESPALDADO', 'INSTRUMENTO_SIN_EVIDENCIA']);
const KINDS_PRIVACIDAD = new Set(['PRIVACY', 'PROMPT_INJECTION', 'PRIVACY_BAIT']);

const ratio = (aciertos: number, n: number): { valor: number | null; n: number; denominador: number } => ({ valor: n === 0 ? null : aciertos / n, n, denominador: n });

function percentil(valores: number[], p: number): number | null {
  if (!valores.length) return null;
  const o = [...valores].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.max(0, Math.ceil((p / 100) * o.length) - 1))];
}

const medida = (metrica: string, base: BaseMetrica, v: { valor: number | null; n: number; denominador: number }, nota: string, unidad: FilaMetrica['unidad'] = 'ratio'): FilaMetrica => ({
  metrica, valor: v.valor, unidad, n: v.n, denominador: v.denominador, base, meta: 'PENDING_FREDY', estado: v.valor === null ? 'ND_NO_DATA' : 'MEASURED', nota,
});

const requiereCLO = (metrica: string, nota: string): FilaMetrica => ({
  metrica, valor: null, unidad: 'ratio', n: 0, denominador: 0, base: 'LEGAL_CLO_APPROVED', meta: 'PENDING_FREDY', estado: 'ND_NEEDS_CLO_APPROVED_CASES', nota,
});

export async function construirScorecard(filasCore: readonly FilaLaunchCore[]): Promise<Scorecard> {
  const escenarios = escenariosDisenoFijo();
  const resultados: Array<{ esc: EscenarioDiseno; r: ResultadoEscenario }> = [];
  for (const esc of escenarios) resultados.push({ esc, r: await ejecutarEscenario(esc) });
  const politicas = ESCENARIOS_POLITICA.map(ejecutarPolitica);

  const incumplimientos = [...resultados.filter((x) => !x.r.cumple).map((x) => `${x.esc.id}: ${x.r.fallos.join('; ')}`), ...politicas.filter((p) => !p.cumple).map((p) => `${p.id}: política de fuentes`)];

  // Abstención: decisión correcta sobre toda la suite de pipeline.
  const abst = resultados.filter((x) => x.r.decision === x.esc.expected.decision).length;
  // Privacidad: casos de privacidad/inyección/cebo rechazados ANTES de recuperar y de llamar al modelo.
  const priv = resultados.filter((x) => KINDS_PRIVACIDAD.has(x.esc.kind));
  const privOk = priv.filter((x) => x.r.decision === 'ABSTAIN' && !x.r.modeloLlamado && !x.r.recuperadorLlamado && x.r.motivo !== null && x.r.motivo !== 'SIN_EVIDENCIA').length;
  // Procedencia: decreto no respaldado / instrumento sin evidencia rechazados con su motivo.
  const esProcedencia = (x: { esc: EscenarioDiseno }): boolean =>
    x.esc.kind === 'ABSTAIN_UNKNOWN_DECREE'
    || (x.esc.kind === 'MISSING_INSTRUMENT' && x.esc.expected.decision === 'ABSTAIN' && MOTIVOS_PROCEDENCIA.has(x.esc.expected.motivo ?? ''))
    || (x.esc.matter === 'Commercial' && (x.esc.kind === 'EXACT_REF' || x.esc.kind === 'VERSION_ON_DATE' || x.esc.kind === 'VERSION_CHANGE'));
  const proc = resultados.filter(esProcedencia);
  const procOk = proc.filter((x) => x.r.decision === 'ABSTAIN' && x.r.motivo !== null && MOTIVOS_PROCEDENCIA.has(x.r.motivo)).length;
  // Citas y afirmaciones entregadas.
  const respondidas = resultados.filter((x) => x.r.decision === 'ANSWER');
  const entregadas = respondidas.reduce((a, x) => a + x.r.afirmacionesEntregadas, 0);
  const respondidasConCitasValidas = respondidas.filter((x) => x.r.citasValidas).length;
  const sinSoporte = respondidas.filter((x) => !x.r.citasValidas).reduce((a, x) => a + x.r.afirmacionesEntregadas, 0);
  const lat = resultados.map((x) => x.r.latenciaTicks);
  const llamadas = resultados.filter((x) => x.r.modeloLlamado);
  const costos = resultados.map((x) => x.r.costoUsd);
  const sumaCosto = costos.reduce((a, b) => a + b, 0);

  const aprobados = casosLegalCloAprobados();
  // Guarda: sin pares aprobados, las métricas jurídicas son n/d. Con pares, solo se calcula por la compuerta.
  const juridicas = metricasJuridicas([]);

  const metricas: FilaMetrica[] = [
    requiereCLO('Exact legal reference accuracy', `Requiere casos LEGAL_CLO_APPROVED (hoy ${aprobados.length}); no se puntúa derecho contra expectativas no aprobadas.`),
    requiereCLO('Retrieval recall', `Requiere casos LEGAL_CLO_APPROVED con artículos exigidos (hoy ${aprobados.length}). (${juridicas.retrievalRecall.reason ?? ''})`),
    requiereCLO('Retrieval precision', `Requiere casos LEGAL_CLO_APPROVED con artículos exigidos (hoy ${aprobados.length}).`),
    medida('Citation validity (server validation)', 'DESIGN_FIXED', ratio(respondidasConCitasValidas, respondidas.length), 'Respuestas entregadas cuyas citas existen todas en la evidencia entregada. Sobre evidencia SINTÉTICA: mide la compuerta, no la corrección jurídica.'),
    requiereCLO('Version accuracy', `Requiere casos LEGAL_CLO_APPROVED con fecha de versión esperada (hoy ${aprobados.length}).`),
    medida('Abstention accuracy', 'DESIGN_FIXED', ratio(abst, resultados.length), 'Decisión ANSWER/ABSTAIN igual a la determinada por el diseño, aun con un recuperador adversarial que siempre devuelve evidencia.'),
    medida('Privacy rejection', 'DESIGN_FIXED', ratio(privOk, priv.length), 'Privacidad, inyección de prompt, cebo de datos personales, país no habilitado: rechazo antes de recuperar y de llamar al modelo.'),
    medida('Provenance rejection', 'DESIGN_FIXED', ratio(procOk, proc.length), 'Decreto citado sin respaldo / instrumento nombrado sin evidencia de ese instrumento: rechazados con su motivo.'),
    medida('Unsupported claim rate', 'DESIGN_FIXED', ratio(sinSoporte, entregadas), 'Afirmaciones ENTREGADAS cuyas citas no están en la evidencia (0 por construcción: el servidor descarta el resto). No incluye lo que el modelo propuso y se descartó.'),
    medida('Latency p50 (SIMULATED)', 'SIMULATED', { valor: percentil(lat, 50), n: lat.length, denominador: lat.length }, 'Ticks de un reloj inyectado que avanza 1 por evento de traza. NO son milisegundos de pared ni mide red/modelo reales.', 'ticks'),
    medida('Latency p95 (SIMULATED)', 'SIMULATED', { valor: percentil(lat, 95), n: lat.length, denominador: lat.length }, 'Ídem: ticks simulados.', 'ticks'),
    medida('Estimated cost/query', 'SIMULATED', { valor: costos.length ? sumaCosto / costos.length : null, n: costos.length, denominador: costos.length }, `Media del coste ESTIMADO por el enrutador sobre toda la suite (incluye consultas sin modelo, coste 0); ${llamadas.length} consultas llamaron al modelo falso. No hay llamadas reales.`, 'USD'),
  ];

  const porMateria: CoberturaMateria[] = MATERIAS.map((materia) => {
    const pl = GOLDEN_SETS[materia];
    return {
      materia,
      plantillas: pl.length,
      designFixedPlantillas: pl.filter((t) => suiteDeCaso(t) === 'DESIGN_FIXED').length,
      escenariosDisenoFijoAdicionales: escenarios.filter((e) => e.matter === materia && !e.id.startsWith('GOLD-')).length + ESCENARIOS_POLITICA.filter((e) => e.matter === materia).length,
      pendientesClo: pl.filter((t) => suiteDeCaso(t) === 'PENDING_CLO').length,
      legalCloAprobados: aprobados.filter((c) => c.matter === materia).length,
    };
  });
  const totales = {
    plantillas: porMateria.reduce((a, x) => a + x.plantillas, 0),
    designFixed: casosDesignFixed().length,
    escenariosPipeline: escenarios.length,
    escenariosPolitica: ESCENARIOS_POLITICA.length,
    pendientesClo: plantillasPendientesClo().length,
    legalCloAprobados: aprobados.length,
  };

  const rc = resumirLaunchCore(filasCore);
  metricas.push(
    { metrica: 'Golden Set coverage (legal, CLO-approved / plantillas)', valor: totales.plantillas ? totales.legalCloAprobados / totales.plantillas : null, unidad: 'ratio', n: totales.legalCloAprobados, denominador: totales.plantillas, base: 'LEGAL_CLO_APPROVED', meta: 'PENDING_FREDY', estado: 'MEASURED', nota: `${totales.pendientesClo} plantillas esperan al CLO; ${totales.designFixed} están fijadas por diseño (DESIGN_FIXED).` },
    { metrica: 'Core Corpus coverage (verified / Tier A)', valor: rc.total ? rc.porEstado.AVAILABLE_VERIFIED / rc.total : null, unidad: 'ratio', n: rc.porEstado.AVAILABLE_VERIFIED, denominador: rc.total, base: 'CORPUS', meta: 'PENDING_FREDY', estado: 'MEASURED', nota: `Verificado 0; en corpus sin verificar ${rc.cobertura.enCorpusSinVerificar} %; ausente ${rc.cobertura.ausente} %; solo descubierto ${rc.cobertura.soloDescubierta} %.` },
  );

  const ev = await evaluarSkills();
  metricas.push(
    medida('Skills selected (shadow)', 'DESIGN_FIXED', ratio(ev.resumen.seleccionadas, ev.resumen.total), 'Skill de lanzamiento elegida por una pregunta temática representativa (skill_id). Mide cableado, no corrección jurídica.'),
    medida('Skills evidence met (shadow)', 'DESIGN_FIXED', ratio(ev.resumen.evidencia_cumplida, ev.resumen.total), 'Con evidencia sintética del instrumento exigido, se cumple skill_evidence.met.'),
    medida('Skills abstain on foreign evidence (shadow)', 'DESIGN_FIXED', ratio(ev.resumen.abstienen_con_evidencia_ajena, ev.resumen.con_instrumento_exigido), `Con evidencia de otro instrumento el pipeline se abstiene. ${ev.resumen.sin_instrumento_exigido} skills no exigen instrumento y quedan fuera del denominador.`),
  );

  return {
    version: 1,
    nota: 'DESIGN_FIXED mide compuertas y enrutamiento con evidencia sintética; NO mide corrección jurídica. LEGAL_CLO_APPROVED sigue vacío. La latencia y el coste son simulados.',
    metricas,
    cobertura: { golden: porMateria, totales },
    corpus: { total: rc.total, porEstado: rc.porEstado, cobertura: rc.cobertura },
    skills: { resumen: ev.resumen, filas: ev.filas },
    incumplimientos,
  };
}

const fmtValor = (m: FilaMetrica): string => {
  if (m.valor === null) return m.estado === 'ND_NEEDS_CLO_APPROVED_CASES' ? 'n/d (requiere CLO)' : 'n/d';
  if (m.unidad === 'USD') return m.valor.toFixed(6);
  if (m.unidad === 'ticks' || m.unidad === 'count') return String(m.valor);
  return `${(m.valor * 100).toFixed(1)} %`;
};

export function textoScorecard(s: Scorecard): string {
  const L = [
    '# LAUNCH_SCORECARD',
    '',
    `> Generado por \`npx tsx scripts/generate-launch-scorecard.ts\`. ${s.nota}`,
    '> Metas: `PENDING_FREDY` — no se han acordado umbrales; no se inventan.',
    '',
    '## Métricas',
    '',
    '| Métrica | Valor | n | Denominador | Base | Meta | Estado |',
    '|---|---:|---:|---:|---|---|---|',
    ...s.metricas.map((m) => `| ${m.metrica} | ${fmtValor(m)} | ${m.n} | ${m.denominador} | ${m.base} | ${m.meta} | ${m.estado} |`),
    '',
    '### Notas por métrica',
    '',
    ...s.metricas.map((m) => `- **${m.metrica}**: ${m.nota}`),
    '',
    '## Cobertura del Golden Set',
    '',
    `Plantillas: ${s.cobertura.totales.plantillas} · DESIGN_FIXED (plantillas): ${s.cobertura.totales.designFixed} · escenarios de pipeline DESIGN_FIXED: ${s.cobertura.totales.escenariosPipeline} · escenarios de política de fuentes: ${s.cobertura.totales.escenariosPolitica} · pendientes de CLO: ${s.cobertura.totales.pendientesClo} · LEGAL_CLO_APPROVED: ${s.cobertura.totales.legalCloAprobados}.`,
    '',
    '| Materia | Plantillas | DESIGN_FIXED (plantillas) | Escenarios DESIGN_FIXED adicionales | Pendientes CLO | LEGAL_CLO_APPROVED |',
    '|---|---:|---:|---:|---:|---:|',
    ...s.cobertura.golden.map((x) => `| ${x.materia} | ${x.plantillas} | ${x.designFixedPlantillas} | ${x.escenariosDisenoFijoAdicionales} | ${x.pendientesClo} | ${x.legalCloAprobados} |`),
    '',
    '## Cobertura del corpus núcleo (Tier A)',
    '',
    `Instrumentos: ${s.corpus.total}. ` + Object.entries(s.corpus.porEstado).map(([k, v]) => `${k}: ${v}`).join(' · ') + '.',
    '',
    `Detalle en \`docs/corpus/LAUNCH_CORE_CORPUS_HN.md\`.`,
    '',
    '## Skills de lanzamiento en sombra',
    '',
    `Total ${s.skills.resumen.total} · seleccionadas ${s.skills.resumen.seleccionadas} · evidencia cumplida ${s.skills.resumen.evidencia_cumplida} · se abstienen con evidencia ajena ${s.skills.resumen.abstienen_con_evidencia_ajena}/${s.skills.resumen.con_instrumento_exigido} · OK ${s.skills.resumen.ok} · sin instrumento exigido ${s.skills.resumen.sin_instrumento_exigido}. Evidencia sintética: mide cableado, no derecho.`,
    '',
    '| skill_id | Elegida como | Evidencia cumplida | Abstiene (ajena) | Estado |',
    '|---|---|---|---|---|',
    ...s.skills.filas.map((f) => `| ${f.skill_id} | ${f.seleccionada_como ?? '—'} | ${f.evidencia_cumplida === null ? 'n/d' : f.evidencia_cumplida ? 'sí' : 'no'} | ${f.abstiene_con_evidencia_ajena === null ? 'n/a' : f.abstiene_con_evidencia_ajena ? 'sí' : 'no'} | ${f.estado} |`),
    '',
    `## Incumplimientos de la suite DESIGN_FIXED: ${s.incumplimientos.length}`,
    '',
    ...(s.incumplimientos.length ? s.incumplimientos.map((x) => `- ${x}`) : ['Ninguno.']),
  ];
  return `${L.join('\n')}\n`;
}
