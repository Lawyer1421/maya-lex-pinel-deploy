# MayaLex Luna (P26) — motor de respuestas sobre la Responses API de OpenAI

> **DEPENDENCIA: el PR #110 depende del PR #106 y se fusiona DESPUÉS.** Luna consume el clasificador compartido (`lib/legal-retrieval/clo-guards.ts`) y la rama del #110 incluye un merge de `feature/clo-retrieval-guards`; al fusionarse el #106 en `main`, el diff del #110 queda reducido a Luna. No se duplican reglas del #106 en `lib/luna` (una prueba lo impide).
>
> **Actualización CLO 29-oct:** modalidad explícita «consulta jurídica general» con aviso de privacidad (`lib/luna/consent.ts`), privacidad estricta (`lib/luna/privacy.ts`), SSE solo con citas validadas (`lib/luna/citas.ts`), contador global de costos (`lib/luna/cost-counter.ts`, DDL = `PROPUESTA_NO_APLICADA_luna_costos.sql`), script de prueba real sin ejecutar (`scripts/luna-verify-model.ts`). La búsqueda externa en fuentes oficiales NO está en este PR: solo diseño (`DISENO_FUENTES_OFICIALES_EXTERNAS.md`).

Estado: **implementado, APAGADO por defecto, sin activar.** No hay migraciones, no se toca `biblioteca_vectores`, `/api/rag` sigue cerrado (PR #109), y `/api/chat` conserva su comportamiento cuando Luna está apagada o no responde.

## Qué hace
`/api/chat` conserva autenticación, cuota (`reserveRateLimit`), recuperación (resolutor exacto → semántico), Evidence Gate y fallback a fuentes oficiales. Si Luna está encendida, recibe **solo** la pregunta (tras el privacy gate) y la evidencia autorizada, y devuelve una respuesta estructurada (JSON Schema estricto) cuyas afirmaciones se validan: cada claim debe citar un `chunk_id` entregado y tener respaldo `DIRECT` en un fragmento citable. Las referencias del texto final se resuelven desde la evidencia, no desde lo que diga el modelo. Si la evidencia no basta, Luna se abstiene y dice **qué falta**.

Luna solo corre si: el usuario envía `luna:{modalidad:'consulta_juridica_general', aceptado:true, aviso_version:'<vigente>'}` **y** `LUNA_ENABLED=1` **y** `flag_luna_responses` para él **y** la recuperación terminó en `EXACT_SUCCESS`/`SEMANTIC_SUCCESS`. Solo fragmentos **PRIMARY** según el clasificador del #106 salen hacia OpenAI (CONTEXT, vigencia FALSE/NULL, desplazadas, otra jurisdicción o instrumento distinto del pedido: nunca). **R3 (texto oficial CLO, 29-oct, cableado en el clasificador compartido del #106, `lib/legal-retrieval/clo-guards.ts`):** «Hay suficiencia solo si existe al menos una cita DIRECT validada a un fragmento con rol PRIMARY y es_norma_vigente = TRUE, del mismo instrumento y del mismo artículo consultados. Un conteo de PRIMARY no basta. Si no hay esa cita, hay abstención. NULL = solo CONTEXT; FALSE = excluido, rotulado "NORMA NO VIGENTE, NO CITAR".» Complemento: la cita DIRECT debe respaldar la afirmación concreta; no se impone un mínimo de fragmentos. Luna llama a `resumenEvidenciaClo` (nivel recuperación) antes de pagar la llamada y a `evaluarSuficienciaR3` (nivel respuesta) después; solo las afirmaciones que cumplen se muestran y se citan, y sin ninguna hay abstención que dice qué falta. *Interpretación a confirmar por el CLO:* en una consulta temática (que no nombra instrumento ni artículo) no hay objetivo que comparar y rigen PRIMARY+TRUE y la cita DIRECT que respalda; el respaldo de la afirmación es una comprobación determinista (cifras, artículos y términos propios aparecen en el fragmento), conservadora, que no sustituye la lectura jurídica.

Orden (Fase C): 1) resolutor exacto + corpus interno (solo lectura) · 2) recuperación semántica existente · 3) si no hay evidencia, fallback oficial existente (CEDIJ, solo metadatos, tras `flag_official_source_fallback`) · 4) verificación de instrumento/artículo/vigencia vía compuerta de corpus público · 5) respuesta o abstención. La búsqueda externa nunca modifica el corpus; `lib/luna/incorporation-queue.ts` solo define el tipo del candidato futuro (en memoria, sin escritura).

## Archivos
`lib/luna/{config,pricing,model-validation,evidence,adapter,render,engine,incorporation-queue}.ts` · cableado en `app/api/chat/route.ts` · bandera `flag_luna_responses` en `lib/flags.ts` · el cliente OpenAI se crea solo en `lib/ai-gateway/shadow/openai-adapter.ts` (`crearClienteOpenAI`), donde ya vivían el SDK y la credencial.

## Planes (una implementación, tres configuraciones)
| Plan (tier) | Razonamiento | Salida máx. | Entrada máx. | Evidencias | Tope por consulta (peor caso) | Presupuesto 24 h/instancia |
|---|---|---|---|---|---|---|
| Free (`free`) | none | 600 | 8 000 | 4 | USD 0.003 | USD 1 |
| Académico (`academico`) | low | 1 400 | 16 000 | 8 | USD 0.008 | USD 3 |
| Premium (`pro`,`admin`) | medium | 2 500 | 24 000 | 12 | USD 0.020 | USD 5 |

Costos **ESTIMADOS** hasta la prueba real (tarifas del 2026-10-23, vigencia 7 días). Costo del **peor caso** por consulta (entrada completa como escritura de caché + salida máxima, tarifas `gpt-6-luna` Standard de `shadow-model-config.ts`): free ≈ USD 0.0013 · académico ≈ USD 0.0027 · premium ≈ USD 0.0043. Una consulta típica (≈1 000 tokens de entrada, ≈150 de salida) cuesta ≈ USD 0.0002. El límite diario de consultas por usuario sigue siendo el de cuotas existente (free: `FREE_LIMIT_DEFAULT`).

Sobrescrituras de entorno (opcionales): `LUNA_MODEL_ID`, `LUNA_MODEL_ID_<PLAN>`, `LUNA_BUDGET_USD_<PLAN>`, `LUNA_MAX_QUERY_USD_<PLAN>`. Un modelo sin tarifa registrada se **rechaza** (se usa el predeterminado).

## Compuertas (todas fail-closed)
modalidad+aviso (ruta) → `LUNA_ENABLED=1` → bandera → `OPENAI_API_KEY` → estado de recuperación → **privacidad estricta** (gate base + primera persona, montos, fechas y números de caso) → evidencia PRIMARY (clasificador #106) → tope de entrada → tope de costo por consulta → **auditoría del payload** (solo `question`+`evidence`, `store:false`, sin campos extra, escaneo de PII sobre la pregunta enviada) → circuit breaker → presupuesto local → **contador GLOBAL** → **modelo disponible en la cuenta** (`GET /v1/models/{id}`, caché 10 min) → llamada con timeout → parseo estricto → validador de citas. Cualquier `SKIPPED/ERROR` deja que la consulta siga por el proveedor vigente.

La solicitud usa `store:false`, sin tools, sin web/file search, sin `previous_response_id`, `maxRetries:0`. `store:false` no equivale a Zero Data Retention (retención de monitoreo de abuso hasta 30 días): por eso solo sale texto de normas públicas y una pregunta ya filtrada.

## Contador global de costos
El `budget-guard` en memoria es por instancia y **no cuenta como límite global**. El límite global es `lib/luna/cost-counter.ts` sobre dos RPC (`luna_reservar_costo`, `luna_liquidar_costo`) cuyo DDL está en `docs/luna/PROPUESTA_NO_APLICADA_luna_costos.sql` — **PROPUESTA_NO_APLICADA** (no es migración, no se ejecutó, requiere autorización expresa de Fredy). Sin ese DDL, Luna falla cerrada (`PRESUPUESTO_GLOBAL_AGOTADO`). Para la cuenta de prueba existe `LUNA_COST_COUNTER=local_canary_only` (en memoria, una instancia, **no global**, registrado como `contador=LOCAL_CANARY_NO_GLOBAL`).

## Kill switch
Apagar `flag_luna_responses` (`enabled=false` en `feature_flags`) corta Luna en la solicitud siguiente: la bandera se lee de la base en cada solicitud (sin caché), sin redeploy y sin tocar datos (probado en `tests/chat-luna.test.ts`, «KILL SWITCH»). `LUNA_ENABLED` es el corte global de entorno y sí requiere redeploy.

## Prueba real del modelo (NO ejecutada)
`scripts/luna-verify-model.ts` verifica con datos sintéticos: modelo en la cuenta, `reasoning.effort` none/low/medium, JSON Schema estricto, `store:false`, tokens y costo estimado. Exige `LUNA_VERIFY_CONFIRM=SI_FREDY` y una clave de PRUEBA; sin ellas sale con código 2 sin abrir red (probado). **No se ejecuta sin el sí de Fredy.**

## Habilitación por etapas (decisión de Fredy en cada paso)
1. Autorizar y ejecutar `scripts/luna-verify-model.ts` con la clave de prueba; anotar qué esfuerzos soporta y el costo real; revalidar tarifas.
2. Cuenta de prueba: Preview, `OPENAI_API_KEY`+`LUNA_ENABLED=1`+`LUNA_COST_COUNTER=local_canary_only`, bandera solo para el correo de Fredy.
3. Aplicar (si Fredy autoriza) el DDL del contador global y quitar `local_canary_only`.
4. Free → Académico → Premium, cada etapa con bandera por lista de correos y revisión de los registros `[Luna]` (solo códigos y cifras). Interfaz: falta el interruptor y el aviso en `ChatInterface` (texto en `AVISO_LUNA_TEXTO`, PENDIENTE_VERIFICACIÓN legal).
5. Fusionar #106 antes que #110.

## Activación / desactivación (decisión del propietario; nada de esto se ejecutó)
1. Verificar el modelo con la clave real: `curl -s https://api.openai.com/v1/models/gpt-6-luna -H "Authorization: Bearer $OPENAI_API_KEY"` (200 con `"id":"gpt-6-luna"`).
2. Revalidar tarifas (vigencia de 7 días; la verificación G6-A es del 2026-10-23 → vence el 2026-10-30).
3. Definir `OPENAI_API_KEY` y `LUNA_ENABLED=1` en el entorno **Preview** primero.
4. Sembrar `feature_flags.flag_luna_responses` (`enabled=true`, `allowed_emails=[correo del canario]`).
5. **Apagar:** `LUNA_ENABLED` distinto de `1` (corte global inmediato tras redeploy) o `enabled=false` en la fila (corte sin redeploy). Ambos devuelven las consultas al proveedor vigente.

## Canary y rollback
Canary: Preview con 1 usuario (propietario) → 3–5 usuarios Premium → Académico → Free, observando `[Luna] estado=… motivo=…` (solo códigos y costo, nunca texto), tasa de `ERROR/SKIPPED`, abstenciones, costo/consulta y latencia. Criterio de avance: 0 respuestas con referencia no verificable, costo ≤ tope, `SALIDA_INVALIDA` < 5 %. Rollback: apagar la bandera (sin deploy); si hace falta, `LUNA_ENABLED` vacío + redeploy; revertir el merge no deja datos que limpiar (no hay migraciones ni escrituras).

## Riesgos residuales
- **No se verificó contra la API real**: el sandbox no tiene credencial ni salida a `api.openai.com`. La compatibilidad (modelo, `reasoning.effort` = `low`/`medium`, esquema estricto) se apoya en la verificación documental G6-A; solo `none` figura como soportado en el registro. Si la API rechaza `low`/`medium`, la llamada falla (`ERROR`) y la consulta sigue por el proveedor vigente.
- Hasta que se aplique el DDL del contador global, no hay límite global multi-instancia (Luna falla cerrada fuera del canary de cuenta de prueba).
- El manifiesto de procedencia fuerte del gateway sigue vacío; Luna usa el clasificador del #106 (PRIMARY), no la procedencia fuerte. Que eso baste para enviar texto de normas al proveedor es **decisión del propietario/CLO**.
- **Riesgo de privacidad residual:** el filtro es determinista; nombres fuera de diccionario en minúscula o hechos del caso en tercera persona sin marcadores pueden pasar. Mitigación: modalidad opt-in con aviso, privacidad estricta, payload mínimo auditado, `store:false`, kill switch y piloto con cuenta de prueba. La retención de abuso de OpenAI (hasta 30 días) no se elimina con `store:false`.
- Luna no hace streaming (valida antes de mostrar) y no recibe historial ni archivos ni datos de sesión; las preguntas de seguimiento sin contexto propio pueden abstenerse. Preguntas > 500 caracteres o con datos de caso siguen por el proveedor vigente.
- Búsqueda externa en fuentes oficiales: fuera de este PR (solo diseño). El fallback sigue siendo solo metadatos (CEDIJ).
- Se amplió una regla de política de pruebas (`tests/ai-gateway-shadow.test.ts`): `lib/luna` puede importar `lib/ai-gateway`; la regla «SDK y credencial solo en `openai-adapter.ts`» sigue intacta. Evidencia G6 regenerada por el cambio de código.

## Ajuste CLO 29-oct (2) — qué cambió
- **PRs separados:** R3 vive en el #106 (`feature/clo-retrieval-guards`); el #110 se reconstruyó sobre la punta del #106 sin el merge (cherry-pick de los dos commits de Luna; **se hizo force-push de la rama del #110**, respaldo local `backup/luna-pre-rebase-78198dc`) y su base de PR es la rama del #106: el diff muestra solo Luna.
- **Privacidad fail-closed:** además de primera persona, montos, fechas y números de caso, se rechaza lo que no se pueda clasificar como general: hechos en tercera persona (pretérito/relato), marcadores de persona concreta y dos palabras desconocidas seguidas (p. ej. un nombre en minúscula).
- **Interfaz:** `components/LunaGeneralToggle.tsx` en `ChatInterface`: interruptor apagado por defecto y casilla de aceptación versionada; **no se pinta** mientras `AVISO_LUNA_APROBADO_POR_CLO` sea `false` (hoy). El texto está en `docs/luna/AVISO_LUNA_BORRADOR.md`. Con archivos adjuntos nunca se envía `luna`.
- **Script de verificación:** solo consultas sintéticas; el secreto se lee del entorno (en `openai-adapter.ts`), nunca del repo; ni el informe ni los errores lo reproducen (pruebas). No ejecutado.
- **DDL del contador (PROPUESTA_NO_APLICADA):** `docs/luna/PROPUESTA_NO_APLICADA_luna_costos.sql` (permisos: EXECUTE solo `service_role`, RLS sin políticas, `SECURITY DEFINER` con `search_path` fijo), `..._rollback.sql`, y `tests/sql/luna-costos.sql.test.ts` (60 reservas concurrentes por 4 conexiones, tope por plan y día, liquidación, permisos, reversión) sobre una base en memoria. No se aplicó a ninguna base.
- **Preview:** `LUNA_ENABLED=1` no basta en producción (`VERCEL_ENV=production` exige `LUNA_ALLOW_PRODUCTION=1`); en Preview el presupuesto diario se limita a USD 0.05 por plan (`LUNA_PREVIEW_BUDGET_USD`). La bandera se siembra solo con el correo de la cuenta de prueba (acción de Fredy, no del código).

## Ajuste CLO 29-oct (3) — auditoría #106 @ 52e5969 y #110 @ 471d877
- **R3 endurecida (en el #106):** sin número de artículo o sin instrumento identificados nunca hay suficiencia; con artículo consultado pero instrumento sin resolver no hay match; la respuesta debe NOMBRAR instrumento y artículo (`docs/retrieval/R3_SUFICIENCIA.md`). Luna pasa a `evaluarSuficienciaR3(..., textoRespuesta)` y usa `mensajeAbstencionR3` (un solo texto). El chat principal usa la misma R3 (A-2, `r3-chat.ts`).
- **M-2:** `flag_luna_responses` con `enabled=true` y lista vacía es CERRADO para todos (`FLAGS_LISTA_VACIA_CERRADA` en `lib/flags.ts`); las demás banderas no cambian.
- **Topes duros en código** (`lib/luna/config.ts`): por consulta ≤ USD 0.01 y por día ≤ USD 5 por plan. Un valor de entorno que los exceda, o que no sea un número válido, deja la configuración inválida y Luna FALLA CERRADA (`CONFIG_EXCEDE_TOPE_DURO` / `CONFIG_VALOR_DE_ENTORNO_INVALIDO`); no se recorta en silencio. Premium bajó de USD 0.02 a 0.01 por consulta (su peor caso estimado es ≈ 0.0043).
- **`LUNA_ALLOW_PRODUCTION`:** se exige SIEMPRE fuera de Preview y desarrollo (producción de Vercel, producción autoalojada, entorno sin identificar). `local_canary_only` queda PROHIBIDO fuera de Preview/desarrollo, incluso con `LUNA_ALLOW_PRODUCTION`.
- **Privacidad:** se rechazan residencia y lugar de un caso («alguien que vive en la aldea el ocotal es demandado» y variantes: colonia, barrio, caserío, municipio de…, vecino de…) y personas indefinidas («alguien», «fulano»).
- **Respaldo:** la rama `backup/luna-pre-rebase-78198dc` se subió al remoto.
