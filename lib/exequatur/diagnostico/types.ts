/**
 * Dominio de diagnóstico de colocación (Slice 3).
 * Repositorio-versionado, sin persistencia. El ítem es pedagógico:
 * no almacena texto legal ni identidad de chunk.
 */
export interface OpcionDiagnostico {
  id: string;
  texto: string;
}

export interface ItemDiagnostico {
  id: string;
  /** Debe existir en CURRICULUM_EXEQUATUR. */
  objetivoId: string;
  enunciado: string;
  opciones: OpcionDiagnostico[];
  respuestaCorrectaId: string;
}

export interface BancoDiagnostico {
  version: number;
  titulo: string;
  items: ItemDiagnostico[];
}

export interface LeccionRecomendada {
  moduloSlug: string;
  leccionSlug: string;
  titulo: string;
  objetivoIds: string[];
}

export interface ResultadoDiagnostico {
  versionBanco: number;
  total: number;
  aciertos: string[];
  fallos: string[];
  sinRespuesta: string[];
  objetivosPendientes: string[];
  leccionesRecomendadas: LeccionRecomendada[];
}
