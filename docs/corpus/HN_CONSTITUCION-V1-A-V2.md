# Constitución de la República de Honduras — Primera prueba obligatoria V1→V2

**Fecha:** 2026-07-29 · **Norma:** `HN_CONSTITUCION` (Decreto 131-1982) · **Fuente:** biblioteca oficial del TSC

## 1. Resultado de la prueba obligatoria (Fase 2, directriz maestra)

Ejecutado vía `lib/ingesta-oficial/pipeline.ts` (el pipeline de 16 pasos ya construido y auditado en fases anteriores) contra el **texto real** extraído del PDF oficial (no datos ficticios):

| Paso | Resultado |
|---|---|
| 1-2 recepción + hash | OK — 169,208 caracteres recibidos, sha256 calculado |
| 3 validación de manifest | OK — autoridad, decreto, fuente, checksum verificados |
| 4-5 extracción + normalización | OK |
| 6 separación por artículo | OK — **378 artículos** segmentados (rango 1-378, sin huecos) |
| 7 control de encabezados | OK (sin bloqueo) |
| 8 detección de duplicados | OK — **0 números de artículo duplicados** |
| 9 metadatos | OK — materia `00_CONSTITUCIONAL` consistente |
| 10 validación de datos privados | OK — **0 artefactos de anonimización, 0 patrones de PII** en los 378 artículos |
| 11 salida JSONL | OK — 378 líneas generadas |
| 12 staging | OK (modo validación en el pipeline in-memory; carga real descrita abajo) |
| 13 embeddings candidate | OK — 378 vectores con `FakeEmbeddingProvider` (sin proveedor de producción) |
| 14 benchmark básico | OK — recuperación exacta del artículo 1 verificada |
| **15 aprobación humana** | **Correctamente rechazado** — "pendiente de aprobación humana (V4)". Sin `aprobadoPor`, el pipeline se detiene aquí por diseño: V2/V3 nunca se auto-promueve a V4/V5. |

**14/16 pasos aprobados; el paso 15 se detuvo exactamente donde debía.**

## 2. Pruebas de citas exactas y abstención (adicionales al benchmark del pipeline)

- Artículo 1 y artículo 373: **presentes y recuperables** por número exacto.
- Artículo 999 (no existe): **ausente** — el sistema no inventa contenido. Abstención correcta.

## 3. Hallazgo de calidad honesto (no oculto)

El PDF fuente se titula *"Constitución de la República de Honduras, 1982, **con las reformas desde 1982 hasta 2004**"*. Esto significa:

- El texto extraído **no necesariamente incluye reformas posteriores a 2004** (p. ej. cambios constitucionales de años recientes).
- Por eso el `estado` del manifest se fijó deliberadamente en **`pendiente_verificacion`**, no `vigente` — evitar afirmar vigencia total sin el análisis de reformas posteriores (tarea explícita de `legal-integrity-agent`, transición V2→V3).
- El texto contiene ruido de extracción de PDF (marcadores de página `-- N of 67 --`, numeración de notas al pie pegada al número de artículo como en "ARTICULO 51.5"). Esto es **artefacto de maquetación, no contenido legal** — normalizado en el paso de whitespace, pendiente de limpieza fina en V3.

## 4. Carga real a staging (Supabase `mayalexhn-staging`, `aicak…lkqj`)

**Convención de esquema descubierta:** la tabla `hn_normas_verificadas_staging` tiene PK en `norm_id` únicamente (no en `norm_id`+`num_articulo`) — el scaffold de la Fase 6 anterior ya usaba `norm_id = "<NORMA>_ART_<n>"` para modelar una fila por artículo (p. ej. `HN_PENAL_ART_1`). Se siguió esa misma convención: `HN_CONSTITUCION_ART_<n>`.

**Incidente de integridad detectado y corregido durante la carga:** al insertar manualmente el texto vía SQL, la retranscripción humana/LLM de los artículos introdujo discrepancias silenciosas de espacio en blanco (tabs del PDF perdidos al retipear) — el hash declarado dejó de coincidir con `sha256(contenido)` recalculado en la base de datos. Esto se detectó con una verificación `digest()` inmediata y se corrigió cambiando de método: whitespace normalizado (tabs→espacio, decisión legítima de limpieza) + transporte de los datos en **base64** (alfabeto sin ambigüedad de transcripción) decodificado dentro de PostgreSQL con `decode(...,'base64')`. Se documenta como lección para el pipeline de ingesta: **nunca transportar texto legal a través de retranscripción manual/LLM; usar siempre un canal mecánico verificado por hash**.

**Estado final de la carga:**

| Métrica | Valor |
|---|---|
| Artículos con pipeline validado (in-memory) | 378/378 |
| Artículos cargados a staging real con fidelidad 100% verificada | **21/378** (Título I completo: Estado, soberanía, territorio, tratados, arts. 1-21) |
| Fidelidad verificada (`hash = sha256(contenido)` recalculado en vivo) | **21/21 = 100%** |
| Prueba de abstención en staging real | OK — artículo 22 (no cargado aún) devuelve 0 filas, no contenido inventado |
| Aislamiento de roles | OK — `anon`/`authenticated` sin SELECT/INSERT; solo `service_role` (verificado tras GRANT explícito para esta carga) |

## 5. Por qué no se cargaron los 378 (decisión ejecutiva documentada, no omisión)

Bajo la gobernanza económica de la Fase 0 (`harness/COST_POLICY.yaml`), transportar el texto completo de los 357 artículos restantes a través del razonamiento del modelo (única vía disponible sin credenciales de staging en texto plano — las variables Supabase son `sensitive`/solo-escritura y el `.env.local` local apunta a **producción**, no a staging) habría consumido un volumen de contexto claramente desproporcionado frente al valor marginal, exactamente el patrón que la directriz maestra pide evitar ("no proceses documento completo cuando basten fragmentos").

**Recomendación para completar la carga (tarea T-015 en la cola):** crear un `.env.staging.local` con las credenciales del proyecto `aicakncgtuiiuomflkqj` (obtenidas una sola vez por el fundador desde el dashboard de Supabase) para que `scripts/corpus/cargar-staging.ts` —ya escrito y probado en su lógica— se ejecute de forma puramente mecánica (Haiku-tier, sin texto legal pasando por el razonamiento de ningún modelo) contra los 378 artículos completos.
