import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GoldenCase, type RunResult } from '@/lib/legal-os/evaluation/schema';
import { GOLDEN_SETS } from '@/lib/legal-os/evaluation/golden';
import { ESCENARIOS_PIPELINE, ESCENARIOS_POLITICA, escenariosDisenoFijo } from '@/lib/legal-os/evaluation/golden/design-fixed';
import { casosDesignFixed, casosLegalCloAprobados, plantillasPendientesClo, suiteDeCaso } from '@/lib/legal-os/evaluation/golden/suites';
import { SuiteNoAprobadaError, exigirSoloAprobadosCLO, metricasJuridicas } from '@/lib/legal-os/evaluation/legal-metrics';
import { ejecutarEscenario, ejecutarPolitica } from '@/lib/legal-os/evaluation/design-runner';
import { ALCANCE_TIER_A, construirLaunchCore, resumirLaunchCore, textoLaunchCore, type FuentesLaunchCore, type RegistroEvidencia } from '@/lib/legal-os/launch/launch-core';
import { construirScorecard, textoScorecard } from '@/lib/legal-os/launch/scorecard';

const RAIZ = join(__dirname, '..');
const leer = (...p: string[]) => readFileSync(join(RAIZ, ...p), 'utf8');
const json = (...p: string[]) => JSON.parse(leer(...p));
const fuentes = (): FuentesLaunchCore => ({
  seed: json('docs', 'launch', 'data', 'corpus-seed.json').records,
  descubrimientoA: json('docs', 'launch', 'discovery', 'DISCOVERY_A_ABSENT_INSTRUMENTS.json'),
  descubrimientoB: json('docs', 'launch', 'discovery', 'DISCOVERY_B_PENDING_MATTERS.json').records,
});

const caso = (over: Partial<GoldenCase> = {}): GoldenCase =>
  GoldenCase.parse({ id: 'X-1', matter: 'Civil', question: 'q', expected: { decision: 'ABSTAIN', mustCite: [], mustNotCite: [] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: 'pruebas unitarias', ...over });
const resultado = (id: string): RunResult => ({ caseId: id, decision: 'ABSTAIN', citations: [], claims: [], retrieved: [], evidenceIds: [], latencyMs: 1, costUsd: 0 });

describe('P7: suites DESIGN_FIXED vs LEGAL_CLO_APPROVED', () => {
  it('las 94 abstenciones de las plantillas son DESIGN_FIXED y las 56 restantes esperan al CLO; ninguna es LEGAL_CLO_APPROVED', () => {
    const plantillas = Object.values(GOLDEN_SETS).flat();
    expect(plantillas).toHaveLength(150);
    expect(plantillas.filter((t) => suiteDeCaso(t) === 'DESIGN_FIXED')).toHaveLength(94);
    expect(plantillasPendientesClo()).toHaveLength(56);
    expect(casosDesignFixed()).toHaveLength(94);
    expect(casosDesignFixed().every((c) => c.suite === 'DESIGN_FIXED' && suiteDeCaso(c) === 'DESIGN_FIXED')).toBe(true);
    expect(casosLegalCloAprobados()).toEqual([]);
  });
  it('un caso solo es LEGAL_CLO_APPROVED si el CLO lo aprobó; el esquema impide mezclar suites', () => {
    expect(suiteDeCaso(caso())).toBe('PENDING_CLO');
    expect(suiteDeCaso(caso({ review_state: 'CLO_APPROVED' }))).toBe('LEGAL_CLO_APPROVED');
    expect(suiteDeCaso(caso({ suite: 'DESIGN_FIXED' }))).toBe('DESIGN_FIXED');
    expect(() => caso({ suite: 'LEGAL_CLO_APPROVED' })).toThrow(/CLO_APPROVED/);
    expect(() => caso({ suite: 'DESIGN_FIXED', review_state: 'CLO_APPROVED' })).toThrow(/DESIGN_FIXED/);
  });
  it('GUARDA: las métricas de corrección jurídica rechazan casos DESIGN_FIXED y pendientes', () => {
    const diseno = caso({ suite: 'DESIGN_FIXED' });
    const pendiente = caso({ id: 'X-2' });
    expect(() => exigirSoloAprobadosCLO([{ caso: diseno, resultado: resultado('X-1') }])).toThrow(SuiteNoAprobadaError);
    expect(() => metricasJuridicas([{ caso: pendiente, resultado: resultado('X-2') }])).toThrow(/no es LEGAL_CLO_APPROVED/);
    expect(() => metricasJuridicas([{ caso: diseno, resultado: resultado('X-1') }, { caso: caso({ id: 'X-3', review_state: 'CLO_APPROVED' }), resultado: resultado('X-3') }])).toThrow(SuiteNoAprobadaError);
  });
  it('sin casos aprobados las métricas jurídicas son n/d con motivo, nunca un 100 % de relleno', () => {
    const m = metricasJuridicas([]);
    for (const v of Object.values(m)) expect(v.value).toBeNull();
    const aprobado = caso({ id: 'X-4', review_state: 'CLO_APPROVED' });
    expect(() => metricasJuridicas([{ caso: aprobado, resultado: resultado('X-4') }])).not.toThrow();
  });
  it('los escenarios de política y de pipeline son DESIGN_FIXED y usan evidencia sintética (sin números de artículo reales ni texto normativo)', () => {
    for (const e of [...ESCENARIOS_PIPELINE, ...ESCENARIOS_POLITICA]) expect(suiteDeCaso(e)).toBe('DESIGN_FIXED');
    const fuente = leer('lib', 'legal-os', 'evaluation', 'design-runner.ts');
    expect(fuente).toMatch(/Texto sintético de prueba \(no es derecho\)/);
  });
});

describe('P7: la suite DESIGN_FIXED completa a través del pipeline', () => {
  it('114 escenarios (94 plantillas + 20 ricos) cumplen su expectativa de diseño', async () => {
    const todos = escenariosDisenoFijo();
    expect(todos).toHaveLength(114);
    const incumplen: string[] = [];
    for (const e of todos) {
      const r = await ejecutarEscenario(e);
      if (!r.cumple) incumplen.push(`${e.id}: ${r.fallos.join('; ')}`);
    }
    expect(incumplen).toEqual([]);
  });
  it('cubre los tipos pedidos: enrutamiento, privacidad, política de fuentes, citas e instrumento ausente', () => {
    const tipos = new Set([...ESCENARIOS_PIPELINE.map((e) => e.kind), ...ESCENARIOS_POLITICA.map((e) => e.kind)]);
    for (const k of ['ROUTING', 'PRIVACY', 'SOURCE_POLICY', 'CITATION_BEHAVIOR', 'MISSING_INSTRUMENT']) expect(tipos.has(k as never), k).toBe(true);
  });
  it('enrutamiento: una consulta exacta con evidencia no llama al modelo; una consulta sin evidencia tampoco', async () => {
    const exacto = await ejecutarEscenario(ESCENARIOS_PIPELINE.find((e) => e.id === 'DF-ROUTING-01')!);
    expect(exacto).toMatchObject({ decision: 'ANSWER', rol: 'NONE', modeloLlamado: false });
    const vacio = await ejecutarEscenario(ESCENARIOS_PIPELINE.find((e) => e.id === 'DF-ROUTING-05')!);
    expect(vacio).toMatchObject({ decision: 'ABSTAIN', modeloLlamado: false });
  });
  it('citas: una cita fuera de la evidencia se rechaza y nunca se entrega', async () => {
    const r = await ejecutarEscenario(ESCENARIOS_PIPELINE.find((e) => e.id === 'DF-CITATION-03')!);
    expect(r).toMatchObject({ afirmacionesEntregadas: 1, citasValidas: true, estadoFinal: 'DEGRADED' });
    expect(r.citasRechazadas).toBe(1);
  });
  it('política de fuentes: la fuente no oficial no establece texto; el dominio de La Gaceta NO verificado no se acepta', () => {
    for (const p of ESCENARIOS_POLITICA) expect(ejecutarPolitica(p), p.id).toMatchObject({ cumple: true });
    expect(ejecutarPolitica(ESCENARIOS_POLITICA.find((p) => p.id === 'DF-SOURCE-05')!)).toMatchObject({ oficial: false, puedeEstablecerTexto: false });
  });
});

describe('P4: corpus núcleo de lanzamiento (Tier A)', () => {
  const filas = construirLaunchCore(fuentes());
  it('congela las 16 entradas del alcance y ninguna es AVAILABLE_VERIFIED', () => {
    expect(ALCANCE_TIER_A).toHaveLength(16);
    expect(filas).toHaveLength(16);
    expect(filas.filter((f) => f.estado === 'AVAILABLE_VERIFIED')).toEqual([]);
    expect(filas.every((f) => f.pendiente_aprobacion_humana)).toBe(true);
  });
  it('estados derivados solo de la evidencia: ausentes → MISSING, solo descubiertos → DISCOVERED_UNVERIFIED, presentes → PARTIAL/PENDING_CLO', () => {
    const e = Object.fromEntries(filas.map((f) => [f.id, f.estado]));
    expect(e.CODIGO_COMERCIO).toBe('MISSING');
    expect(e.CODIGO_NINEZ).toBe('MISSING');
    for (const id of ['PROCEDIMIENTO_ADMINISTRATIVO', 'LEGISLACION_PROPIEDAD', 'LEGISLACION_ADUANERA', 'AML_CFT', 'BANCA_FINANCIERA']) expect(e[id], id).toBe('DISCOVERED_UNVERIFIED');
    expect(e.LEGISLACION_NOTARIAL).toBe('PENDING_CLO');
    for (const id of ['CONSTITUCION', 'CODIGO_CIVIL', 'CODIGO_PROCESAL_CIVIL', 'CODIGO_PENAL', 'CODIGO_PROCESAL_PENAL', 'CODIGO_TRABAJO', 'CODIGO_FAMILIA', 'CODIGO_TRIBUTARIO']) expect(e[id], id).toBe('AVAILABLE_PARTIAL');
  });
  it('cobertura: 0 % verificada; 56.3 % en corpus sin verificar; 12.5 % ausente; 31.3 % solo descubierta', () => {
    const r = resumirLaunchCore(filas);
    expect(r.cobertura).toEqual({ verificada: 0, enCorpusSinVerificar: 56.3, ausente: 12.5, soloDescubierta: 31.3 });
    expect(r.porEstado).toMatchObject({ AVAILABLE_VERIFIED: 0, AVAILABLE_PARTIAL: 8, PENDING_CLO: 1, MISSING: 2, DISCOVERED_UNVERIFIED: 5, OUTDATED: 0 });
  });
  it('descubrir no es verificar: un candidato de descubrimiento (aun con muchos datos) nunca sube de DISCOVERED_UNVERIFIED', () => {
    const f = fuentes();
    const b: RegistroEvidencia[] = f.descubrimientoB.map((r) => ({ ...r, verification_state: 'V5', approvals: [] }));
    const x = construirLaunchCore({ ...f, descubrimientoB: b });
    expect(x.find((r) => r.id === 'LEGISLACION_PROPIEDAD')!.estado).toBe('DISCOVERED_UNVERIFIED');
  });
  it('solo una aprobación humana V5 registrada sobre un registro PRESENTE sube a AVAILABLE_VERIFIED', () => {
    const f = fuentes();
    const seed = f.seed.map((r) => (r.id === 'HN_CODIGO_CIVIL' ? { ...r, verification_state: 'V5', approvals: [{ stage: 'V5', approver: 'Persona de Prueba', date: '2026-10-23' }] } : r));
    expect(construirLaunchCore({ ...f, seed }).find((r) => r.id === 'CODIGO_CIVIL')!.estado).toBe('AVAILABLE_VERIFIED');
    const sinAprobador = f.seed.map((r) => (r.id === 'HN_CODIGO_CIVIL' ? { ...r, verification_state: 'V5', approvals: [] } : r));
    expect(construirLaunchCore({ ...f, seed: sinAprobador }).find((r) => r.id === 'CODIGO_CIVIL')!.estado).toBe('AVAILABLE_PARTIAL');
  });
  it('un id inexistente en la evidencia falla en voz alta (sin filas inventadas)', () => {
    expect(() => construirLaunchCore(fuentes(), [{ id: 'X', instrumento: 'X', materia: 'X', seed: ['NO_EXISTE'], descubrimiento: [] }])).toThrow(/inexistentes/);
  });
  it('determinista: los archivos commiteados coinciden con la regeneración', () => {
    expect(leer('docs', 'corpus', 'LAUNCH_CORE_CORPUS_HN.md')).toBe(textoLaunchCore(filas));
    expect(json('docs', 'launch', 'data', 'launch-core.json')).toEqual(JSON.parse(JSON.stringify({ alcance: 'Tier A', filas, resumen: resumirLaunchCore(filas) })));
  });
});

describe('P8: cuadro de mando de lanzamiento', () => {
  it('todas las métricas tienen valor|n/d, n, denominador, base, meta PENDING_FREDY y estado; las jurídicas son n/d', async () => {
    const s = await construirScorecard(construirLaunchCore(fuentes()));
    expect(s.incumplimientos).toEqual([]);
    for (const m of s.metricas) {
      expect(m.meta).toBe('PENDING_FREDY');
      expect(['DESIGN_FIXED', 'LEGAL_CLO_APPROVED', 'SIMULATED', 'CORPUS']).toContain(m.base);
      if (m.estado === 'ND_NEEDS_CLO_APPROVED_CASES') expect(m.valor).toBeNull();
    }
    const por = Object.fromEntries(s.metricas.map((m) => [m.metrica, m]));
    for (const k of ['Exact legal reference accuracy', 'Retrieval recall', 'Retrieval precision', 'Version accuracy']) expect(por[k].valor, k).toBeNull();
    expect(por['Abstention accuracy']).toMatchObject({ valor: 1, n: 114, base: 'DESIGN_FIXED' });
    expect(por['Latency p50 (SIMULATED)'].base).toBe('SIMULATED');
    expect(por['Core Corpus coverage (verified / Tier A)']).toMatchObject({ valor: 0, n: 0, denominador: 16 });
  });
  it('determinista: LAUNCH_SCORECARD.md y .json commiteados coinciden con la regeneración (reloj inyectado, sin reloj de pared)', async () => {
    const s = await construirScorecard(construirLaunchCore(fuentes()));
    expect(leer('docs', 'launch', 'LAUNCH_SCORECARD.md')).toBe(textoScorecard(s));
    expect(json('docs', 'launch', 'LAUNCH_SCORECARD.json')).toEqual(JSON.parse(JSON.stringify(s)));
  });
});
