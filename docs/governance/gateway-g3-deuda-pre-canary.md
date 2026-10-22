# Gateway v1 (modo sombra) — deuda previa a canary y verificaciones antes de activar

Estado del PR #85: el adaptador OpenAI está implementado pero **apagado y sin presupuesto**:
`SHADOW_GATEWAY_ENABLED = false` y `SHADOW_BUDGET_USD = 0` (constantes de código). No hay llamada real posible.

## Deuda previa a canary (bloqueos)

| Marca | Qué falta |
|---|---|
| `PUBLIC_PROVENANCE_STRONG_PROOF_PENDING` | El gate de corpus público es una garantía **estructural y conservadora** (fuente_tipo `codigo`, jurisdicción HN, vigente, id/hash/fuente presentes, no doctrinal, no `doc_*`). No es prueba absoluta de procedencia pública: hace falta una prueba fuerte (por ejemplo, una columna de procedencia verificada). Requiere SQL/migración: fuera de este PR. |
| `PRIVACY_GATE_KNOWN_FALSE_NEGATIVES_PENDING` | El privacy gate es determinista y fail-closed, pero deja pasar nombres en minúscula sin marcador (p. ej. «sobre juan perez») y datos personales escritos con palabras. Las pruebas lo documentan. Un filtro determinista no los elimina: no se puede activar un canary con consultas reales sin cerrar o aceptar este riesgo de forma expresa. |

## Verificar antes de activar

1. **Tarifas de `gpt-6-luna`:** la configuración dice «verificadas por el supervisor el 2026-10-22» (fuente: https://developers.openai.com/api/docs/pricing). Adjuntar la fuente y una **captura** fechada de la página; revalidar antes de producción o canary. Las tarifas batch vienen del dictamen CLO del 21-oct-2026 y no se revalidaron.
2. **Esquema estricto:** confirmar `MODEL_OUTPUT_WIRE_JSON_SCHEMA` contra la documentación oficial de la Responses API (modo `strict`). La sintaxis de la solicitud se leyó de los tipos del SDK `openai@7.43.0`, no de la documentación en línea.
3. **Runtime de Node en Vercel:** `openai@7.43.0` exige Node ≥ 22. `.nvmrc` y el CI usan 22 y la vista previa compiló; falta confirmar la versión de Node del proyecto en Vercel.
4. **Trabajo suelto en serverless (P1, D14):** el trabajo shadow puede cortarse al terminar la respuesta antes de completar la llamada. `after()` y `maxDuration` quedan fuera de este PR y requieren autorización expresa.
5. **Presupuesto y kill switch:** activarlos exige un cambio de código revisado; este PR no los sube ni lee variables de entorno para ello.

## Retención de datos

`store: false` es obligatorio, **no equivale a Zero Data Retention** (la retención para monitoreo de abuso se rige por los controles de datos de la organización en OpenAI) y no autoriza enviar datos privados. Solo se envían la pregunta pública aprobada por el privacy gate y el evidence público aprobado por el gate de corpus.
