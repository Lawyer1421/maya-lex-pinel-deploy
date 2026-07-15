/**
 * lib/self-learning/types.ts
 * Tipos compartidos del sistema de conocimiento comunitario.
 * Ver schema.sql para el esquema de base de datos correspondiente.
 */

export type TipoDocumento = 'demanda' | 'sentencia' | 'analisis' | 'opinion' | 'dictamen';

export type EstadoModeracion = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';

export interface DocumentoSubido {
  autorIdentifier: string;   // email:{correo} — mismo esquema que subscriptions
  titulo?: string;
  contenido: string;         // texto crudo tal como lo pega/sube el usuario
  tipoDocumento: TipoDocumento;
  materia?: string;          // si no se indica, se infiere en moderar.ts
}

export interface ResultadoModeracion {
  decision: 'aprobado' | 'rechazado' | 'en_revision';
  motivo: string;
  piiDetectada: boolean;
  scoreCalidad: number;      // 0.0–1.0
  contenidoAnonimizado: string;
  materiaInferida?: string;
}

export interface ResultadoConocimientoComunidad {
  contenido: string;
  tipoDocumento: TipoDocumento;
  documentoId: string;
  similarity: number;
}
