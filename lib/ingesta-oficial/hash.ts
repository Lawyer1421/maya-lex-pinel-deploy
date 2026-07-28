/**
 * lib/ingesta-oficial/hash.ts
 * Checksums del pipeline de ingesta — SHA-256, sin dependencias externas.
 */
import { createHash } from 'crypto';

export function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

export function md5Corto(texto: string): string {
  return createHash('md5').update(texto, 'utf8').digest('hex');
}
