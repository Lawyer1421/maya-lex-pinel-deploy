/**
 * lib/luna/render.ts
 * Texto final para el usuario a partir de claims YA validadas (cita DIRECT a evidencia citable). El texto del modelo solo se
 * muestra si superó el validador; las referencias se resuelven desde la evidencia entregada, nunca desde lo que diga el modelo.
 */
import type { EvidenceChunk, ValidatedClaim } from '../ai-gateway/shadow/types';

export interface ReferenciaLuna {
  chunk_id: string;
  instrumento: string;
  articulo: string | null;
}

export function etiquetaReferencia(e: EvidenceChunk): string {
  return e.articulo ? `${e.instrumento}, art. ${e.articulo}` : e.instrumento;
}

export function renderizarRespuesta(claims: readonly ValidatedClaim[], evidencia: readonly EvidenceChunk[]): { texto: string; referencias: ReferenciaLuna[] } {
  const porId = new Map(evidencia.map((e) => [e.chunk_id, e]));
  const usados: ReferenciaLuna[] = [];
  const vistos = new Set<string>();
  const parrafos = claims.map((c) => {
    const etiquetas: string[] = [];
    for (const ct of c.citations) {
      const e = porId.get(ct.chunk_id);
      if (!e) continue;
      etiquetas.push(etiquetaReferencia(e));
      if (!vistos.has(e.chunk_id)) {
        vistos.add(e.chunk_id);
        usados.push({ chunk_id: e.chunk_id, instrumento: e.instrumento, articulo: e.articulo });
      }
    }
    const unicas = [...new Set(etiquetas)];
    return unicas.length > 0 ? `${c.text.trim()} [${unicas.join('; ')}]` : c.text.trim();
  });
  const pie = 'Análisis NO OFICIAL basado en el corpus de MayaLex; verifique la vigencia en la Gaceta antes de usarlo en un acto jurídico.';
  return { texto: `${parrafos.join('\n\n')}\n\n${pie}`, referencias: usados };
}

/** Mensaje de abstención que dice qué falta. El motivo lo escribió el modelo: se recorta y se presenta como indicación, no como hecho jurídico. */
export function renderizarAbstencion(motivo: string | null): string {
  const m = (motivo ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  const base = 'MayaLex no cuenta con evidencia verificable suficiente en su corpus para responder con fundamento esta consulta.';
  return m ? `${base}\n\nLo que falta para poder responder: ${m}` : base;
}
