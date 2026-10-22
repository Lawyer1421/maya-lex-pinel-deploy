/**
 * lib/ai-gateway/shadow/pii-gate.ts
 * PR-G2: compuerta de datos personales previa al despacho sombra.
 *
 * Fail-closed: ante la duda (falso positivo) se omite el despacho. Sólo corpus
 * público: una consulta con posibles datos personales no sale del flujo de
 * producción. El resultado nombra la categoría, nunca el dato detectado.
 */
export type CategoriaPii = 'EMAIL' | 'IDENTIDAD_RTN' | 'TELEFONO' | 'NOMBRE_CLIENTE' | 'EXPEDIENTE_FOLIO';

const PATRONES: ReadonlyArray<readonly [CategoriaPii, RegExp]> = [
  ['EMAIL', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/],
  // DNI (13 dígitos, 4-4-5) y RTN (14 dígitos), con o sin guiones; o la sigla seguida de un número.
  ['IDENTIDAD_RTN', /(?<!\d)\d{4}[-\s]?\d{4}[-\s]?\d{5,6}(?!\d)/],
  ['IDENTIDAD_RTN', /\b(?:RTN|DNI)\b[^\n]{0,20}?\d/i],
  // Teléfono hondureño de 8 dígitos (inicia en 2, 3, 8 o 9), con prefijo +504 opcional.
  ['TELEFONO', /(?<![\d-])(?:\+?504[\s-]?)?[2389]\d{3}[\s-]?\d{4}(?![\d-])/],
  // Nombre propio tras «mi cliente» (o variantes); en mayúsculas sostenidas también.
  ['NOMBRE_CLIENTE', /\b[Mm]i\s+[Cc]lient[ea]s?\s+(?:(?:el|la|don|do[ñn]a|se[ñn]or(?:a)?|sr\.?|sra\.?|licenciad[oa]|lic\.?)\s+)*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/],
  ['NOMBRE_CLIENTE', /\bMI\s+CLIENT[EA]S?\s+[A-ZÁÉÍÓÚÑ]{2,}/],
  // Número de expediente o folio.
  ['EXPEDIENTE_FOLIO', /\b(?:expediente|exp\.?|folio)\s*(?:n[úu]m(?:ero)?\.?|no\.?|n[°º]|#)?\s*[:\-]?\s*\d/i],
];

/** Devuelve la categoría detectada, o null si la consulta no tiene señales de datos personales. */
export function detectarPii(texto: string): CategoriaPii | null {
  for (const [categoria, patron] of PATRONES) {
    if (patron.test(texto)) return categoria;
  }
  return null;
}
