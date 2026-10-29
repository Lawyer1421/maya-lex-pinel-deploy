# R3 — suficiencia de evidencia (CLO, 29-oct-2026)

Texto oficial: «Hay suficiencia solo si existe al menos una cita DIRECT validada a un fragmento con rol PRIMARY y es_norma_vigente = TRUE, del mismo instrumento y del mismo artículo consultados. Un conteo de PRIMARY no basta. Si no hay esa cita, hay abstención. NULL = solo CONTEXT; FALSE = excluido, rotulado "NORMA NO VIGENTE, NO CITAR".»

Un solo criterio, en `lib/legal-retrieval/clo-guards.ts`, usado por la recuperación (`resumenEvidenciaClo`), por el chat principal (`lib/legal-retrieval/r3-chat.ts`, A-2) y por Luna (#110):

| Regla | Dónde |
|---|---|
| PRIMARY + `es_norma_vigente=TRUE` + instrumento **y** artículo identificados (A-1: sin número de artículo o sin instrumento nunca hay suficiencia) | `fragmentoCumpleR3` |
| Mismo instrumento y artículo consultados; artículo sin instrumento resuelto no hace match (BAJO) | `fragmentoCumpleR3` + `objetivosDeConsulta` |
| Cita DIRECT que respalda la afirmación concreta (cifras, artículos, términos propios) | `afirmacionRespaldadaPorFragmento` |
| La respuesta **nombra** el instrumento y el artículo | `respuestaNombraFuente` |
| Sin ninguna afirmación válida → abstención que dice qué falta | `evaluarSuficienciaR3`, `mensajeAbstencionR3` |

Chat principal (A-2): en consultas que exigen corpus (rutas A/B/C) la respuesta se retiene hasta el final, se evalúa con la misma R3 y se entrega o se sustituye por la abstención (código `R3_SUFICIENCIA_NO_ACREDITADA`, la consulta no consume cuota). **Ruta D** (sala, sin corpus, sin fragmentos): sin cambio; aplicarle R3 equivaldría a abstenerse siempre — **decisión pendiente del CLO**. Los textos libres se ligan a fragmentos por párrafo (nombran artículo e instrumento): aproximación determinista y conservadora.

N-1: la bandera `flag_corpus_p21` se sella en cada fragmento (`corpus_p21_habilitado`) para que recuperación, citas, contexto y Luna usen el mismo criterio. N-2: `mapearFilaSemantica` lee `metadata_clo` (rol, desplazado_por, elegible_primary) de la RPC semántica; la RPC actual no lo devuelve — ampliación **solo como propuesta** en `PROPUESTA_NO_APLICADA_buscar_biblioteca_v2_metadata_clo.sql`.
