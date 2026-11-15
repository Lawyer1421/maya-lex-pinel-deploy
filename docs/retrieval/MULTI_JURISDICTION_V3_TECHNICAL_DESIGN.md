# Diseño técnico: Retrieval multi-jurisdicción v3 (Centroamérica)

**Estado:** propuesta de diseño; no implementada ni aplicada a Supabase.  
**Branch:** `feat/multi-jurisdiction-v3`  
**Alcance inicial:** Honduras (`HN`), El Salvador (`SV`), Guatemala (`GT`), Costa Rica (`CR`), Nicaragua (`NI`) y Panamá (`PA`). Belice permanece fuera de esta fase.

## Objetivo e invariantes

Permitir recuperar y citar normas de más de un país sin que una consulta o un fragmento de un país se trate como derecho de otro. Mantener `buscar_biblioteca_v2` y el comportamiento actual de producción sin cambios mientras v3 se prueba en staging.

Invariantes:

1. Cada instrumento y cada fila ingerida declaran una jurisdicción ISO alfa-2 válida; la ingesta nunca infiere `HN` ni acepta un valor vacío.
2. La identidad canónica de un instrumento incluye el país, por ejemplo `HN:CODIGO_CIVIL` y `SV:CODIGO_CIVIL`. El identificador de chunk existente (`coleccion:chunk_id`) conserva su función y no se reutiliza como identidad jurídica.
3. La búsqueda v3 recibe siempre un país y filtra en SQL antes del ranking. País ambiguo, no habilitado o sin corpus aprobado no se sustituye por Honduras.
4. El CLO solo permite `PRIMARY` cuando la jurisdicción de la fuente coincide con la seleccionada para la consulta; ausencia, conflicto o divergencia da `CONTEXT`/abstención.
5. v2, sus consumidores y sus datos no se alteran durante la prueba inicial. Ninguna migración se aplica a producción sin aprobación expresa.

## Estado actual relevante

- [`lib/legal-os/jurisdiction/registry.ts`](../../lib/legal-os/jurisdiction/registry.ts) ya define los seis países solicitados, pero solo `HN` está habilitado. `resolverJurisdiccion` devuelve estados para jurisdicción no habilitada y consulta ambigua.
- [`lib/legal-os/router/intent.ts`](../../lib/legal-os/router/intent.ts) convierte cualquier resolución distinta de `RESUELTA` en `HN`. Ese fallback debe dejar de alimentar retrieval v3: un país deshabilitado o una consulta ambigua debe detenerse o pedir aclaración, nunca buscar derecho hondureño.
- [`supabase/migrations/20260925055249_revision_pendiente_instrumentos.sql`](../../supabase/migrations/20260925055249_revision_pendiente_instrumentos.sql) define `buscar_biblioteca_v2`. Recibe colección, materia, límite y `solo_norma_vigente`, pero no jurisdicción.
- [`lib/legal-retrieval/semantic-retriever.ts`](../../lib/legal-retrieval/semantic-retriever.ts) llama v2 dos veces (pool amplio y pool de normas vigentes) y mapea `jurisdiccion` de cada fila.
- [`lib/legal-retrieval/clo-guards.ts`](../../lib/legal-retrieval/clo-guards.ts) requiere país `HN` para `PRIMARY`; `ContextoClasificacion` no contiene hoy la jurisdicción de la consulta.
- [`lib/ai-gateway/canary/evidence-integrity.ts`](../../lib/ai-gateway/canary/evidence-integrity.ts) fija por hash la ruta y el retrieval jurídico para la evidencia G6. CLO y el registro de jurisdicciones no están incluidos actualmente en `ARCHIVOS_PRODUCCION_JURIDICA`.

## Diseño por superficie

### 1. Identidad de instrumentos e ingesta

- Definir un tipo canónico `InstrumentRef` con país y nombre de instrumento, serializado como `<ISO2>:<INSTRUMENTO>`; rechazar países fuera del registro y nombres que no pertenezcan al catálogo cerrado.
- Guardar ese valor en el campo de identidad normativa (`metadata.norm_id` o campo equivalente acordado), no en el ID único de cada chunk. Validar que el prefijo coincida exactamente con `jurisdiccion` de la fila.
- Centralizar la validación para todos los puntos de entrada (incluidos scripts/lotes): `jurisdiccion` es requerida, normalizada a ISO alfa-2 y validada contra los países habilitados para ingesta. No crear un valor por defecto.
- La ingesta debe fallar con error explícito antes de escribir ante jurisdicción ausente, inválida o inconsistente con `InstrumentRef`; registrar pruebas para cada caso.
- Para filas históricas sin identidad prefijada, hacer inventario y backfill auditable en staging. No habilitar v3 para un país hasta que su corpus haya sido asignado, revisado y aprobado; no reinterpretar automáticamente filas sin país como `HN`.

Superficies a revisar al implementar: [`lib/legal-retrieval/instrument-identity.ts`](../../lib/legal-retrieval/instrument-identity.ts), [`lib/legal-retrieval/exact-resolver.ts`](../../lib/legal-retrieval/exact-resolver.ts), scripts de ingesta en [`scripts/`](../../scripts) y sus pruebas de validación.

### 2. RPC `buscar_biblioteca_v3`

Crear una migración aditiva de staging que defina `public.buscar_biblioteca_v3` con parámetro obligatorio `jurisdiccion_filtro` (`text`, validado como país admitido). Conservar los argumentos y columnas de salida de v2, agregando solo el filtro:

```sql
AND b.jurisdiccion = jurisdiccion_filtro
```

Mantener los filtros actuales de colección, materia, `revision_pendiente = false`, `solo_norma_vigente`, el orden por distancia y el límite máximo. Un parámetro ausente, vacío o inválido debe producir error explícito, no una búsqueda sin filtro ni un resultado interpretado como evidencia inexistente. Mantener los permisos mínimos de `service_role`; v2 no se reemplaza ni se modifica.

El consumidor semántico debe pasar el país resuelto en las dos llamadas (pool normal y pool vigente). Mapear, deduplicar y clasificar los resultados con el mismo país objetivo; no mezclar pools ni recurrir a v2 si v3 falla. Los errores de configuración/DB permanecen errores de retrieval, según el contrato de abstención existente.

Pruebas SQL y de integración en staging: las filas de otro país no aparecen incluso si tienen mayor similitud; sin filtro no hay ejecución; materia, vigencia y revisión pendiente conservan su semántica; ambas consultas (normal/vigente) quedan restringidas al mismo país; v2 devuelve exactamente lo mismo que antes.

### 3. CLO y selección de jurisdicción

- Resolver país una sola vez en el flujo de consulta y propagar el valor tipado al retrieval y al `ContextoClasificacion` de [`lib/legal-retrieval/clo-guards.ts`](../../lib/legal-retrieval/clo-guards.ts).
- Sustituir la comparación fija con `HN` por una comparación estricta `país_del_fragmento === país_objetivo`. Un valor nulo, no reconocido, discrepante o una identidad `InstrumentRef` cuyo prefijo no coincide con la fila nunca puede ser `PRIMARY`.
- Hacer que la identidad reconocida por CLO sea país-calificada para distinguir instrumentos homónimos. Los alias legados solo podrán resolverse como `HN:<id>` mediante una regla explícita y temporal; no inferir el país de una fuente de texto libre.
- Mantener las reglas existentes de vigencia, tipo de fuente, instrumento, materia, práctica notarial, P21 y suficiencia R3. La extensión multi-país solo puede conservar o agregar bloqueos, no relajar criterios ni permitir que metadata entrante ascienda una fila a `PRIMARY`.
- Enrutamiento: HN puede conservar el comportamiento por defecto actual cuando la consulta no mencione país. País mencionado pero no habilitado/sin corpus aprobado y mención de varios países deben pedir aclaración o abstenerse antes del retrieval; nunca caer a HN.

## Secuencia de entrega y puertas

1. **Contratos y pruebas puras:** catálogo cerrado de países/instrumentos, normalización, casos de país ausente/ambiguo/no habilitado y pruebas CLO de coincidencia/mismatch. HN conserva las regresiones actuales.
2. **Ingesta:** validador requerido y backfill/revisión de identificadores históricos en staging; las nuevas jurisdicciones permanecen deshabilitadas hasta aprobar corpus y fuentes.
3. **SQL staging:** migración aditiva y `buscar_biblioteca_v3`; inspeccionar definición/permisos y probar aislamiento por país con datos controlados.
4. **Cableado v3 detrás de selector/flag:** pasar jurisdicción en ambas búsquedas; no cambiar el camino productivo v2. Probar HN y negativos cruzados para los seis códigos.
5. **CLO y habilitación gradual:** activar un país solo con corpus oficial revisado, pruebas de suficiencia/citas aprobadas por CLO y evidencia G6 regenerada. Mantener apagado o revertir el flag si cualquier caso cruzado produce `PRIMARY`.
6. **Producción:** requiere autorización separada, plan de rollback y aprobación expresa; este diseño no autoriza aplicar la migración ni habilitar países en producción.

## G6: archivos y evidencia que deben regenerarse

Los siguientes archivos ya están en `ARCHIVOS_PRODUCCION_JURIDICA` y se prevé modificarlos para implementar el contrato anterior; sus hashes deben regenerarse en la evidencia de rollback:

- [`app/api/chat/route.ts`](../../app/api/chat/route.ts) — propaga/resuelve la jurisdicción seleccionada.
- [`lib/rag/search.ts`](../../lib/rag/search.ts) — propaga el filtro a la búsqueda semántica y al contexto CLO.
- [`lib/legal-retrieval/semantic-retriever.ts`](../../lib/legal-retrieval/semantic-retriever.ts) — cambia llamadas v2 por v3 en el camino segregado.
- [`lib/legal-retrieval/types.ts`](../../lib/legal-retrieval/types.ts) — tipa la jurisdicción objetivo y la identidad país-calificada.
- [`lib/legal-retrieval/exact-resolver.ts`](../../lib/legal-retrieval/exact-resolver.ts) — reconoce y compara la identidad país-calificada.

Además, la implementación prevista cambiaría [`lib/legal-retrieval/clo-guards.ts`](../../lib/legal-retrieval/clo-guards.ts), [`lib/legal-retrieval/instrument-identity.ts`](../../lib/legal-retrieval/instrument-identity.ts) y [`lib/legal-os/jurisdiction/registry.ts`](../../lib/legal-os/jurisdiction/registry.ts), que hoy **no** aparecen en esa lista de hashes. Antes de implementar, deben incorporarse a la protección de evidencia jurídica G6; no basta con regenerar evidencia dejando fuera la lógica nueva que decide país e identidad.

Al finalizar esos cambios y sus pruebas:

- Regenerar `docs/governance/evidence/g6-rollback-evidence.json` con `G6_WRITE_EVIDENCE=1` y `tests/rollback-rehearsal-g6.test.ts`.
- Como `app/api/chat/route.ts` también está en `ARCHIVOS_RUTA_Y_SHADOW`, regenerar `docs/governance/evidence/g6-production-independence.json` con `G6_WRITE_EVIDENCE=1` y `tests/production-independence-g6.test.ts`.
- Volver a generar el paquete de autorización (`g6-authorization-pack.md` y `.json`) después de actualizar ambas evidencias. No modificar las métricas de privacidad salvo que la implementación también cambie sus archivos fuente/gates.
- Añadir regresiones que exijan que los manifiestos incluyan los nuevos archivos CLO/jurisdicción; verificar que la evidencia reporta hashes actuales y que el paquete G6 no queda `MET` con hashes ausentes o antiguos.

La migración SQL y su validación de aislamiento necesitan evidencia separada de staging; no están cubiertas por los hashes de código G6.
