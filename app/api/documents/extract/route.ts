/**
 * POST /api/documents/extract
 *
 * Segundo paso de la subida directa (ver /api/documents/upload-url). El
 * cliente ya subió el archivo directo a Supabase Storage con la signed URL;
 * esta ruta lo descarga server-to-server (sin límite de body de Vercel),
 * extrae el texto y BORRA el objeto de Storage siempre -- éxito o error. No
 * hay persistencia de documentos de usuario: el bucket es solo tránsito.
 *
 * Recibe: { path, filename }
 * Devuelve: { text, filename, chars, truncated }
 *
 * Seguridad: el path debe empezar con el uid verificado del token de quien
 * llama -- igual que /api/documents/upload-url, nunca se confía en un path
 * arbitrario del cliente. Sin esto, un usuario autenticado podría pedir la
 * extracción de un archivo subido por otro usuario si adivinara su path.
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
import { extraerTextoDeBuffer, truncarTexto } from '@/lib/documents/extract-content';

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
      { error: 'Inicie sesión para analizar documentos.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  let body: { path?: unknown; filename?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }

  const path = typeof body.path === 'string' ? body.path : '';
  const filename = typeof body.filename === 'string' ? body.filename : '';

  if (!path || !path.startsWith(`${userId}/`)) {
    return NextResponse.json(
      { error: 'Documento no encontrado o no autorizado.', code: 'FORBIDDEN' },
      { status: 403 },
    );
  }

  if (!filename || !isAllowedDocumentExtension(filename)) {
    const ext = extensionOfFilename(filename) || '(sin extensión)';
    return NextResponse.json(
      { error: `${DOCUMENT_FORMAT_ERROR} Recibido: "${ext}".`, code: 'FILE_FORMAT' },
      { status: 400 },
    );
  }

  const supabase = createServerSupabaseClient();
  const ext = extensionOfFilename(filename);

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(TEMP_DOCS_BUCKET)
      .download(path);

    if (downloadError || !blob) {
      console.error('[documents/extract] Error descargando:', downloadError);
      return NextResponse.json(
        { error: 'No se pudo leer el documento subido. Intente de nuevo.', code: 'EXTRACT_FAILED' },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    if (buffer.byteLength > MAX_DOCUMENT_BYTES_DIRECT) {
      return NextResponse.json(
        { error: DOCUMENT_SIZE_ERROR_DIRECT, code: 'FILE_TOO_LARGE' },
        { status: 413 },
      );
    }

    const rawText = await extraerTextoDeBuffer(buffer, ext);
    const { text, truncated } = truncarTexto(rawText);

    return NextResponse.json({ text, filename, chars: text.length, truncated });
  } catch (err) {
    console.error('[documents/extract] Error al procesar:', filename, err);
    return NextResponse.json(
      {
        error: 'Error al extraer texto del documento. Verifique que el archivo no esté protegido y sea PDF, DOCX o TXT.',
        code: 'EXTRACT_FAILED',
      },
      { status: 500 },
    );
  } finally {
    // Tránsito únicamente -- nunca queda un documento de usuario en Storage,
    // ni siquiera si la extracción falló.
    await supabase.storage.from(TEMP_DOCS_BUCKET).remove([path]).catch((err) => {
      console.error('[documents/extract] No se pudo borrar el temporal:', path, err);
    });
  }
}
