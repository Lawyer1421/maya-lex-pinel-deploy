# DISCOVERY A — instrumentos `ABSENT_VERIFIED`

Fecha: 2026-10-23. Datos en `DISCOVERY_A_ABSENT_INSTRUMENTS.json` (siete candidatos `PENDING_VERIFICATION`, etapa `DISCOVER`).

## Limitación de red (resultado principal)
Desde esta sesión **ningún host oficial `.gob.hn` es alcanzable** (el proxy responde 403 al túnel y WebFetch devuelve `ENOTFOUND`; tampoco abrieron WIPO ni otros). **No se obtuvo ningún documento, ningún HTTP 200 ni ningún hash**. Por eso `official_url`, `pdf_sha256`, `text_sha256` y `source_tier` son `null` en los siete registros, y los campos de decreto/Gaceta/fechas siguen en `UNKNOWN`. Las «pistas» del JSON salen de resúmenes de búsqueda web (no se abrieron) y llevan `fetched:false`; son descubrimiento, no evidencia.

| Instrumento | Resultado | Pistas (sin abrir) | Siguiente paso |
|---|---|---|---|
| Código de Comercio (D. 73-1950) | No hallado en fuente oficial | Índices secundarios lo listan como Decreto 73/1950; fechas discrepantes entre fuentes | Tier 1/2 desde una red con acceso |
| Ley de Organización y Atribuciones de los Tribunales | No hallado en fuente oficial | Un índice secundario sugiere un Decreto 76 de 1906; hay copia de un tercero (no oficial) | Confirmar decreto, fecha y reformas |
| Código de la Niñez y la Adolescencia (D. 73-96) | No hallado en fuente oficial | Candidato Tier 4 (`tsc.gob.hn`) y fichas secundarias | Descargar, hash, verificar versión consolidada |
| Decreto 31-2015 | **No identificado** | ninguna | El CLO indica el instrumento |
| Decreto 35-2013 | Ambiguo | Fuentes secundarias discrepan (Código de la Niñez vs. art. 39 Código de Familia) | Resolver con La Gaceta |
| Decreto 124-92 | **No identificado** | ninguna | El CLO indica el instrumento |
| Decreto 284-2013 | No hallado en fuente oficial | Candidato Tier 4; resúmenes secundarios lo describen como ley de generación de empleo/sociedad unipersonal que reforma el Código de Comercio | Descargar, hash, confirmar título y Gaceta |

## Para el CLO
1. Indicar qué instrumentos son los decretos 31-2015 y 124-92 (no se pudieron identificar).
2. Repetir este descubrimiento desde un entorno con acceso a `legislacion.poderjudicial.gob.hn`, `tsc.gob.hn` y La Gaceta, o autorizar que se haga allí.
3. Nada de lo anterior es verificación ni validez jurídica; ninguna aprobación fue registrada.
