/**
 * lib/documents/extract-content.ts
 *
 * Extracción de texto plano de un buffer PDF/DOCX/TXT ya en memoria.
 * Compartido por app/api/extract-text (multipart directo, ≤4 MB) y
 * app/api/documents/extract (subida directa a Storage, documentos pesados)
 * — la lógica de parseo es idéntica, solo cambia de dónde viene el buffer.
 */
import mammoth from 'mammoth';

export const MAX_EXTRACTED_CHARS = 20_000;

export async function extraerTextoDeBuffer(buffer: Buffer, ext: string): Promise<string> {
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
  return rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function truncarTexto(texto: string): { text: string; truncated: boolean } {
  const truncated = texto.length > MAX_EXTRACTED_CHARS;
  return { text: truncated ? texto.slice(0, MAX_EXTRACTED_CHARS) : texto, truncated };
}
