/**
 * lib/ai-gateway/shadow/entidades-publicas.ts
 * G6-C: registro CERRADO de nombres propios PÚBLICOS que pueden aparecer en una consulta jurídica legítima: autores y juristas
 * clásicos, casos y tribunales internacionales, empresas e instituciones de dominio público, lugares y tratados.
 *
 * Se usa solo para ENMASCARAR esos nombres antes de las comprobaciones de nombre propio (diccionario, mayúsculas, minúsculas).
 * Nunca enmascara antes de los detectores de identificadores (DNI, RTN, correo, teléfono…): un dato personal no se esconde tras
 * un nombre público. Solo hay coincidencia con la frase completa; un apellido suelto del registro no la activa.
 * Añadir un nombre es una decisión revisada: debe ser una figura, caso o entidad de dominio público, no una persona privada.
 */
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const ENTIDADES_PUBLICAS: readonly string[] = [
  // autores y juristas
  'Hans Kelsen', 'Eduardo Couture', 'Luigi Ferrajoli', 'Robert Alexy', 'Francesco Carnelutti', 'Ronald Dworkin', 'Claus Roxin',
  'Herbert Hart', 'H. L. A. Hart', 'Norberto Bobbio', 'John Rawls', 'Hans Welzel', 'Gunther Jakobs', 'Cesare Beccaria', 'Montesquieu',
  'Jean-Jacques Rousseau', 'John Locke', 'Thomas Hobbes', 'Immanuel Kant', 'Carl Schmitt', 'Gustav Radbruch', 'Giuseppe Chiovenda',
  'Piero Calamandrei', 'Hernando Devis Echandía', 'Eugenio Raúl Zaffaroni', 'Santiago Sentís Melendo', 'Andrés Bello', 'Francisco Morazán',
  'José Cecilio del Valle', 'Dionisio de Herrera', 'Hugo Grocio', 'Francisco de Vitoria', 'Rudolf von Jhering', 'Friedrich Carl von Savigny',
  // casos y tribunales
  'Velásquez Rodríguez', 'López Lone', 'Juan Humberto Sánchez', 'Godínez Cruz', 'Fairén Garbi', 'Kawas Fernández', 'Pacheco Teruel',
  'Servellón García', 'Marbury contra Madison', 'Marbury vs. Madison', 'Miranda contra Arizona', 'Almonacid Arellano', 'Barrios Altos',
  'Corte Interamericana de Derechos Humanos', 'Corte Penal Internacional', 'Corte Internacional de Justicia',
  // empresas e instituciones nombradas
  'Banco Atlántida', 'Banco Ficohsa', 'Banco Occidente', 'Banco de Occidente', 'Banpaís', 'Davivienda', 'Tigo', 'Cervecería Hondureña',
  'Empresa Nacional de Energía Eléctrica', 'Hondutel', 'Banco Central de Honduras', 'Banco Mundial', 'Fondo Monetario Internacional',
  'Organización de las Naciones Unidas', 'Organización de los Estados Americanos', 'Naciones Unidas',
  // instrumentos con nombre propio
  'Código Bustamante', 'Pacto de San José', 'Convención de Viena', 'Convenio de La Haya', 'Carta de las Naciones Unidas',
  // lugares
  'San Pedro Sula', 'Santa Rosa de Copán', 'Tegucigalpa', 'Comayagüela', 'Distrito Central', 'La Ceiba', 'Choluteca', 'El Progreso', 'Danlí',
  'Comayagua', 'Gracias a Dios', 'Islas de la Bahía', 'Roatán', 'Santa Bárbara', 'Tela', 'Olancho', 'Yoro', 'Lempira', 'Intibucá',
  'La Paz', 'Ocotepeque', 'Copán', 'Cortés', 'El Paraíso', 'Francisco Morazán', 'Estados Unidos', 'Centroamérica', 'Costa Rica', 'El Salvador',
  'Guatemala', 'Nicaragua', 'Panamá', 'España', 'México', 'Colombia', 'Chile', 'Argentina', 'Arizona', 'Madrid', 'La Haya', 'Viena', 'San José',
];

function patron(frase: string): RegExp {
  const cuerpo = sinTildes(frase)
    .split(/\s+/)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${cuerpo}(?![\\p{L}\\p{N}])`, 'giu');
}

const PATRONES = ENTIDADES_PUBLICAS.map(patron);

/**
 * Sustituye cada entidad pública (frase completa) por un espacio. El texto se compara sin tildes pero el resultado conserva el
 * original salvo en las posiciones enmascaradas. La normalización NFD cambia longitudes: se trabaja sobre el texto sin tildes y se devuelve ese.
 */
export function enmascararEntidadesPublicas(texto: string): string {
  let plano = texto.normalize('NFD').replace(/\p{M}/gu, '');
  for (const re of PATRONES) plano = plano.replace(re, ' ');
  return plano;
}
