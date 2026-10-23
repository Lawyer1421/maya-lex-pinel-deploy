/**
 * lib/legal-os/observability/redact.ts
 * Redacción de texto libre ANTES de exportar una traza. Es MEJOR ESFUERZO, no una garantía: el valor por defecto de la exportación es
 * NO exportar texto libre (solo hash + longitud). Este redactor existe para campos que un operador decida conservar explícitamente.
 * Independiente del gate de privacidad del gateway (aislamiento).
 */
import { createHash } from 'node:crypto';

export const REDACTED = '[REDACTADO]';

const PATRONES: ReadonlyArray<RegExp> = [
  // correo, incluso ofuscado con «(at)», «[at]» o «arroba»
  /[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sarroba\s)\s*[A-Za-z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\spunto\s)\s*[A-Za-z]{2,}/gi,
  // DNI hondureño 0000-0000-00000 y RTN de 14 dígitos, con separadores variados
  /\b\d{4}[\s.-]?\d{4}[\s.-]?\d{5}\b/g,
  /\b\d{4}[\s.-]?\d{4}[\s.-]?\d{6}\b/g,
  // teléfonos: +504 9999-9999, (504) 99999999, 9999-9999, 9999 9999
  /(?:\+|\()?\s*504\)?[\s.-]*\d{4}[\s.-]?\d{4}\b/g,
  /\b\d{4}[\s.-]\d{4}\b/g,
  // cualquier secuencia larga de dígitos (cuentas, expedientes, pasaportes numéricos)
  /\b\d[\d\s.-]{6,}\d\b/g,
  /\b\d{7,}\b/g,
];

const MARCAS =
  '(?:me llamo|mi nombre es|soy|mi cliente|mi representado|mi defendido|el se[ñn]or|la se[ñn]ora|se[ñn]ora?|sr\\.?|sra\\.?|lic\\.?|licenciad[oa]|abogad[oa]|dr\\.?|dra\\.?|do[ñn]a|don)';
/** Marcador explícito de nombre propio + hasta cuatro palabras capitalizadas (con «de», «de la», «del»). */
const MARCADOR_NOMBRE = new RegExp(
  `\\b(${MARCAS})\\s+(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:\\s+(?:de\\s+(?:la\\s+|los\\s+|las\\s+)?|del\\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}`,
  'gi',
);

export function redactarTexto(texto: string): string {
  let t = String(texto);
  for (const re of PATRONES) t = t.replace(re, REDACTED);
  t = t.replace(MARCADOR_NOMBRE, (_m, marca: string) => `${marca} ${REDACTED}`);
  return t;
}

export function hashTexto(texto: string): string {
  return createHash('sha256').update(String(texto), 'utf8').digest('hex').slice(0, 16);
}

/** Forma exportable por defecto de un texto libre: ni el contenido ni una versión redactada, solo huella y tamaño. */
export function huellaTexto(texto: string): { sha256_16: string; length: number } {
  return { sha256_16: hashTexto(texto), length: String(texto).length };
}
