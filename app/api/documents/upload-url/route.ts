/**
 * POST /api/documents/upload-url
 *
 * Primer paso de la subida directa de documentos pesados (> 4 MB, hasta
 * MAX_DOCUMENT_BYTES_DIRECT). Emite una signed upload URL de Supabase
 * Storage (bucket privado TEMP_DOCS_BUCKET, ver supabase/migrations) para
 * que el cliente suba el archivo DIRECTO al Storage, sin pasar por el body
 * de esta ni ninguna función serverless de Vercel (límite 4.5 MB).
 *
 * Recibe: { filename, size }
 * Devuelve: { path, token, signedUrl }
 *
 * Gate: mismo que /api/extract-text (resolveDocumentAnalysisAccess) — sesión
 * autenticada con cuota disponible. El path se ancla al uid verificado del
 * token, nunca a un valor provisto por el cliente -- ver /api/documents/extract
 * para la verificación de propiedad en el segundo paso.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveDocumentAnalysisAccess } from '@/lib/paypal/document-analysis';
import {
  DOCUMENT_FORMAT_ERROR,
  DOCUMENT_SIZE_ERROR_DIRECT,
  MAX_DOCUMENT_BYTES_DIRECT,
  TEMP_DOCS_BUCKET,
  extensionOfFilename,
  isAllowedDocumentExtension,
} from '@/lib/documents/upload-rules';

async function getVerifiedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return null;

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const access = await resolveDocumentAnalysisAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
  }

  const userId = await getVerifiedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: 'Inicie sesión para subir documentos.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  let body: { filename?: unknown; size?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }

  const filename = typeof body.filename === 'string' ? body.filename : '';
  const size = typeof body.size === 'number' ? body.size : 0;

  if (!filename || !isAllowedDocumentExtension(filename)) {
    const ext = extensionOfFilename(filename) || '(sin extensión)';
    return NextResponse.json(
      { error: `${DOCUMENT_FORMAT_ERROR} Recibido: "${ext}".`, code: 'FILE_FORMAT' },
      { status: 400 },
    );
  }

  if (size <= 0 || size > MAX_DOCUMENT_BYTES_DIRECT) {
    return NextResponse.json(
      { error: DOCUMENT_SIZE_ERROR_DIRECT, code: 'FILE_TOO_LARGE' },
      { status: 413 },
    );
  }

  const ext = extensionOfFilename(filename);
  // Nunca se usa el filename original en el path (evita traversal / caracteres
  // no válidos en Storage) -- solo su extensión, ya validada contra la lista blanca.
  const path = `${userId}/${crypto.randomUUID()}${ext}`;

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from(TEMP_DOCS_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('[documents/upload-url] Error creando signed URL:', error);
      return NextResponse.json(
        { error: 'No se pudo preparar la subida. Intente de nuevo.', code: 'UPLOAD_URL_FAILED' },
        { status: 500 },
      );
    }

    return NextResponse.json({ path: data.path, token: data.token, signedUrl: data.signedUrl });
  } catch (err) {
    console.error('[documents/upload-url] Error inesperado:', err);
    return NextResponse.json(
      { error: 'No se pudo preparar la subida. Intente de nuevo.', code: 'UPLOAD_URL_FAILED' },
      { status: 500 },
    );
  }
}
