# MAYA LEX V2 — Resultados de pruebas (portada, demo, precios)

Rama: `feature/mayalex-v2-accelerated-relaunch` · commit `ff4c729a4ead582477cf6ec2a1bfb81b9f1736ba` · worktree: `C:\dev\mayalex-v2` (fuera de OneDrive).

## 1. Typecheck

```
npx tsc --noEmit
TSC_EXIT=0
```
0 errores.

## 2. Tests

```
Test Files  21 passed (21)
Tests       162 passed | 1 skipped (163)
```
Ninguna prueba existente se rompió. No se agregaron pruebas unitarias nuevas para los componentes `v2/` en esta sesión (contenido principalmente presentacional) — queda como recomendación para la siguiente fase, especialmente para `DemoInteractiva.tsx` (lógica de selección de estado).

## 3. Build

```
✓ Generating static pages using 15 workers (415/415)
```
415 páginas, sin errores. `/`, `/demo` y `/pricing` compilan como contenido estático (`○`).

## 4. Verificación manual (navegador real, `next start` — build de producción)

| Prueba | Resultado |
|---|---|
| `/` responde 200, título correcto | ✅ |
| `/demo` responde 200, título correcto | ✅ |
| `/pricing` responde 200, título correcto | ✅ |
| Desktop (1274px viewport): sin overflow horizontal (`scrollWidth === clientWidth`) | ✅ |
| Móvil (375px viewport): sin overflow horizontal en `/` y `/demo` | ✅ |
| Demo interactiva: clic en escenario muestra los 7 campos + aviso de estado de verificación | ✅ (verificado con `next start`, no solo `next dev`) |
| Precios: los 5 botones de plan tienen `disabled === true` | ✅ |
| Precios: 0 scripts de PayPal cargados en la página | ✅ |
| FAQ (portada y precios): `aria-expanded` cambia correctamente al hacer clic | ✅ |
| Navegación: enlaces del nav apuntan a las rutas correctas (`/demo`, `/pricing`, `/soluciones/*`, etc.) | ✅ (rutas de fases futuras aún no existen — enlaces preparados, no rotos intencionalmente hoy) |

## 5. Capturas de pantalla — limitación honesta

**No se pudieron generar capturas de pantalla en esta sesión.** El panel de navegador de este entorno no pudo componer/renderizar una captura visual (`screenshot failed: the Browser pane is not displayed`) — es una limitación del entorno de esta sesión, no del código. En su lugar, se verificó el contenido y el comportamiento mediante:
- Extracción de texto renderizado (`get_page_text`) confirmando el contenido exacto de cada sección.
- Inspección de DOM y CSS computado vía JavaScript (dimensiones de scroll, atributos `disabled`/`aria-expanded`).
- Interacción real (clics) confirmando el comportamiento dinámico.

Se recomienda que el propio usuario abra `http://localhost:3200` (o el Preview de Vercel una vez listo) en su navegador local para la revisión visual final — el código está listo para esa revisión.

## 6. Confirmaciones de alcance

- 0 secretos expuestos (mismo `.env.local` local ya usado en fases previas, nunca commiteado).
- 0 PII — la demo usa exclusivamente datos ficticios (`app/demo/casos-mock.ts`).
- 0 llamadas a PayPal live — verificado, ningún script de PayPal se carga en `/pricing`.
- 0 modificaciones a producción — todo el trabajo vive en `feature/mayalex-v2-accelerated-relaunch`, sin mezclar con `main`.
