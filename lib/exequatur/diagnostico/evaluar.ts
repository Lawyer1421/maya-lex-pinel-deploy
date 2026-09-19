/**
 * Evaluación determinística del diagnóstico (Slice 3).
 * Fail-closed: ítem desconocido, opción desconocida u objetivo huérfano
 * no puntúan ni inventan una lección.
 */
import { localizarObjetivo } from '../curriculum/localizar';
import { BANCO_DIAGNOSTICO_EXEQUATUR } from './banco';
import type { ItemDiagnostico, LeccionRecomendada, ResultadoDiagnostico } from './types';

export function itemPorId(itemId: string): ItemDiagnostico | null {
  if (!itemId) return null;
  return BANCO_DIAGNOSTICO_EXEQUATUR.items.find((item) => item.id === itemId) ?? null;
}

export function parsearRespuestas(formData: FormData): Record<string, string> {
  const respuestas: Record<string, string> = {};
  for (const item of BANCO_DIAGNOSTICO_EXEQUATUR.items) {
    const crudo = formData.get(`item:${item.id}`);
    if (typeof crudo === 'string' && crudo.length > 0) {
      respuestas[item.id] = crudo;
    }
  }
  return respuestas;
}

function opcionPertenece(item: ItemDiagnostico, opcionId: string): boolean {
  return item.opciones.some((opcion) => opcion.id === opcionId);
}

export function evaluarDiagnostico(respuestas: Record<string, string>): ResultadoDiagnostico {
  const aciertos: string[] = [];
  const fallos: string[] = [];
  const sinRespuesta: string[] = [];
  const objetivosPendientes: string[] = [];

  for (const item of BANCO_DIAGNOSTICO_EXEQUATUR.items) {
    const elegido = respuestas[item.id];
    if (!elegido) {
      sinRespuesta.push(item.id);
      objetivosPendientes.push(item.objetivoId);
      continue;
    }
    if (!opcionPertenece(item, elegido) || elegido !== item.respuestaCorrectaId) {
      fallos.push(item.id);
      objetivosPendientes.push(item.objetivoId);
      continue;
    }
    aciertos.push(item.id);
  }

  return {
    versionBanco: BANCO_DIAGNOSTICO_EXEQUATUR.version,
    total: BANCO_DIAGNOSTICO_EXEQUATUR.items.length,
    aciertos,
    fallos,
    sinRespuesta,
    objetivosPendientes: [...new Set(objetivosPendientes)],
    leccionesRecomendadas: recomendarLecciones(objetivosPendientes),
  };
}

export function recomendarLecciones(objetivoIds: string[]): LeccionRecomendada[] {
  const porLeccion = new Map<string, LeccionRecomendada>();

  for (const objetivoId of objetivoIds) {
    const localizado = localizarObjetivo(objetivoId);
    if (!localizado) continue;
    const clave = `${localizado.modulo.slug}/${localizado.leccion.slug}`;
    const existente = porLeccion.get(clave);
    if (existente) {
      if (!existente.objetivoIds.includes(objetivoId)) {
        existente.objetivoIds.push(objetivoId);
      }
      continue;
    }
    porLeccion.set(clave, {
      moduloSlug: localizado.modulo.slug,
      leccionSlug: localizado.leccion.slug,
      titulo: localizado.leccion.titulo,
      objetivoIds: [objetivoId],
    });
  }

  return [...porLeccion.values()];
}

export function parsearObjetivosQuery(crudo: string | undefined): string[] {
  if (!crudo) return [];
  const vistos = new Set<string>();
  const validos: string[] = [];
  for (const parte of crudo.split(',')) {
    const id = parte.trim();
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    if (!localizarObjetivo(id)) continue;
    validos.push(id);
  }
  return validos;
}
