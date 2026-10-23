/**
 * lib/ai-gateway/shadow/pii-gate.ts
 * Etapas A y B del privacy gate (G2, ampliadas en G3): identificadores y señales de cliente, expediente o
 * documento privado. Fail-closed: ante la duda (falso positivo) se rechaza. El resultado nombra la categoría,
 * nunca el dato detectado. Sin LLM: solo expresiones regulares sobre el texto.
 *
 * Etapa A (identificadores): EMAIL, IDENTIDAD_RTN, TELEFONO, TARJETA_CUENTA, PASAPORTE, URL, NUMERO_LARGO.
 * Etapa B (cliente/expediente/documento privado): NOMBRE_CLIENTE, EXPEDIENTE_FOLIO, CLIENTE_O_PARTE,
 *   TRATAMIENTO_NOMBRE, DIRECCION, FORMA_SOCIETARIA.

 * G4-B añade: NOMBRE_COMPLETO, NUMERO_EN_PALABRAS, NUMERO_JUDICIAL (etapa B/A) y variantes de teléfono y correo.
 * El orden de los patrones es estable: los de G2 van primero y conservan su categoría.
 */
import { contieneDeApellido, contieneNombreCompleto, contieneNumeroEnPalabras } from './nombres-propios';
import { contieneNombreDePila } from './nombres-inequivocos';
import { enmascararEntidadesPublicas } from './entidades-publicas';

export type CategoriaPii =
  | 'EMAIL'
  | 'IDENTIDAD_RTN'
  | 'TELEFONO'
  | 'TARJETA_CUENTA'
  | 'PASAPORTE'
  | 'URL'
  | 'NUMERO_LARGO'
  | 'NOMBRE_CLIENTE'
  | 'EXPEDIENTE_FOLIO'
  | 'CLIENTE_O_PARTE'
  | 'TRATAMIENTO_NOMBRE'
  | 'DIRECCION'
  | 'FORMA_SOCIETARIA'
  | 'NOMBRE_COMPLETO'
  | 'NUMERO_EN_PALABRAS'
  | 'NUMERO_JUDICIAL'
  | 'PLACA'
  | 'PARIENTE_O_TERCERO'
  | 'INICIALES_NOMBRE'
  | 'NOMBRE_DE_PILA'
  | 'NOMBRE_AL_INICIO'
  | 'RELATO_PERSONAL';

export const ETAPA_POR_CATEGORIA: Readonly<Record<CategoriaPii, 'A' | 'B'>> = {
  EMAIL: 'A',
  IDENTIDAD_RTN: 'A',
  TELEFONO: 'A',
  TARJETA_CUENTA: 'A',
  PASAPORTE: 'A',
  URL: 'A',
  NUMERO_LARGO: 'A',
  NOMBRE_CLIENTE: 'B',
  EXPEDIENTE_FOLIO: 'B',
  CLIENTE_O_PARTE: 'B',
  TRATAMIENTO_NOMBRE: 'B',
  DIRECCION: 'B',
  FORMA_SOCIETARIA: 'B',
  NOMBRE_COMPLETO: 'B',
  NUMERO_EN_PALABRAS: 'A',
  NUMERO_JUDICIAL: 'B',
  PLACA: 'A',
  PARIENTE_O_TERCERO: 'B',
  INICIALES_NOMBRE: 'B',
  NOMBRE_DE_PILA: 'B',
  NOMBRE_AL_INICIO: 'B',
  RELATO_PERSONAL: 'B',
};

const MAYUS = 'A-ZÁÉÍÓÚÑ';
const MINUS = 'a-záéíóúñ';

const PATRONES: ReadonlyArray<readonly [CategoriaPii, RegExp]> = [
  // ── G2 (orden y categorías conservados) ────────────────────────────────────
  ['EMAIL', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/],
  // DNI (13 dígitos, 4-4-5) y RTN (14 dígitos), con o sin guiones; o la sigla seguida de un número.
  ['IDENTIDAD_RTN', /(?<!\d)\d{4}[-\s]?\d{4}[-\s]?\d{5,6}(?!\d)/],
  ['IDENTIDAD_RTN', /\b(?:RTN|DNI)\b[^\n]{0,20}?\d/i],
  // Teléfono de 8 dígitos (cualquier prefijo 2-9), con +504 opcional; o número internacional con «+».
  ['TELEFONO', /(?<![\d-])(?:\+?504[\s-]?)?[2-9]\d{3}[\s-]?\d{4}(?![\d-])/],
  ['TELEFONO', /\+\d{1,3}[\s-]?\d{3,}/],
  // Nombre propio tras «mi cliente» (o variantes); en mayúsculas sostenidas también.
  ['NOMBRE_CLIENTE', new RegExp(String.raw`\b[Mm]i\s+[Cc]lient[ea]s?\s+(?:(?:el|la|don|do[ñn]a|se[ñn]or(?:a)?|sr\.?|sra\.?|licenciad[oa]|lic\.?)\s+)*[${MAYUS}][${MINUS}]+`)],
  ['NOMBRE_CLIENTE', new RegExp(String.raw`\bMI\s+CLIENT[EA]S?\s+[${MAYUS}]{2,}`)],
  // Número de expediente o folio.
  ['EXPEDIENTE_FOLIO', /\b(?:expediente|exp\.?|folio)\s*(?:n[úu]m(?:ero)?\.?|no\.?|n[°º]|#)?\s*[:\-]?\s*\d/i],

  // ── G3: etapa A ────────────────────────────────────────────────────────────
  // Correo ofuscado: «juan arroba gmail punto com», «juan (at) gmail (dot) com».
  ['EMAIL', /[\w.+-]+\s*(?:\(at\)|\[at\]|\(arroba\)|\barroba\b)\s*[\w-]+\s*(?:\.|\(dot\)|\[dot\]|\bpunto\b)\s*[a-z]{2,}/i],
  // Tarjeta o cuenta: 13 a 19 dígitos con separadores opcionales, o la palabra clave seguida de dígitos.
  ['TARJETA_CUENTA', /(?<![\d-])(?:\d[ -]?){13,19}(?![\d-])/],
  ['TARJETA_CUENTA', /\b(?:cuenta|iban|tarjeta|cvv|clabe)\b[^\n]{0,25}\d/i],
  ['PASAPORTE', /\bpasaporte\b[^\n]{0,25}[A-Z0-9]{5,}/i],
  ['URL', /\b(?:https?:\/\/|www\.)\S+/i],
  ['URL', /\b[a-z0-9-]+\.(?:com|org|net|hn|gob|edu)\b/i],
  // Cualquier secuencia de 5 o más dígitos que no sea parte de un número de artículo, decreto o año.
  ['NUMERO_LARGO', /(?<![\d-])\d{5,}(?![\d-])/],

  // ── G3: etapa B ────────────────────────────────────────────────────────────
  ['CLIENTE_O_PARTE', /\b(?:mi|mis|nuestro|nuestra|nuestros|nuestras)\s+(?:cliente|clienta|representad[oa]|defendid[oa]|patrocinad[oa]|poderdante|caso|expediente|demanda|denuncia)s?\b/i],
  // Tratamiento o calidad procesal seguidos de un nombre propio.
  ['TRATAMIENTO_NOMBRE', new RegExp(String.raw`\b(?:[Ss]e[ñn]or(?:a|ita)?|[Ss]r\.?|[Ss]ra\.?|[Dd]on|[Dd]o[ñn]a|[Ll]ic(?:enciad[oa])?\.?|[Aa]bogad[oa]|[Dd]r\.?|[Dd]ra\.?|[Ii]ng\.?|[Cc]liente|[Ii]mputad[oa]|[Aa]cusad[oa]|[Dd]emandad[oa]|[Dd]emandante|[Pp]rocesad[oa]|[Qq]uerellante)\s+(?:(?:el|la|de|del)\s+)?[${MAYUS}][${MINUS}]+`)],
  ['EXPEDIENTE_FOLIO', /\b(?:causa|radicado|tomo)\s*(?:n[úu]m(?:ero)?\.?|no\.?|n[°º]|#)?\s*[:\-]?\s*\d/i],
  // Dirección: palabra clave seguida de un número o de una palabra capitalizada.
  ['DIRECCION', new RegExp(String.raw`\b(?:[Cc]olonia|[Bb]arrio|[Rr]esidencial|[Aa]venida|[Cc]alle|[Bb]ulevar|[Bb]loque|[Aa]partamento|[Kk]m)\s+(?:[Nn]o\.?\s*)?(?:#\s*)?(?:\d|[${MAYUS}][${MINUS}]+)`)],
  ['FORMA_SOCIETARIA', /\b(?:S\.\s?A\.(?:\s?de\s?C\.\s?V\.)?|S\.\s?de\s?R\.\s?L\.?|Ltda\.?|Inc\.?|Corp\.?)(?=\W|$)/],

  // ── G4-B ───────────────────────────────────────────────────────────────────
  // Correo con espacios alrededor de «@» y del punto: «juan @ gmail . com».
  ['EMAIL', /[\w.+-]+\s*@\s*[\w-]+\s*\.\s*[a-z]{2,}/i],
  // Correo ofuscado con «at»/«dot» entre corchetes o palabras: «juan [at] gmail [dot] com», «juan at gmail dot com».
  ['EMAIL', /[\w.+-]+\s+(?:at|arroba)\s+[\w-]+\s+(?:dot|punto)\s+[a-z]{2,}/i],
  // Teléfono partido en pares («99 88 77 66»), con paréntesis «(504) 9988-7766» o precedido de una palabra clave.
  ['TELEFONO', /(?<![\d-])\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}(?![\d-])/],
  ['TELEFONO', /\(\+?\d{2,4}\)\s*\d{3,4}[\s-]?\d{3,4}/],
  ['TELEFONO', /\b(?:tel|tel[eé]fono|celular|cel|whatsapp|fono|contacto)\b[^\n]{0,20}\d{3}/i],
  ['TARJETA_CUENTA', /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/],
  ['PASAPORTE', /\bpassport\b[^\n]{0,25}[A-Z0-9]{5,}/i],
  // Número judicial: palabra procesal + número con guion (o largo), o código de tribunal tipo «SCA-0123-2021».
  ['NUMERO_JUDICIAL', /\b(?:caso|proceso|juicio|recurso|amparo|auto|sentencia|resoluci[oó]n|demanda|denuncia|apelaci[oó]n|casaci[oó]n|querella)\s*(?:n[úu]m(?:ero)?\.?|no\.?|n[°º]|#)?\s*[:\-]?\s*\d[\d-]*\d(?!\w)/i],
  ['NUMERO_JUDICIAL', /\b(?!PCSJ\b)[A-Z]{1,5}-\d{2,6}-\d{2,4}\b/],

  // ── G5-B (adversarial) ─────────────────────────────────────────────────────
  // Teléfono con separador suelto («9876 - 5432», «9876.5432») o dígitos sueltos («9 8 7 6 5 4 3 2»).
  ['TELEFONO', /(?<![\d-])\d{4}(?:\s+[-.]\s*|\.\s*|\s*[-]\s+)\d{4}(?![\d-])/],
  ['TELEFONO', /(?<!\d)(?:\d\s){5,}\d(?!\d)/],
  // Identificadores judiciales no estándar: «rol 2022-0456-PEN», «carpeta fiscal MP-2021-8841», «L-14/22».
  ['NUMERO_JUDICIAL', /\b(?:rol|carpeta(?:\s+fiscal)?|legajo|sumario)\s*(?:n[úu]m(?:ero)?\.?|no\.?|n[°º]|#)?\s*[:\-]?\s*[A-Z0-9-]*\d/i],
  ['NUMERO_JUDICIAL', /\b[A-Z]{1,3}-\d{1,4}\/\d{2,4}\b/],
  // Placa de vehículo («HAB-1234»).
  ['PLACA', /\b[A-Z]{3}[- ]?\d{4}\b/],
  // Terceros identificables por parentesco o relación («mi esposa», «mi vecino»): relato privado, no pregunta abstracta.
  ['PARIENTE_O_TERCERO', /\b(?:mi|mis)\s+(?:esposa|esposo|hij[oa]s?|madre|padre|hermano|hermana|vecin[oa]|jefe|socio|socia|novia|novio|suegr[oa]|abuel[oa]|tio|tia|primo|prima)\b/i],
  // Iniciales seguidas de apellido: «J. A. Hernández», «M.L. Pérez».
  ['INICIALES_NOMBRE', new RegExp(String.raw`\b[${MAYUS}]\.\s?(?:[${MAYUS}]\.\s?)*[${MAYUS}][${MINUS}]+`)],

  // ── G6-C (ronda 2) ─────────────────────────────────────────────────────────
  // Correo ofuscado con «en»/«arroba» y «punto» entre palabras o paréntesis: «abogado en gmail punto com», «ju4n(arroba)hotmail(punto)com».
  // Relato en primera persona sobre bienes, empleo o deudas propias: situación personal, no consulta abstracta.
  ['RELATO_PERSONAL', /\b(?:me|nos)\s+(?:despidi|embarg|demand|denunci|detuvo|detuvieron|multo|multaron|estaf|robo|robaron|desalojo|desalojaron|quito|quitaron|cobr|amenaz|agredi|notific|citaron|citaron)\w*/i],
  ['RELATO_PERSONAL', /\b(?:mi|mis|nuestro|nuestra)\s+(?:jefe|jefa|patrono|patrona|empleador|empleadora|casa|finca|terreno|lote|empresa|negocio|salario|sueldo|deuda|prestamo|préstamo|inquilino|inquilina|arrendador|arrendadora|socio|socia|banco|abogado|abogada|hija|hijo|nieto|nieta|abuelo|abuela|cuñado|cuñada|yerno|nuera|sobrino|sobrina|pareja|ex|exesposo|exesposa|compañero|compañera)\b/i],
  ['EMAIL', /[\w.+-]+\s+en\s+[\w-]+\s+punto\s+(?:com|net|org|hn|es|edu|gob|info)\b/i],
  ['EMAIL', /[\w.+-]+\s*(?:\(arroba\)|\[arroba\]|\(at\)|\[at\])\s*[\w-]+\s*(?:\(punto\)|\[punto\]|\(dot\)|\[dot\])\s*[a-z]{2,}/i],
  // Identidad (13 dígitos) o RTN (14) parcialmente enmascarados con asteriscos: «0801-1990-1****».
  ['IDENTIDAD_RTN', /(?<![\w*])\d{4}[-\s]?\d{4}[-\s]?(?=[\d*]*\*)[\d*]{4,6}(?![\w*])/],
];

// Tratamiento seguido de un nombre en MINÚSCULA («el señor tomás aguilera», «don telmo»). Se excluyen los cargos y roles procesales.
const TITULOS = /(?<![a-z])(senor|senora|senorita|dona|don|sr|sra|srta|licenciado|licenciada|lic|ingeniero|ingeniera|ing|doctor|doctora|dr|dra)\.?\s+([a-z]{3,})/g;
const CARGOS_Y_ROLES: ReadonlySet<string> = new Set([
  'juez', 'jueza', 'notario', 'notaria', 'fiscal', 'magistrado', 'magistrada', 'presidente', 'presidenta', 'secretario', 'secretaria',
  'alcalde', 'alcaldesa', 'director', 'directora', 'ministro', 'ministra', 'procurador', 'procuradora', 'perito', 'registrador',
  'registradora', 'abogado', 'abogada', 'defensor', 'defensora', 'testigo', 'arrendador', 'arrendatario', 'comprador', 'vendedor',
  'deudor', 'acreedor', 'patrono', 'trabajador', 'empleador', 'propietario', 'poseedor', 'demandante', 'demandado', 'imputado',
  'acusado', 'condenado', 'cliente', 'usuario', 'consumidor', 'contribuyente', 'funcionario', 'empleado', 'apoderado', 'mandatario',
  'representante', 'tutor', 'curador', 'heredero', 'legatario', 'albacea', 'conyuge', 'esposo', 'esposa', 'padre', 'madre', 'hijo',
  'hija', 'menor', 'ciudadano', 'ciudadana', 'inquilino', 'inquilina', 'gerente', 'administrador', 'administradora', 'tesorero',
  'sindico', 'liquidador', 'comisionado', 'diputado', 'diputada', 'regidor', 'regidora', 'fedatario', 'oficial', 'agente',
]);

function tituloSeguidoDeNombre(textoSinTildes: string): boolean {
  for (const m of textoSinTildes.toLowerCase().matchAll(TITULOS)) if (!CARGOS_Y_ROLES.has(m[2])) return true;
  return false;
}

/** Devuelve la categoría detectada, o null si el texto no tiene señales de las etapas A o B. */
export function detectarPii(texto: string): CategoriaPii | null {
  for (const [categoria, patron] of PATRONES) {
    if (patron.test(texto)) return categoria;
  }
  // Detección por diccionario (sin importar mayúsculas): pares nombre/apellido y dígitos escritos con palabras.
  if (contieneNumeroEnPalabras(texto)) return 'NUMERO_EN_PALABRAS';
  // Nombres: los nombres públicos del registro (autores, casos, instituciones, lugares) se enmascaran antes de estas comprobaciones.
  const sinPublicos = enmascararEntidadesPublicas(texto);
  if (tituloSeguidoDeNombre(sinPublicos)) return 'TRATAMIENTO_NOMBRE';
  if (contieneNombreCompleto(sinPublicos)) return 'NOMBRE_COMPLETO';
  if (contieneNombreDePila(sinPublicos)) return 'NOMBRE_DE_PILA';
  if (contieneDeApellido(sinPublicos)) return 'NOMBRE_COMPLETO';
  return null;
}
