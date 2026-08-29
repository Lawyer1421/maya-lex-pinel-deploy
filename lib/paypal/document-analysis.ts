/**
 * Gate server-side de análisis documental.
 * Usado por POST /api/extract-text (y /api/usage para canAttach).
 */
import { getUserIdentifierVerificado } from '@/lib/rate-limit';
import { DOCUMENT_AUTH_ERROR, DOCUMENT_PLAN_ERROR } from '@/lib/documents/upload-rules';
import { resolveCurrentAccess } from './access';

export type DocumentAnalysisDecision =
  | { ok: true; userIdentifier: string }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
      code: 'AUTH_REQUIRED' | 'PLAN_REQUIRED';
    };

export async function resolveDocumentAnalysisAccess(
  req: Request
): Promise<DocumentAnalysisDecision> {
  const userIdentifier = await getUserIdentifierVerificado(req);

  if (userIdentifier.startsWith('ip:')) {
    return {
      ok: false,
      status: 401,
      error: DOCUMENT_AUTH_ERROR,
      code: 'AUTH_REQUIRED',
    };
  }

  const access = await resolveCurrentAccess(userIdentifier);
  if (!access.canAnalyzeDocuments) {
    return {
      ok: false,
      status: 403,
      error: DOCUMENT_PLAN_ERROR,
      code: 'PLAN_REQUIRED',
    };
  }

  return { ok: true, userIdentifier };
}
