/**
 * lib/legal-retrieval/jurisdiccion-consulta.ts
 * País objetivo de una consulta para el retrieval multi-jurisdicción v3 (detrás de flag_multi_jurisdiccion_v3).
 * Módulo puro. Diseño: docs/retrieval/MULTI_JURISDICTION_V3_TECHNICAL_DESIGN.md (§3, invariante 3).
 *
 * Se resuelve UNA vez por consulta y se propaga tipado a la búsqueda exacta, a la semántica (buscar_biblioteca_v3) y al CLO.
 *  · Sin mención de país → HN (país de lanzamiento), igual que hoy.
 *  · País nombrado no habilitado o fuera de v3 → PAIS_NO_HABILITADO: abstención antes del retrieval, nunca derecho hondureño.
 *  · Varios países nombrados → AMBIGUA: abstención pidiendo aclaración.
 * A diferencia de lib/legal-os/router/intent.ts, NUNCA convierte un estado no resuelto en HN.
 */
import type { CountryCode } from '../legal-os/types';
import { resolverJurisdiccion } from '../legal-os/jurisdiction/registry';
import { esJurisdiccionV3, type JurisdiccionV3 } from './instrument-ref';

export type JurisdiccionConsulta =
  | { estado: 'RESUELTA'; pais: JurisdiccionV3 }
  | { estado: 'PAIS_NO_HABILITADO'; pais: CountryCode }
  | { estado: 'AMBIGUA'; paises: CountryCode[] };

export function resolverJurisdiccionConsulta(texto: string): JurisdiccionConsulta {
  const r = resolverJurisdiccion(texto);
  if (r.estado === 'AMBIGUA') return { estado: 'AMBIGUA', paises: r.paises };
  if (r.estado === 'PAIS_NO_HABILITADO') return { estado: 'PAIS_NO_HABILITADO', pais: r.pais };
  const pais = r.jurisdiccion.country;
  return esJurisdiccionV3(pais) ? { estado: 'RESUELTA', pais } : { estado: 'PAIS_NO_HABILITADO', pais };
}

export const MENSAJE_JURISDICCION_NO_HABILITADA =
  'Para el país que menciona todavía no tengo un corpus oficial verificado, así que no voy a responder con normas de otro país. ' +
  'Consulte la fuente oficial de ese país o un profesional habilitado allí.';
export const MENSAJE_JURISDICCION_AMBIGUA =
  'Su consulta menciona más de un país. Para no mezclar el derecho de distintas jurisdicciones, indíqueme sobre cuál país desea la respuesta.';

/** Abstención por jurisdicción (mensaje + código seguro), o null si la consulta tiene un país resuelto. */
export function abstencionPorJurisdiccion(j: JurisdiccionConsulta): { mensaje: string; codigo: string } | null {
  if (j.estado === 'PAIS_NO_HABILITADO') return { mensaje: MENSAJE_JURISDICCION_NO_HABILITADA, codigo: 'JURISDICTION_NOT_ENABLED' };
  if (j.estado === 'AMBIGUA') return { mensaje: MENSAJE_JURISDICCION_AMBIGUA, codigo: 'JURISDICTION_AMBIGUOUS' };
  return null;
}
