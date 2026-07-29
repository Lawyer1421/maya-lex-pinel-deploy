/**
 * lib/ingesta-oficial/types.ts
 * Tipos del pipeline de ingesta de fuentes jurídicas oficiales.
 * Ver MAYALEX_OFFICIAL_SOURCE_PIPELINE.md para el diseño completo.
 */

export type EstadoV = 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5';

export interface ManifestFuenteOficial {
  /** Autoridad emisora — ej. "Congreso Nacional de Honduras" */
  autoridad: string;
  /** Número de decreto o instrumento — ej. "130-2017" */
  decreto: string;
  /** Fecha de publicación oficial (ISO 8601) */
  publicacion: string;
  /** Fecha declarada de entrada en vigor (ISO 8601), si se conoce */
  entradaVigor?: string;
  materia: string;
  /** Estado declarado por quien envía el paquete — ej. "vigente", "derogado" */
  estado: string;
  /** SHA-256 del archivo fuente, calculado por quien prepara el paquete */
  checksum: string;
  /** Identificador de la persona responsable de la revisión humana posterior */
  responsableRevision: string;
  /** URL o referencia documental del origen (ej. La Gaceta, enlace oficial) */
  urlOReferencia?: string;
}

export interface PaqueteIngesta {
  manifest: ManifestFuenteOficial;
  textoFuente: string;
}

export interface ArticuloExtraido {
  numArticulo: string;
  contenido: string;
}

export interface RegistroPasoPipeline {
  paso: string;
  numero: number;
  resultado: 'ok' | 'rechazado';
  detalle: string;
}

export interface ResultadoPipeline {
  normId: string;
  aceptado: boolean;
  pasos: RegistroPasoPipeline[];
  articulos: ArticuloExtraido[];
  jsonl: string | null;
  motivoRechazo: string | null;
}

/** Los 16 pasos del pipeline, en orden — usado para trazabilidad y pruebas. */
export const PASOS_PIPELINE = [
  'recepcion',
  'hash',
  'validacion_manifest',
  'extraccion',
  'normalizacion',
  'separacion_por_articulo',
  'control_encabezados',
  'deteccion_duplicados',
  'metadatos',
  'validaciones',
  'salida_jsonl',
  'staging',
  'embeddings_candidate',
  'benchmark',
  'aprobacion_humana',
  'alias',
] as const;

export type NombrePaso = (typeof PASOS_PIPELINE)[number];
