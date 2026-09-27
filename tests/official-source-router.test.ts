import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fase 1E — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md / directiva "OFFICIAL
 * SOURCE ROUTER". Ningún test aquí depende de internet real (§12) -- todo
 * fetch() está mockeado. Los fixtures HTML usados reflejan la estructura
 * REAL observada durante la investigación en vivo de esta fase contra
 * https://legislacion.poderjudicial.gob.hn (ver
 * docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md).
 */

import { safeFetchOfficialHost, SafeFetchError } from '@/lib/legal-retrieval/official-sources/security';
import { cedijLegislacionAdapter } from '@/lib/legal-retrieval/official-sources/adapters/cedij-legislacion';
import { routeOfficialSourceQuery, minimizeQueryForExternalResearch } from '@/lib/legal-retrieval/official-sources/router';
import type { OfficialSourceQuery } from '@/lib/legal-retrieval/official-sources/types';

const FORM_PAGE_HTML = `<html><body><form id="form1" method="post" action="AgregarDocumento.aspx?mode=VIEW">
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="VS123ABC" />
<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="GEN1" />
<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="EV456DEF" />
<input type="text" name="ctl00$ContentPlaceHolder1$txtNombreDocumento" id="ContentPlaceHolder1_txtNombreDocumento" />
</form></body></html>`;

const RESULTS_HTML_CON_FILAS = `<html><body><table id="ContentPlaceHolder1_dgvDocumentos" class="table table-bordered table-hover">
<tbody><tr style="font-weight:bold;"><th class="esconderColumna">ID</th><th>Nombre Documento</th><th>Fecha Publicación</th><th>&nbsp;</th></tr>
<tr>
  <td class="esconderColumna">9144</td><td style="width:500px;">Código Penal Decreto 130-2017 fusionado y actualizado a julio 2026</td><td style="width:150px;">18/1/2018</td><td align="center" valign="middle" style="width:100px;">
    <a id="ContentPlaceHolder1_dgvDocumentos_HyperLink1_0" class="btn btn-info" href="Anexos/2835efbe-e23c-4e80-a393-417920903ec1Codigo%20Penal%20Decreto%20130-2017.pdf" target="_blank">
      <span aria-hidden="true" class="glyphicon glyphicon-search"></span>&nbsp;&nbsp;Previsualizar
    </a>
  </td>
</tr>
</tbody></table></body></html>`;

const RESULTS_HTML_SIN_FILAS = `<html><body><table id="ContentPlaceHolder1_dgvDocumentos" class="table table-bordered table-hover">
<tbody><tr style="font-weight:bold;"><th class="esconderColumna">ID</th><th>Nombre Documento</th><th>Fecha Publicación</th><th>&nbsp;</th></tr>
</tbody></table></body></html>`;

function htmlResponse(body: string, status = 200, headers: Record<string, string> = { 'content-type': 'text/html; charset=utf-8' }) {
  return new Response(body, { status, headers });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────────────────────
// safeFetchOfficialHost — controles de seguridad (§8)
// ─────────────────────────────────────────────────────────────────────────────

describe('safeFetchOfficialHost — allowlist de host', () => {
  it('rechaza una URL cuyo host no está en la allowlist, SIN llamar a fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      safeFetchOfficialHost('https://evil.example.com/x', { allowedHosts: ['legislacion.poderjudicial.gob.hn'], acceptedContentTypePrefixes: ['text/html'] })
    ).rejects.toMatchObject({ code: 'HOST_NOT_ALLOWLISTED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('safeFetchOfficialHost — redirect a host no confiable (SSRF)', () => {
  it('rechaza un 302 cuyo Location apunta a un host fuera de la allowlist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: 'https://attacker.example.com/steal' } })
    ));

    await expect(
      safeFetchOfficialHost('https://legislacion.poderjudicial.gob.hn/x', { allowedHosts: ['legislacion.poderjudicial.gob.hn'], acceptedContentTypePrefixes: ['text/html'] })
    ).rejects.toMatchObject({ code: 'REDIRECT_TO_UNTRUSTED_HOST' });
  });

  it('SÍ sigue un redirect cuyo destino está en la allowlist', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://legislacion.poderjudicial.gob.hn/otra-pagina' } }))
      .mockResolvedValueOnce(htmlResponse('<html>ok</html>'));
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await safeFetchOfficialHost('https://legislacion.poderjudicial.gob.hn/x', { allowedHosts: ['legislacion.poderjudicial.gob.hn'], acceptedContentTypePrefixes: ['text/html'] });
    expect(resultado.body).toBe('<html>ok</html>');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('safeFetchOfficialHost — timeout', () => {
  it('clasifica un TimeoutError como SafeFetchError(TIMEOUT), no lo propaga crudo', async () => {
    const timeoutErr = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutErr));

    await expect(
      safeFetchOfficialHost('https://legislacion.poderjudicial.gob.hn/x', { allowedHosts: ['legislacion.poderjudicial.gob.hn'], acceptedContentTypePrefixes: ['text/html'] })
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});

describe('safeFetchOfficialHost — Content-Type inesperado', () => {
  it('rechaza una respuesta con Content-Type fuera de lo aceptado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    ));

    await expect(
      safeFetchOfficialHost('https://legislacion.poderjudicial.gob.hn/x', { allowedHosts: ['legislacion.poderjudicial.gob.hn'], acceptedContentTypePrefixes: ['text/html'] })
    ).rejects.toMatchObject({ code: 'UNEXPECTED_CONTENT_TYPE' });
  });
});

describe('safeFetchOfficialHost — tamaño máximo de respuesta', () => {
  it('corta una respuesta que excede el límite configurado', async () => {
    const cuerpoGrande = 'A'.repeat(2000);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse(cuerpoGrande)));

    await expect(
      safeFetchOfficialHost('https://legislacion.poderjudicial.gob.hn/x', {
        allowedHosts: ['legislacion.poderjudicial.gob.hn'], acceptedContentTypePrefixes: ['text/html'], maxBytes: 500,
      })
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cedijLegislacionAdapter — sin fallo silencioso, provenance, no soportado
// ─────────────────────────────────────────────────────────────────────────────

describe('cedijLegislacionAdapter.supports()', () => {
  it('true solo para LEGISLATION', () => {
    expect(cedijLegislacionAdapter.supports({ searchText: 'x', kind: 'LEGISLATION' })).toBe(true);
    expect(cedijLegislacionAdapter.supports({ searchText: 'x', kind: 'JURISPRUDENCE' })).toBe(false);
    expect(cedijLegislacionAdapter.supports({ searchText: 'x', kind: 'GAZETTE' })).toBe(false);
  });
});

describe('cedijLegislacionAdapter.search() — SUCCESS con provenance completa', () => {
  it('GET+POST simulado, evidencia con todos los campos de proveniencia exigidos', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(htmlResponse(FORM_PAGE_HTML))
      .mockResolvedValueOnce(htmlResponse(RESULTS_HTML_CON_FILAS));
    vi.stubGlobal('fetch', fetchMock);

    const query: OfficialSourceQuery = { searchText: 'Codigo Penal', kind: 'LEGISLATION' };
    const resultado = await cedijLegislacionAdapter.search(query);

    expect(resultado.status).toBe('SUCCESS');
    expect(resultado.evidence).toHaveLength(1);
    const ev = resultado.evidence[0];
    expect(ev.sourceId).toBe('CEDIJ_LEGISLACION');
    expect(ev.sourceName).toContain('CEDIJ');
    expect(ev.sourceUrl).toBe('https://legislacion.poderjudicial.gob.hn/sistemalegislacion/Anexos/2835efbe-e23c-4e80-a393-417920903ec1Codigo%20Penal%20Decreto%20130-2017.pdf');
    expect(ev.documentTitle).toBe('Código Penal Decreto 130-2017 fusionado y actualizado a julio 2026');
    expect(ev.documentType).toBe('LEGISLATION');
    expect(ev.jurisdiction).toBe('HN');
    expect(ev.publicationDate).toBe('18/1/2018');
    expect(ev.documentNumber).toBe('130-2017');
    expect(ev.verificationStatus).toBe('SOURCE_CONFIRMED');
    expect(ev.contentHash).toBeUndefined();
    expect(new Date(ev.retrievedAt).toString()).not.toBe('Invalid Date');

    // Verifica que el segundo fetch (POST) llevó los tokens extraídos del primero.
    const segundaLlamada = fetchMock.mock.calls[1];
    expect(segundaLlamada[1].method).toBe('POST');
    expect(segundaLlamada[1].body).toContain('VS123ABC');
    expect(segundaLlamada[1].body).toContain('EV456DEF');
  });

  it('NO_RESULTS cuando la tabla de resultados no tiene filas de datos', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(htmlResponse(FORM_PAGE_HTML))
      .mockResolvedValueOnce(htmlResponse(RESULTS_HTML_SIN_FILAS)));

    const resultado = await cedijLegislacionAdapter.search({ searchText: 'articulo inexistente xyz', kind: 'LEGISLATION' });
    expect(resultado.status).toBe('NO_RESULTS');
    expect(resultado.evidence).toEqual([]);
  });

  it('UNSUPPORTED_QUERY si kind no es LEGISLATION -- nunca intenta red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await cedijLegislacionAdapter.search({ searchText: 'x', kind: 'JURISPRUDENCE' });
    expect(resultado.status).toBe('UNSUPPORTED_QUERY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('INVALID_RESPONSE si la página de formulario no trae los tokens esperados (sitio cambió su HTML)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(htmlResponse('<html><body>sin formulario</body></html>')));

    const resultado = await cedijLegislacionAdapter.search({ searchText: 'x', kind: 'LEGISLATION' });
    expect(resultado.status).toBe('INVALID_RESPONSE');
    expect(resultado.errorCode).toBe('MISSING_FORM_TOKENS');
  });

  it('SOURCE_UNAVAILABLE sin lanzar (no falla en silencio ni revienta el caller) cuando la red falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const resultado = await cedijLegislacionAdapter.search({ searchText: 'x', kind: 'LEGISLATION' });
    expect(resultado.status).toBe('SOURCE_UNAVAILABLE');
    expect(resultado.errorCode).toBe('NETWORK_ERROR');
    expect(resultado.evidence).toEqual([]);
  });

  it('SOURCE_UNAVAILABLE con código TIMEOUT propagado desde safeFetchOfficialHost', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));

    const resultado = await cedijLegislacionAdapter.search({ searchText: 'x', kind: 'LEGISLATION' });
    expect(resultado.status).toBe('SOURCE_UNAVAILABLE');
    expect(resultado.errorCode).toBe('TIMEOUT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// router — selección determinista, sin adapter para tipos no implementados
// ─────────────────────────────────────────────────────────────────────────────

describe('routeOfficialSourceQuery', () => {
  it('LEGISLATION -> despacha a cedijLegislacionAdapter', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(htmlResponse(FORM_PAGE_HTML))
      .mockResolvedValueOnce(htmlResponse(RESULTS_HTML_CON_FILAS)));

    const [resultado] = await routeOfficialSourceQuery({ searchText: 'Codigo Penal', kind: 'LEGISLATION' });
    expect(resultado.status).toBe('SUCCESS');
    expect(resultado.sourceId).toBe('CEDIJ_LEGISLACION');
  });

  it('JURISPRUDENCE -> sin adapter real todavía, UNSUPPORTED_QUERY explícito (nunca silencioso)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [resultado] = await routeOfficialSourceQuery({ searchText: 'x', kind: 'JURISPRUDENCE' });
    expect(resultado.status).toBe('UNSUPPORTED_QUERY');
    expect(resultado.errorCode).toBe('NO_ADAPTER_FOR_KIND');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('GAZETTE -> sin adapter real todavía (dominio oficial no verificado en esta fase)', async () => {
    const [resultado] = await routeOfficialSourceQuery({ searchText: 'x', kind: 'GAZETTE' });
    expect(resultado.status).toBe('UNSUPPORTED_QUERY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// minimización de consulta (§9) — nunca enviar identidad del cliente
// ─────────────────────────────────────────────────────────────────────────────

describe('minimizeQueryForExternalResearch', () => {
  it('redacta "mi cliente <Nombre>" y conserva los términos jurídicos', () => {
    const resultado = minimizeQueryForExternalResearch(
      'Mi cliente Juan Pérez fue detenido, necesito medidas cautelares artículo 173 Código Procesal Penal Honduras'
    );
    expect(resultado).not.toContain('Juan Pérez');
    expect(resultado).toContain('medidas cautelares artículo 173 Código Procesal Penal Honduras');
  });

  it('redacta correos y teléfonos', () => {
    const resultado = minimizeQueryForExternalResearch('contactar a cliente@example.com o al 9988-7766 sobre el artículo 173 CPP');
    expect(resultado).not.toContain('cliente@example.com');
    expect(resultado).not.toContain('9988-7766');
    expect(resultado).toContain('artículo 173 CPP');
  });

  it('una consulta ya jurídica y sin PII queda intacta', () => {
    const texto = 'presupuestos para imponer una medida cautelar penal en Honduras';
    expect(minimizeQueryForExternalResearch(texto)).toBe(texto);
  });
});
