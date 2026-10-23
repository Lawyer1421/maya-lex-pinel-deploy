import { plantillasMateria } from './_builder';

/** Sin inventario auditado (PENDING_VERIFICATION): el título es genérico y no afirma un decreto. */
export const GOLDEN_BANKING = plantillasMateria({
  matter: 'Banking', etiqueta: 'bancaria',
  instrumento: { nombre: 'Ley del Sistema Financiero', inventarioId: null, ausenteVerificado: false },
});
