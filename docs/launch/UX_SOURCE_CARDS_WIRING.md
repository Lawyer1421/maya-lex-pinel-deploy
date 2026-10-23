# UX_SOURCE_CARDS_WIRING

## Estado
Las citas **ya llegan al cliente**: `app/api/chat/route.ts` emite `citas` en el evento SSE `done` (`construirCitas`), `components/ChatInterface.tsx` las guarda por mensaje y `components/MessageBubble.tsx` las pinta. Por eso el cableado mínimo no toca `route.ts` ni el streaming.

## Qué se cableó
- `components/MessageBubble.tsx`: bandera de cliente `NEXT_PUBLIC_MAYALEX_SOURCE_CARDS` (**default OFF**). Apagada: el markup de citas es exactamente el anterior. Encendida: se muestra `AnswerPanel` (fundamento legal, vigencia y versión, advertencias, normativa relacionada, análisis profundo). El texto de la respuesta no cambia en ningún caso.
- `lib/legal-os/ux/source-cards.ts` (vista pura) · `components/legal/SourceCard.tsx` · `components/legal/AnswerPanel.tsx`.

## Reglas de presentación
- Vigencia solo desde la bandera existente: `true` → «Norma vigente HN»; `null`/ausente → «Vigencia no verificada» (con advertencia); `false` → «No vigente». Nunca «vigente» sin la bandera.
- Doctrina (`FUENTES_DOCTRINALES`) → «Doctrina — no vinculante». Hoy `construirCitas` ya la excluye de `citas`; el panel la rotularía si algún día llegara.
- El enlace «Ver en la fuente oficial» solo aparece si la URL pasa `esFuenteOficial` (host verificado, https). Hoy `Cita` no trae URL, Gaceta ni sentencias: esas tarjetas existen en el modelo pero no se alimentan hasta que el servidor las envíe.

## Límites y pendientes
1. `Cita` solo contiene artículo, texto (≤600), fuente, `vigente` (siempre `true`) y hash. Para mostrar versión, Gaceta, URL oficial o sentencias hay que ampliar el payload del evento `done` (campos opcionales, aditivos) — cambio de servidor que requiere su propia revisión.
2. La bandera `NEXT_PUBLIC_*` es de compilación (Vercel): activar = cambiar una variable de entorno y redesplegar, **decisión de Fredy**; no se cambió ninguna variable.
3. «Análisis profundo» solo muestra un rótulo; la capacidad depende del plan (entitlements, 21 celdas sin definir) y del modelo profundo, no verificado.
4. Accesibilidad: `details/summary` nativos, anillos de foco `focus-visible:ring-jade`, regiones con `aria-label`. Sin auditoría axe de esta pantalla todavía (el informe V2 cubrió solo las páginas públicas).
