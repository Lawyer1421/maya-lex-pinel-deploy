import { describe, it, expect } from 'vitest';
import {
  DOCUMENT_AUTH_ERROR,
  DOCUMENT_FORMAT_ERROR,
  DOCUMENT_PLAN_ERROR,
  DOCUMENT_QUOTA_ERROR,
  DOCUMENT_SIZE_ERROR,
  MAX_DOCUMENT_BYTES,
  documentAttachAllowed,
  extensionOfFilename,
  isAllowedDocumentExtension,
} from '@/lib/documents/upload-rules';

describe('reglas de adjunto documental', () => {
  it('acepta las extensiones anunciadas en el UI (PDF, DOCX, TXT)', () => {
    expect(isAllowedDocumentExtension('contrato.pdf')).toBe(true);
    expect(isAllowedDocumentExtension('ESCRITO.DOCX')).toBe(true);
    expect(isAllowedDocumentExtension('notas.TXT')).toBe(true);
  });

  it('rechaza formatos no anunciados (p.ej. .doc legado, imágenes)', () => {
    expect(isAllowedDocumentExtension('contrato.doc')).toBe(false);
    expect(isAllowedDocumentExtension('scan.png')).toBe(false);
    expect(isAllowedDocumentExtension('sin-extension')).toBe(false);
  });

  it('normaliza la extensión con último punto y minúsculas', () => {
    expect(extensionOfFilename('informe.final.PDF')).toBe('.pdf');
    expect(extensionOfFilename('solo')).toBe('');
  });

  it('el techo de tamaño es 4 MB — por debajo del body limit de Vercel', () => {
    expect(MAX_DOCUMENT_BYTES).toBe(4 * 1024 * 1024);
  });

  it('los mensajes distinguen login / cuota / archivo — no venden Profesional-only', () => {
    expect(DOCUMENT_AUTH_ERROR).toMatch(/inicie sesión/i);
    expect(DOCUMENT_PLAN_ERROR).not.toMatch(/exclusivo.*Profesional/i);
    expect(DOCUMENT_PLAN_ERROR).not.toMatch(/plan Profesional/i);
    expect(DOCUMENT_QUOTA_ERROR).toMatch(/límite/i);
    expect(DOCUMENT_FORMAT_ERROR).toMatch(/PDF, DOCX o TXT/i);
    expect(DOCUMENT_SIZE_ERROR).toMatch(/4 MB/i);
  });

  it('documentAttachAllowed: autenticado desbloquea; anónimo no; canAttachProp gana', () => {
    expect(documentAttachAllowed(undefined, true)).toBe(true);
    expect(documentAttachAllowed(undefined, false)).toBe(false);
    expect(documentAttachAllowed(true, false)).toBe(true);
    expect(documentAttachAllowed(false, true)).toBe(false);
  });
});
