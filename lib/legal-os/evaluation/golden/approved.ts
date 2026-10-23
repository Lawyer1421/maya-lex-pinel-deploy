/**
 * lib/legal-os/evaluation/golden/approved.ts
 * Registro de casos con expectativa jurídica APROBADA por el CLO. Vacío: el CLO aún no ha aprobado ninguno.
 * Para añadir uno el CLO fija artículo/fecha/citas, `review_state: 'CLO_APPROVED'`, `suite: 'LEGAL_CLO_APPROVED'` y deja su decisión
 * trazable en `source_of_expectation`. Un agente no añade entradas aquí.
 */
import type { GoldenCase } from '../schema';

export const CASOS_CLO_APROBADOS: readonly GoldenCase[] = Object.freeze([]);
