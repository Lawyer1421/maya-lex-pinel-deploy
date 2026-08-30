/**
 * Reglas compartidas de adjunto documental (cliente + servidor).
 * Sin imports de servidor — PromptInput puede importar este módulo.
 *
 * El adjunto (PDF / DOCX / TXT, máx. 4 MB) está disponible para cualquier
 * usuario autenticado (free, académico, pro). Anónimo / IP: AUTH_REQUIRED
 * para poder contar la cuota. El plan no es un candado de función.
 */

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

export const ALLOWED_DOCUMENT_EXTENSIONS = ['.txt', '.pdf', '.docx'] as const;

export const DOCUMENT_AUTH_ERROR =
  'Inicie sesión para analizar documentos.';

export const DOCUMENT_PLAN_ERROR =
  'Inicie sesión para analizar documentos. El adjunto está incluido en todos los planes.';

export const DOCUMENT_QUOTA_ERROR =
  'Ha alcanzado el límite de consultas del día. El adjunto se cuenta con la consulta; intente mañana o actualice de plan.';

export const DOCUMENT_SIZE_ERROR =
  'El archivo supera el tamaño máximo (4 MB). Use PDF, DOCX o TXT de hasta 4 MB.';

export const DOCUMENT_FORMAT_ERROR =
  'Formato no soportado. Use PDF, DOCX o TXT.';

export type DocumentRejectCode =
  | 'AUTH_REQUIRED'
  | 'PLAN_REQUIRED'
  | 'QUOTA_EXCEEDED'
  | 'FILE_TOO_LARGE'
  | 'FILE_FORMAT'
  | 'EXTRACT_FAILED';

/**
 * Gate de UI: si /api/usage ya mandó canAttach, honrarlo; si no, cualquier
 * sesión autenticada desbloquea (free / académico / pro). Anónimo = candado.
 */
export function documentAttachAllowed(
  canAttachProp: boolean | undefined,
  isAuthenticated: boolean
): boolean {
  return canAttachProp ?? isAuthenticated;
}

export function extensionOfFilename(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

export function isAllowedDocumentExtension(filename: string): boolean {
  return (ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(
    extensionOfFilename(filename)
  );
}
