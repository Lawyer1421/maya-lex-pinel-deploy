# MAYA LEX V2 — Accesibilidad tras la remediación

**Fecha:** 2026-07-29 · **Rama:** `feature/mayalex-v2-accelerated-relaunch`
**Método:** axe-core real (`@axe-core/playwright`, Chromium) sobre las **16 páginas públicas** del build de producción local, más verificación de contraste computada.

## 1. Correcciones aplicadas

### Contraste de los CTA primarios (antes: axe `color-contrast`, serious)

| Estado | Fondo | Contraste con texto blanco | Veredicto WCAG AA (texto normal, ≥4.5:1) |
|---|---|---|---|
| Anterior | jade `#2D9B8A` | 3.41:1 | ✗ |
| **Nuevo (base)** | jade-deep `#17796A` | **5.28:1** | ✓ |
| **Nuevo (hover)** | jade-dark `#1E6B5E` | **6.33:1** | ✓ |

La identidad visual se conserva (mismo tono jade, un paso más profundo). Alcance: todos los CTA blanco-sobre-jade del ámbito V2 (nav, hero, secciones, demo, plantilla de marketing). Los componentes V1 del chat quedaron intactos. El texto jade sobre obsidiana (enlaces/acentos) ya cumplía: `#3DB8A5` sobre `#08070B` = 8.22:1.

### Orden de encabezados en /pricing (antes: axe `heading-order`, moderate)

`TarjetaPlan` acepta ahora `nivelTitulo` (`'h2' | 'h3'`, default `h3`): en la portada las tarjetas siguen bajo el h2 de sección (h3 correcto); en `/pricing` cuelgan del h1 y usan h2. Las 13 páginas nuevas nacen con jerarquía h1 → h2 → h3 correcta por plantilla.

## 2. Resultado de axe en las 16 páginas

**0 violaciones** (de cualquier severidad) en: `/`, `/demo`, `/pricing`, `/producto`, `/herramientas`, `/cobertura-juridica`, `/seguridad`, `/fundador`, `/recursos` y los 7 perfiles de `/soluciones/*`. Datos crudos en `artifacts/mayalex-v2-remediacion/qa-16-resumen.json`.

## 3. Verificado manualmente (se mantiene de la fase anterior + plantilla nueva)

- Hamburguesa móvil con `aria-label` y `aria-expanded` alternante; dropdown Soluciones con `aria-haspopup`/`aria-expanded`.
- FAQ operable por teclado con `aria-expanded` + `aria-controls`.
- Anillos de foco visibles (`focus-visible:ring-jade`) en toda la plantilla nueva.
- `lang="es"`, landmarks (`header/nav/main/footer`), un solo h1 por página (verificado programáticamente en las 16).
- Botones de plan deshabilitados con atributo nativo `disabled`.

## 4. Límite explícito

**Este informe no afirma cumplimiento completo de WCAG 2.1 AA.** axe detecta una fracción de las barreras reales; queda en backlog la prueba con lectores de pantalla (NVDA/VoiceOver) y usuarios reales antes del lanzamiento público. Lo que sí se afirma: cero violaciones detectables por axe en las 16 páginas, contraste de CTA verificado por cálculo, y operabilidad por teclado verificada con teclado real.

## 5. Pendientes P2 (fuera del alcance autorizado de esta iteración)

- Tap targets del footer en móvil (Lighthouse `tap-targets` parcial) — mejora de espaciado pendiente.
- Desborde de 8px de "Personalizado" en tarjetas Bufete/Universidad en /pricing desktop.
