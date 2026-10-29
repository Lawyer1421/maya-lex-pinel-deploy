/**
 * lib/legal-retrieval/r3-objetivos.ts
 * Instrumento y artículo CONSULTADOS por la pregunta, para la suficiencia R3 del clasificador compartido (clo-guards.ts). Función pura:
 * usa los mismos detectores que la recuperación exacta, sin red ni base de datos.
 */
import type { ObjetivoConsulta } from './clo-guards';
import { detectarArticuloExacto } from './exact-resolver';
import { clasificarIntencionInstrumental } from './instrument-gate';

export function objetivosDeConsulta(pregunta: string): ObjetivoConsulta[] {
  const det = detectarArticuloExacto(pregunta);
  const intencion = clasificarIntencionInstrumental(pregunta);
  if (det) {
    const unico = intencion.identidades.length === 1 ? intencion.identidades[0] : null;
    return [{ instrumentId: det.instrumento ?? unico, articulo: det.numero }];
  }
  return intencion.identidades.map((instrumentId) => ({ instrumentId, articulo: null }));
}
