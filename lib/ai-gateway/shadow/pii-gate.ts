/**
 * lib/ai-gateway/shadow/pii-gate.ts
 * Etapas A y B del privacy gate (G2, ampliadas en G3): identificadores y señales de cliente, expediente o
 * documento privado. Fail-closed: ante la duda (falso positivo) se rechaza. El resultado nombra la categoría,
 * nunca el dato detectado. Sin LLM: solo expresiones regulares sobre el texto.
 *
 * Etapa A (identificadores): EMAIL, IDENTIDAD_RTN, TELEFONO, TARJETA_CUENTA, PASAPORTE, URL, NUMERO_LARGO.
 * Etapa B (cliente/expediente/documento privado): NOMBRE_CLIENTE, EXPEDIENTE_FOLIO, CLIENTE_O_PARTE,
 *   TRATAMIENTO_NOMBRE, DIRECCION, FORMA_SOCIETARIA.
 * El orden de los patrones es estable: los de G2 van primero y conservan su categoría.
 */
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
  | 'FORMA_SOCIETARIA';

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
];

/** Devuelve la categoría detectada, o null si el texto no tiene señales de las etapas A o B. */
export function detectarPii(texto: string): CategoriaPii | null {
  for (const [categoria, patron] of PATRONES) {
    if (patron.test(texto)) return categoria;
  }
  return null;
}
