# Piloto de Luna en Preview — acciones que requieren autorización del propietario

**Estado: PREPARACIÓN. Nada de esto se ha ejecutado.** Luna sigue apagada (sin `LUNA_ENABLED`, sin credencial OpenAI, sin fila `flag_luna_responses`, DDL del contador sin aplicar). Producción no se toca: `LUNA_ALLOW_PRODUCTION` no se define nunca en este piloto.

## Presupuesto
- **Ensayo del modelo (`scripts/luna-verify-model.ts`):** tope duro USD 0.05. Peor caso calculado del plan de 3 llamadas: ≈ USD 0.004 (tarifas del repositorio, vencidas el 2026-10-30: revalidar). El script imprime el plan antes de cualquier llamada y se detiene si el peor caso no cabe en el tope, si el modelo no tiene tarifa o si `LUNA_VERIFY_MAX_USD` es inválido o mayor que el tope.
- **Piloto Preview:** tope diario USD 0.05 por plan (`LUNA_PREVIEW_BUDGET_USD`, límite impuesto por el código en Preview).

## Acciones (cada una la autoriza quien se indica; ninguna la ejecuta el agente por su cuenta)
| # | Acción | Autoriza |
|---|---|---|
| A1 | Revalidar tarifas en https://developers.openai.com/api/docs/pricing y actualizar `shadow-model-config.ts` (PR aparte) | Fredy |
| A2 | Crear una clave de **prueba** de OpenAI con límite de gasto mensual bajo en el panel del proveedor. Nunca la de producción. | Fredy |
| A3 | Ejecutar el ensayo desde una terminal propia: `OPENAI_API_KEY=<clave de prueba> LUNA_VERIFY_CONFIRM=SI_FREDY LUNA_VERIFY_MAX_USD=0.05 npx tsx scripts/luna-verify-model.ts --model <id>`. Primero revisar el «PLAN DEL ENSAYO» y la lista `modelosLunaEnCuenta`; si el id no aparece, **no** asumir `gpt-6-luna`: usar el id que liste la cuenta (y registrar su tarifa, A1). | Fredy |
| A4 | Aprobar por escrito el aviso `AVISO_LUNA_BORRADOR.md` (versión `2026-10-29.v1`) y, solo entonces, cambiar `AVISO_LUNA_APROBADO_POR_CLO` a `true` en un PR revisado | CLO |
| A5 | Decidir si el clasificador PRIMARY basta para enviar texto de normas al proveedor | CLO |
| A6 | Variables **solo en Preview**: `OPENAI_API_KEY` (clave de prueba), `LUNA_ENABLED=1`, `LUNA_COST_COUNTER=local_canary_only`, `LUNA_PREVIEW_BUDGET_USD=0.05` | Fredy |
| A7 | Insertar `flag_luna_responses` con `enabled=true` y `allowed_emails` = solo el correo del canario (una fila en `feature_flags`; es escritura de datos) | Fredy |

## Reversión inmediata
1. `enabled=false` en `flag_luna_responses` → corta Luna en la solicitud siguiente, sin redeploy.
2. Quitar `LUNA_ENABLED` en Preview (corte global; requiere redeploy).
3. Revocar la clave de prueba en el panel del proveedor.
No hay migraciones ni datos que limpiar.

## Lo que NO se hace
Ingesta o cambios al corpus; DDL del contador global (requiere decisión aparte); activar en producción; usar la clave de producción; consultas con datos reales.
