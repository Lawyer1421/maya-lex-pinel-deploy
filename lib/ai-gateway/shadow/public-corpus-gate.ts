/**
 * lib/ai-gateway/shadow/public-corpus-gate.ts
 * PR-G3: gate EXPERIMENTAL y fail-closed del corpus jurídico público para el modo sombra.
 *
 * PUBLIC_CORPUS_PASS solo si TODOS los fragmentos cumplen, con las propiedades estructurales reales de
 * FragmentoRAG: fuente_tipo 'codigo', jurisdiccion 'HN', es_norma_vigente true, id, hash y fuente presentes,
 * no doctrinal y no fuente documental excluida (capa doc_*). Si UNO falla: PUBLIC_CORPUS_REJECT y no hay egress.
 *
 * ALCANCE HONESTO: esto NO es prueba absoluta de procedencia pública. Es una garantía estructural conservadora
 * para G3 shadow: ninguna escritura del runtime llega a esa tabla y solo se admite lo que el resolver exacto
 * ya consulta como código vigente de Honduras. No se verifica el contenido real de la base (sin SQL).
 *
 * DEUDA PREVIA A CANARY: PUBLIC_PROVENANCE_STRONG_PROOF_PENDING (prueba fuerte de procedencia pública,
 * p. ej. una columna de procedencia verificada). No se hace en este PR: sin SQL, migración ni columna nueva.
 *
 * Una lista vacía pasa de forma vacua: no hay evidencia que pueda ser privada. La razón de un rechazo es solo
 * el NOMBRE del campo que falló, nunca su valor.
 */
import { FUENTES_DOCTRINALES } from '../../legal-retrieval/evidence-engine';
import { esFuenteDocumentalExcluida } from '../../legal-retrieval/semantic-retriever';
import type { FragmentoRAG } from '../../legal-retrieval/types';

export type ResultadoCorpusPublico =
  | { estado: 'PUBLIC_CORPUS_PASS' }
  | { estado: 'PUBLIC_CORPUS_REJECT'; razon: string };

function motivoDeRechazo(f: FragmentoRAG): string | null {
  if (f.fuente_tipo !== 'codigo') return 'fuente_tipo';
  if (f.jurisdiccion !== 'HN') return 'jurisdiccion';
  if (f.es_norma_vigente !== true) return 'es_norma_vigente';
  if (typeof f.id !== 'string' || f.id === '') return 'id';
  if (typeof f.hash !== 'string' || f.hash === '') return 'hash';
  if (typeof f.fuente !== 'string' || f.fuente === '') return 'fuente';
  if (FUENTES_DOCTRINALES.has(f.fuente)) return 'fuente_doctrinal';
  if (esFuenteDocumentalExcluida(f.fuente)) return 'fuente_documental_excluida';
  return null;
}

export function evaluarCorpusPublico(fragmentos: readonly FragmentoRAG[]): ResultadoCorpusPublico {
  for (const f of fragmentos) {
    const razon = motivoDeRechazo(f);
    if (razon) return { estado: 'PUBLIC_CORPUS_REJECT', razon };
  }
  return { estado: 'PUBLIC_CORPUS_PASS' };
}
