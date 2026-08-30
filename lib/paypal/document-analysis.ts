/**
 * Gate server-side de análisis documental.
 * Usado por POST /api/extract-text (y /api/usage para canAttach).
 *
 * Autenticado (cualquier plan) = puede extraer. IP / anónimo = 401.
 * Si la cuota diaria ya está agotada = 429 QUOTA_EXCEEDED (solo CHEQUEA;
 * no incrementa — el POST /api/chat incrementa al enviar).
 */
import { getRateLimitStatus, getUserIdentifierVerificado } from '@/lib/rate-limit';
import {
  DOCUMENT_AUTH_ERROR,
  DOCUMENT_PLAN_ERROR,
  DOCUMENT_QUOTA_ERROR,
} from '@/lib/documents/upload-rules';
import { resolveCurrentAccess } from './access';

export type DocumentAnalysisDecision =
  | { ok: true; userIdentifier: string }
  | {
      ok: false;
      status: 401 | 403 | 429;
      error: string;
      code: 'AUTH_REQUIRED' | 'PLAN_REQUIRED' | 'QUOTA_EXCEEDED';
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

  const usage = await getRateLimitStatus(userIdentifier);
  if (usage.tier !== 'admin' && usage.used >= usage.limit) {
    return {
      ok: false,
      status: 429,
      error: DOCUMENT_QUOTA_ERROR,
      code: 'QUOTA_EXCEEDED',
    };
  }

  return { ok: true, userIdentifier };
}
