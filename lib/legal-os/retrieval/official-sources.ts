/**
 * lib/legal-os/retrieval/official-sources.ts
 * Política de fuentes oficiales. SOLO hosts documentados como verificados en docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md.
 * Host desconocido = no oficial. El dominio de La Gaceta y el del Congreso Nacional NO están verificados: no se inventan;
 * `lagaceta.hn` es un medio de noticias privado (hallazgo del registro) y se excluye de forma explícita.
 */
export type FuenteTier = 1 | 2 | 3 | 4 | 5;
export type ClaseFuente = 'GACETA' | 'PODER_JUDICIAL' | 'CONGRESO' | 'TSC' | 'REGULADOR';

export interface FuenteOficial {
  host: string;
  tier: FuenteTier;
  clase: ClaseFuente;
  /** Puede establecer texto normativo/jurisprudencial autoritativo. */
  autoritativa: boolean;
  /** Apta para consulta automatizada (el registro marca TSC como no apta). */
  automatizable: boolean;
  nota: string;
}

export const FUENTES_OFICIALES_VERIFICADAS: readonly FuenteOficial[] = Object.freeze([
  { host: 'legislacion.poderjudicial.gob.hn', tier: 2, clase: 'PODER_JUDICIAL', autoritativa: true, automatizable: true, nota: 'CEDIJ Legislación — PRIMARY_OFFICIAL, ADAPTER_LIVE_VERIFIED' },
  { host: 'sejeinfo.poderjudicial.gob.hn', tier: 2, clase: 'PODER_JUDICIAL', autoritativa: false, automatizable: false, nota: 'Justicia Abierta/SEJE — SECONDARY_OFFICIAL, no es texto normativo' },
  { host: 'www.tsc.gob.hn', tier: 4, clase: 'TSC', autoritativa: true, automatizable: false, nota: 'Alcanzable; registro: UNSUITABLE_FOR_AUTOMATION' },
]);

/** Hosts excluidos de forma explícita (no oficiales aunque lo parezcan). */
export const HOSTS_EXCLUIDOS: readonly string[] = Object.freeze(['lagaceta.hn', 'www.lagaceta.hn']);

export type ClasificacionUrl =
  | { oficial: true; fuente: FuenteOficial }
  | { oficial: false; motivo: 'URL_INVALIDA' | 'NO_HTTPS' | 'HOST_EXCLUIDO' | 'HOST_NO_VERIFICADO' };

/** ¿Es la URL de una fuente oficial verificada? https obligatorio; sin credenciales embebidas; host exacto (sin subdominios sorpresa). */
export function esFuenteOficial(url: string): ClasificacionUrl {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { oficial: false, motivo: 'URL_INVALIDA' };
  }
  if (u.protocol !== 'https:') return { oficial: false, motivo: 'NO_HTTPS' };
  if (u.username || u.password) return { oficial: false, motivo: 'HOST_NO_VERIFICADO' };
  const host = u.hostname.toLowerCase();
  if (HOSTS_EXCLUIDOS.includes(host)) return { oficial: false, motivo: 'HOST_EXCLUIDO' };
  const f = FUENTES_OFICIALES_VERIFICADAS.find((x) => x.host === host);
  return f ? { oficial: true, fuente: f } : { oficial: false, motivo: 'HOST_NO_VERIFICADO' };
}

/**
 * Una fuente solo establece texto autoritativo si es oficial (tier 1–5). Una fuente secundaria o privada (tier null)
 * es solo descubrimiento: nunca establece el texto, haya o no una fuente oficial disponible.
 */
export function puedeEstablecerTextoAutoritativo(tier: FuenteTier | null, hayOficial: boolean): boolean {
  void hayOficial;
  return tier !== null;
}
