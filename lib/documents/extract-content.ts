/**
 * lib/documents/extract-content.ts
 *
 * Extracción de texto plano de un buffer PDF/DOCX/TXT ya en memoria.
 * Compartido por app/api/extract-text (multipart directo, ≤4 MB) y
 * app/api/documents/extract (subida directa a Storage, documentos pesados)
 * — la lógica de parseo es idéntica, solo cambia de dónde viene el buffer.
 */
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const MAX_EXTRACTED_CHARS = 20_000;

export async function extraerTextoDeBuffer(buffer: Buffer, ext: string): Promise<string> {
  let rawText = '';

  if (ext === '.txt') {
    rawText = buffer.toString('utf-8');
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value;
  } else if (ext === '.pdf') {
    // API de pdf-parse v2 (la v1 exponía una función; v2 expone la clase PDFParse).
    const parser = new PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      rawText = data.text ?? '';
    } finally {
      await parser.destroy();
    }
  }

  // Limpiar espacios excesivos comunes en PDFs
  return rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function truncarTexto(texto: string): { text: string; truncated: boolean } {
  const truncated = texto.length > MAX_EXTRACTED_CHARS;
  return { text: truncated ? texto.slice(0, MAX_EXTRACTED_CHARS) : texto, truncated };
}
