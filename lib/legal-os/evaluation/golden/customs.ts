import { plantillasMateria } from './_builder';

/** Sin inventario auditado (PENDING_VERIFICATION): el título es genérico y no afirma un decreto. */
export const GOLDEN_CUSTOMS = plantillasMateria({
  matter: 'Customs', etiqueta: 'aduanera',
  instrumento: { nombre: 'ley aduanera de Honduras', inventarioId: null, ausenteVerificado: false },
});
