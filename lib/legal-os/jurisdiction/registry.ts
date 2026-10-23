/**
 * lib/legal-os/jurisdiction/registry.ts
 * Registro de jurisdicciones. Honduras es la jurisdicción de lanzamiento; las demás están declaradas pero DESHABILITADAS:
 * habilitarlas exige corpus y skills propios, no cambiar el núcleo.
 */
import type { CountryCode, JurisdictionRef } from '../types';

export interface CountryInfo {
  code: CountryCode;
  nombre: string;
  enabled: boolean;
  /** Fuentes oficiales por orden de prioridad (descripción; los URL los fija el registro de fuentes verificado, no este archivo). */
  fuentesOficiales: readonly string[];
  /** Patrones que identifican explícitamente al país en una consulta. */
  patrones: readonly RegExp[];
}

const HN_FUENTES = ['Diario Oficial La Gaceta', 'Poder Judicial / CEDIJ', 'Congreso Nacional', 'Tribunal Superior de Cuentas', 'Institución reguladora oficial'] as const;

export const PAISES: Readonly<Record<CountryCode, CountryInfo>> = Object.freeze({
  HN: { code: 'HN', nombre: 'Honduras', enabled: true, fuentesOficiales: HN_FUENTES, patrones: [/\bhonduras\b/i, /\bhondure[ñn]/i, /\btegucigalpa\b/i, /\bla gaceta\b/i] },
  GT: { code: 'GT', nombre: 'Guatemala', enabled: false, fuentesOficiales: [], patrones: [/\bguatemala\b/i, /\bguatemalte/i] },
  SV: { code: 'SV', nombre: 'El Salvador', enabled: false, fuentesOficiales: [], patrones: [/\bel salvador\b/i, /\bsalvadore[ñn]/i] },
  NI: { code: 'NI', nombre: 'Nicaragua', enabled: false, fuentesOficiales: [], patrones: [/\bnicaragua\b/i, /\bnicarag[uü]ense/i] },
  CR: { code: 'CR', nombre: 'Costa Rica', enabled: false, fuentesOficiales: [], patrones: [/\bcosta rica\b/i, /\bcostarricense/i] },
  PA: { code: 'PA', nombre: 'Panamá', enabled: false, fuentesOficiales: [], patrones: [/\bpanam[aá]\b/i, /\bpaname[ñn]/i] },
  BZ: { code: 'BZ', nombre: 'Belice', enabled: false, fuentesOficiales: [], patrones: [/\bbelice\b/i, /\bbelize\b/i] },
});

export const PAIS_DE_LANZAMIENTO: CountryCode = 'HN';

export type ResultadoJurisdiccion =
  | { estado: 'RESUELTA'; jurisdiccion: JurisdictionRef; explicita: boolean }
  /** Se nombra un país que no está habilitado: no se responde con el derecho de otro país. */
  | { estado: 'PAIS_NO_HABILITADO'; pais: CountryCode }
  /** Se nombran dos o más países: se pide aclaración. */
  | { estado: 'AMBIGUA'; paises: CountryCode[] };

/** Resuelve la jurisdicción de una consulta. Sin mención explícita rige el país de lanzamiento. */
export function resolverJurisdiccion(texto: string, porDefecto: CountryCode = PAIS_DE_LANZAMIENTO): ResultadoJurisdiccion {
  const mencionados = (Object.values(PAISES) as CountryInfo[]).filter((p) => p.patrones.some((r) => r.test(texto))).map((p) => p.code);
  if (mencionados.length > 1) return { estado: 'AMBIGUA', paises: mencionados };
  const pais = mencionados[0] ?? porDefecto;
  if (!PAISES[pais].enabled) return { estado: 'PAIS_NO_HABILITADO', pais };
  return { estado: 'RESUELTA', jurisdiccion: { country: pais, jurisdiction: 'NACIONAL' }, explicita: mencionados.length === 1 };
}
