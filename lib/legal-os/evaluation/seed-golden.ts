/**
 * lib/legal-os/evaluation/seed-golden.ts
 * Conjunto dorado inicial. SOLO dos tipos de caso, y todos PENDING_CLO_REVIEW:
 *  (a) fuera de alcance → se espera ABSTAIN (no afirman contenido jurídico);
 *  (b) referencias exactas tomadas TAL CUAL de tests/golden/gateway-g1-casos.ts (dictámenes del CLO ya en el repositorio).
 * No contiene respuestas jurídicas, ni artículos ni citas inventados. Una prueba exige que (b) coincida con ese archivo.
 */
import { GoldenCase } from './schema';

const G1 = 'tests/golden/gateway-g1-casos.ts';
const FUERA = 'Pregunta fuera de alcance jurídico: la expectativa no afirma contenido legal.';

const crudos: GoldenCase[] = [
  { id: 'SEED-OOS-RECETA', matter: 'Civil', question: 'Dame una receta de baleadas.', expected: { decision: 'ABSTAIN', mustCite: [], mustNotCite: [] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: FUERA },
  { id: 'SEED-OOS-FUTBOL', matter: 'Civil', question: '¿Quién ganó el último clásico de fútbol?', expected: { decision: 'ABSTAIN', mustCite: [], mustNotCite: [] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: FUERA },
  { id: 'SEED-OOS-CLIMA', matter: 'Civil', question: '¿Va a llover mañana en Tegucigalpa?', expected: { decision: 'ABSTAIN', mustCite: [], mustNotCite: [] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: FUERA },
  { id: 'G1-ABS-NOTARIADO-ART-500', matter: 'Notarial', question: '¿Qué dice el artículo 500 del Código del Notariado?', expected: { decision: 'ABSTAIN', mustCite: [], mustNotCite: [] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: `${G1} → G1-ABS-NOTARIADO-ART-500 (dictamen CLO: el art. 500 no existe)` },
  { id: 'G1-ABS-REGLAMENTO-ART-12-BIS', matter: 'Notarial', question: '¿Qué establece el artículo 12-BIS del Reglamento del Código del Notariado?', expected: { decision: 'ABSTAIN', mustCite: [], mustNotCite: [] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: `${G1} → G1-ABS-REGLAMENTO-ART-12-BIS (dictamen CLO: el art. 12-BIS no existe)` },
  { id: 'G1-REF-ART-173-B-CPP', matter: 'CriminalProcedure', question: '¿Qué dice el artículo 173-B del Código Penal?', expected: { decision: 'ANSWER', instrument: 'CPP', article: '173-B', mustCite: [{ instrumento: 'CPP', articulo: '173-B' }], mustNotCite: [{ instrumento: 'CODIGO_PENAL' }] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: `${G1} → G1-REF-ART-173-B-CPP (dictamen CLO: el 173-B pertenece al CPP, no al Código Penal)` },
  { id: 'G1-VIG-CODIGO-PENAL-130-2017', matter: 'Criminal', question: '¿Qué deroga el artículo 634 del Código Penal (Decreto 130-2017) y desde cuándo está vigente?', expected: { decision: 'ANSWER', instrument: 'CODIGO_PENAL_D130_2017', article: '634', mustCite: [{ instrumento: 'CODIGO_PENAL_D130_2017', articulo: '634' }], mustNotCite: [] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: `${G1} → G1-VIG-CODIGO-PENAL-130-2017` },
  { id: 'G1-ART-TRIBUTARIO-214', matter: 'Tax', question: '¿Qué dispone el artículo 214 del Código Tributario?', expected: { decision: 'ANSWER', instrument: 'CODIGO_TRIBUTARIO', article: '214', mustCite: [{ instrumento: 'CODIGO_TRIBUTARIO', articulo: '214' }], mustNotCite: [] }, review_state: 'PENDING_CLO_REVIEW', source_of_expectation: `${G1} → G1-ART-TRIBUTARIO-214` },
];

export const GOLDEN_SEED: readonly GoldenCase[] = crudos.map((c) => GoldenCase.parse(c));
