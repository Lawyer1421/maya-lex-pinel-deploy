import { MATERIAS, type Materia } from '../schema';
import { aGoldenCase, esDeterminada, type GoldenTemplate } from './types';
import { GOLDEN_AML } from './aml';
import { GOLDEN_ADMINISTRATIVE } from './administrative';
import { GOLDEN_BANKING } from './banking';
import { GOLDEN_CIVIL } from './civil';
import { GOLDEN_CIVILPROCEDURE } from './civil-procedure';
import { GOLDEN_COMMERCIAL } from './commercial';
import { GOLDEN_CONSTITUTIONAL } from './constitutional';
import { GOLDEN_CRIMINAL } from './criminal';
import { GOLDEN_CRIMINALPROCEDURE } from './criminal-procedure';
import { GOLDEN_CUSTOMS } from './customs';
import { GOLDEN_FAMILY } from './family';
import { GOLDEN_LABOR } from './labor';
import { GOLDEN_NOTARIAL } from './notarial';
import { GOLDEN_PROPERTY } from './property';
import { GOLDEN_TAX } from './tax';

export * from './types';

export const GOLDEN_SETS: Readonly<Record<Materia, readonly GoldenTemplate[]>> = Object.freeze({
  Constitutional: GOLDEN_CONSTITUTIONAL,
  Civil: GOLDEN_CIVIL,
  CivilProcedure: GOLDEN_CIVILPROCEDURE,
  Criminal: GOLDEN_CRIMINAL,
  CriminalProcedure: GOLDEN_CRIMINALPROCEDURE,
  Commercial: GOLDEN_COMMERCIAL,
  Labor: GOLDEN_LABOR,
  Family: GOLDEN_FAMILY,
  Notarial: GOLDEN_NOTARIAL,
  Administrative: GOLDEN_ADMINISTRATIVE,
  Tax: GOLDEN_TAX,
  Customs: GOLDEN_CUSTOMS,
  AML: GOLDEN_AML,
  Banking: GOLDEN_BANKING,
  Property: GOLDEN_PROPERTY,
});

export type Preparacion = 'NOT_SCORABLE' | 'PARTIAL' | 'SCORABLE';
export interface ResumenMateria {
  matter: Materia;
  total: number;
  abstenciones: number;
  pendientesCLO: number;
  approved: number;
  preparacion: Preparacion;
}

/** Sin casos CLO_APPROVED no hay corrección jurídica calculable: NOT_SCORABLE. */
export function resumenGolden(sets: Readonly<Record<Materia, readonly GoldenTemplate[]>> = GOLDEN_SETS): ResumenMateria[] {
  return MATERIAS.map((matter) => {
    const casos = sets[matter] ?? [];
    const approved = casos.filter((c) => (c.review_state as string) === 'CLO_APPROVED').length;
    const abstenciones = casos.filter(esDeterminada).length;
    return {
      matter, total: casos.length, abstenciones, pendientesCLO: casos.length - abstenciones - approved, approved,
      preparacion: approved === 0 ? 'NOT_SCORABLE' : approved < casos.length ? 'PARTIAL' : 'SCORABLE',
    };
  });
}

export function textoEstadoGolden(): string {
  const r = resumenGolden();
  const L = [
    '# GOLDEN_SETS_STATUS',
    '',
    '> Generado por `npx tsx scripts/generate-golden-status.ts`. Plantillas para revisión del CLO: no afirman contenido jurídico.',
    '> `NOT_SCORABLE` = ningún caso `CLO_APPROVED`; la corrección jurídica no se puede calcular. Las abstenciones las determina el diseño del sistema; el resto queda `PENDIENTE_CLO`.',
    '',
    '| Materia | Casos | Abstenciones (diseño) | Pendientes CLO | CLO_APPROVED | Preparación |',
    '|---|---:|---:|---:|---:|---|',
    ...r.map((x) => `| ${x.matter} | ${x.total} | ${x.abstenciones} | ${x.pendientesCLO} | ${x.approved} | ${x.preparacion} |`),
    '',
    `Total: ${r.reduce((a, x) => a + x.total, 0)} casos; ${r.reduce((a, x) => a + x.approved, 0)} aprobados por el CLO.`,
    '',
    'Para completar una plantilla el CLO fija el artículo/fecha (marcadores `<N>`, `<FECHA>`), el texto esperado y las citas, y cambia `review_state` a `CLO_APPROVED` registrando su decisión.',
  ];
  return `${L.join('\n')}\n`;
}

export { aGoldenCase };
