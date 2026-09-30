/**
 * lib/legal-retrieval/official-sources/types.ts
 * Retrieval v3 — Fase 1E: Official Source Router (discovery + arquitectura).
 *
 * NO se activa en producción todavía -- ver §11 de la directiva de Fase 1E.
 * Estos tipos existen para soportar el estado `OFFICIAL_FALLBACK_REQUIRED`
 * (Fase 1D) con adapters reales y seguros, cuando una fase FUTURA autorice
 * cablearlos a app/api/chat/route.ts.
 *
 * Ningún campo aquí se inventa: cada uno mapea a algo que al menos UNA fuente
 * oficial hondureña verificada realmente expone hoy (ver
 * docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md para la evidencia).
 * Donde una fuente no expone un dato, el campo correspondiente queda
 * opcional -- nunca se rellena con un valor supuesto.
 */

export type OfficialSourceKind = 'LEGISLATION' | 'JURISPRUDENCE' | 'GAZETTE' | 'ADMINISTRATIVE' | 'MIXED';

/**
 * Identificador estable por adapter. Se amplía según se verifiquen e
 * implementen más fuentes -- NUNCA se agrega un id para una fuente que no
 * tiene todavía un adapter real (ver registro: DISCOVERY_ONLY/UNAVAILABLE no
 * llevan id de adapter, solo entrada en el registro documental).
 */
export type OfficialSourceId = 'CEDIJ_LEGISLACION';

export interface OfficialSourceQuery {
  /**
   * Texto de búsqueda ya minimizado (§9 de la directiva) -- nunca el mensaje
   * crudo del usuario. Ver official-sources/router.ts: minimizeQueryForExternalResearch().
   */
  searchText: string;
  kind: OfficialSourceKind;
  materia?: string;
  instrumentHint?: string;
  articleNumber?: string;
}

export type OfficialSourceResultStatus =
  | 'SUCCESS'
  | 'NO_RESULTS'
  | 'SOURCE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'UNSUPPORTED_QUERY';

/**
 * Nunca 'VERIFIED' en el sentido de VerificationStatus (lib/legal-retrieval/types.ts).
 * Esa verificación pertenece a un proceso editorial separado (revisión humana
 * contra el corpus productivo) -- un documento recién descargado de una
 * fuente oficial es, como mucho, SOURCE_CONFIRMED (el propio sitio lo expone
 * como la versión vigente/consolidada), nunca "verificado" por MayaLex.
 */
export type OfficialVerificationStatus = 'UNVERIFIED' | 'SOURCE_CONFIRMED';

export interface OfficialSourceEvidence {
  sourceId: OfficialSourceId;
  sourceName: string;
  sourceUrl: string;
  documentTitle: string;
  documentType: OfficialSourceKind;
  jurisdiction: 'HN';
  publicationDate?: string;
  decisionDate?: string;
  documentNumber?: string;
  articleNumber?: string;
  contentSnippet?: string;
  /** SHA-256 del contenido recuperado -- ausente en esta fase: los adapters actuales devuelven la URL del documento (PDF), no descargan/parsean su contenido todavía (fuera de alcance de la Fase 1E). */
  contentHash?: string;
  /** ISO 8601, momento en que MayaLex consultó la fuente (no la fecha de publicación del documento). */
  retrievedAt: string;
  verificationStatus: OfficialVerificationStatus;
}

export interface OfficialSourceResult {
  status: OfficialSourceResultStatus;
  evidence: OfficialSourceEvidence[];
  /**
   * Fase 1E.1: opcional a propósito. Cuando NINGÚN adapter existe para
   * `query.kind` (status='UNSUPPORTED_QUERY' emitido por el router, no por
   * un adapter real), no hay ninguna fuente que haya intentado nada -- el
   * router antes rellenaba esto con 'CEDIJ_LEGISLACION' como placeholder,
   * lo cual es proveniencia falsa (sugiere que CEDIJ fue consultado cuando
   * ni siquiera se le llamó). `undefined` representa la ausencia real de
   * fuente. Todo adapter real SIEMPRE lo setea a su propio id.
   */
  sourceId?: OfficialSourceId;
  /** Código seguro -- nunca el mensaje crudo de red/HTML, nunca la URL con detalles internos. */
  errorCode?: string;
}

export interface OfficialSourceAdapter {
  id: OfficialSourceId;
  supports(query: OfficialSourceQuery): boolean;
  search(query: OfficialSourceQuery): Promise<OfficialSourceResult>;
}
