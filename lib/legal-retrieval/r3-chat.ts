/**
 * lib/legal-retrieval/r3-chat.ts
 * A-2 / A-2b / D-1 (decisión CLO): el chat principal aplica el MISMO criterio que Luna (R3 + R4, clasificador compartido `clo-guards.ts`), sin ruta de
 * evasión. La salida del modelo se retiene siempre y se evalúa antes de emitirse:
 *  - Rutas con corpus (A/B/C): cualquier artículo o instrumento mencionado sin respaldo en un fragmento recuperado → abstención completa; si no, se
 *    entregan SOLO las oraciones validadas por R3 y las citas son las de los fragmentos que las respaldan.
 *  - Ruta D (sala, sin corpus): si la respuesta NO nombra ningún artículo, instrumento ni el contenido de una norma concreta, se entrega tal cual; si lo
 *    nombra, pasa por R3/R4 y, como no hay fragmentos, hay abstención que dice qué falta.
 */
import { construirCitas, type Cita } from './evidence-engine';
import { mensajeAbstencionR3, mencionaNormaConcreta, validarRespuestaR4, type MotivoR3 } from './clo-guards';
import { objetivosDeConsulta } from './r3-objetivos';
import type { FragmentoRAG } from './types';

export const CODIGO_ABSTENCION_R3 = 'R3_SUFICIENCIA_NO_ACREDITADA';

export type VeredictoChatR3 =
  | { suficiente: true; texto: string; citas: Cita[] }
  | { suficiente: false; motivo: MotivoR3; mensaje: string; citas: [] };

export function evaluarRespuestaChatR3(p: { texto: string; fragmentos: readonly FragmentoRAG[]; pregunta: string; conCorpus: boolean }): VeredictoChatR3 {
  // D-1: sin corpus y sin referirse a ninguna norma concreta, no hay nada que fundamentar.
  if (!p.conCorpus && !mencionaNormaConcreta(p.texto)) return { suficiente: true, texto: p.texto, citas: [] };
  if (!p.conCorpus && p.fragmentos.length === 0) {
    return { suficiente: false, motivo: 'SIN_FRAGMENTOS_PARA_NORMA', mensaje: mensajeAbstencionR3('SIN_FRAGMENTOS_PARA_NORMA'), citas: [] };
  }
  const r4 = validarRespuestaR4(p.texto, p.fragmentos, p.conCorpus ? objetivosDeConsulta(p.pregunta) : [], {});
  if (!r4.suficiente) return { suficiente: false, motivo: r4.motivo, mensaje: mensajeAbstencionR3(r4.motivo), citas: [] };
  const ids = new Set(r4.fragmentoIds);
  return { suficiente: true, texto: r4.textoValidado, citas: construirCitas(p.fragmentos.filter((f) => typeof f.id === 'string' && ids.has(f.id))) };
}
