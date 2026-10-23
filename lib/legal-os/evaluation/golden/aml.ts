import { plantillasMateria } from './_builder';

/** Sin inventario auditado (PENDING_VERIFICATION): el título es genérico y no afirma un decreto. */
export const GOLDEN_AML = plantillasMateria({
  matter: 'AML', etiqueta: 'de prevención del lavado de activos',
  instrumento: { nombre: 'ley contra el lavado de activos', inventarioId: null, ausenteVerificado: false },
});
