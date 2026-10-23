import { plantillasMateria } from './_builder';

/** Sin inventario auditado (PENDING_VERIFICATION): el título es genérico y no afirma un decreto. */
export const GOLDEN_PROPERTY = plantillasMateria({
  matter: 'Property', etiqueta: 'de propiedad',
  instrumento: { nombre: 'Ley de Propiedad', inventarioId: null, ausenteVerificado: false },
});
