# MAYA LEX V2 — Sistema de diseño

"Biblioteca jurídica premium + centro de inteligencia + tecnología hondureña moderna."

## 1. Paleta (extiende `tailwind.config.ts`, no reemplaza la V1 en uso en `/chat`)

| Token | Hex | Uso |
|---|---|---|
| `obsidian` | `#08070B` | Fondo de página principal V2 (reemplaza el `navy` plano en portada/demo/precios) |
| `obsidian-light` | `#121019` | Superficies elevadas (tarjetas, nav) |
| `obsidian-medium` | `#1B1826` | Bordes sutiles, divisores |
| `navy` (V1) | `#0D1B3E` | Acentos de profundidad, degradados de fondo |
| `ivory` | `#F6F2E9` | Texto principal sobre fondo oscuro, tarjetas claras puntuales |
| `ivory-dim` | `#E9E2D2` | Texto secundario |
| `gold` (V1) | `#C9A84C` | Acento **moderado** — solo en detalles puntuales (línea, ícono, badge), nunca como fondo grande |
| `jade` (V1) | `#2D9B8A` | Acento principal — CTAs, enlaces activos |
| `verify` | `#3FAE68` | Exclusivo para indicadores de estado de verificación (V4/V5, "verificado") — nunca decorativo |

Regla explícita: **el dorado se usa con moderación** — bordes finos, un ícono, un subrayado — nunca como color de fondo de sección completa (evita "dorado excesivo").

## 2. Tipografía

- Títulos editoriales: `font-serif` (Merriweather, ya cargada) — tamaños grandes, peso 700, tracking ajustado.
- Interfaz: `font-sans` (Inter, ya cargada) — cuerpo de texto, navegación, botones.
- Sin fuentes nuevas — cero peticiones adicionales a Google Fonts.

## 3. Componentes nuevos (`components/v2/`)

- `NavV2.tsx` — navegación premium con dropdown de Soluciones, sticky, fondo `obsidian/80` con blur.
- `HeroV2.tsx` — título editorial + descripción + 3 CTA.
- `SeccionHerramientas.tsx` — grid de tarjetas de herramientas.
- `SeccionPerfiles.tsx` — grid de 7 tarjetas de perfil.
- `SeccionBancoJuridico.tsx` — presentación honesta del corpus.
- `SeccionSeguridad.tsx` — bullets de seguridad verificables.
- `SeccionFundador.tsx` — nota del fundador.
- `SeccionPreciosResumen.tsx` — resumen de 5 planes (usado en portada, distinto de la tabla completa en `/pricing`).
- `FAQV2.tsx` — acordeón de preguntas frecuentes, accesible por teclado.
- `FooterV2.tsx` — footer profesional.
- `TarjetaPlan.tsx` — tarjeta de plan individual (reutilizada en portada y `/pricing`).
- `BadgeVerificacion.tsx` — badge reutilizable V0-V5 (usa el token `verify`).

## 4. Principios visuales explícitos

- **Evitar**: iconografía de balanza/mazo/columnas repetida más de una vez en toda la página; fondos con gradientes saturados de esquina a esquina; animaciones de más de 300ms; cualquier afirmación como "100% actualizado" o "garantiza resultados".
- **Usar**: mobile-first (diseñar el layout de 375px primero, expandir con `sm:`/`md:`/`lg:`); animaciones ligeras (`fade-in`/`slide-up`, ya definidas en `tailwind.config.ts`, ≤300ms); contraste verificado (texto `ivory` sobre `obsidian` ≥ 12:1); foco de teclado visible en todos los elementos interactivos (`focus-visible:ring-2 focus-visible:ring-jade`).

## 5. Accesibilidad (aplicada, no solo declarada)

- Todo botón/enlace interactivo con `focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian`.
- Encabezados en orden jerárquico correcto (un solo `<h1>` por página).
- Acordeón de FAQ con `<button aria-expanded>` real, no solo CSS.
- Imágenes/iconos decorativos con `aria-hidden="true"`; iconos con significado con `aria-label`.
- Sin texto exclusivamente en color para transmitir estado (siempre + ícono o palabra).
