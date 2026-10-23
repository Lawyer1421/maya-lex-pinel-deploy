/**
 * lib/legal-os/jurisprudence/search.ts
 * Índice y búsqueda de jurisprudencia (en memoria, sin red ni base de datos). Dimensiones: tribunal, sala, fecha, materia, tema jurídico,
 * artículo citado e identificador de caso. La jurisprudencia SIEMPRE se distingue de la autoridad normativa: cada resultado lleva
 * `kind: 'JURISPRUDENCE'` y una etiqueta fija, y el valor precedencial se muestra tal cual está registrado (UNKNOWN = «no determinado»),
 * nunca inferido por similitud.
 */
import { JurisprudenceRecordSchema, puedeIndexarPublicamente, type JurisprudenceRecord } from './index';

export interface FiltrosJurisprudencia {
  court?: string;
  chamber?: string;
  /** Rango inclusivo AAAA-MM-DD. */
  dateFrom?: string;
  dateTo?: string;
  matter?: JurisprudenceRecord['matter'];
  /** Palabras que deben aparecer en el tema jurídico (todas, sin distinguir mayúsculas ni acentos). */
  legalIssue?: string;
  citedArticle?: string;
  caseNumber?: string;
}

export interface ResultadoJurisprudencia {
  kind: 'JURISPRUDENCE';
  /** Etiqueta fija: nunca se presenta como fuente normativa. */
  authorityLabel: 'Jurisprudencia — no es fuente normativa';
  id: string;
  court: string;
  chamber: string;
  case_number: string;
  date: string;
  matter: JurisprudenceRecord['matter'];
  legal_issue: string | null;
  cited_articles: string[];
  precedential_status: JurisprudenceRecord['precedential_status'];
  precedentialLabel: string;
  source_url: string;
  document_hash: string;
}

const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const ETIQUETA_PRECEDENTE: Record<JurisprudenceRecord['precedential_status'], string> = {
  UNKNOWN: 'Valor precedencial no determinado',
  BINDING: 'Precedente vinculante (verificado por una persona)',
  PERSUASIVE: 'Precedente persuasivo (verificado por una persona)',
  NOT_PRECEDENT: 'No constituye precedente (verificado por una persona)',
};

export interface IndiceJurisprudencia {
  readonly registros: readonly JurisprudenceRecord[];
  readonly rechazados: ReadonlyArray<{ id: string; motivos: string[] }>;
}

/** Construye el índice con SOLO los registros que pueden entrar a un índice público; los demás quedan listados con su motivo. */
export function construirIndiceJurisprudencia(entradas: readonly unknown[]): IndiceJurisprudencia {
  const registros: JurisprudenceRecord[] = [];
  const rechazados: Array<{ id: string; motivos: string[] }> = [];
  for (const e of entradas) {
    const id = typeof (e as { id?: unknown })?.id === 'string' ? (e as { id: string }).id : '(sin id)';
    const veredicto = puedeIndexarPublicamente(e);
    if (veredicto.puede) registros.push(JurisprudenceRecordSchema.parse(e));
    else rechazados.push({ id, motivos: veredicto.motivos });
  }
  return { registros, rechazados };
}

export function buscarJurisprudencia(indice: IndiceJurisprudencia, f: FiltrosJurisprudencia): ResultadoJurisprudencia[] {
  const palabras = f.legalIssue ? norm(f.legalIssue).split(/\s+/).filter(Boolean) : [];
  return indice.registros
    .filter((r) => {
      if (f.court && norm(r.court) !== norm(f.court)) return false;
      if (f.chamber && norm(r.chamber) !== norm(f.chamber)) return false;
      if (f.matter && r.matter !== f.matter) return false;
      if (f.caseNumber && norm(r.case_number) !== norm(f.caseNumber)) return false;
      if (f.citedArticle && !r.cited_articles.some((a) => norm(a) === norm(f.citedArticle!))) return false;
      if ((f.dateFrom || f.dateTo) && r.date === 'UNKNOWN') return false;
      if (f.dateFrom && r.date < f.dateFrom) return false;
      if (f.dateTo && r.date > f.dateTo) return false;
      if (palabras.length > 0) {
        const tema = norm(r.legal_issue ?? '');
        if (!palabras.every((p) => tema.includes(p))) return false;
      }
      return true;
    })
    .map((r): ResultadoJurisprudencia => ({
      kind: 'JURISPRUDENCE', authorityLabel: 'Jurisprudencia — no es fuente normativa', id: r.id, court: r.court, chamber: r.chamber, case_number: r.case_number, date: r.date,
      matter: r.matter, legal_issue: r.legal_issue, cited_articles: r.cited_articles, precedential_status: r.precedential_status,
      precedentialLabel: ETIQUETA_PRECEDENTE[r.precedential_status], source_url: r.source_url, document_hash: r.document_hash,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
