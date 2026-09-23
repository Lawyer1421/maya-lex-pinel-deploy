/**
 * POST /api/extract-text
 * Extrae texto plano de archivos PDF, DOCX y TXT.
 * Recibe: multipart/form-data con campo "file"
 * Devuelve: { text, filename, chars, truncated }
 *
 * Gate: sesión autenticada (free / académico / pro / admin). Anónimo = 401.
 * Si la cuota diaria ya está agotada = 429 (sin incrementar).
 * No usa feature flags. Formato/tamaño: PDF, DOCX, TXT, máx. 4 MB.
 *
 * PDF  → pdf-parse (importado via lib/ para evitar el bug de test-files en Next.js)
 * DOCX → mammoth
 * TXT  → UTF-8 directo
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  DOCUMENT_FORMAT_ERROR,
  DOCUMENT_SIZE_ERROR,
  MAX_DOCUMENT_BYTES,
  extensionOfFilename,
  isAllowedDocumentExtension,
} from '@/lib/documents/upload-rules';
import { resolveDocumentAnalysisAccess } from '@/lib/paypal/document-analysis';
import { extraerTextoDeBuffer, truncarTexto } from '@/lib/documents/extract-content';

export async function POST(req: NextRequest) {
  const access = await resolveDocumentAnalysisAccess(req);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, code: access.code },
      { status: access.status }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Campo "file" requerido' }, { status: 400 });
  }

  const filename = file.name;

  if (!isAllowedDocumentExtension(filename)) {
    const ext = extensionOfFilename(filename) || '(sin extensión)';
    return NextResponse.json(
      {
        error: `${DOCUMENT_FORMAT_ERROR} Recibido: "${ext}".`,
        code: 'FILE_FORMAT',
      },
      { status: 400 }
    );
  }

  if (typeof file.size === 'number' && file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      { error: DOCUMENT_SIZE_ERROR, code: 'FILE_TOO_LARGE' },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      { error: DOCUMENT_SIZE_ERROR, code: 'FILE_TOO_LARGE' },
      { status: 413 }
    );
  }

  const ext = extensionOfFilename(filename);

  try {
    const rawText = await extraerTextoDeBuffer(buffer, ext);
    const { text, truncated } = truncarTexto(rawText);

    return NextResponse.json({
      text,
      filename,
      chars: text.length,
      truncated,
    });
  } catch (err) {
    console.error('[extract-text] Error al procesar:', filename, err);
    return NextResponse.json(
      {
        error: 'Error al extraer texto del documento. Verifique que el archivo no esté protegido y sea PDF, DOCX o TXT.',
        code: 'EXTRACT_FAILED',
      },
      { status: 500 }
    );
  }
}
