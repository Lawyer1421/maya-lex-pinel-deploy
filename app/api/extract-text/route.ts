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
import mammoth from 'mammoth';
import {
  DOCUMENT_FORMAT_ERROR,
  DOCUMENT_SIZE_ERROR,
  MAX_DOCUMENT_BYTES,
  extensionOfFilename,
  isAllowedDocumentExtension,
} from '@/lib/documents/upload-rules';
import { resolveDocumentAnalysisAccess } from '@/lib/paypal/document-analysis';

const MAX_CHARS = 20_000;

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
    let rawText = '';

    if (ext === '.txt') {
      rawText = buffer.toString('utf-8');

    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;

    } else if (ext === '.pdf') {
      // Importar la lib directamente evita que Next.js falle al intentar
      // leer el archivo de test que pdf-parse busca al cargar el módulo principal.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
        buf: Buffer
      ) => Promise<{ text: string; numpages: number }>;

      const data = await pdfParse(buffer);
      rawText = data.text ?? '';
    }

    // Limpiar espacios excesivos comunes en PDFs
    rawText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    const truncated = rawText.length > MAX_CHARS;
    const text = truncated ? rawText.slice(0, MAX_CHARS) : rawText;

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
