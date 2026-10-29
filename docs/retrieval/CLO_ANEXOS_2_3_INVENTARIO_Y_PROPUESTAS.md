# CLO 28-oct-2026, Anexos 2 y 3 — inventario y propuestas (solo documentación; ninguna propuesta está aplicada)

Lo implementado en código (con pruebas en `tests/clo-anexo2-3.test.ts`) está en el PR #106. Este documento reúne lo que el CLO pidió solo **inventariar o proponer**.

## 1. Inventario: modos sin corpus y `/api/rag` (Anexo 2.7 — sin cambios de comportamiento)

| Camino | Qué responde sin corpus | ¿Puede afirmar vigencia? | Gate propuesto (decide Fredy/CLO) |
| --- | --- | --- | --- |
| `sala_ia` y `sala_penal` (`app/api/chat/route.ts:333-338`: `usarRouter=false` → `NOT_REQUIRED`) | Van directo al modelo con el prompt del sistema. No llaman a `buscarRAG`: no hay recuperación, ni Evidence Gate, ni abstención por falta de corpus. El prompt lista instrumentos «y reformas vigentes» (`lib/system-prompt.ts:20`). | **Sí puede**: nada impide que el modelo diga que un artículo está vigente o lo cite de memoria. | (a) instrucción dura en el prompt de sala: «no afirmes vigencia ni cites artículos; si piden artículo, vigencia o texto, indica que se use el modo Análisis»; (b) detector determinista (`requiereEvidenciaCorpus`) que, si la pregunta pide artículo/vigencia, responda con la abstención en lugar de llamar al modelo; (c) etiqueta fija «respuesta sin corpus, no verificada». |
| Ruta D en modos con router (`analisis`, `documento`, `analisis_penal`, `escritos_penales`; `route.ts:338` y `route.ts:537-538`) | Consulta ambigua o corta: devuelve `MENSAJE_ACLARACION` **sin LLM y sin RAG**. | No: no genera texto jurídico. | Ninguno adicional; mantener. |
| `/api/rag` (GET/POST, `app/api/rag/route.ts`) | Llama a `buscarRAG` y devuelve fragmentos, `contexto_formateado` y el `outcome`. Sin corpus devuelve la lista vacía. No pasa por el Evidence Gate de la ruta de chat. | El `contexto_formateado` etiqueta `[NO VIGENTE…]`/`[NORMA VIGENTE HONDURAS]` según el fragmento, pero la ruta **no** exige PRIMARY para exponer texto, y **no tiene autenticación ni límite de uso** en el archivo (`middleware.ts` es un pase libre). Con `flag_corpus_p21` no se le pasa la opción: las filas P21 no salen (apagado por defecto). | (a) exigir sesión verificada y límite de uso, como `/api/chat`; (b) devolver solo `rol_evidencia='PRIMARY'` como «evidencia» y marcar el resto «contexto»; (c) no devolver texto de filas CONTEXT con vigencia NULL/FALSE. |

Hallazgo de seguridad para decidir aparte: `/api/rag` es público y expone el corpus recuperado por la clave de servicio (§3).

## 2. Prueba intermitente (Anexo 2.8) — severidad BAJO

`tests/ai-gateway-shadow-boundary.test.ts:199` («el adaptador no responde: la ruta termina sin esperar…») exige `Date.now() - t0 < 40`. Se observó una corrida de **194 ms contra 40 ms** en un runner cargado; aislada pasa. La causa es medir tiempo real de pared con un umbral muy ajustado, no un defecto del código. **Severidad: BAJO.** No se toca el umbral en este PR (decisión del CLO); una estabilización posible, aparte, es medir con temporizadores simulados (`vi.useFakeTimers`) en lugar de reloj real.

## 3. Recuperación con `service_role` y propuesta de rol limitado (Anexo 3.4 — solo documentación)

**Estado actual.** `lib/supabase.ts:5-17` (`createServerSupabaseClient`) crea el cliente con `SUPABASE_SERVICE_ROLE_KEY`. Lo usan la búsqueda exacta (`lib/rag/search.ts`), la semántica (`lib/legal-retrieval/semantic-retriever.ts`) y los flags (`lib/flags.ts`). `service_role` **omite RLS**: una consulta de recuperación con un error (o una inyección de filtro) podría leer cualquier tabla del proyecto, no solo `biblioteca_vectores`.

**Propuesta (no aplicada).**
1. Un rol de base de datos `mayalex_retrieval_ro` con `SELECT` solo sobre `biblioteca_vectores` (idealmente sobre una vista `v_biblioteca_recuperable` que excluya `revision_pendiente = true` y la capa privada `doc_*`) y `EXECUTE` solo sobre las funciones `buscar_biblioteca*`.
2. Una política RLS `FOR SELECT TO mayalex_retrieval_ro USING (revision_pendiente = false)`, junto a la política `service_only_biblioteca` que ya existe en `supabase/vectores.sql`.
3. Un JWT firmado con el secreto del proyecto y `role = mayalex_retrieval_ro`, guardado como `SUPABASE_RETRIEVAL_JWT` (sensible) y un `createRetrievalSupabaseClient()` que lo use **solo** en la recuperación y falle cerrado si falta. `service_role` queda para escrituras, flags y administración.
4. Prueba de aceptación: con ese cliente, `select` sobre `auth.users`, `subscriptions` o `queries_log` debe fallar.

Requiere migración y secretos nuevos: es una decisión de Fredy, en un PR aparte.

## 4. Bloqueo en tiempo de ejecución Preview → producción (Anexo 3.5 — solo propuesta)

**Riesgo.** Un despliegue de Preview con `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` de producción leería o escribiría datos reales. Las variables de Preview existen por separado en Vercel (se verificó solo su existencia por nombre, no su valor); que apunten a staging es algo que Fredy debe confirmar.

**Propuesta.** En `createServerSupabaseClient()` (y en `createSupabaseAdminClient`), antes de crear el cliente:
```ts
// PROPUESTA_NO_APLICADA
const REF_PRODUCCION = 'thgrhueckkjdutjvcufp';
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' && supabaseUrl.includes(REF_PRODUCCION)) {
  throw new Error('BLOQUEO: un entorno que no es producción no puede usar la base de producción');
}
```
Complementos: (a) lista de proyectos permitidos por entorno (`ALLOWED_SUPABASE_REFS_<ENV>`) en vez de una sola referencia; (b) el mismo chequeo en el arranque (`instrumentation.ts`) para fallar al desplegar, no al primer uso; (c) prueba que simule `VERCEL_ENV=preview` con la URL de producción y espere el error; (d) revisar en el panel de Vercel que las variables de Preview no contengan la referencia de producción.

## 5. Plan de rollback del P21 (Anexo 3.5 — solo propuesta)

Alcance: las filas con id `mayalex_normativos:codigo_comercio_bch_d73_50…`, `…codigo_notariado_d59_2015…` y `…decreto_284_2013_titulo_ii…`.

1. **Antes de cargar (staging primero):** confirmar `count = 0` por prefijo; exportar copia de la tabla (o del subconjunto) y anotar el recuento.
2. **Apagado inmediato, sin despliegue:** `flag_corpus_p21` → `enabled=false`. Con el flag apagado (o la fila ausente) las filas P21 no se recuperan ni se citan.
3. **Exclusión reversible por fila:** `UPDATE … SET revision_pendiente = true WHERE id LIKE '<prefijo>%'` (las funciones de búsqueda ya excluyen esas filas) — se revierte con el mismo `UPDATE` en `false`. *(PROPUESTA_NO_APLICADA.)*
4. **Retiro definitivo (solo con autorización):** `DELETE … WHERE id LIKE '<prefijo>%'` tras verificar el recuento de la copia. *(PROPUESTA_NO_APLICADA.)*
5. **Verificación:** `select count(*) … where id like '<prefijo>%'` = 0 (o = `revision_pendiente`) y una consulta de Comercio que debe abstenerse.
6. **Disparadores de rollback:** aumento anormal de abstenciones, una cita de una fila FALSE/NULL, o cualquier hallazgo del CLO sobre el texto.
