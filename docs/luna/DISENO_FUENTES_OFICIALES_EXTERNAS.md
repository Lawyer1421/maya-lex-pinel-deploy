# Diseño — búsqueda en fuentes oficiales externas para Luna (SOLO DISEÑO; NO implementado en el PR #110)

Estado: propuesta para decisión de Fredy/CLO. No hay código, red ni escritura asociados a este documento.

## Principios
1. **Lista cerrada de dominios.** Un registro versionado en el repositorio (`dominio`, `institución`, `tipos de documento permitidos`, `fecha de revisión de términos`, `aprobado por`). Todo lo que no esté en la lista no se consulta, ni por redirección. Cada dominio entra por decisión expresa del CLO tras revisar sus términos de uso (hoy: CEDIJ solo metadatos; SNH/IP Catastro, CDSE e INHGEOMIN siguen `SOURCE_TERMS_UNVERIFIED`).
2. **Consulta mínima.** Solo términos jurídicos reducidos (`minimizeQueryForExternalResearch`), nunca la pregunta cruda ni datos del usuario; un intento por solicitud, con timeout.
3. **Cada hallazgo se acredita con cinco campos:** documento (título e instrumento normalizado), **artículo**, **fecha** (publicación/versión), **URL oficial** y **huella SHA-256 del contenido obtenido**. Sin los cinco, el hallazgo es solo «pista».
4. **Verificado frente a descriptivo.** *Verificado*: texto del artículo obtenido del dominio oficial, instrumento y artículo coinciden con lo pedido (identidad), fecha y vigencia constan en la fuente. *Descriptivo*: metadatos, índices, resúmenes o páginas sin texto del artículo. Un hallazgo descriptivo nunca se presenta como texto de norma ni como «vigente», y nunca alimenta a Luna como evidencia PRIMARY.
5. **Nunca autoingesta.** La búsqueda externa no escribe en el corpus, en `biblioteca_vectores` ni en caché persistente de evidencia. Lo verificado puede generar un `CandidatoIncorporacion` (`lib/luna/incorporation-queue.ts`, tipo en memoria) que una persona (CLO) revisa y, si procede, carga por el proceso supervisado existente (P21/CLO).
6. **Abstención si no se acredita.** Sin los cinco campos, con contradicción entre fuentes, dominio fuera de la lista, error o timeout: Luna se abstiene diciendo qué falta (instrumento, artículo, fecha, o fuente oficial no disponible) y no completa con conocimiento general. `SOURCE_UNAVAILABLE` no se presenta como «la ley no existe».
7. **Privacidad.** Misma modalidad opt-in y mismo filtro estricto antes de cualquier consulta externa; registro solo de códigos, dominio y estado.
8. **Costo y límites.** Cuota por plan de consultas externas, contador global (mismo que Luna), circuit breaker por dominio.

## Flujo propuesto
exacto → semántica → (si insuficiente y bandera aparte `flag_official_source_fallback`) consulta a dominio de la lista → extracción del artículo → verificación de identidad/fecha → si **verificado**: se entrega al clasificador del #106 como fuente externa **CONTEXT con aviso** (nunca PRIMARY hasta que el CLO la incorpore) y se encola candidato; si **descriptivo** o fallido: abstención con el faltante.

## Decisiones que necesita el CLO
Lista inicial de dominios; si un hallazgo verificado externo puede mostrarse como CONTEXT con aviso; formato de la cola de incorporación (persistencia = DDL, otra propuesta).
