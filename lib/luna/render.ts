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

export function renderizarRespuesta(claims: readonly ValidatedClaim[], evidencia: readonly EvidenceChunk[]): { texto: string; referencias: ReferenciaLuna[]; chunkIdsValidados: string[] } {
  const porId = new Map(evidencia.map((e) => [e.chunk_id, e]));
  const usados: ReferenciaLuna[] = [];
  const vistos = new Set<string>();
  const parrafos = claims.map((c) => {
    const etiquetas: string[] = [];
    for (const ct of c.citations) {
      // Solo el respaldo DIRECT a evidencia entregada es una cita validada; INDIRECT contextualiza y no se muestra como fundamento.
      if (ct.support !== 'DIRECT') continue;
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
  return { texto: `${parrafos.join('\n\n')}\n\n${pie}`, referencias: usados, chunkIdsValidados: usados.map((u) => u.chunk_id) };
}

/** Mensaje de abstención que dice qué falta. El motivo lo escribió el modelo: se recorta y se presenta como indicación, no como hecho jurídico. */
export function renderizarAbstencion(motivo: string | null): string {
  const m = (motivo ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  const base = 'MayaLex no cuenta con evidencia verificable suficiente en su corpus para responder con fundamento esta consulta.';
  return m ? `${base}\n\nLo que falta para poder responder: ${m}` : base;
}

const FALTANTE_R3: Record<string, string> = {
  SIN_AFIRMACIONES: 'la respuesta no contiene afirmaciones con fundamento',
  SIN_CITA_DIRECT: 'ninguna afirmación tiene una cita directa al texto de la norma',
  SIN_PRIMARY_VIGENTE: 'la cita no corresponde a una norma con vigencia acreditada (vigencia nula o no vigente)',
  OTRO_INSTRUMENTO_O_ARTICULO: 'la cita no corresponde al mismo instrumento y artículo consultados',
  AFIRMACION_NO_RESPALDADA: 'el texto citado no respalda lo que afirma la respuesta',
};

/** Abstención por R3: dice qué falta, sin reproducir texto del modelo. */
export function renderizarAbstencionR3(motivo: string): string {
  return `MayaLex no cuenta con evidencia verificable suficiente para responder con fundamento esta consulta.\n\nLo que falta para poder responder: ${FALTANTE_R3[motivo] ?? 'una cita directa a norma vigente del instrumento y artículo consultados'}.`;
}
