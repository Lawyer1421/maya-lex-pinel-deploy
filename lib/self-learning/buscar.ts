/**
 * lib/self-learning/buscar.ts
 * Búsqueda en el conocimiento comunitario — completamente separada de
 * lib/rag/search.ts (el corpus curado oficial: CPC, CPP, doctrina).
 *
 * NO está conectada a app/api/chat/route.ts todavía. Conectarla implica
 * una decisión editorial: ¿el modelo debe usar esto por defecto, o solo
 * cuando el usuario lo pide explícitamente? Y requiere extender el
 * system prompt (lib/system-prompt.ts) para que el modelo distinga
 * explícitamente "doctrina oficial verificada" de "aporte de la
 * comunidad, no verificado por Maya Lex" en su jerarquía de fuentes —
 * ver JERARQUIA_NORMATIVA en el prompt Magistrado, que ya tiene 7
 * niveles; esto entraría en un nivel propio, por debajo de doctrina
 * científica, con advertencia explícita de que no es fuente oficial.
 */
import { createServerSupabaseClient } from '@/lib/supabase';
import { embedQueryComunidad } from './embed';
import type { ResultadoConocimientoComunidad, TipoDocumento } from './types';

export async function buscarConocimientoComunidad(
  consulta: string,
  opciones: { materia?: string; tipoDocumento?: TipoDocumento; limite?: number } = {}
): Promise<ResultadoConocimientoComunidad[]> {
  const supabase = createServerSupabaseClient();
  const vec = await embedQueryComunidad(consulta);
  const vecTexto = '[' + vec.map((x) => x.toFixed(6)).join(',') + ']';

  const { data, error } = await supabase.rpc('buscar_conocimiento_comunidad', {
    query_embedding: vecTexto,
    materia_filtro:  opciones.materia ?? null,
    tipo_filtro:     opciones.tipoDocumento ?? null,
    limite:          opciones.limite ?? 5,
  });

  if (error) {
    console.error('[Conocimiento Comunidad] Error de búsqueda:', error.message);
    return []; // degrada a vacío — nunca rompe el chat
  }

  return (data ?? []).map((fila: {
    contenido: string; tipo_documento: string; documento_id: string; similarity: number;
  }) => ({
    contenido:      fila.contenido,
    tipoDocumento:  fila.tipo_documento as TipoDocumento,
    documentoId:    fila.documento_id,
    similarity:     fila.similarity,
  }));
}

/**
 * Formatea resultados para inyectar en el system prompt — SIEMPRE con
 * la advertencia de que es contenido comunitario no verificado, jamás
 * mezclado sin distinguir con el corpus oficial curado.
 */
export function formatearContextoComunidad(resultados: ResultadoConocimientoComunidad[]): string {
  if (!resultados.length) return '';

  const bloques = resultados
    .map((r, i) => `[Comunidad ${i + 1}] (${r.tipoDocumento})\n${r.contenido}`)
    .join('\n\n');

  return [
    '## APORTES DE LA COMUNIDAD (no verificados por Maya Lex)',
    '',
    '> Estos son análisis/documentos subidos por otros usuarios de la plataforma,',
    '> aprobados solo por un filtro automático de calidad y anonimización —',
    '> NO tienen el mismo nivel de autoridad que el corpus normativo oficial.',
    '> Trátalos como referencia de práctica profesional, nunca como fuente',
    '> normativa. Cítalos explícitamente como "[Comunidad N]" y aclara que',
    '> no son doctrina oficial verificada.',
    '',
    bloques,
  ].join('\n');
}
