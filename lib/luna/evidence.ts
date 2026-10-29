/**
 * lib/luna/evidence.ts
 * Evidencia AUTORIZADA para Luna. Solo sale hacia el proveedor externo el texto de normas públicas que el corpus ya tiene
 * como vigentes (codigo, HN, es_norma_vigente=true, id y hash presentes, no doctrinal ni excluido) y que producción trata
 * como citables. Cada fragmento se evalúa por separado: uno no autorizado se omite, no contamina a los demás.
 * Solo lectura: nunca modifica, reclasifica ni reindexa el corpus.
 */
import type { FragmentoRAG } from '../legal-retrieval/types';
import { clasificarFragmento } from '../ai-gateway/shadow/evidence-classification';
import { evaluarCorpusPublico } from '../ai-gateway/shadow/public-corpus-gate';
import type { EvidenceChunk } from '../ai-gateway/shadow/types';

export interface EvidenciaAutorizada {
  evidencia: EvidenceChunk[];
  /** Cantidad de fragmentos recuperados que NO se enviarán (no autorizados o fuera del tope). */
  omitidos: number;
}

export function autorizarEvidencia(fragmentos: readonly FragmentoRAG[], maxEvidencias: number): EvidenciaAutorizada {
  const lista = Array.isArray(fragmentos) ? fragmentos : [];
  const autorizados: FragmentoRAG[] = [];
  for (const f of lista) {
    if (evaluarCorpusPublico([f]).estado !== 'PUBLIC_CORPUS_PASS') continue;
    autorizados.push(f);
  }
  const chunks: EvidenceChunk[] = [];
  autorizados.forEach((f, i) => {
    const { clasificacionProduccion, citable } = clasificarFragmento(f);
    if (!citable) return;
    chunks.push({
      chunk_id: f.id ?? f.hash ?? `frag-${i}`,
      instrumento: f.fuente,
      articulo: f.num_articulo || null,
      gaceta: null,
      rol: null,
      clasificacionProduccion,
      citable,
      texto: f.contenido,
    });
  });
  const tope = chunks.slice(0, Math.max(0, maxEvidencias));
  return { evidencia: tope, omitidos: lista.length - tope.length };
}
