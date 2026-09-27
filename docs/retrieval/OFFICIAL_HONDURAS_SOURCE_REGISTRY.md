# Registro de Fuentes Oficiales Hondureñas — Retrieval v3 Fase 1E / 1E.1

**Naturaleza de este documento:** investigación de campo, no memoria ni
suposición. Cada afirmación de "reachable"/"unreachable"/"estructura real"
proviene de una navegación efectiva realizada durante esta sesión (browser
de solo lectura, sin autenticación, sin scraping masivo, sin escritura) —
nunca de conocimiento general no verificado. Donde no se pudo verificar algo
en vivo, se dice explícitamente "no verificado en esta sesión", nunca se
completa el hueco con una suposición.

**Actualización Fase 1E.1 (misma fecha de investigación):** distinción
introducida entre dos niveles de verificación:
- `MANUAL_BROWSER_VERIFIED` — confirmado navegando manualmente (Fase 1E).
- `ADAPTER_LIVE_VERIFIED` — confirmado ejecutando el CÓDIGO REAL del
  adapter (`cedijLegislacionAdapter`) contra el sitio en vivo, vía
  `scripts/verify-cedij-adapter.ts` (Fase 1E.1).

CEDIJ Legislación pasa de `MANUAL_BROWSER_VERIFIED` a **`ADAPTER_LIVE_VERIFIED`**
en esta fase: 2/2 consultas sintéticas ("Codigo Penal", "Codigo Civil")
devolvieron `SUCCESS` con evidencia real (10 y 1 resultados respectivamente),
una consulta sin sentido devolvió `NO_RESULTS` correctamente, y una sonda
HEAD contra un PDF real confirmó `HTTP 200` + `Content-Type: application/pdf`
en el host oficial. Ver detalle completo en la sección A.2 actualizada.

**Fragilidad real descubierta durante la verificación en vivo (no visible
solo navegando manualmente):** la primera ejecución del adapter contra el
sitio real FALLÓ con `HTTP 500` en el POST, pese a que el parseo de
`__VIEWSTATE`/`__EVENTVALIDATION` era correcto. Diagnóstico en vivo (con
`node -e` ad-hoc, nunca contra producción de MayaLex) encontró dos causas
independientes, ambas corregidas en el código del adapter:
1. El POST debe reenviar la cookie `ASP.NET_SessionId` emitida por el GET
   inicial -- sin ella, el servidor responde 500 ("sesión no encontrada")
   aunque los tokens VIEWSTATE sean válidos.
2. El valor por defecto real de los `<select>` (`ddlTipoDocumento`,
   `ddlMateria`) es el texto literal `"Seleccione"`, NO una cadena vacía --
   `__EVENTVALIDATION` (mecanismo anti-tampering de ASP.NET) rechaza
   cualquier valor de `<select>` que no coincida con uno de sus `<option>`
   renderizados, y también producía 500.

Este hallazgo es la razón exacta por la que Fase 1E.1 exige verificación de
código real, no solo confirmación manual por navegador: la interacción
manual (clic real en el botón, con todo el contexto de sesión/cookies del
navegador) ocultaba ambos problemas por completo.

Fecha de la investigación: 2026-09-27 (fecha del sistema en el momento de
las pruebas). Las páginas gubernamentales cambian sin aviso — este registro
es un snapshot, no una garantía permanente.

---

## Clasificación usada

**Por tipo de automatización:**
- `PRIMARY_OFFICIAL` — fuente oficial primaria, contenido verificado en vivo, técnicamente automatizable hoy.
- `SECONDARY_OFFICIAL` — fuente oficial pero de menor prioridad para evidencia normativa directa (ej. datos administrativos/estadísticos).
- `DISCOVERY_ONLY` — existe y es oficial, pero solo sirve para que un humano (o Tavily) descubra un enlace; no automatizable de forma confiable hoy.
- `UNSUITABLE_FOR_AUTOMATION` — no debe automatizarse (no es una fuente jurídica primaria, o el acceso no es viable).

**Por tipo de contenido:** `LEGISLATION` | `JURISPRUDENCE` | `GAZETTE` | `ADMINISTRATIVE` | `MIXED`.

---

## A. Poder Judicial / CSJ / CEDIJ

### A.1 Portal principal — `www.poderjudicial.gob.hn`

- **Clasificación:** `DISCOVERY_ONLY` (portal índice, no contenido normativo directo).
- **Contenido:** noticias institucionales, enlaces a los sistemas reales (ver A.2/A.3/A.4).
- **Verificado en vivo:** sí — `https://www.poderjudicial.gob.hn/Paginas/CSJHN.aspx` responde, es un sitio SharePoint clásico (widgets "Cargando Vínculos rápidos..." que requieren esperar la carga diferida de JS).
- **robots.txt:** no existe (`/robots.txt` redirige a la página de inicio, sin archivo real) — sin restricción máquina-legible encontrada.
- **Autenticación:** ninguna para las páginas públicas navegadas.

### A.2 Biblioteca Judicial Electrónica (CEDIJ) — `legislacion.poderjudicial.gob.hn` ✅ ADAPTER_LIVE_VERIFIED

- **Clasificación:** `PRIMARY_OFFICIAL` — **`ADAPTER_LIVE_VERIFIED`** (Fase 1E.1; era `MANUAL_BROWSER_VERIFIED` en Fase 1E)
- **Tipo de contenido:** `LEGISLATION` (Códigos, Leyes, Reglamentos, Otros Instrumentos)
- **URL base:** `https://legislacion.poderjudicial.gob.hn/sistemalegislacion/inicio.aspx`
- **Descripción propia del sitio:** "creación de la Biblioteca Judicial Electrónica... donde se han incluido Códigos, Leyes, Reglamentos y Otros Instrumentos obtenidos del diario oficial La Gaceta, por el Centro Electrónico de Documentación e Información Judicial (CEDIJ) a partir del año 2009 a la fecha."
- **Actualidad confirmada:** documentos agregados el **16/9/2026** visibles en "Agregados Recientemente" en el momento de la prueba (fuente activamente mantenida, no abandonada).
- **Mecanismo de búsqueda:** formulario HTML clásico **ASP.NET WebForms** (`__VIEWSTATE`/`__EVENTVALIDATION`/`__EVENTTARGET`) en `/sistemalegislacion/AgregarDocumento.aspx?mode=VIEW`. **NO es una API REST** — confirmado inspeccionando los campos del formulario vía JavaScript (`__VIEWSTATE`, `__VIEWSTATEGENERATOR`, `__EVENTVALIDATION` como campos ocultos; `ctl00$ContentPlaceHolder1$txtNombreDocumento`, `ddlTipoDocumento`, `ddlMateria`, `txtFechaPublicacion` como campos de búsqueda).
- **Campos de búsqueda:** nombre de documento (texto libre), tipo de documento (`LEY`, `CODIGO`, `REGLAMENTO`, `OTROS INSTRUMENTOS`), materia (`PENAL`, `CIVIL`, `FAMILIA`, `ADMINISTRATIVO`, `NIÑEZ`, `VIOLENCIA DOMESTICA`, `CONSTITUCIONAL`, `TRIBUTARIO`, `AMBIENTAL`, `MERCANTIL`, `NOTARIAL`, `OTROS`, `LABORAL`, `BANCARIO/FINANCIERO` — casi idéntico a la taxonomía de `materia` que ya usa `biblioteca_vectores`), fecha de publicación.
- **Búsqueda probada en vivo:** se ejecutó una búsqueda real por "Codigo Penal" (vía JS, simulando el submit del botón) y devolvió **10 resultados reales con paginación (3 páginas)**, incluyendo *"Código Penal Decreto 130-2017 fusionado y actualizado a julio 2026"* — el texto consolidado vigente, con fecha muy reciente.
- **Identificadores de documento:** cada fila trae un ID interno de base de datos (ej. `9144`) y un enlace "Previsualizar".
- **URLs de documento:** **estables y directas** — patrón `https://legislacion.poderjudicial.gob.hn/sistemalegislacion/Anexos/{uuid}{nombre-archivo}.pdf`. Confirmado que la descarga del PDF en sí **no requiere sesión ni VIEWSTATE** — solo la búsqueda es stateful.
- **Formato de respuesta:** HTML (tabla de resultados) + PDF (documento final). Sin JSON, sin XML.
- **Paginación:** sí, confirmada visualmente (números de página al pie de la tabla de resultados).
- **robots.txt:** no existe (404 en `/robots.txt`).
- **Autenticación:** ninguna.
- **Rate limits:** no publicados/documentados en el sitio; no se realizaron pruebas de alta frecuencia (§13 de la directiva prohíbe crawling a escala).
- **Confiabilidad de la fuente:** alta — es la fuente primaria que el propio corpus de MayaLex ya cita en sus comentarios de código (`lib/rag/search.ts` referencia "fuente Poder Judicial" para el Código Civil).
- **¿Puede consultarse automáticamente?** Sí, con las dos peticiones (GET + POST) descritas — implementado en `lib/legal-retrieval/official-sources/adapters/cedij-legislacion.ts`.
- **¿Es apropiado técnicamente automatizarlo?** Sí — sin robots.txt restrictivo, sin autenticación, volumen de peticiones bajo (una búsqueda por consulta con evidencia insuficiente, no un crawl).

**Verificación en vivo desde código real (Fase 1E.1, `scripts/verify-cedij-adapter.ts`):**
- **Fecha de verificación:** 2026-09-27 (misma sesión).
- **Consultas ejecutadas:** 2 sintéticas ("Codigo Penal", "Codigo Civil") + 1 sin sentido (control de `NO_RESULTS`).
- **Resultado:** "Codigo Penal" → `SUCCESS`, 10 documentos reales (incluyendo el Código Penal consolidado a julio 2026). "Codigo Civil" → `SUCCESS`, 1 documento ("Código Civil (mayo 2018)"). Consulta sin sentido → `NO_RESULTS` limpio.
- **Disponibilidad de la fuente en el momento de la prueba:** activa, tiempos de respuesta normales (sub-segundo).
- **Fragilidad conocida (encontrada y corregida en esta fase):** (1) el POST requiere reenviar la cookie `ASP.NET_SessionId` del GET inicial; (2) los `<select>` de filtro deben enviarse con su valor real por defecto (`"Seleccione"`), nunca cadena vacía -- ambos, si se omiten, producen `HTTP 500` por rechazo de `__EVENTVALIDATION`/sesión, no un error de la aplicación de MayaLex. Ambos ya corregidos en el adapter y cubiertos por tests de regresión.
- **Enlaces PDF confirmados en vivo:** sí -- sonda `HEAD` real contra un PDF devuelto por la búsqueda: `HTTP 200`, `Content-Type: application/pdf`, mismo host oficial. No se descargó el archivo completo.

**Segunda verificación independiente (Fase 1E.1B, estabilidad temporal):**
- **Fecha/hora:** 2026-09-27T15:49:29Z (~10 minutos después de la corrida de Fase 1E.1, proceso `npx tsx` nuevo -- sin reutilizar caché, cookie, VIEWSTATE ni EVENTVALIDATION de la corrida anterior; el adapter obtiene todo de nuevo en cada invocación).
- **Resultado:** idéntico en estructura a la primera corrida -- "Codigo Penal" → `SUCCESS` (10 documentos), "Codigo Civil" → `SUCCESS` (1 documento, mismo título "Código Civil (mayo 2018)"), consulta sin sentido → `NO_RESULTS`, sonda PDF → `HTTP 200` / `application/pdf`.
- **Estabilidad estructural confirmada:** GET exitoso, cookie de sesión nueva emitida y aceptada, VIEWSTATE/EVENTVALIDATION frescos extraídos y aceptados por el servidor, POST aceptado (sin 500), tabla de resultados reconocida por el parser, enlaces PDF válidos.
- **Ninguna fragilidad nueva encontrada** en esta segunda corrida -- los dos fixes de Fase 1E.1 (cookie de sesión, valor `"Seleccione"` de los `<select>`) siguen siendo suficientes y necesarios.
- **Ningún cambio de código requerido.**

### A.3 Sistema de Indexación Jurisprudencial (SIJ) — `sij.poderjudicial.gob.hn`

- **Clasificación:** `DISCOVERY_ONLY` (por ahora — ver nota).
- **Tipo de contenido:** `JURISPRUDENCE` (por su nombre; contenido interno no confirmado).
- **Estado verificado en esta sesión:** **inaccesible** — 2 intentos de navegación (`https://` y `http://`) fallaron sin poder cargar la página, en dos momentos distintos de la sesión.
- **No se concluye que el sitio esté permanentemente caído** — solo que no fue alcanzable desde este entorno de investigación en este momento. Requiere reintento en una sesión futura antes de construir un adapter.
- **Sin adapter implementado.**

### A.4 Datos Abiertos SEJE / "Justicia Abierta" — `sejeinfo.poderjudicial.gob.hn`

- **Clasificación:** `SECONDARY_OFFICIAL`
- **Tipo de contenido:** `MIXED` (principalmente `ADMINISTRATIVE`/estadístico judicial; incluye "Sentencias Anonimizadas" pero como base de datos de seguimiento de causas, no como texto íntegro de jurisprudencia razonada).
- **Verificado en vivo:** sí — `https://sejeinfo.poderjudicial.gob.hn/sejeinfo/justicia-abierta/` responde, con iniciativa de datos abiertos (apoyo IDLO/INL).
- **Formato de respuesta:** **CSV descargable directo** (ej. `.../wp-content/uploads/2026/08/Tabla-1-Tribunal-de-Sentencias-...Causas_Iniciadas_Ene_Jun_2026.csv`), sin autenticación, sin postback — URLs estáticas de WordPress.
- **Contenido confirmado:** "Sentencias Anonimizadas del Tribunal de Sentencia de Tegucigalpa" (enero-junio 2026), "Causas Iniciadas", "Actuaciones Procesales", datos de Violencia Doméstica (causas, resoluciones, sanciones) — todo con metadatos PDF adjuntos describiendo cada tabla.
- **Actualidad:** datos hasta 2026, publicación reciente (agosto 2026).
- **API disponible:** no en sentido REST/JSON — son archivos CSV estáticos, técnicamente el mecanismo de acceso MÁS simple y seguro de todos los evaluados (GET directo, sin sesión).
- **robots.txt / autenticación:** no verificado explícitamente en esta sesión (fuera del tiempo disponible); dado que es un sitio WordPress público con archivos en `wp-content/uploads`, la exposición pública es evidente por diseño.
- **¿Por qué no es el adapter prioritario de esta fase?** El contenido es metadata procesal/estadística de causas (números de expediente, fechas, tipo de actuación), no el TEXTO de la sentencia razonada citable como jurisprudencia — útil para una fase futura de analítica procesal, pero no resuelve directamente `OFFICIAL_FALLBACK_REQUIRED` para una cita jurídica de fondo. Queda documentado como fuente real y verificada, pendiente de un adapter dedicado cuando se decida su alcance exacto.
- **Sin adapter implementado en esta fase** (por la razón anterior, no por inviabilidad técnica — de hecho es la fuente MÁS fácil de automatizar de todas las revisadas).

---

## B. Tribunal Superior de Cuentas (TSC) / Biblioteca Virtual — `www.tsc.gob.hn`

- **Clasificación:** `UNSUITABLE_FOR_AUTOMATION` (para el propósito de evidencia legal de MayaLex).
- **Tipo de contenido:** `ADMINISTRATIVE`.
- **Verificado en vivo:** sí — el sitio responde y es real, enfocado en auditoría, declaraciones juradas, rendición de cuentas municipal, portal de transparencia y denuncia ciudadana.
- **No se encontró en esta sesión** una "Biblioteca Virtual" de contenido normativo/jurisprudencial equivalente a CEDIJ — el sitio es institucional-administrativo (auditorías, probidad, ética), no un repositorio de códigos/leyes/sentencias.
- **Conclusión:** no es una fuente prioritaria para `OFFICIAL_FALLBACK_REQUIRED` en el dominio de MayaLex (derecho penal/civil/notarial/etc.) — se documenta como investigado y descartado para esta fase, no como pendiente.

---

## C. Diario Oficial La Gaceta

- **Clasificación:** `UNSUITABLE_FOR_AUTOMATION` para el dominio verificado en esta sesión (`lagaceta.hn`); **dominio oficial no verificado**.
- **HALLAZGO NEGATIVO IMPORTANTE:** `https://www.lagaceta.hn` **NO es el Diario Oficial La Gaceta del Estado hondureño** — es un **medio de noticias privado** ("La Gaceta — Información sin filtros, cerca de la realidad"), con artículos de sucesos, clima y política general, sin ninguna relación con publicación normativa oficial. **Este dominio debe quedar explícitamente excluido de cualquier allowlist futura** para un adapter de "Gaceta" — usarlo por error presentaría noticias genéricas como si fueran la fuente oficial de publicación de decretos.
- **Dominio oficial real:** no confirmado en esta sesión. Intentos de navegación a variantes plausibles (`lagaceta.gob.hn`) fallaron sin resolver. No se inventó ni se asumió ningún dominio alternativo.
- **Contexto ya conocido del propio corpus de MayaLex:** el sistema actual ya obtiene contenido histórico "obtenido del diario oficial La Gaceta" indirectamente A TRAVÉS de CEDIJ (ver A.2) — es decir, para legislación ya existe un camino oficial indirecto y verificado a el contenido de la Gaceta sin necesitar un adapter propio de "la Gaceta" en esta fase.
- **Pendiente para una fase futura:** identificar y verificar el dominio real de publicación oficial (posiblemente bajo gestión de la Secretaría General de Gobierno/Casa Presidencial) antes de construir cualquier adapter de "Gaceta" independiente.

---

## D. Congreso Nacional — repositorios oficiales de legislación

- **Clasificación:** `UNSUITABLE_FOR_AUTOMATION` por ahora — **dominio no verificado en esta sesión**.
- Intentos de navegación a `congresonacional.hn` y `cn.gob.hn` no resolvieron durante esta sesión.
- **No se asumió ni se documentó ningún dominio como oficial sin verificación en vivo** — a diferencia de A.2 (CEDIJ), que sí se verificó en profundidad, este apartado se deja explícitamente como investigación pendiente para una fase futura, en vez de rellenarse con una suposición.
- Nota de diseño: dado que CEDIJ (A.2) ya indexa Leyes/Códigos/Reglamentos "obtenidos del diario oficial La Gaceta... a partir del año 2009", es probable que cubra la mayoría de la legislación relevante sin necesitar un adapter separado del Congreso Nacional a corto plazo — pero esto no sustituye la verificación pendiente.

---

## E. Otros repositorios oficiales

No se investigaron otros repositorios adicionales en esta sesión por límite de tiempo — el criterio de priorización de la directiva (A antes que B/C/D/E) se respetó, y A.2 (CEDIJ) ya produjo evidencia suficiente para un primer adapter real, que era el objetivo mínimo de esta fase.

---

## Resumen tabular

| Fuente | Dominio | Clasificación | Tipo | Verificado en vivo | Adapter implementado |
|---|---|---|---|---|---|
| Portal Poder Judicial | www.poderjudicial.gob.hn | DISCOVERY_ONLY | MIXED | Sí | No |
| **CEDIJ Biblioteca Judicial** | legislacion.poderjudicial.gob.hn | **PRIMARY_OFFICIAL — ADAPTER_LIVE_VERIFIED** | LEGISLATION | **Sí — código real, 2/2 consultas SUCCESS + PDF probado** | **Sí — `cedij-legislacion.ts`** |
| SIJ Jurisprudencial | sij.poderjudicial.gob.hn | DISCOVERY_ONLY | JURISPRUDENCE | Inalcanzable (2 intentos) | No |
| Justicia Abierta / SEJE | sejeinfo.poderjudicial.gob.hn | SECONDARY_OFFICIAL | MIXED/ADMINISTRATIVE | Sí | No (fuera de alcance de esta fase) |
| Tribunal Superior de Cuentas | www.tsc.gob.hn | UNSUITABLE_FOR_AUTOMATION | ADMINISTRATIVE | Sí | No |
| "La Gaceta" (noticias) | lagaceta.hn | **EXCLUIR — no es fuente oficial** | — | Sí (confirmado que NO es la Gaceta oficial) | No |
| Diario Oficial La Gaceta (real) | no confirmado | UNSUITABLE_FOR_AUTOMATION | GAZETTE | No verificado | No |
| Congreso Nacional | no confirmado | UNSUITABLE_FOR_AUTOMATION | LEGISLATION | No verificado | No |

---

## Métodos de prueba usados (transparencia total, §13)

Todas las pruebas fueron de **solo lectura**, sin autenticación, sin bypass de ningún control de acceso, sin crawling a escala, sin peticiones de alta frecuencia, sin ninguna acción de escritura. URLs exactas navegadas durante esta sesión:

- `https://www.poderjudicial.gob.hn/` y `/Paginas/CSJHN.aspx`
- `https://www.poderjudicial.gob.hn/robots.txt` (no existe)
- `https://sij.poderjudicial.gob.hn/index` (http y https — ambos fallaron)
- `https://legislacion.poderjudicial.gob.hn/sistemalegislacion/inicio.aspx`
- `https://legislacion.poderjudicial.gob.hn/sistemalegislacion/AgregarDocumento.aspx?mode=VIEW` (incluyendo una búsqueda real por "Codigo Penal" ejecutada vía JS del propio formulario, para observar la respuesta real)
- `https://legislacion.poderjudicial.gob.hn/robots.txt` (no existe, 404)
- `https://sejeinfo.poderjudicial.gob.hn/sejeinfo/justicia-abierta/`
- `https://www.lagaceta.hn/`
- `https://www.lagaceta.gob.hn` (falló)
- `https://www.tsc.gob.hn/`
- `https://www.congresonacional.hn`, `https://www.congreso.gob.hn`, `https://www.cn.gob.hn` (los tres fallaron)
- `https://www.gob.hn` (falló)

Ninguna petición se repitió más de 2 veces sobre el mismo endpoint. No se realizó ninguna autenticación ni se intentó eludir ninguna.
