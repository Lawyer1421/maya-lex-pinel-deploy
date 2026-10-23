import { plantillasMateria } from './_builder';

/** El Código de Comercio figura ABSENT_VERIFIED en el inventario auditado: las consultas exactas deben abstenerse hasta su ingesta y verificación. */
export const GOLDEN_COMMERCIAL = plantillasMateria({
  matter: 'Commercial', etiqueta: 'mercantil',
  instrumento: { nombre: 'Código de Comercio', inventarioId: null, ausenteVerificado: true },
});
