import { plantillasMateria } from './_builder';

/** Sin inventario auditado (PENDING_VERIFICATION): el título es genérico y no afirma un decreto. */
export const GOLDEN_ADMINISTRATIVE = plantillasMateria({
  matter: 'Administrative', etiqueta: 'administrativa',
  instrumento: { nombre: 'Ley de Procedimiento Administrativo', inventarioId: null, ausenteVerificado: false },
});
