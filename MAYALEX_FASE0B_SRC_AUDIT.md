# Auditoría de `src/` — 13 archivos

Ver `MAYALEX_FASE0B_SRC_INVENTORY.csv` para la tabla completa. Este documento resume los hallazgos y el veredicto.

## Verificaciones de seguridad (todas realizadas, ninguna mostró valores)

- ❌ **Secretos**: no encontrados. Todos los archivos leen credenciales exclusivamente vía `process.env.*` con manejo explícito de ausencia (error o fallback `'demo-key'`/`'demo-secret'`) — ningún valor real hardcodeado.
- ❌ **Datos de clientes / PII**: no encontrados.
- ❌ **Dumps / backups**: no encontrados.
- ❌ **Archivos de compilación**: no encontrados — los 13 son código fuente `.ts`/`.tsx` legítimo, ninguno tiene aspecto de artefacto generado.
- ❌ **Credenciales embebidas**: no encontradas.
- ❌ **URLs con tokens**: no encontradas.
- ❌ **Claves privadas**: no encontradas.
- ❌ **Logs con información sensible**: no aplica, ninguno de estos archivos es un log.

## Hallazgo #1 (crítico para el veredicto de Fase A): `src/` NO es código abandonado

Corrección respecto a auditorías previas de esta misma sesión, que habían clasificado `src/` como "posible trabajo experimental abandonado, decidir después". Verificado ahora con `grep` sobre el código actualmente rastreado:

- `lib/supabase.ts` (modificado, no commiteado) **importa directamente** de `@/src/lib/supabase/browser` y `@/src/lib/supabase/admin`.
- `lib/supabase-browser.ts` (modificado) es ahora **solo un re-export** de `@/src/lib/supabase/browser`.
- `lib/supabase-ssr.ts` (modificado) es ahora **solo un re-export** de `@/src/lib/supabase/server`.
- `components/ChatInterface.tsx` (modificado) importa `StreamConsole` desde `@/src/components/shared/StreamConsole`.
- `app/pricing/PricingCheckoutPanel.tsx` (nuevo, no rastreado) importa `MultiCheckout` y `CheckoutModal` desde `@/src/components/billing/*`.

**Conclusión**: 3 de los 13 archivos de `src/` (`lib/supabase/{admin,browser,server}.ts`) y 1 más (`components/shared/StreamConsole.tsx`, vía `hooks/useAlertsSocket.ts`) son **dependencias activas y obligatorias** del código ya modificado en el árbol de trabajo. Si esos 4 archivos (+1 dependencia transitiva) se perdieran, el trabajo en curso en `lib/supabase.ts`, `lib/supabase-browser.ts`, `lib/supabase-ssr.ts` y `components/ChatInterface.tsx` dejaría de compilar inmediatamente.

Los otros 8 archivos (todo el árbol `billing/` de PixelPay/transferencia bancaria, y `modules/ai-agents/core/auditor.ts`) son código funcional legítimo pero **sin ningún punto de entrada tracked que los use hoy**, salvo `app/pricing/PricingCheckoutPanel.tsx` (también sin rastrear) que sí conecta `MultiCheckout`/`CheckoutModal`.

## Hallazgo #2: la ruta de webhook de PixelPay no verifica firma

`src/app/api/v1/billing/pixelpay/webhook/route.ts` procesa el body de la petición (`body.status === 'approved'`) y activa un plan **sin verificar ninguna firma criptográfica de PixelPay**. Si esta ruta llegara a activarse en producción tal cual está, cualquiera podría enviar una petición POST falsificada y activar un plan de pago sin haber pagado. Esto debe corregirse antes de cualquier activación — no es un hallazgo de "revisar", es un bloqueador de seguridad si se decide usar PixelPay.

## Hallazgo #3: datos bancarios con patrón de placeholder

`CheckoutModal.tsx` y `BankTransferModal.tsx` muestran números de cuenta bancaria (Ficohsa/BAC/Atlántida) con un patrón claramente secuencial (`01-234-567890`, `02-345-678901`, `03-456-789012`) — consistente con datos de ejemplo, no con cuentas reales verificadas. **No confirmado de forma definitiva sin que el propietario lo verifique** — se recomienda no activar públicamente ninguno de estos componentes hasta que se confirmen o reemplacen por cuentas reales.

## Veredicto de clasificación (solicitado en Fase A)

| Archivo | Clasificación |
|---|---|
| `src/lib/supabase/admin.ts`, `browser.ts`, `server.ts` | Código fuente legítimo, **dependencia activa** |
| `src/components/shared/StreamConsole.tsx`, `src/hooks/useAlertsSocket.ts` | Código fuente legítimo, **dependencia activa transitiva** |
| `src/components/billing/*` (3 archivos) | Código fuente legítimo, **funcional pero no activado** (requiere decisión de producto + corrección de seguridad del webhook) |
| `src/app/api/v1/billing/pixelpay/*`, `src/app/api/billing/manual-transfer/route.ts` | Código fuente legítimo, **funcional pero con gaps de seguridad que deben cerrarse antes de activar** |
| `src/modules/ai-agents/core/auditor.ts` | Código fuente legítimo, **completo pero sin punto de entrada conectado** — backlog de producto |

**Ninguno de los 13 archivos es generado, temporal, duplicado ni obsoleto.** Todos son código fuente intencional escrito para este proyecto.
