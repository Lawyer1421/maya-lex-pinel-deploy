/**
 * lib/legal-retrieval/official-sources/adapters/cedij-legislacion.ts
 * Retrieval v3 — Fase 1E, primer adapter real.
 *
 * Fuente: Biblioteca Judicial Electrónica del Centro Electrónico de
 * Documentación e Información Judicial (CEDIJ), Poder Judicial de Honduras.
 * https://legislacion.poderjudicial.gob.hn/sistemalegislacion/inicio.aspx
 *
 * Verificado en vivo (solo lectura, sin autenticación) durante la
 * investigación de esta fase -- ver docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md
 * para el detalle completo de la evidencia. Resumen:
 *   - El buscador es un formulario ASP.NET WebForms clásico (__VIEWSTATE /
 *     __EVENTVALIDATION) en /sistemalegislacion/AgregarDocumento.aspx?mode=VIEW
 *     -- SIN API REST. Requiere: (1) GET para obtener tokens frescos, (2) POST
 *     simulando el submit del botón "Buscar".
 *   - Los resultados llegan en una tabla HTML con id
 *     ContentPlaceHolder1_dgvDocumentos (ID interno, Nombre Documento, Fecha
 *     Publicación, enlace "Previsualizar").
 *   - Cada documento tiene una URL de PDF ESTABLE y directa
 *     (/sistemalegislacion/Anexos/{uuid}{nombre}.pdf) que NO requiere sesión
 *     ni VIEWSTATE para descargarse una vez conocida -- solo la búsqueda es
 *     stateful, la recuperación del documento no.
 *   - Esta fase NO descarga ni parsea el contenido del PDF (fuera de
 *     alcance) -- `sourceUrl` apunta al PDF real, `contentHash`/`contentSnippet`
 *     quedan `undefined` a propósito (ver types.ts).
 *   - Fecha de publicación se conserva TAL CUAL la expone la fuente
 *     (formato "D/M/AAAA" observado, ej. "18/1/2018") -- no se reinterpreta
 *     a ISO 8601 para evitar una conversión de fecha incorrecta por
 *     ambigüedad día/mes; el campo es de todas formas opcional y de solo
 *     referencia, no se usa para lógica de vigencia.
 */

import type { OfficialSourceAdapter, OfficialSourceEvidence, OfficialSourceQuery, OfficialSourceResult } from '../types';
import { safeFetchOfficialHost, SafeFetchError } from '../security';

const HOST = 'legislacion.poderjudicial.gob.hn';
const BASE_URL = `https://${HOST}/sistemalegislacion/`;
const SEARCH_URL = `${BASE_URL}AgregarDocumento.aspx?mode=VIEW`;
const ALLOWED_HOSTS = [HOST] as const;
const SOURCE_NAME = 'CEDIJ — Biblioteca Judicial Electrónica (Poder Judicial de Honduras)';

function extractHiddenValue(html: string, name: string): string {
  const tagMatch = html.match(new RegExp(`<input[^>]*name="${name.replace(/[$]/g, '\\$')}"[^>]*>`, 'i'));
  if (!tagMatch) return '';
  const valueMatch = tagMatch[0].match(/value="([^"]*)"/);
  return valueMatch ? valueMatch[1] : '';
}

/** Extrae el número de decreto del título si el texto lo trae explícito -- best-effort, nunca inventado. */
function extraerNumeroDecreto(titulo: string): string | undefined {
  const m = /decreto\s*(?:no\.?\s*)?(\d{1,4}-\d{4})/i.exec(titulo);
  return m ? m[1] : undefined;
}

interface FilaResultado {
  titulo: string;
  fecha: string;
  hrefRelativo: string;
}

function parsearFilasResultado(html: string): FilaResultado[] {
  const filas: FilaResultado[] = [];
  const filaRe = /<tr>\s*<td class="esconderColumna">[^<]*<\/td><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><td[^>]*>\s*<a[^>]*href="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = filaRe.exec(html)) !== null) {
    filas.push({ titulo: decodeHtmlEntities(m[1].trim()), fecha: m[2].trim(), hrefRelativo: m[3] });
  }
  return filas;
}

function decodeHtmlEntities(texto: string): string {
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#243;|&oacute;/g, 'ó')
    .replace(/&#237;|&iacute;/g, 'í')
    .replace(/&#225;|&aacute;/g, 'á')
    .replace(/&#233;|&eacute;/g, 'é')
    .replace(/&#250;|&uacute;/g, 'ú')
    .replace(/&#241;|&ntilde;/g, 'ñ');
}

export const cedijLegislacionAdapter: OfficialSourceAdapter = {
  id: 'CEDIJ_LEGISLACION',

  supports(query: OfficialSourceQuery): boolean {
    return query.kind === 'LEGISLATION';
  },

  async search(query: OfficialSourceQuery): Promise<OfficialSourceResult> {
    if (!this.supports(query)) {
      return { status: 'UNSUPPORTED_QUERY', evidence: [], sourceId: 'CEDIJ_LEGISLACION', errorCode: 'UNSUPPORTED_QUERY_KIND' };
    }
    if (!query.searchText.trim()) {
      return { status: 'UNSUPPORTED_QUERY', evidence: [], sourceId: 'CEDIJ_LEGISLACION', errorCode: 'EMPTY_SEARCH_TEXT' };
    }

    try {
      // Paso 1: GET para obtener __VIEWSTATE/__EVENTVALIDATION frescos --
      // este sitio invalida un POST con tokens de una carga anterior.
      const pagina = await safeFetchOfficialHost(SEARCH_URL, {
        allowedHosts: ALLOWED_HOSTS,
        acceptedContentTypePrefixes: ['text/html'],
      });

      const viewState = extractHiddenValue(pagina.body, '__VIEWSTATE');
      const viewStateGenerator = extractHiddenValue(pagina.body, '__VIEWSTATEGENERATOR');
      const eventValidation = extractHiddenValue(pagina.body, '__EVENTVALIDATION');
      if (!viewState || !eventValidation) {
        return { status: 'INVALID_RESPONSE', evidence: [], sourceId: 'CEDIJ_LEGISLACION', errorCode: 'MISSING_FORM_TOKENS' };
      }

      // Paso 2: POST simulando el submit real del botón "Buscar" (verificado
      // en vivo: name=ctl00$ContentPlaceHolder1$btnAdjuntar, value=Buscar).
      const body = new URLSearchParams({
        __VIEWSTATE: viewState,
        __VIEWSTATEGENERATOR: viewStateGenerator,
        __EVENTVALIDATION: eventValidation,
        'ctl00$ContentPlaceHolder1$txtNombreDocumento': query.searchText,
        'ctl00$ContentPlaceHolder1$ddlTipoDocumento': '',
        'ctl00$ContentPlaceHolder1$ddlMateria': '',
        'ctl00$ContentPlaceHolder1$btnAdjuntar': 'Buscar',
      }).toString();

      const resultados = await safeFetchOfficialHost(SEARCH_URL, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        allowedHosts: ALLOWED_HOSTS,
        acceptedContentTypePrefixes: ['text/html'],
      });

      const filas = parsearFilasResultado(resultados.body);
      const ahora = new Date().toISOString();

      const evidence: OfficialSourceEvidence[] = filas.map((fila) => ({
        sourceId: 'CEDIJ_LEGISLACION',
        sourceName: SOURCE_NAME,
        sourceUrl: new URL(fila.hrefRelativo, BASE_URL).toString(),
        documentTitle: fila.titulo,
        documentType: 'LEGISLATION',
        jurisdiction: 'HN',
        publicationDate: fila.fecha || undefined,
        documentNumber: extraerNumeroDecreto(fila.titulo),
        articleNumber: query.articleNumber,
        retrievedAt: ahora,
        // El propio CEDIJ es la fuente que consolida/publica el texto -- se
        // clasifica SOURCE_CONFIRMED (el sitio lo presenta como el
        // documento oficial), nunca "verificado" por MayaLex (ver types.ts).
        verificationStatus: 'SOURCE_CONFIRMED',
      }));

      return {
        status: evidence.length > 0 ? 'SUCCESS' : 'NO_RESULTS',
        evidence,
        sourceId: 'CEDIJ_LEGISLACION',
      };
    } catch (err) {
      if (err instanceof SafeFetchError) {
        return { status: 'SOURCE_UNAVAILABLE', evidence: [], sourceId: 'CEDIJ_LEGISLACION', errorCode: err.code };
      }
      return { status: 'SOURCE_UNAVAILABLE', evidence: [], sourceId: 'CEDIJ_LEGISLACION', errorCode: 'UNKNOWN_ADAPTER_ERROR' };
    }
  },
};
