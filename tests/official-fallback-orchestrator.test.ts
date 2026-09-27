import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fase 1E.2 — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md / directiva "OFFICIAL
 * FALLBACK RUNTIME WIRING". Cubre la decisión/orquestación pura
 * (shouldAttemptOfficialFallback / attemptOfficialFallback /
 * construirMensajeFallbackOficial) sin mockear Next.js -- la integración a
 * nivel de route.ts (tests A/B del matrix) vive en
 * tests/chat-route-fail-closed.test.ts. Red 100% mockeada (§17).
 */

import {
  shouldAttemptOfficialFallback,
  attemptOfficialFallback,
  construirMensajeFallbackOficial,
} from '@/lib/legal-retrieval/official-sources/fallback-orchestrator';

const FORM_PAGE_HTML = `<html><body>
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="VS1" />
<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="G1" />
<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="EV1" />
</body></html>`;

const RESULTS_HTML_CON_FILAS = `<table id="ContentPlaceHolder1_dgvDocumentos">
<tr><th>ID</th><th>Nombre</th><th>Fecha</th><th></th></tr>
<tr><td>9144</td><td>Código Penal Decreto 130-2017</td><td>18/1/2018</td><td><a href="Anexos/uuidCodigoPenal.pdf">Previsualizar</a></td></tr>
</table>`;

const RESULTS_HTML_SIN_FILAS = `<table id="ContentPlaceHolder1_dgvDocumentos">
<tr><th>ID</th><th>Nombre</th><th>Fecha</th><th></th></tr>
</table>`;

function htmlResponse(body: string, status = 200, headers: Record<string, string> = { 'content-type': 'text/html' }) {
  return new Response(body, { status, headers });
}

beforeEach(() => { vi.restoreAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ─────────────────────────────────────────────────────────────────────────────
// shouldAttemptOfficialFallback — reglas deterministas (§3)
// ─────────────────────────────────────────────────────────────────────────────

describe('shouldAttemptOfficialFallback', () => {
  it('[A] flag OFF -> false aunque todo lo demás sea correcto', () => {
    expect(shouldAttemptOfficialFallback({ retrievalState: 'OFFICIAL_FALLBACK_REQUIRED', ruta: 'B', flagEnabled: false })).toBe(false);
  });

  it('[G] NO_VERIFIED_EVIDENCE (artículo exacto inexistente/ambiguo) -> false, nunca dispara fallback amplio', () => {
    expect(shouldAttemptOfficialFallback({ retrievalState: 'NO_VERIFIED_EVIDENCE', ruta: 'B', flagEnabled: true })).toBe(false);
  });

  it('estado undefined (nunca se ejecutó buscarRAG) -> false', () => {
    expect(shouldAttemptOfficialFallback({ retrievalState: undefined, ruta: 'B', flagEnabled: true })).toBe(false);
  });

  it('[F] ruta A (solo procedimental, no legislation-compatible) -> false', () => {
    expect(shouldAttemptOfficialFallback({ retrievalState: 'OFFICIAL_FALLBACK_REQUIRED', ruta: 'A', flagEnabled: true })).toBe(false);
  });

  it('[H/I] ruta D (sala_ia/sala_penal siempre son ruta D) -> false', () => {
    expect(shouldAttemptOfficialFallback({ retrievalState: 'OFFICIAL_FALLBACK_REQUIRED', ruta: 'D', flagEnabled: true })).toBe(false);
  });

  it('ruta B/C + OFFICIAL_FALLBACK_REQUIRED + flag ON -> true', () => {
    expect(shouldAttemptOfficialFallback({ retrievalState: 'OFFICIAL_FALLBACK_REQUIRED', ruta: 'B', flagEnabled: true })).toBe(true);
    expect(shouldAttemptOfficialFallback({ retrievalState: 'OFFICIAL_FALLBACK_REQUIRED', ruta: 'C', flagEnabled: true })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// attemptOfficialFallback — sin red cuando no corresponde, clasificación
// correcta cuando sí corresponde
// ─────────────────────────────────────────────────────────────────────────────

describe('attemptOfficialFallback — gates sin red (§F/§G/§H/§I)', () => {
  it('flag OFF -> attempted=false, fetch NUNCA llamado', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await attemptOfficialFallback({ retrievalState: 'OFFICIAL_FALLBACK_REQUIRED', ruta: 'B', flagEnabled: false, rawQuery: 'artículo 173 código penal' });
    expect(resultado).toEqual({ attempted: false, evidenceCount: 0, evidence: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ruta no legislation-compatible -> attempted=false, fetch NUNCA llamado', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await attemptOfficialFallback({ retrievalState: 'OFFICIAL_FALLBACK_REQUIRED', ruta: 'A', flagEnabled: true, rawQuery: 'plazos para apelar' });
    expect(resultado.attempted).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('NO_VERIFIED_EVIDENCE (Art. 9999) -> attempted=false, fetch NUNCA llamado', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await attemptOfficialFallback({ retrievalState: 'NO_VERIFIED_EVIDENCE', ruta: 'B', flagEnabled: true, rawQuery: 'artículo 9999 CPP' });
    expect(resultado.attempted).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('attemptOfficialFallback — clasificación de resultado real (§B/§C/§D/§E)', () => {
  const inputBase = { retrievalState: 'OFFICIAL_FALLBACK_REQUIRED' as const, ruta: 'B', flagEnabled: true };

  it('[B] CEDIJ SUCCESS -> attempted=true, status SUCCESS, evidencia presente, sourceId correcto', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(htmlResponse(FORM_PAGE_HTML))
      .mockResolvedValueOnce(htmlResponse(RESULTS_HTML_CON_FILAS)));

    const resultado = await attemptOfficialFallback({ ...inputBase, rawQuery: 'artículo 173 código penal' });
    expect(resultado.attempted).toBe(true);
    expect(resultado.status).toBe('SUCCESS');
    expect(resultado.evidenceCount).toBeGreaterThan(0);
    expect(resultado.sourceId).toBe('CEDIJ_LEGISLACION');
    expect(typeof resultado.latencyMs).toBe('number');
  });

  it('[C] CEDIJ NO_RESULTS -> status NO_RESULTS explícito, evidenceCount=0', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(htmlResponse(FORM_PAGE_HTML))
      .mockResolvedValueOnce(htmlResponse(RESULTS_HTML_SIN_FILAS)));

    const resultado = await attemptOfficialFallback({ ...inputBase, rawQuery: 'ley inexistente xyz' });
    expect(resultado.attempted).toBe(true);
    expect(resultado.status).toBe('NO_RESULTS');
    expect(resultado.evidenceCount).toBe(0);
  });

  it('[D] CEDIJ SOURCE_UNAVAILABLE (red cae) -> NUNCA colapsa con NO_RESULTS', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const resultado = await attemptOfficialFallback({ ...inputBase, rawQuery: 'artículo 173 código penal' });
    expect(resultado.attempted).toBe(true);
    expect(resultado.status).toBe('SOURCE_UNAVAILABLE');
    expect(resultado.status).not.toBe('NO_RESULTS');
  });

  it('[E] CEDIJ INVALID_RESPONSE (formulario sin tokens) -> clasificado correctamente, distinto de NO_RESULTS', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(htmlResponse('<html>sin formulario</html>')));

    const resultado = await attemptOfficialFallback({ ...inputBase, rawQuery: 'artículo 173 código penal' });
    expect(resultado.attempted).toBe(true);
    expect(resultado.status).toBe('INVALID_RESPONSE');
    expect(resultado.status).not.toBe('NO_RESULTS');
  });

  it('[J] consulta con PII: el adapter recibe la consulta MINIMIZADA, nunca el nombre del cliente', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(htmlResponse(FORM_PAGE_HTML))
      .mockResolvedValueOnce(htmlResponse(RESULTS_HTML_CON_FILAS));
    vi.stubGlobal('fetch', fetchMock);

    await attemptOfficialFallback({
      ...inputBase,
      rawQuery: 'Mi cliente Juan Pérez necesita saber qué dice el artículo 173 del Código Penal, su correo es juan@example.com',
    });

    const segundaLlamada = fetchMock.mock.calls[1];
    // application/x-www-form-urlencoded codifica espacios como '+', que
    // decodeURIComponent NO convierte de vuelta -- se usa URLSearchParams
    // para decodificar correctamente el valor real enviado.
    const textoEnviado = new URLSearchParams(segundaLlamada[1].body as string).get('ctl00$ContentPlaceHolder1$txtNombreDocumento');
    expect(textoEnviado).not.toContain('Juan Pérez');
    expect(textoEnviado).not.toContain('juan@example.com');
    expect(textoEnviado).toContain('artículo 173 del Código Penal');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// construirMensajeFallbackOficial — §6/§7: solo proveniencia, nunca texto de
// artículo, nunca vigencia
// ─────────────────────────────────────────────────────────────────────────────

describe('construirMensajeFallbackOficial', () => {
  const evidenciaEjemplo = [{
    sourceId: 'CEDIJ_LEGISLACION' as const,
    sourceName: 'CEDIJ — Biblioteca Judicial Electrónica (Poder Judicial de Honduras)',
    sourceUrl: 'https://legislacion.poderjudicial.gob.hn/sistemalegislacion/Anexos/uuidX.pdf',
    documentTitle: 'Código Penal Decreto 130-2017 fusionado y actualizado a julio 2026',
    documentType: 'LEGISLATION' as const,
    jurisdiction: 'HN' as const,
    retrievedAt: new Date().toISOString(),
    verificationStatus: 'SOURCE_CONFIRMED' as const,
  }];

  it('[L] incluye título/fuente/URL, NUNCA texto de artículo fabricado', () => {
    const mensaje = construirMensajeFallbackOficial(evidenciaEjemplo);
    expect(mensaje).toContain('MayaLex localizó una fuente oficial relacionada en CEDIJ');
    expect(mensaje).toContain(evidenciaEjemplo[0].documentTitle);
    expect(mensaje).toContain(evidenciaEjemplo[0].sourceUrl);
    // Nunca debe parecer una afirmación de contenido normativo ("El artículo X establece...").
    expect(mensaje).not.toMatch(/el art[ií]culo\s+\d+\s+establece/i);
  });

  it('[K] el mensaje nunca afirma vigencia -- SOURCE_CONFIRMED != NORMA VIGENTE HONDURAS', () => {
    const mensaje = construirMensajeFallbackOficial(evidenciaEjemplo);
    expect(mensaje).not.toContain('NORMA VIGENTE HONDURAS');
    expect(mensaje).not.toMatch(/vigente/i);
    // La evidencia oficial no tiene (ni debe tener) un campo es_norma_vigente
    // -- estructuralmente no puede convertirse en una cita interna.
    expect('es_norma_vigente' in evidenciaEjemplo[0]).toBe(false);
  });

  it('sin evidencia -> devuelve solo el mensaje base', () => {
    const mensaje = construirMensajeFallbackOficial([]);
    expect(mensaje).toContain('MayaLex localizó una fuente oficial relacionada en CEDIJ');
    expect(mensaje).not.toContain('Documento localizado');
  });
});
