/**
 * lib/legal-retrieval/r3-chat.ts
 * A-2 (decisión CLO): el chat principal aplica la MISMA R3 que Luna (`evaluarSuficienciaR3`, clasificador compartido). Un solo criterio, sin ruta
 * de evasión: si la respuesta no tiene una afirmación respaldada por una cita a un fragmento PRIMARY vigente (TRUE) del mismo instrumento y artículo
 * consultados, y no nombra ese instrumento y artículo, NO se entrega: hay abstención y se dice qué falta.
 */
import { construirCitas, type Cita } from './evidence-engine';
import { evaluarSuficienciaR3, extraerAfirmacionesCitadas, mensajeAbstencionR3, type MotivoR3 } from './clo-guards';
import { objetivosDeConsulta } from './r3-objetivos';
import type { FragmentoRAG } from './types';

export const CODIGO_ABSTENCION_R3 = 'R3_SUFICIENCIA_NO_ACREDITADA';

export type VeredictoChatR3 =
  | { suficiente: true; citas: Cita[] }
  | { suficiente: false; motivo: MotivoR3; mensaje: string; citas: [] };

export function evaluarRespuestaChatR3(p: { texto: string; fragmentos: readonly FragmentoRAG[]; pregunta: string }): VeredictoChatR3 {
  const afirmaciones = extraerAfirmacionesCitadas(p.texto, p.fragmentos);
  const r3 = evaluarSuficienciaR3(p.fragmentos, afirmaciones, objetivosDeConsulta(p.pregunta), {}, p.texto);
  if (!r3.suficiente) return { suficiente: false, motivo: r3.motivo, mensaje: mensajeAbstencionR3(r3.motivo), citas: [] };
  const ids = new Set(r3.afirmacionesValidas.flatMap((a) => a.fragmentoIds));
  return { suficiente: true, citas: construirCitas(p.fragmentos.filter((f) => typeof f.id === 'string' && ids.has(f.id))) };
}
