/**
 * Reglas compartidas de adjunto documental (cliente + servidor).
 * Sin imports de servidor — PromptInput puede importar este módulo.
 *
 * El análisis de documentos se vende en el plan Profesional (USD 15,
 * paypalTier 'pro'). Académico (USD 9) no incluye adjuntos.
 */

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

export const ALLOWED_DOCUMENT_EXTENSIONS = ['.txt', '.pdf', '.docx'] as const;

export const DOCUMENT_AUTH_ERROR =
  'Inicie sesión para analizar documentos.';

export const DOCUMENT_PLAN_ERROR =
  'Análisis documental exclusivo del plan Profesional.';

export const DOCUMENT_SIZE_ERROR =
  'El archivo supera el tamaño máximo (4 MB). Use PDF, DOCX o TXT de hasta 4 MB.';

export const DOCUMENT_FORMAT_ERROR =
  'Formato no soportado. Use PDF, DOCX o TXT.';

export type DocumentRejectCode =
  | 'AUTH_REQUIRED'
  | 'PLAN_REQUIRED'
  | 'FILE_TOO_LARGE'
  | 'FILE_FORMAT'
  | 'EXTRACT_FAILED';

export function extensionOfFilename(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

export function isAllowedDocumentExtension(filename: string): boolean {
  return (ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(
    extensionOfFilename(filename)
  );
}
