/**
 * lib/legal-os/evaluation/golden/suites.ts
 * Clasificación explícita de los casos en suites:
 *  - DESIGN_FIXED: la expectativa la determina el diseño del sistema (abstención, enrutamiento, privacidad, política de fuentes,
 *    comportamiento de citas, instrumento ausente). No afirma derecho.
 *  - LEGAL_CLO_APPROVED: la expectativa jurídica (proposición, artículo, versión, reforma, cita) fue aprobada por el CLO.
 *  - PENDING_CLO: plantilla o caso sin expectativa aprobada. NO puntúa corrección jurídica.
 * Hoy no hay ningún caso LEGAL_CLO_APPROVED: la corrección jurídica no se calcula.
 */
import { GoldenCase } from '../schema';
import { GOLDEN_SETS } from './index';
import { aGoldenCase, esDeterminada, type GoldenTemplate } from './types';
import { CASOS_CLO_APROBADOS } from './approved';
import type { EscenarioDiseno, EscenarioPolitica } from './design-fixed';

export type SuiteGolden = 'DESIGN_FIXED' | 'LEGAL_CLO_APPROVED' | 'PENDING_CLO';

export type ElementoDeSuite = GoldenTemplate | GoldenCase | EscenarioDiseno | EscenarioPolitica;

/** Suite de un elemento. Un caso solo es LEGAL_CLO_APPROVED con review_state CLO_APPROVED y sin declararse DESIGN_FIXED. */
export function suiteDeCaso(x: ElementoDeSuite): SuiteGolden {
  if ('setup' in x || (x as EscenarioPolitica).kind === 'SOURCE_POLICY') return 'DESIGN_FIXED';
  if ('placeholders' in x) return esDeterminada(x as GoldenTemplate) ? 'DESIGN_FIXED' : 'PENDING_CLO';
  const c = x as GoldenCase;
  if (c.suite === 'DESIGN_FIXED') return c.review_state === 'CLO_APPROVED' ? 'PENDING_CLO' : 'DESIGN_FIXED';
  return c.review_state === 'CLO_APPROVED' ? 'LEGAL_CLO_APPROVED' : 'PENDING_CLO';
}

/** Las abstenciones de las plantillas, como GoldenCase válidos (suite DESIGN_FIXED). */
export function casosDesignFixed(): GoldenCase[] {
  return Object.values(GOLDEN_SETS).flat().map(aGoldenCase).filter((c): c is GoldenCase => c !== null);
}

/** Casos con expectativa jurídica aprobada por el CLO. Hoy: ninguno. */
export function casosLegalCloAprobados(): GoldenCase[] {
  return CASOS_CLO_APROBADOS.map((c) => GoldenCase.parse(c)).filter((c) => suiteDeCaso(c) === 'LEGAL_CLO_APPROVED');
}

/** Plantillas aún sin expectativa aprobada (esperan al CLO). */
export function plantillasPendientesClo(): GoldenTemplate[] {
  return Object.values(GOLDEN_SETS).flat().filter((t) => suiteDeCaso(t) === 'PENDING_CLO');
}
