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

Chat principal (A-2, A-2b, D-1 — re-auditoría): **toda** la salida del modelo se retiene hasta el final (ya nada se transmite token a token; al llegar el primer token se emite un aviso `thinking`) y se evalúa con el criterio compartido **R4** (`validarRespuestaR4`, `lib/legal-retrieval/clo-guards.ts`), que Luna también usa (`mencionesNoValidadas`):
1. Rutas con corpus (A/B/C): si el texto menciona CUALQUIER artículo o instrumento sin respaldo en un fragmento recuperado elegible (PRIMARY, vigente TRUE, instrumento y artículo identificados) → abstención completa (`MENCION_NO_VALIDADA`). Un artículo sin instrumento nombrado en su bloque, o un instrumento fuera de la tabla de alias («Ley de…», «Decreto N»), no se valida.
2. Si no hay menciones sin respaldo, R3 por oración; sin ninguna válida → abstención. Se entregan SOLO las oraciones validadas y las citas son las de los fragmentos que las respaldan.
3. Ruta D (sala, sin corpus): si la respuesta no nombra artículo, instrumento ni el contenido de una norma concreta («la ley establece…») se entrega íntegra; si lo nombra no hay fragmento que lo respalde → abstención (`SIN_FRAGMENTOS_PARA_NORMA`).
La abstención (código `R3_SUFICIENCIA_NO_ACREDITADA`) no consume cuota. Los textos libres se ligan a fragmentos por bloque (línea en blanco): aproximación determinista y conservadora. Consecuencia a vigilar: en los modos de redacción (`documento`, `escritos_penales`) un borrador que nombre artículos no recuperados se abstendrá.

N-1: la bandera `flag_corpus_p21` se sella en cada fragmento (`corpus_p21_habilitado`) para que recuperación, citas, contexto y Luna usen el mismo criterio. N-2: `mapearFilaSemantica` lee `metadata_clo` (rol, desplazado_por, elegible_primary) de la RPC semántica; la RPC actual no lo devuelve — ampliación **solo como propuesta** en `PROPUESTA_NO_APLICADA_buscar_biblioteca_v2_metadata_clo.sql`.
