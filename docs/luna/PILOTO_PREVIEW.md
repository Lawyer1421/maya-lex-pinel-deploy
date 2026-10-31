# Piloto de Luna en Preview — acciones que requieren autorización expresa del propietario

**Estado: PREPARACIÓN. Nada de esto se ha ejecutado.** Luna sigue apagada (sin `LUNA_ENABLED`, sin credencial OpenAI, sin fila `flag_luna_responses`, DDL del contador sin aplicar). Producción no se toca: `LUNA_ALLOW_PRODUCTION` no se define nunca en este piloto.

**Quién autoriza.** Toda autorización la da el **propietario (Fredy) o su delegado jurídico designado por escrito**. El antiguo CLO ya no interviene: la constante `AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO` (antes `…_APROBADO_POR_CLO`) solo pasa a `true` en un PR revisado, tras esa autorización escrita.

## Presupuesto: qué es y qué NO es el tope de USD 0.05
- **Es** un límite **operativo** del script de ensayo: calcula el peor caso con las tarifas del repositorio y comprueba, antes de cada llamada pagada, que gastado + peor caso ≤ USD 0.05. Peor caso del plan de 3 llamadas: ≈ USD 0.004. El piloto Preview limita además su presupuesto diario a USD 0.05 por plan (`LUNA_PREVIEW_BUDGET_USD`).
- **NO es** un límite global garantizado de facturación. La factura la fija el proveedor; el cálculo usa tarifas que pueden cambiar, y un error del cliente o un reintento ajeno al script no lo frena. El único tope que el proveedor hace cumplir es el **límite de gasto del panel de la cuenta de OpenAI**: configúrelo (por ejemplo USD 1) en el proyecto/clave de prueba **antes** de cualquier llamada.
- **Tarifas Standard de `gpt-6-luna` (por millón de tokens):** entrada USD 0.10, salida USD 0.50, entrada en caché USD 0.01 (Batch: 0.05 / 0.25). Fast, regional (+10 %) y prompts de más de 272 K tokens **no están registrados** y el código lanza error si se pide una tarifa no registrada. Verificadas el 2026-10-31 por búsqueda restringida a los dominios oficiales de OpenAI; el propietario debe confirmarlas leyendo la página oficial (https://developers.openai.com/api/docs/pricing).

## Antes de configurar Preview: comprobar que no conecta a la base productiva
1. El script de ensayo **no** se conecta a Supabase ni al corpus (una prueba lo impide).
2. Pero la app en Preview sí usa `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` de **Preview**. Para saber a qué base apuntan sin ver secretos, abrir en un deployment Preview `GET /api/diagnostico-preview` (responde solo en Preview, redacta el ref). El veredicto debe ser `esStagingEsperado: true` y `esProduccionConocida: false` (staging `aicakncgtuiiuomflkqj`; producción `thgrhueckkjdutjvcufp`).
3. Si `esProduccionConocida` es `true`, **no** definir las variables de Luna en Preview hasta separar Preview de la base productiva (acción del propietario en el panel de Vercel).

## Procedimiento (cada paso lo autoriza el propietario por separado)
| # | Acción | Autoriza |
|---|---|---|
| A1 | Confirmar las tarifas en la página oficial y fijar el límite de gasto del panel de OpenAI | Propietario |
| A2 | Crear una clave de **prueba** de OpenAI (solo para esto; nunca la de producción) | Propietario |
| A3 | Comprobación **gratuita** de modelos: `OPENAI_API_KEY=<prueba> LUNA_VERIFY_CONFIRM=SI_FREDY_LISTA npx tsx scripts/luna-verify-model.ts --list-models --model gpt-6-luna` — solo `GET /v1/models`, cero tokens. Sale con 0 si el ID está en la cuenta y con 1 si no (en ese caso se detiene aquí). | Propietario |
| A4 | **Ensayo sintético pagado** (autorización aparte, solo si A3 listó el modelo): `OPENAI_API_KEY=<prueba> LUNA_VERIFY_CONFIRM=SI_FREDY LUNA_VERIFY_MAX_USD=0.05 npx tsx scripts/luna-verify-model.ts --model gpt-6-luna`. Revisar primero el «PLAN DEL ENSAYO» que imprime. | Propietario |
| A5 | Autorizar el aviso de privacidad y la decisión sobre enviar texto de normas PRIMARY al proveedor | Propietario o delegado jurídico |
| A6 | Variables solo en Preview: `OPENAI_API_KEY` (prueba), `LUNA_ENABLED=1`, `LUNA_COST_COUNTER=local_canary_only`, `LUNA_PREVIEW_BUDGET_USD=0.05` | Propietario |
| A7 | Insertar `flag_luna_responses` con `enabled=true` y `allowed_emails` = solo el correo del canario | Propietario |

## Reversión inmediata
1. `enabled=false` en `flag_luna_responses` → corta Luna en la solicitud siguiente, sin redeploy.
2. Quitar `LUNA_ENABLED` en Preview (corte global; requiere redeploy).
3. Revocar la clave de prueba en el panel del proveedor.
No hay migraciones ni datos que limpiar.

## Lo que NO se hace
Ingesta o cambios al corpus; DDL del contador global (decisión aparte); activar en producción; usar la clave de producción; consultas con datos reales.
