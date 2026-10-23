/**
 * lib/legal-os/launch/launch-core.ts
 * Congela el alcance LAUNCH CORE (Tier A) y calcula el estado de cada instrumento SOLO a partir de evidencia del repositorio:
 * inventario auditado (corpus-seed.json, derivado de MAYALEX_CORPUS_MASTER_INVENTORY_V1) y descubrimientos A/B.
 * Reglas: nada es AVAILABLE_VERIFIED sin aprobación humana V5 registrada (hoy ninguna); presente sin verificar = AVAILABLE_PARTIAL;
 * ausencia verificada = MISSING; solo descubierto = DISCOVERED_UNVERIFIED (descubrir NO es verificar); si el instrumento primario
 * tiene una nota que exige adjudicación del CLO = PENDING_CLO.
 */

export const ESTADOS_LAUNCH_CORE = ['AVAILABLE_VERIFIED', 'AVAILABLE_PARTIAL', 'OUTDATED', 'MISSING', 'DISCOVERED_UNVERIFIED', 'PENDING_CLO'] as const;
export type EstadoLaunchCore = (typeof ESTADOS_LAUNCH_CORE)[number];

export interface RegistroEvidencia {
  id: string;
  title?: string;
  presence?: string;
  outdated?: boolean;
  verification_state?: string;
  approvals?: Array<{ stage: string; approver: string; date: string }>;
  notes?: string[];
  discovery_only?: boolean;
}

/** Fila congelada del alcance. `seed`: ids en corpus-seed.json; `descubrimiento`: ids en DISCOVERY_A/B. `primarios`: los ids que SON el instrumento (no capas auxiliares). */
export interface FilaAlcance {
  id: string;
  instrumento: string;
  materia: string;
  seed: readonly string[];
  primarios?: readonly string[];
  descubrimiento: readonly string[];
  nota?: string;
}

export const ALCANCE_TIER_A: readonly FilaAlcance[] = Object.freeze([
  { id: 'CONSTITUCION', instrumento: 'Constitución de la República de Honduras', materia: 'CONSTITUTIONAL', seed: ['HN_CONSTITUCION'], descubrimiento: [] },
  { id: 'CODIGO_CIVIL', instrumento: 'Código Civil', materia: 'CIVIL', seed: ['HN_CODIGO_CIVIL'], descubrimiento: [] },
  {
    id: 'CODIGO_PROCESAL_CIVIL', instrumento: 'Código Procesal Civil', materia: 'CIVIL_PROCEDURE',
    seed: ['HN_CPC_PRIMARY_NORMATIVO', 'HN_CPC_PROCEDURAL_MIRROR', 'HN_CPC_TEXTO_BASE_D211_2006', 'HN_CPC_ROMERO_2024'],
    primarios: ['HN_CPC_PRIMARY_NORMATIVO', 'HN_CPC_TEXTO_BASE_D211_2006'], descubrimiento: [],
    nota: 'Cuatro capas; la comentada (Romero 2024) es doctrinal y no establece texto normativo.',
  },
  { id: 'CODIGO_PENAL', instrumento: 'Código Penal', materia: 'CRIMINAL', seed: ['HN_CODIGO_PENAL'], descubrimiento: [] },
  { id: 'CODIGO_PROCESAL_PENAL', instrumento: 'Código Procesal Penal', materia: 'CRIMINAL_PROCEDURE', seed: ['HN_CPP_D9_99E'], descubrimiento: [] },
  { id: 'CODIGO_COMERCIO', instrumento: 'Código de Comercio', materia: 'COMMERCIAL', seed: ['ABSENT_CODIGO_DE_COMERCIO_DECRETO_73_1950'], descubrimiento: ['HN_CODIGO_COMERCIO_D73_1950'] },
  { id: 'CODIGO_TRABAJO', instrumento: 'Código del Trabajo', materia: 'LABOR', seed: ['HN_CODIGO_TRABAJO'], descubrimiento: [] },
  { id: 'CODIGO_FAMILIA', instrumento: 'Código de Familia', materia: 'FAMILY', seed: ['HN_CODIGO_FAMILIA'], descubrimiento: [] },
  {
    id: 'CODIGO_NINEZ', instrumento: 'Código de la Niñez y de la Adolescencia', materia: 'FAMILY',
    seed: ['ABSENT_DECRETO_73_96_CODIGO_DE_LA_NINEZ_Y_LA_ADOLESCENCIA'], descubrimiento: ['HN_CODIGO_NINEZ_ADOLESCENCIA_D73_96'],
  },
  {
    id: 'LEGISLACION_NOTARIAL', instrumento: 'Código del Notariado / legislación notarial', materia: 'NOTARIAL',
    seed: ['HN_CODIGO_NOTARIADO_D353_2005', 'HN_RESOLUCION_PCSJ_17_2012'], primarios: ['HN_CODIGO_NOTARIADO_D353_2005'], descubrimiento: [],
  },
  { id: 'PROCEDIMIENTO_ADMINISTRATIVO', instrumento: 'Procedimiento administrativo', materia: 'ADMINISTRATIVE', seed: [], descubrimiento: ['HN_LEY_PROCEDIMIENTO_ADMINISTRATIVO', 'HN_LEY_JURISDICCION_CONTENCIOSO_ADMINISTRATIVA', 'HN_LEY_GENERAL_ADMINISTRACION_PUBLICA'] },
  { id: 'LEGISLACION_PROPIEDAD', instrumento: 'Legislación de propiedad', materia: 'PROPERTY', seed: [], descubrimiento: ['HN_LEY_PROPIEDAD'] },
  { id: 'CODIGO_TRIBUTARIO', instrumento: 'Código Tributario', materia: 'TAX', seed: ['HN_CODIGO_TRIBUTARIO'], descubrimiento: ['HN_LEY_IMPUESTO_SOBRE_VENTAS', 'HN_LEY_IMPUESTO_SOBRE_LA_RENTA'] },
  { id: 'LEGISLACION_ADUANERA', instrumento: 'Legislación aduanera', materia: 'CUSTOMS', seed: [], descubrimiento: ['HN_LEY_ADUANAS', 'HN_CAUCA_RECAUCA'] },
  {
    id: 'AML_CFT', instrumento: 'Legislación núcleo AML/CFT', materia: 'AML', seed: [],
    descubrimiento: ['HN_LEY_ESPECIAL_LAVADO_ACTIVOS', 'HN_LEY_REGULACION_APNFD', 'HN_LEY_DELITO_LAVADO_ACTIVOS_45_2002', 'HN_LEY_BENEFICIARIOS_FINALES'],
  },
  { id: 'BANCA_FINANCIERA', instrumento: 'Legislación núcleo bancaria/financiera', materia: 'BANKING', seed: [], descubrimiento: ['HN_LEY_SISTEMA_FINANCIERO'] },
]);

export interface FuentesLaunchCore {
  seed: readonly RegistroEvidencia[];
  descubrimientoA: ReadonlyArray<{ record: RegistroEvidencia }>;
  descubrimientoB: readonly RegistroEvidencia[];
}

const RE_ADJUDICACION_CLO = /CLO (adjudication|reconciliation)|legal status (pending|unresolved)/i;

export interface FilaLaunchCore {
  id: string;
  instrumento: string;
  materia: string;
  estado: EstadoLaunchCore;
  /** Siempre true hoy: ningún instrumento tiene aprobación humana V5 registrada. */
  pendiente_aprobacion_humana: boolean;
  motivo: string;
  evidencia: Array<{ archivo: string; ids: string[] }>;
  nota: string | null;
}

const ARCHIVO_SEED = 'docs/launch/data/corpus-seed.json';
const ARCHIVO_A = 'docs/launch/discovery/DISCOVERY_A_ABSENT_INSTRUMENTS.json';
const ARCHIVO_B = 'docs/launch/discovery/DISCOVERY_B_PENDING_MATTERS.json';

/** ¿El registro tiene una aprobación humana V5 (la condición mínima de AVAILABLE_VERIFIED)? */
const verificadoPorHumano = (r: RegistroEvidencia): boolean => r.verification_state === 'V5' && (r.approvals ?? []).some((a) => a.stage === 'V5' && a.approver.trim().length > 0);

export function construirLaunchCore(f: FuentesLaunchCore, alcance: readonly FilaAlcance[] = ALCANCE_TIER_A): FilaLaunchCore[] {
  const seed = new Map(f.seed.map((r) => [r.id, r]));
  const dA = new Map(f.descubrimientoA.map((x) => [x.record.id, x.record]));
  const dB = new Map(f.descubrimientoB.map((r) => [r.id, r]));
  return alcance.map((fila) => {
    const reg = fila.seed.map((id) => seed.get(id));
    const faltantes = fila.seed.filter((id) => !seed.has(id));
    if (faltantes.length) throw new Error(`launch-core: ids de seed inexistentes en ${fila.id}: ${faltantes.join(', ')}`);
    const idsD = fila.descubrimiento.filter((id) => dA.has(id) || dB.has(id));
    if (idsD.length !== fila.descubrimiento.length) throw new Error(`launch-core: ids de descubrimiento inexistentes en ${fila.id}`);
    const evidencia: FilaLaunchCore['evidencia'] = [];
    if (fila.seed.length) evidencia.push({ archivo: ARCHIVO_SEED, ids: [...fila.seed] });
    const idsA = fila.descubrimiento.filter((id) => dA.has(id));
    const idsB = fila.descubrimiento.filter((id) => dB.has(id));
    if (idsA.length) evidencia.push({ archivo: ARCHIVO_A, ids: idsA });
    if (idsB.length) evidencia.push({ archivo: ARCHIVO_B, ids: idsB });

    const presentes = reg.filter((r): r is RegistroEvidencia => !!r && r.presence !== 'ABSENT_VERIFIED');
    const primarios = (fila.primarios ?? fila.seed).map((id) => seed.get(id)!).filter((r) => r.presence !== 'ABSENT_VERIFIED');
    let estado: EstadoLaunchCore;
    let motivo: string;
    if (presentes.length > 0) {
      if (primarios.some((r) => r.outdated)) { estado = 'OUTDATED'; motivo = 'El inventario marca el instrumento primario como desactualizado.'; }
      else if (primarios.length > 0 && primarios.every(verificadoPorHumano)) { estado = 'AVAILABLE_VERIFIED'; motivo = 'Aprobación humana V5 registrada.'; }
      else if (primarios.some((r) => (r.notes ?? []).some((n) => RE_ADJUDICACION_CLO.test(n)))) { estado = 'PENDING_CLO'; motivo = 'Presente en el corpus, pero el inventario exige adjudicación del CLO sobre el estado legal del instrumento primario.'; }
      else { estado = 'AVAILABLE_PARTIAL'; motivo = 'Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada.'; }
    } else if (reg.length > 0) {
      estado = 'MISSING';
      motivo = idsD.length ? 'Ausencia verificada en el corpus; el descubrimiento solo aportó pistas no oficiales (sin URL ni hash).' : 'Ausencia verificada en el corpus.';
    } else if (idsD.length > 0) {
      estado = 'DISCOVERED_UNVERIFIED';
      motivo = 'Sin entrada en el inventario del corpus; solo candidatos de descubrimiento, sin URL oficial ni hash. Descubrir no es verificar.';
    } else {
      estado = 'MISSING';
      motivo = 'Sin evidencia en el repositorio.';
    }
    return { id: fila.id, instrumento: fila.instrumento, materia: fila.materia, estado, pendiente_aprobacion_humana: estado !== 'AVAILABLE_VERIFIED', motivo, evidencia, nota: fila.nota ?? null };
  });
}

export interface ResumenLaunchCore {
  total: number;
  porEstado: Record<EstadoLaunchCore, number>;
  /** Porcentajes sobre el total de filas, con un decimal. */
  cobertura: { verificada: number; enCorpusSinVerificar: number; ausente: number; soloDescubierta: number };
}

const pct = (n: number, total: number): number => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

export function resumirLaunchCore(filas: readonly FilaLaunchCore[]): ResumenLaunchCore {
  const porEstado = Object.fromEntries(ESTADOS_LAUNCH_CORE.map((e) => [e, filas.filter((x) => x.estado === e).length])) as Record<EstadoLaunchCore, number>;
  const t = filas.length;
  return {
    total: t, porEstado,
    cobertura: {
      verificada: pct(porEstado.AVAILABLE_VERIFIED, t),
      enCorpusSinVerificar: pct(porEstado.AVAILABLE_PARTIAL + porEstado.PENDING_CLO + porEstado.OUTDATED, t),
      ausente: pct(porEstado.MISSING, t),
      soloDescubierta: pct(porEstado.DISCOVERED_UNVERIFIED, t),
    },
  };
}

export function textoLaunchCore(filas: readonly FilaLaunchCore[]): string {
  const r = resumirLaunchCore(filas);
  const L = [
    '# LAUNCH_CORE_CORPUS_HN',
    '',
    '> Generado por `npx tsx scripts/generate-launch-core.ts`. Alcance Tier A congelado. Estados calculados SOLO con evidencia del repositorio',
    '> (`docs/launch/data/corpus-seed.json`, `docs/launch/discovery/*.json`). **Descubrir no es verificar**: ningún instrumento tiene aprobación humana V4/V5.',
    '',
    '## Estados',
    '',
    '`AVAILABLE_VERIFIED` aprobación humana V5 registrada · `AVAILABLE_PARTIAL` presente en el corpus sin verificar · `OUTDATED` desactualizado ·',
    '`MISSING` ausencia verificada · `DISCOVERED_UNVERIFIED` solo candidato de descubrimiento · `PENDING_CLO` el inventario exige adjudicación del CLO.',
    '',
    '## Cobertura',
    '',
    `Instrumentos Tier A: **${r.total}**.`,
    '',
    '| Estado | Instrumentos |',
    '|---|---:|',
    ...ESTADOS_LAUNCH_CORE.map((e) => `| ${e} | ${r.porEstado[e]} |`),
    '',
    `- Verificada (humano V5): **${r.cobertura.verificada} %**`,
    `- En el corpus, sin verificar (parcial + pendiente CLO + desactualizado): **${r.cobertura.enCorpusSinVerificar} %**`,
    `- Ausente (verificado): **${r.cobertura.ausente} %**`,
    `- Solo descubierta (sin URL ni hash): **${r.cobertura.soloDescubierta} %**`,
    '',
    '## Instrumentos',
    '',
    '| Instrumento | Materia | Estado | Motivo | Evidencia |',
    '|---|---|---|---|---|',
    ...filas.map((x) => `| ${x.instrumento} | ${x.materia} | ${x.estado} | ${x.motivo}${x.nota ? ` ${x.nota}` : ''} | ${x.evidencia.map((e) => `\`${e.archivo}\`: ${e.ids.join(', ')}`).join('<br>')} |`),
    '',
    'Para subir un instrumento: paquete oficial (OfficialSourcePackage) → validación de hash y fuente → QA del corpus → CLO → V4/V5. Hasta entonces, MayaLex se abstiene cuando no hay evidencia autoritativa.',
  ];
  return `${L.join('\n')}\n`;
}
