# MAYA LEX V2 — Determinismo del build de rutas jurídicas

**Fecha:** 2026-07-28 · **Rama:** `feature/mayalex-v2-accelerated-relaunch`

## 1. El problema (incidente real, reproducido)

Durante el QA del Preview V2 se observó un build frío que **completó "exitosamente" con 0 páginas `/leyes`** (204 HTML en vez de 402). En el reintento inmediato, el mismo commit produjo las 402 páginas. El incidente ocurrió **fuera de OneDrive**, en un checkout limpio en `C:\dev` — lo que descartó la hipótesis previa de que la flakiness era exclusiva del proveedor de archivos de OneDrive.

**Causa raíz** (en `lib/seo/articulos-vigentes.ts`, versión anterior):

```ts
const { data, error } = await supabase.from('biblioteca_vectores')...
if (error || !data) return [];   // ← error transitorio de red = lista vacía SILENCIOSA
```

`generateStaticParams` de `/leyes/[articulo]` y `/consultas/[slug]` consumían esa lista: un fallo transitorio de la consulta a Supabase durante el build se convertía en "no hay artículos", y Next.js generaba felizmente un sitio incompleto sin ningún error.

## 2. La solución (3 capas)

### Capa 1 — Lista de rutas desde manifest local versionado (opción preferente)

`listarNumerosArticulo()` ya no consulta la red: lee `data/corpus-editorial-status.json`, el manifest editorial versionado en git que ya era la fuente de verdad para noindex/sitemap (198 artículos auditados). La lista de rutas es ahora **determinista por construcción** — el mismo commit produce siempre las mismas 198+198 rutas, en local y en Vercel, con o sin red.

### Capa 2 — Contenido con timeout, reintentos y fallo duro

El **contenido** de cada artículo sigue viniendo de Supabase en build/ISR. `obtenerArticuloPorNumero()` ahora:

- aplica **timeout explícito de 15 s** por consulta;
- **reintenta hasta 3 veces** con backoff (750 ms × intento);
- registra cada fallo con **logging sanitizado** (número de artículo, intento y código de error — nunca claves, URLs ni contenido);
- distingue **"sin fila" (legítimo — p. ej. Preview contra staging vacío) → `null`** de **"error persistente" → `throw`**: un error real tras 3 intentos **rompe el build de forma visible** en vez de degradarlo en silencio.

### Capa 3 — Verificación dura del conteo (postbuild)

`scripts/verificar-conteo-build.mjs` corre automáticamente vía el script npm `postbuild` (local **y** Vercel — npm ejecuta `postbuild` tras `build` en ambos):

- exige exactamente **198 HTML en `/leyes`** y **198 en `/consultas`** (el conteo se deriva del propio manifest, no de una constante duplicada);
- exige la presencia de las **16 páginas públicas estáticas** (portada, demo, pricing, 6 de producto, 7 de soluciones);
- si falta cualquier cosa: **exit 1 → build fallido**.

Además, `tests/build-determinism.test.ts` (4 pruebas) verifica en CI que la lista sale del manifest, tiene 198 entradas, es estable entre llamadas y produce slugs reversibles — **sin variables de entorno de Supabase**, de modo que cualquier regresión que reintroduzca dependencia de red falla de inmediato.

## 3. Resultado: tres builds fríos consecutivos

Cada build desde el mismo checkout limpio (`C:\dev\mayalex-qa`, fuera de OneDrive), con `rm -rf .next` previo (caché de páginas eliminada por completo):

| Build | Resultado del postbuild | Páginas |
|---|---|---|
| #1 | ✓ `198 /leyes + 198 /consultas + 16 estáticas públicas` | 428/428 generadas |
| #2 | ✓ `198 /leyes + 198 /consultas + 16 estáticas públicas` | 428/428 generadas |
| #3 | ✓ `198 /leyes + 198 /consultas + 16 estáticas públicas` | 428/428 generadas |

Los tres builds produjeron **exactamente el mismo conteo**. (El total de páginas del generador de Next subió de 415 a 428 por las 13 rutas públicas nuevas de esta iteración.)

## 4. Comportamiento esperado por entorno

| Entorno | Lista de rutas | Contenido | Si Supabase falla |
|---|---|---|---|
| Build local | manifest (198+198) | Supabase con retry/timeout | build FALLA (visible) |
| Build Vercel (Preview/Prod) | manifest (198+198) | Supabase con retry/timeout | build FALLA (visible) |
| Preview vs staging vacío | manifest (198+198) | sin filas → páginas "no encontrado" | n/a (no es error) |
| ISR en runtime (revalidate 1d) | n/a | Supabase con retry/timeout | se conserva la página anterior |

## 4b. El fallo duro funcionando en el mundo real (evidencia)

El primer build de Vercel con este mecanismo **falló a propósito** — y ese fallo destapó que la credencial Supabase del ámbito Preview era inválida desde su creación (primero un carácter de whitespace en el valor, luego `Invalid API key`), algo que el código anterior convertía silenciosamente en páginas "no encontrado". Es exactamente el comportamiento diseñado: un entorno roto ahora produce un build rojo y un log accionable, no un sitio degradado. Detalle completo en `MAYALEX_V2_PREVIEW_ENV_VERIFIED.md`.

## 5. Credenciales

Ninguna credencial se imprime en logs ni se incorpora al manifest. El manifest contiene únicamente números de artículo y estados editoriales (`contaminado`/`limpio` + motivo), datos ya públicos en el propio sitio.
