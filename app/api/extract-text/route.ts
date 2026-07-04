/**
 * POST /api/extract-text
 * Extrae texto plano de archivos PDF, DOCX y TXT.
 * Recibe: multipart/form-data con campo "file"
 * Devuelve: { text, filename, chars, truncated }
 *
 * PDF  → pdf-parse (importado via lib/ para evitar el bug de test-files en Next.js)
 * DOCX → mammoth
 * TXT  → UTF-8 directo
 */

import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

const MAX_CHARS = 20_000;

const ALLOWED_EXTENSIONS = new Set(['.txt', '.pdf', '.docx']);

export async function POST(req: NextRequest) {
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
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: `Formato no soportado: "${ext}". Use PDF, DOCX o TXT.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

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
      { error: 'Error al extraer texto del documento. Verifique que el archivo no esté protegido.' },
      { status: 500 }
    );
  }
}
