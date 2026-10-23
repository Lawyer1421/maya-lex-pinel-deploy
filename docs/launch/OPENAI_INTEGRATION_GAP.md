# OPENAI_INTEGRATION_GAP

| Tema | Hoy | Objetivo | Brecha |
|---|---|---|---|
| Modelo de producción | Anthropic (Sonnet 4.6 / Haiku 4.5), `lib/model-config.ts` | OpenAI Responses API detrás de una abstracción de proveedor | Falta `LegalModelProvider` + proveedor OpenAI de producción; el shadow existe pero apagado y sin streaming |
| API | Shadow usa Responses (`openai@7.43.0`) | Responses API | OK; sin Assistants |
| Router | `clasificarConsulta` (regex) | `LegalModelRouter` (complejidad, jurisdicción, materia, evidencia, confianza, profundidad, plan, latencia, costo) | Construir (puro, determinista, testeable) |
| Modelos | gpt-6-luna verificado 2026-10-23 | Luna para ruta/clasificación; modelo de razonamiento mayor solo si el router lo justifica | Modelo «profundo» **no verificado**: no se hardcodea ningún ID sin verificación oficial |
| Costo/latencia | Guard de presupuesto + simulación G6 | Presupuesto por plan y por consulta | Falta enlazar a entitlements |
| Streaming/estructurado | Shadow: salida estructurada estricta, sin streaming | Streaming progresivo en análisis profundo | Falta en producción |
| Privacidad | `store:false`; ZDR **no** aprobado; gate de privacidad con riesgo residual 15.4 % (holdout) | Ruta privada aprobada para enviar documentos | Decisión de privacidad de Fredy antes de enviar cualquier dato de cliente |
| Activación | Kill switch constante `false`, presupuesto 0 | Integración controlada con canary | Requiere autorización expresa de Fredy (canary/activación) |

Regla: el modelo propone; la validez jurídica sale del corpus + motor de versiones.
