# MayaLex Luna (P26) — motor de respuestas sobre la Responses API de OpenAI

Estado: **implementado, APAGADO por defecto, sin activar.** No hay migraciones, no se toca `biblioteca_vectores`, `/api/rag` sigue cerrado (PR #109), y `/api/chat` conserva su comportamiento cuando Luna está apagada o no responde.

## Qué hace
`/api/chat` conserva autenticación, cuota (`reserveRateLimit`), recuperación (resolutor exacto → semántico), Evidence Gate y fallback a fuentes oficiales. Si Luna está encendida, recibe **solo** la pregunta (tras el privacy gate) y la evidencia autorizada, y devuelve una respuesta estructurada (JSON Schema estricto) cuyas afirmaciones se validan: cada claim debe citar un `chunk_id` entregado y tener respaldo `DIRECT` en un fragmento citable. Las referencias del texto final se resuelven desde la evidencia, no desde lo que diga el modelo. Si la evidencia no basta, Luna se abstiene y dice **qué falta**.

Orden (Fase C): 1) resolutor exacto + corpus interno (solo lectura) · 2) recuperación semántica existente · 3) si no hay evidencia, fallback oficial existente (CEDIJ, solo metadatos, tras `flag_official_source_fallback`) · 4) verificación de instrumento/artículo/vigencia vía compuerta de corpus público · 5) respuesta o abstención. La búsqueda externa nunca modifica el corpus; `lib/luna/incorporation-queue.ts` solo define el tipo del candidato futuro (en memoria, sin escritura).

## Archivos
`lib/luna/{config,pricing,model-validation,evidence,adapter,render,engine,incorporation-queue}.ts` · cableado en `app/api/chat/route.ts` · bandera `flag_luna_responses` en `lib/flags.ts` · el cliente OpenAI se crea solo en `lib/ai-gateway/shadow/openai-adapter.ts` (`crearClienteOpenAI`), donde ya vivían el SDK y la credencial.

## Planes (una implementación, tres configuraciones)
| Plan (tier) | Razonamiento | Salida máx. | Entrada máx. | Evidencias | Tope por consulta (peor caso) | Presupuesto 24 h/instancia |
|---|---|---|---|---|---|---|
| Free (`free`) | none | 600 | 8 000 | 4 | USD 0.003 | USD 1 |
| Académico (`academico`) | low | 1 400 | 16 000 | 8 | USD 0.008 | USD 3 |
| Premium (`pro`,`admin`) | medium | 2 500 | 24 000 | 12 | USD 0.020 | USD 5 |

Costo del **peor caso** por consulta (entrada completa como escritura de caché + salida máxima, tarifas `gpt-6-luna` Standard de `shadow-model-config.ts`): free ≈ USD 0.0013 · académico ≈ USD 0.0027 · premium ≈ USD 0.0043. Una consulta típica (≈1 000 tokens de entrada, ≈150 de salida) cuesta ≈ USD 0.0002. El límite diario de consultas por usuario sigue siendo el de cuotas existente (free: `FREE_LIMIT_DEFAULT`).

Sobrescrituras de entorno (opcionales): `LUNA_MODEL_ID`, `LUNA_MODEL_ID_<PLAN>`, `LUNA_BUDGET_USD_<PLAN>`, `LUNA_MAX_QUERY_USD_<PLAN>`. Un modelo sin tarifa registrada se **rechaza** (se usa el predeterminado).

## Compuertas (todas fail-closed)
`LUNA_ENABLED=1` → `OPENAI_API_KEY` → privacy gate (PII/longitud ≤ 500) → evidencia autorizada (cada fragmento: `codigo`, HN, `es_norma_vigente=true`, id y hash, no doctrinal, citable) → tope de entrada → tope de costo por consulta → circuit breaker → presupuesto → **modelo disponible en la cuenta** (`GET /v1/models/{id}`, caché 10 min) → llamada con timeout → parseo estricto → validador de citas. Cualquier `SKIPPED/ERROR` deja que la consulta siga por el proveedor vigente.

La solicitud usa `store:false`, sin tools, sin web/file search, sin `previous_response_id`, `maxRetries:0`. `store:false` no equivale a Zero Data Retention (retención de monitoreo de abuso hasta 30 días): por eso solo sale texto de normas públicas y una pregunta ya filtrada.

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
- Presupuesto y circuit breaker son **en memoria por instancia** serverless: el tope duro real es el costo máximo por consulta × cuota diaria de usuarios. Un presupuesto global exige almacén compartido (decisión posterior).
- El manifiesto de procedencia fuerte del gateway sigue vacío; Luna usa la compuerta de corpus público (vigente + id + hash + citable), no la procedencia fuerte. Que eso baste para enviar texto de normas al proveedor es **decisión del propietario/CLO**.
- Las reglas CLO del PR #106 (PRIMARY/CONTEXT, `flag_corpus_p21`) no están en `main`; si #106 se fusiona, `autorizarEvidencia` debe adoptar `esCitableComoNorma`.
- Luna no hace streaming (valida antes de mostrar) y no recibe historial de conversación (privacidad); las preguntas de seguimiento sin contexto propio pueden abstenerse. Preguntas > 500 caracteres no pasan el privacy gate y siguen por el proveedor vigente.
- El fallback externo sigue siendo solo metadatos (CEDIJ); no hay extracción de texto de artículos desde fuentes oficiales ni cola de incorporación persistente.
- Se amplió una regla de política de pruebas (`tests/ai-gateway-shadow.test.ts`): `lib/luna` puede importar `lib/ai-gateway`; la regla «SDK y credencial solo en `openai-adapter.ts`» sigue intacta. Evidencia G6 regenerada por el cambio de código.
