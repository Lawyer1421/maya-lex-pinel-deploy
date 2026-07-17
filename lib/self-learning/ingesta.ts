/**
 * lib/self-learning/ingesta.ts
 * Pipeline principal: usuario sube documento → moderación → (si aprueba)
 * fragmentación + embeddings → guardado en vectores_conocimiento.
 *
 * Flujo:
 *   1. moderarDocumento()   — gate obligatorio (lib/self-learning/moderar.ts)
 *   2. Guardar SIEMPRE en documentos_aprendizaje, sin importar el resultado
 *      (auditoría completa: incluso lo rechazado queda registrado y visible
 *      para un admin, nunca se descarta silenciosamente)
 *   3. Solo si estado_moderacion='aprobado' → fragmentar + embeber + indexar
 *
 * IMPORTANTE — este archivo NO está conectado a ninguna ruta API todavía.
 * Es la lógica de negocio aislada; conectarla a un endpoint público es un
 * paso deliberadamente posterior y separado (requiere además: límite de
 * tamaño de subida, rate limiting propio, y CAPTCHA o equivalente para
 * evitar que un bot inunde la cola de moderación).
 */
import { createServerSupabaseClient } from '@/lib/supabase';
import { moderarDocumento } from './moderar';
import { embedPassage, fragmentarDocumento } from './embed';
import type { DocumentoSubido } from './types';

export interface ResultadoIngesta {
  documentoId: string;
  estadoModeracion: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
  motivo: string;
  chunksIndexados: number;
}

function vecATexto(vec: number[]): string {
  return '[' + vec.map((x) => x.toFixed(6)).join(',') + ']';
}

export async function ingerirDocumento(doc: DocumentoSubido): Promise<ResultadoIngesta> {
  if (!doc.contenido.trim() || doc.contenido.trim().length < 100) {
    throw new Error('El documento debe tener al menos 100 caracteres de contenido sustantivo');
  }
  if (doc.contenido.length > 100_000) {
    throw new Error('El documento excede el tamaño máximo (100,000 caracteres)');
  }

  const supabase = createServerSupabaseClient();

  // 1. Moderación — nunca se salta, nunca falla silenciosamente
  const resultado = await moderarDocumento(doc);
  const materiaFinal = doc.materia ?? resultado.materiaInferida ?? null;

  // 2. Registro SIEMPRE, sin importar el resultado — auditoría completa
  const { data: insertado, error: errInsert } = await supabase
    .from('documentos_aprendizaje')
    .insert({
      autor_identifier:       doc.autorIdentifier,
      titulo:                 doc.titulo ?? null,
      contenido_original:     doc.contenido,
      contenido_anonimizado:  resultado.contenidoAnonimizado,
      tipo_documento:         doc.tipoDocumento,
      materia:                materiaFinal,
      estado_moderacion:      resultado.decision,
      motivo_moderacion:      resultado.motivo,
      pii_detectada:          resultado.piiDetectada,
      score_calidad:          resultado.scoreCalidad,
    })
    .select('id')
    .single();

  if (errInsert || !insertado) {
    throw new Error(`No se pudo registrar el documento: ${errInsert?.message ?? 'error desconocido'}`);
  }

  const documentoId = insertado.id as string;

  // 3. Indexar SOLO si quedó aprobado — 'en_revision'/'rechazado'/'pendiente'
  //    quedan registrados pero invisibles para buscar_conocimiento_comunidad()
  if (resultado.decision !== 'aprobado') {
    return {
      documentoId,
      estadoModeracion: resultado.decision,
      motivo: resultado.motivo,
      chunksIndexados: 0,
    };
  }

  const fragmentos = fragmentarDocumento(resultado.contenidoAnonimizado);
  const filas = [];

  for (let i = 0; i < fragmentos.length; i++) {
    const vec = await embedPassage(fragmentos[i]);
    filas.push({
      id:             `${documentoId}:${String(i).padStart(3, '0')}`,
      documento_id:   documentoId,
      materia:        materiaFinal,
      tipo_documento: doc.tipoDocumento,
      contenido:      fragmentos[i],
      embedding:      vecATexto(vec),
    });
  }

  const { error: errVectores } = await supabase
    .from('vectores_conocimiento')
    .insert(filas);

  if (errVectores) {
    // El documento queda aprobado en metadata pero sin vectores indexados —
    // no es invisible (queda en el listado de admin) pero tampoco buscable
    // hasta reintentar. No revertimos el estado: evita perder el registro
    // de que la moderación sí lo aprobó.
    console.error('[Ingesta] Documento aprobado pero fallo al indexar vectores:', errVectores.message);
    return {
      documentoId,
      estadoModeracion: 'aprobado',
      motivo: `${resultado.motivo} (⚠️ error al indexar: ${errVectores.message})`,
      chunksIndexados: 0,
    };
  }

  return {
    documentoId,
    estadoModeracion: 'aprobado',
    motivo: resultado.motivo,
    chunksIndexados: filas.length,
  };
}
