/**
 * lib/self-learning/buscar-plantilla.ts
 * Búsqueda de plantillas jurídicas genéricas para el modo 'documento'.
 *
 * Conectado a app/api/chat/route.ts: cuando el usuario pide generar un
 * instrumento notarial, se busca la plantilla más parecida (aprobada,
 * sin PII) y se inyecta como base estructural — el modelo la adapta
 * con los datos reales del caso, nunca la copia a ciegas.
 */
import { createServerSupabaseClient } from '@/lib/supabase';
import { embedQueryComunidad } from './embed';

export interface PlantillaEncontrada {
  id: string;
  tipoInstrumento: string;
  titulo: string;
  contenidoPlantilla: string;
  variables: string[];
  similarity: number;
}

export async function buscarPlantilla(
  consulta: string,
  opciones: { tipoInstrumento?: string; limite?: number } = {}
): Promise<PlantillaEncontrada[]> {
  try {
    const supabase = createServerSupabaseClient();
    const vec = await embedQueryComunidad(consulta);
    const vecTexto = '[' + vec.map((x) => x.toFixed(6)).join(',') + ']';

    const { data, error } = await supabase.rpc('buscar_plantilla', {
      query_embedding: vecTexto,
      tipo_filtro: opciones.tipoInstrumento ?? null,
      limite: opciones.limite ?? 2,
    });

    if (error) {
      console.warn('[Plantillas] Error de búsqueda:', error.message);
      return [];
    }

    return (data ?? []).map((fila: {
      id: string; tipo_instrumento: string; titulo: string;
      contenido_plantilla: string; variables: string[]; similarity: number;
    }) => ({
      id: fila.id,
      tipoInstrumento: fila.tipo_instrumento,
      titulo: fila.titulo,
      contenidoPlantilla: fila.contenido_plantilla,
      variables: fila.variables,
      similarity: fila.similarity,
    }));
  } catch (err) {
    console.warn('[Plantillas] Fallo inesperado:', err instanceof Error ? err.message : String(err));
    return []; // degrada a sin-plantilla — nunca rompe el chat
  }
}

/**
 * Formatea la plantilla encontrada para inyectar en el system prompt.
 * Solo se inyecta si similarity supera un umbral razonable — de lo
 * contrario el modelo genera desde su conocimiento general, sin forzar
 * una plantilla que no corresponde al tipo de documento pedido.
 */
export function formatearContextoPlantilla(resultados: PlantillaEncontrada[]): string {
  const relevantes = resultados.filter((r) => r.similarity >= 0.75);
  if (!relevantes.length) return '';

  const bloques = relevantes
    .map((r, i) => [
      `[PLANTILLA ${i + 1}] ${r.titulo} (similitud: ${(r.similarity * 100).toFixed(0)}%)`,
      `Variables a completar: ${r.variables.join(', ')}`,
      '',
      r.contenidoPlantilla,
    ].join('\n'))
    .join('\n\n---\n\n');

  return [
    '## PLANTILLA BASE DEL ARCHIVO PROFESIONAL (Bufete Pinel)',
    '',
    '> La(s) siguiente(s) plantilla(s) provienen de instrumentos notariales',
    '> reales del ejercicio profesional, ya despojados de datos personales.',
    '> Úsala(s) como ESTRUCTURA BASE si corresponde al documento solicitado:',
    '> reemplaza cada [VARIABLE] con los datos reales que el usuario indique',
    '> en su consulta, y ajusta cláusulas solo si el usuario lo pide',
    '> explícitamente. Si el usuario no dio un dato requerido, dejarlo',
    '> marcado como [FALTA: nombre_variable] en vez de inventarlo.',
    '> Si el tipo de documento no calza con la plantilla, ignórala y',
    '> redacta desde tu conocimiento jurídico general.',
    '',
    bloques,
  ].join('\n');
}
