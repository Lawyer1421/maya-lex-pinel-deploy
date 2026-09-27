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

/**
 * Fase 1E.1 — parser endurecido contra variaciones de formato del MISMO
 * table de resultados (§5 de la directiva): orden de atributos, espacios en
 * blanco/saltos de línea extra, clases CSS adicionales, entidades HTML,
 * fecha vacía, columnas adicionales. NO se amplía a parsear una estructura
 * de tabla distinta -- sigue siendo específico de `dgvDocumentos`.
 *
 * Estrategia: (1) aislar solo la tabla `dgvDocumentos` para que nada fuera
 * de ella interfiera; (2) partir en bloques `<tr ...>...</tr>` tolerando
 * atributos y saltos de línea; (3) descartar la fila de encabezado
 * (contiene `<th`); (4) extraer TODAS las celdas `<td ...>...</td>` de la
 * fila, sin asumir su `class`/`style` exactos; (5) el enlace PDF se busca en
 * TODA la fila (no en una celda fija), tolerante a columnas adicionales
 * antes o después. Deliberadamente NO usa un parser DOM/HTML de terceros --
 * ninguno está presente en las dependencias del proyecto hoy (verificado:
 * sin cheerio/jsdom/parse5/htmlparser2 en package.json/node_modules), y
 * agregar uno sería una dependencia nueva no autorizada en esta fase.
 */
function parsearFilasResultado(html: string): FilaResultado[] {
  const tablaMatch = html.match(/<table[^>]*id="[^"]*dgvDocumentos"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tablaMatch) return [];
  const tablaHtml = tablaMatch[1];

  const filas: FilaResultado[] = [];
  const filaRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let filaMatch: RegExpExecArray | null;

  while ((filaMatch = filaRe.exec(tablaHtml)) !== null) {
    const filaHtml = filaMatch[1];
    if (/<th[\s>]/i.test(filaHtml)) continue; // fila de encabezado, no es un documento

    const celdas: string[] = [];
    const celdaRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let celdaMatch: RegExpExecArray | null;
    while ((celdaMatch = celdaRe.exec(filaHtml)) !== null) {
      celdas.push(celdaMatch[1]);
    }
    // Columnas esperadas: [0]=ID interno, [1]=Nombre Documento, [2]=Fecha
    // Publicación, [3..]=acciones (enlace Previsualizar). Si el sitio agrega
    // una columna al final, [1]/[2] siguen siendo correctas -- solo se
    // rompería si insertaran una columna ANTES de estas dos, lo cual sería
    // un rediseño real de la tabla (fuera de "misma tabla", ver docstring).
    if (celdas.length < 3) continue;

    const enlacePdf = /href="([^"]*\.pdf[^"]*)"/i.exec(filaHtml);
    if (!enlacePdf) continue; // fila sin documento adjunto -- no es evidencia utilizable

    filas.push({
      titulo: decodeHtmlEntities(stripTags(celdas[1]).trim()),
      fecha: decodeHtmlEntities(stripTags(celdas[2]).trim()),
      hrefRelativo: enlacePdf[1],
    });
  }
  return filas;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

const ENTIDADES_NOMBRADAS: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  oacute: 'ó', iacute: 'í', aacute: 'á', eacute: 'é', uacute: 'ú',
  Oacute: 'Ó', Iacute: 'Í', Aacute: 'Á', Eacute: 'É', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
};

/**
 * Decodifica entidades HTML nombradas y numéricas (decimales `&#243;` y
 * hexadecimales `&#xF3;`) -- no depende de una tabla fija de casos
 * observados, cubre cualquier entidad numérica válida.
 */
function decodeHtmlEntities(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-zA-Z]+);/gi, (entidad, cuerpo: string) => {
    if (cuerpo[0] === '#') {
      const codigo = cuerpo[1]?.toLowerCase() === 'x' ? parseInt(cuerpo.slice(2), 16) : parseInt(cuerpo.slice(1), 10);
      return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : entidad;
    }
    return ENTIDADES_NOMBRADAS[cuerpo] ?? entidad;
  });
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

      // __VIEWSTATEGENERATOR se trata como opcional (§6 de la directiva
      // 1E.1): el sitio podría omitirlo en una versión futura sin que eso
      // invalide la búsqueda -- solo __VIEWSTATE y __EVENTVALIDATION son
      // estrictamente necesarios, verificado en vivo.
      const viewState = extractHiddenValue(pagina.body, '__VIEWSTATE');
      const viewStateGenerator = extractHiddenValue(pagina.body, '__VIEWSTATEGENERATOR');
      const eventValidation = extractHiddenValue(pagina.body, '__EVENTVALIDATION');
      if (!viewState || !eventValidation) {
        return { status: 'INVALID_RESPONSE', evidence: [], sourceId: 'CEDIJ_LEGISLACION', errorCode: 'MISSING_FORM_TOKENS' };
      }

      // Verificado en vivo (Fase 1E.1): el POST DEBE reenviar la cookie de
      // sesión emitida por el GET (ASP.NET_SessionId) -- sin ella el sitio
      // responde 500 "sesión no encontrada" aunque los tokens sean
      // correctos. Es la sesión anónima propia del servidor, no una
      // credencial de usuario.
      const cookieSesion = pagina.setCookie?.split(';')[0];

      // Verificado en vivo (Fase 1E.1): el valor real del <option> por
      // defecto de ambos <select> es el TEXTO "Seleccione", NO una cadena
      // vacía -- __EVENTVALIDATION rechaza cualquier valor de <select> que
      // no coincida exactamente con uno de sus <option> renderizados
      // (mecanismo anti-tampering de ASP.NET), lo que también producía un
      // 500 antes de este fix.
      const VALOR_SELECT_SIN_FILTRO = 'Seleccione';

      // Paso 2: POST simulando el submit real del botón "Buscar" (verificado
      // en vivo: name=ctl00$ContentPlaceHolder1$btnAdjuntar, value=Buscar).
      const body = new URLSearchParams({
        __VIEWSTATE: viewState,
        ...(viewStateGenerator ? { __VIEWSTATEGENERATOR: viewStateGenerator } : {}),
        __EVENTVALIDATION: eventValidation,
        'ctl00$ContentPlaceHolder1$txtNombreDocumento': query.searchText,
        'ctl00$ContentPlaceHolder1$ddlTipoDocumento': VALOR_SELECT_SIN_FILTRO,
        'ctl00$ContentPlaceHolder1$ddlMateria': VALOR_SELECT_SIN_FILTRO,
        'ctl00$ContentPlaceHolder1$btnAdjuntar': 'Buscar',
      }).toString();

      const resultados = await safeFetchOfficialHost(SEARCH_URL, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(cookieSesion ? { Cookie: cookieSesion } : {}),
        },
        allowedHosts: ALLOWED_HOSTS,
        acceptedContentTypePrefixes: ['text/html'],
      });

      const filas = parsearFilasResultado(resultados.body);
      const ahora = new Date().toISOString();

      // Fase 1E.1 (§8): un href malformado o inesperadamente absoluto en la
      // respuesta (ej. `href="https://evil.example.com/x.pdf"`) NUNCA debe
      // convertirse en un sourceUrl aceptado solo porque `new URL(href, BASE_URL)`
      // resuelve URLs absolutas ignorando la base. Cada fila se valida
      // explícitamente contra ALLOWED_HOSTS antes de entrar a la evidencia --
      // una fila que no resuelve al host oficial se descarta, nunca se
      // propaga como si fuera un documento de CEDIJ.
      const evidence: OfficialSourceEvidence[] = [];
      for (const fila of filas) {
        let sourceUrl: string;
        try {
          sourceUrl = new URL(fila.hrefRelativo, BASE_URL).toString();
        } catch {
          continue; // href irreconocible como URL -- se descarta, no se adivina
        }
        if (!ALLOWED_HOSTS.includes(new URL(sourceUrl).hostname.toLowerCase() as (typeof ALLOWED_HOSTS)[number])) {
          continue; // fuera del host oficial -- descartada, nunca reportada como evidencia
        }
        evidence.push({
          sourceId: 'CEDIJ_LEGISLACION',
          sourceName: SOURCE_NAME,
          sourceUrl,
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
        });
      }

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
