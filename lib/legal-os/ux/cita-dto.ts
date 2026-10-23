/**
 * lib/legal-os/ux/cita-dto.ts
 * DTO versionado de la cita que viaja servidor → cliente (SSE `done.citas`) y mapeador PURO del lado del servidor.
 *
 * Regla central: `validity_state = VERIFIED` SOLO con evidencia explícita del backend (un registro de verificación humana con aprobador y fecha).
 * La marca del corpus `es_norma_vigente = true` NO es verificación humana de ese texto: produce PRESUMED. Nada la eleva a VERIFIED.
 * La doctrina nunca es «vigente»: se marca DOCTRINE y NOT_VERIFIED.
 */
import { FUENTES_DOCTRINALES } from '../../legal-retrieval/evidence-engine';
import { esFuenteOficial, type FuenteTier } from '../retrieval/official-sources';

export const CITA_DTO_VERSION = 2 as const;

export type ValidityState = 'VERIFIED' | 'PRESUMED' | 'NOT_VERIFIED' | 'NOT_IN_FORCE';
export type CitaKind = 'LAW' | 'ARTICLE' | 'GACETA' | 'JUDGMENT' | 'DOCTRINE';

export interface CitaDTOv2 {
  v: typeof CITA_DTO_VERSION;
  kind: CitaKind;
  instrument: string;
  article: string | null;
  text: string;
  hash: string;
  decree?: string | null;
  gaceta?: string | null;
  gaceta_date?: string | null;
  source_authority?: string | null;
  source_tier?: FuenteTier | null;
  version?: string | null;
  validity_state: ValidityState;
  official_url?: string | null;
  /** Hash del texto de la evidencia (el mismo `hash` del fragmento), para trazabilidad. */
  evidence_hash?: string | null;
}

/** Forma actual (v1) de `Cita` en producción: no cambia. */
export interface CitaV1 {
  articulo: string | null;
  texto: string;
  fuente: string;
  vigente: boolean;
  hash: string;
}

/** Lo mínimo que el mapeador necesita del fragmento recuperado. */
export interface FragmentoMinimo {
  es_norma_vigente?: boolean | null;
}

/** Evidencia adicional del backend. Todo es opcional y se toma tal cual: el mapeador no infiere nada. */
export interface MetadataCita {
  /** Verificación humana de ESTE texto (p. ej. V4/V5 del CLO). Sin ella no hay VERIFIED. */
  verificacionHumana?: { aprobadoPor: string; fecha: string } | null;
  decreto?: string | null;
  gaceta?: string | null;
  gacetaFecha?: string | null;
  version?: string | null;
  urlOficial?: string | null;
  tipo?: 'SENTENCIA' | null;
}

const verificacionValida = (v: MetadataCita['verificacionHumana']): boolean =>
  !!v && v.aprobadoPor.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(v.fecha);

export function construirCitaDTO(
  cita: CitaV1,
  fragmento?: FragmentoMinimo,
  metadata: MetadataCita = {},
  opciones: { fuentesDoctrinales?: ReadonlySet<string> } = {},
): CitaDTOv2 {
  const doctrinal = (opciones.fuentesDoctrinales ?? FUENTES_DOCTRINALES).has(cita.fuente);
  const marca = fragmento?.es_norma_vigente ?? (cita.vigente ? true : null);

  let validity_state: ValidityState;
  if (doctrinal) validity_state = 'NOT_VERIFIED';
  else if (marca === false) validity_state = 'NOT_IN_FORCE';
  else if (marca === true && verificacionValida(metadata.verificacionHumana)) validity_state = 'VERIFIED';
  else if (marca === true) validity_state = 'PRESUMED';
  else validity_state = 'NOT_VERIFIED';

  let official_url: string | null = null;
  let source_tier: FuenteTier | null = null;
  let source_authority: string | null = null;
  if (metadata.urlOficial) {
    const c = esFuenteOficial(metadata.urlOficial);
    if (c.oficial) {
      official_url = metadata.urlOficial;
      source_tier = c.fuente.tier;
      source_authority = c.fuente.clase;
    }
  }

  const kind: CitaKind = doctrinal ? 'DOCTRINE' : metadata.tipo === 'SENTENCIA' ? 'JUDGMENT' : cita.articulo ? 'ARTICLE' : 'LAW';
  return {
    v: CITA_DTO_VERSION,
    kind,
    instrument: cita.fuente,
    article: cita.articulo,
    text: cita.texto,
    hash: cita.hash,
    decree: metadata.decreto ?? null,
    gaceta: metadata.gaceta ?? null,
    gaceta_date: metadata.gacetaFecha ?? null,
    source_authority,
    source_tier,
    version: metadata.version ?? null,
    validity_state,
    official_url,
    evidence_hash: cita.hash || null,
  };
}

export const esCitaDTOv2 = (x: unknown): x is CitaDTOv2 =>
  typeof x === 'object' && x !== null && (x as { v?: unknown }).v === CITA_DTO_VERSION && typeof (x as { instrument?: unknown }).instrument === 'string';
