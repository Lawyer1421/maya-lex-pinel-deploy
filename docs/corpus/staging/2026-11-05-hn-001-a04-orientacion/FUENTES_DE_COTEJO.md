# Fuentes de cotejo para A04 — intento de acceso y estado

Fecha de los intentos: 2026-11-05T14:32:33Z. Fuentes pedidas: **repositorio de la UNAH** y **Portal Único del IAIP**. Resultado: **no se obtuvo ningún archivo**. No hay, por tanto, URL de descarga, tamaño, SHA-256, portada ni correspondencia de páginas que registrar; no se inventa ninguno.

| Fuente | Host probado | Vía | Resultado exacto |
|---|---|---|---|
| UNAH, repositorio | `repositorio.unah.edu.hn` | `curl` por el proxy de la sesión | `CONNECT tunnel failed, response 403` |
| UNAH, sitio | `www.unah.edu.hn` | ídem | `CONNECT tunnel failed, response 403` |
| IAIP, Portal Único | `portalunico.iaip.gob.hn` | ídem | `CONNECT tunnel failed, response 403` |
| IAIP, sitio | `www.iaip.gob.hn` | ídem | `CONNECT tunnel failed, response 403` |
| Los cuatro anteriores | los mismos | agente de lectura web (WebFetch) | `getaddrinfo ENOTFOUND` en los cuatro (host fuera de los dominios permitidos de la sesión o inexistente) |

Tampoco se localizó la URL del PDF de La Gaceta 33,222 ni la del Decreto 130-2017 (La Gaceta 34,940): sin acceso no hay URL verificable, y no se adivinan direcciones.

## Qué hay que habilitar
Los cuatro hosts deben figurar en **Allowed domains** de la red del entorno (o un nivel de acceso más amplio): `repositorio.unah.edu.hn`, `www.unah.edu.hn`, `portalunico.iaip.gob.hn`, `www.iaip.gob.hn`. Pasos: menú del entorno en la barra de título de la sesión → Edit → Network access (https://code.claude.com/docs/en/cloud-environments#network-access). Alternativa sin red: adjuntar los PDF por el canal de dos ZIP (< 10 MB cada uno), como se hizo con A04.

## Lo que se hará al recibir un ejemplar (checklist; todo pendiente)
1. Registrar URL exacta, fecha/hora de descarga, tamaño y SHA-256; el hash distinto distingue los archivos.
2. Portada: número de Gaceta, fecha, sección, paginación (A04 trae «NUM. 33,222», «VIERNES 6 DE SEPTIEMBRE DEL 2013», Sección A, 46 págs. para el Decreto 35-2013).
3. Tabla de correspondencia de páginas A04 ↔ ejemplar nuevo.
4. Comparar márgenes: ¿otro escaneo? ¿bordes completos? ¿legibles? Recortes comparativos lado a lado.
5. Cotejar, en este orden: las 11 líneas de la pág. 41; los 88 finales anómalos (`transcripcion_candidata/borde_derecho_88_lecturas.csv`); el encabezado del art. 6; C01–C06; el pasaje de los arts. 134 y 141; luego el resto del inventario de 629 líneas.

## Estado de cada prioridad (sin ejemplar de cotejo)
| Prioridad | Lectura conservada | Recorte | Estado |
|---|---|---|---|
| 11 líneas de la pág. 41 | carácter inicial ausente en la imagen; lectura por contexto **no adoptada** | `transcripcion_candidata/recortes_borde_izq/p41_y*.jpg` | **ABIERTA** (ILEGIBLE_EN_ESTE_EJEMPLAR) |
| 88 finales anómalos | 29 legibles, 40 parciales (letra final cortada), 6 ilegibles parciales, 13 sin lectura | `transcripcion_candidata/recortes_borde_derecho/` | **ABIERTA** salvo los 29 legibles (sin cotejar con otro ejemplar) |
| Encabezado del art. 6 | lista «11» / cuerpo «511» (ambas) | `paquete-revision/recortes/p41_*art6*` | **ABIERTA** |
| C01–C06 | lecturas visuales propuestas | `paquete-revision/recortes/` | **PENDIENTE CLO**, sin segundo ejemplar |
| Arts. 134 y 141 | pasaje completo A04/A03 | `paquete-revision/PASAJES_134_141.md` | **ABIERTA** |
