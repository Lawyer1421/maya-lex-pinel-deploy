/**
 * lib/legal-os/ux/source-cards.ts
 * Modelo de vista (PURO, sin React, sin red) del panel «por qué respondió MayaLex».
 * Reglas: «Vigencia verificada» SOLO con `validity_state = VERIFIED` del backend (DTO v2). La forma antigua (`Cita` v1, `vigente: true`) NO prueba
 * verificación (es la marca del corpus): se muestra «Vigencia no verificada». `PRESUMED` se muestra como presumida; `false`/NOT_IN_FORCE → no vigente.
 * Una URL solo se muestra si es oficial verificada (misma regla que la recuperación); lo doctrinal se rotula «Doctrina — no vinculante».
 */
import { esFuenteOficial } from '../retrieval/official-sources';
import { esCitaDTOv2, type CitaDTOv2, type ValidityState } from './cita-dto';

export type SourceCardKind = 'LAW' | 'ARTICLE' | 'GACETA' | 'JUDGMENT';

/** Entrada mínima: la `Cita` v1 de producción cabe aquí (sin url/gaceta); el DTO v2 se convierte con `normalizarEntrada`. */
export interface FuenteEntrada {
  fuente: string;
  articulo?: string | null;
  texto?: string;
  /** Estado de vigencia dado por el backend (DTO v2). Ausente = forma antigua. */
  validityState?: ValidityState;
  /** Forma antigua: bandera del corpus. `true` NO equivale a verificada. `false` sí se respeta (no vigente). */
  vigente?: boolean | null;
  hash?: string;
  kind?: SourceCardKind;
  versionLabel?: string | null;
  gaceta?: string | null;
  url?: string | null;
  doctrinal?: boolean;
  /** Contexto complementario: no es el artículo solicitado. */
  relacionada?: boolean;
}

export interface SourceCard {
  id: string;
  kind: SourceCardKind;
  title: string;
  instrument: string;
  article: string | null;
  versionLabel: string;
  validityLabel: string;
  validity: 'VERIFICADA' | 'PRESUMIDA' | 'NO_VIGENTE' | 'NO_VERIFICADA' | 'DOCTRINAL';
  officialUrl: string | null;
  tier: 1 | 2 | 3 | 4 | 5 | null;
  doctrinal: boolean;
  related: boolean;
  hash: string | null;
  excerpt: string | null;
  warnings: string[];
}

export const ETIQUETA = {
  verificada: 'Vigencia verificada',
  presumida: 'Vigencia presumida (marca del corpus, sin verificación humana)',
  noVigente: 'No vigente',
  noVerificada: 'Vigencia no verificada',
  doctrina: 'Doctrina — no vinculante',
  sinVersion: 'Versión no indicada',
} as const;

const ORDEN_KIND: Record<SourceCardKind, number> = { LAW: 0, ARTICLE: 1, GACETA: 2, JUDGMENT: 3 };
const NUM = (a: string | null): number => {
  const m = /^\d+/.exec(a ?? '');
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
};

/** Convierte el DTO v2 a la entrada de la vista; la forma antigua pasa tal cual. */
export function normalizarEntrada(x: FuenteEntrada | CitaDTOv2): FuenteEntrada {
  if (!esCitaDTOv2(x)) return x;
  return {
    fuente: x.instrument,
    articulo: x.article,
    texto: x.text,
    hash: x.hash,
    validityState: x.validity_state,
    kind: x.kind === 'DOCTRINE' ? (x.article ? 'ARTICLE' : 'LAW') : x.kind,
    doctrinal: x.kind === 'DOCTRINE',
    versionLabel: x.version ?? null,
    gaceta: x.gaceta ?? null,
    url: x.official_url ?? null,
  };
}

export function crearTarjeta(entrada: FuenteEntrada | CitaDTOv2, opciones: { fuentesDoctrinales?: ReadonlySet<string> } = {}): SourceCard {
  const f = normalizarEntrada(entrada);
  const doctrinal = f.doctrinal === true || (opciones.fuentesDoctrinales?.has(f.fuente) ?? false);
  const kind: SourceCardKind = f.kind ?? (f.articulo ? 'ARTICLE' : 'LAW');
  const warnings: string[] = [];

  let validity: SourceCard['validity'];
  let validityLabel: string;
  if (doctrinal) {
    validity = 'DOCTRINAL';
    validityLabel = ETIQUETA.doctrina;
    warnings.push('Comentario o doctrina: no es derecho positivo vinculante.');
  } else if (f.validityState === 'VERIFIED') {
    validity = 'VERIFICADA';
    validityLabel = ETIQUETA.verificada;
  } else if (f.validityState === 'PRESUMED') {
    validity = 'PRESUMIDA';
    validityLabel = ETIQUETA.presumida;
    warnings.push('La vigencia procede de la marca del corpus y no tiene verificación humana; confirme en la fuente oficial.');
  } else if (f.validityState === 'NOT_IN_FORCE' || (f.validityState === undefined && f.vigente === false)) {
    validity = 'NO_VIGENTE';
    validityLabel = ETIQUETA.noVigente;
    warnings.push('Este texto está marcado como no vigente.');
  } else {
    validity = 'NO_VERIFICADA';
    validityLabel = ETIQUETA.noVerificada;
    warnings.push('La vigencia de este texto no está verificada; confirme en la fuente oficial.');
  }

  let officialUrl: string | null = null;
  let tier: SourceCard['tier'] = null;
  if (f.url) {
    const c = esFuenteOficial(f.url);
    if (c.oficial) {
      officialUrl = f.url;
      tier = c.fuente.tier;
    } else {
      warnings.push('Se omitió un enlace porque no pertenece a una fuente oficial verificada.');
    }
  }
  if (kind === 'GACETA' && !f.gaceta && !officialUrl) warnings.push('Sin número de Gaceta ni enlace oficial.');
  const articuloTxt = f.articulo ? `Art. ${f.articulo}` : null;
  return {
    id: `${kind}:${f.fuente}:${f.articulo ?? ''}:${f.hash ?? ''}`,
    kind,
    title: [f.fuente, articuloTxt].filter(Boolean).join(' · '),
    instrument: f.fuente,
    article: f.articulo ?? null,
    versionLabel: f.versionLabel ?? (f.gaceta ? `Gaceta ${f.gaceta}` : ETIQUETA.sinVersion),
    validityLabel,
    validity,
    officialUrl,
    tier,
    doctrinal,
    related: f.relacionada === true,
    hash: f.hash ? f.hash : null,
    excerpt: f.texto ? (f.texto.length > 600 ? `${f.texto.slice(0, 600)}…` : f.texto) : null,
    warnings,
  };
}

/** Orden determinista: normas antes que doctrina, tipo, instrumento, número de artículo, id. */
export function ordenarTarjetas(tarjetas: readonly SourceCard[]): SourceCard[] {
  return [...tarjetas].sort(
    (a, b) =>
      Number(a.doctrinal) - Number(b.doctrinal) ||
      ORDEN_KIND[a.kind] - ORDEN_KIND[b.kind] ||
      a.instrument.localeCompare(b.instrument, 'es') ||
      NUM(a.article) - NUM(b.article) ||
      a.id.localeCompare(b.id),
  );
}

export type SeccionId = 'ANSWER' | 'LEGAL_BASIS' | 'SOURCES' | 'CITATIONS' | 'VALIDITY_VERSION' | 'WARNINGS' | 'RELATED_LAW' | 'DEEP_ANALYSIS';

export interface PanelSection {
  id: SeccionId;
  titulo: string;
  vacio: boolean;
}
export interface AnswerPanelModel {
  answer: string;
  legalBasis: SourceCard[];
  sources: SourceCard[];
  citations: Array<{ etiqueta: string; hash: string }>;
  validityVersion: Array<{ id: string; titulo: string; validityLabel: string; versionLabel: string }>;
  warnings: string[];
  relatedLaw: SourceCard[];
  deepAnalysis: { disponible: boolean; etiqueta: string };
  secciones: PanelSection[];
}

export interface PanelEntrada {
  answer: string;
  fuentes: readonly (FuenteEntrada | CitaDTOv2)[];
  /** ¿Hay análisis profundo disponible para esta consulta/plan? Solo lo indica quien lo calcula. */
  analisisProfundoDisponible?: boolean;
  fuentesDoctrinales?: ReadonlySet<string>;
}

export function construirPanel(entrada: PanelEntrada): AnswerPanelModel {
  const todas = ordenarTarjetas(entrada.fuentes.map((f) => crearTarjeta(f, { fuentesDoctrinales: entrada.fuentesDoctrinales })));
  const vistos = new Set<string>();
  const sources = todas.filter((t) => {
    if (vistos.has(t.id)) return false;
    vistos.add(t.id);
    return true;
  });
  const legalBasis = sources.filter((t) => !t.doctrinal && !t.related && t.kind !== 'JUDGMENT');
  const relatedLaw = sources.filter((t) => t.related || t.kind === 'JUDGMENT' || t.doctrinal);
  const warnings = [...new Set(sources.flatMap((t) => t.warnings))];
  if (sources.length === 0) warnings.push('Esta respuesta no cita fuentes del corpus.');
  const citations = sources.filter((t) => t.hash).map((t) => ({ etiqueta: t.title, hash: t.hash as string }));
  const deepAnalysis = entrada.analisisProfundoDisponible
    ? { disponible: true, etiqueta: 'Análisis profundo disponible' }
    : { disponible: false, etiqueta: 'Análisis profundo no disponible para esta consulta' };
  const validityVersion = sources.map((t) => ({ id: t.id, titulo: t.title, validityLabel: t.validityLabel, versionLabel: t.versionLabel }));
  const secciones: PanelSection[] = [
    { id: 'ANSWER', titulo: 'Respuesta', vacio: entrada.answer.trim() === '' },
    { id: 'LEGAL_BASIS', titulo: 'Fundamento legal', vacio: legalBasis.length === 0 },
    { id: 'SOURCES', titulo: 'Fuentes', vacio: sources.length === 0 },
    { id: 'CITATIONS', titulo: 'Citas verificables', vacio: citations.length === 0 },
    { id: 'VALIDITY_VERSION', titulo: 'Vigencia y versión', vacio: validityVersion.length === 0 },
    { id: 'WARNINGS', titulo: 'Advertencias', vacio: warnings.length === 0 },
    { id: 'RELATED_LAW', titulo: 'Normativa relacionada', vacio: relatedLaw.length === 0 },
    { id: 'DEEP_ANALYSIS', titulo: 'Análisis profundo (opcional)', vacio: !deepAnalysis.disponible },
  ];
  return { answer: entrada.answer, legalBasis, sources, citations, validityVersion, warnings, relatedLaw, deepAnalysis, secciones };
}
