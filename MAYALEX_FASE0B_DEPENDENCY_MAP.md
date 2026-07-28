# Grafo de dependencias `src/` ↔ código rastreado

## Quién importa desde `src/` (verificado con grep, no inferido)

```
lib/supabase.ts (modificado)            → @/src/lib/supabase/browser, @/src/lib/supabase/admin
lib/supabase-browser.ts (modificado)    → @/src/lib/supabase/browser
lib/supabase-ssr.ts (modificado)        → @/src/lib/supabase/server
components/ChatInterface.tsx (mod.)     → @/src/components/shared/StreamConsole
app/pricing/PricingCheckoutPanel.tsx    → @/src/components/billing/MultiCheckout
  (no rastreado)                        → @/src/components/billing/CheckoutModal
```

## Cadena transitiva completa

```
lib/supabase.ts, lib/supabase-browser.ts, lib/supabase-ssr.ts
  └─ requieren: src/lib/supabase/{admin,browser,server}.ts

components/ChatInterface.tsx
  └─ requiere: src/components/shared/StreamConsole.tsx
       └─ requiere: src/hooks/useAlertsSocket.ts

app/pricing/PricingCheckoutPanel.tsx (no rastreado, pero ya escrito)
  └─ requiere: src/components/billing/{MultiCheckout,CheckoutModal}.tsx
       └─ MultiCheckout requiere: src/components/billing/BankTransferModal.tsx
       └─ CheckoutModal requiere: lib/supabase-browser (tracked) + app/components/PayPalSubscribeButton (tracked)
       └─ ambos llaman a: /api/v1/billing/pixelpay/checkout (src/app/api/v1/billing/pixelpay/checkout/route.ts)
       └─ CheckoutModal también llama a: /api/billing/manual-transfer (src/app/api/billing/manual-transfer/route.ts)

src/modules/ai-agents/core/auditor.ts
  └─ sin ninguna ruta API tracked ni no-tracked que lo invoque hoy — aislado
```

## Rutas / APIs / funciones que dependen de `src/`

- **Ninguna ruta API commiteada en `main`** depende de `src/` — confirmado, `app/api/**` (todo tracked) no importa nada de `src/`.
- **Ninguna función de autenticación commiteada** depende de `src/` — `lib/rate-limit.ts`, `app/auth/callback/route.ts` no lo importan.
- **Ninguna función de RAG** depende de `src/` — `lib/rag/search.ts`, `lib/rag/embed.ts` no lo importan.
- **Ninguna función de pagos ya commiteada** (PayPal: `lib/paypal/*`, `app/api/paypal/*`) depende de `src/` — son sistemas completamente separados; PixelPay en `src/` es una integración de pagos *alterna*, no una dependencia del sistema PayPal ya funcional.
- **Los únicos consumidores reales están en el working tree local, sin commitear**: los 3 archivos `lib/supabase*.ts` modificados y `components/ChatInterface.tsx` modificado.

## Respuestas a las 5 preguntas de la Fase B

1. **¿El commit inicial (`0a56272`) puede compilar sin esos archivos?** **Sí, confirmado** — la versión de `lib/supabase.ts`, `lib/supabase-browser.ts`, `lib/supabase-ssr.ts` y `components/ChatInterface.tsx` tal como existen en el commit `0a56272` son autocontenidas (usan `@supabase/supabase-js`/`@supabase/ssr` directamente, sin pasar por `src/`). Prueba directa: el deployment `g8g8rrnb5` se construyó exitosamente en Vercel sin que `src/` existiera en el repositorio remoto.
2. **¿El deployment probablemente necesita esos archivos?** No para el deployment YA realizado. **Sí, obligatoriamente**, en el momento en que los cambios locales actuales de `lib/supabase*.ts` y `ChatInterface.tsx` se commiteen y desplieguen — en ese momento el build fallaría sin `src/lib/supabase/*` y `src/components/shared/StreamConsole.tsx` + `src/hooks/useAlertsSocket.ts`.
3. **¿Son los archivos parte esencial de la aplicación?** Parcialmente: 5 de 13 son esenciales para que el refactor en curso funcione; los otros 8 (billing PixelPay/transferencia, ai-agents/auditor) son funcionalidad nueva no esencial para lo que hoy está en producción.
4. **¿Existen versiones equivalentes en otra carpeta?** Sí — las versiones COMMITEADAS (HEAD) de `lib/supabase.ts`, `lib/supabase-browser.ts`, `lib/supabase-ssr.ts` son las versiones "equivalentes" autocontenidas que las versiones modificadas en `src/` están reemplazando.
5. **¿Hay duplicación o migración incompleta de estructura?** **Sí, confirmado** — es una migración en curso, no terminada, moviendo la lógica de cliente de Supabase de `lib/` hacia `src/lib/supabase/`, y agregando nueva UI de checkout/monitoreo bajo `src/components/`. El estado actual es una duplicación funcional intencional a mitad de camino: `lib/supabase.ts` (HEAD) todavía funciona de forma autónoma, mientras la versión modificada en disco ya depende de la nueva ubicación.
