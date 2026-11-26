# Dictamen R1 · Sincronización de las RPC de producción con el repositorio

**Estado:** PENDIENTE DE FIRMA
**Fecha:** 2026-11-25 · **Destinos:** staging `aicakncgtuiiuomflkqj` (validación) y producción `thgrhueckkjdutjvcufp`

> **Cómo se firma.** Para firmar, el CLO sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula R1 y la palabra FIRMADA, y completa el bloque de firma de §6. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea y exige que este dictamen cite la huella completa de la migración (§5).

## 1. Hallazgo

Las funciones `public.resolver_articulo_exacto` y `public.buscar_biblioteca_v3` de producción **no** son las de `supabase/migrations/`. Son la variante que entró con `00a_migracion_esquema_prod.sql` el 2026-11-21, pegada desde el SQL Editor con CRLF.

| Base | `resolver_articulo_exacto` (md5 prosrc) | `buscar_biblioteca_v3` (md5 prosrc) | Mensaje de error | Historial de migraciones |
|---|---|---|---|---|
| Producción | `ec9a0d25…` = 00a (CRLF) | `96e6ad99…` = 00a (CRLF) | «jurisdiccion_filtro **invalida**» | Termina en `20261102132346`; **no registra** `20261107010000` ni `20261115000000` |
| Staging | `37735385…` = `20261107010000` | `df4381e8…` = `20261115000000` (CRLF) | «jurisdiccion_filtro **inválida**» | Registra `20261107232059 resolver_articulo_exacto` y las de 2026-11-12 |
| Repositorio | `20261107010000_resolver_articulo_exacto.sql` | `20261115000000_multi_jurisdiction_v3.sql` | «inválida», exigido por `tests/sql/buscar-biblioteca-v3.sql.test.ts` | — |

Las definiciones se extrajeron en solo lectura con `pg_get_functiondef`. Están en esta carpeta, normalizadas a LF: `prod_*.sql` y `repo_*.sql`, esta última como la renderiza staging. La transcripción se verificó contra el md5 de `prosrc` de cada base, 4 de 4.

## 2. Diff exacto

Archivos: [`diff_buscar_biblioteca_v3.diff`](diff_buscar_biblioteca_v3.diff) y [`diff_resolver_articulo_exacto.diff`](diff_resolver_articulo_exacto.diff). Con «−» va el repositorio y con «+» producción.

| Diferencia | Función | ¿Cambia el comportamiento? |
|---|---|---|
| `inválida` frente a `invalida` en `RAISE EXCEPTION` | `buscar_biblioteca_v3` | **Sí, solo el texto del error** (mismo `ERRCODE 22023`). La prueba SQL del repositorio espera «inválida» |
| `AS similarity` en la última columna del `SELECT` | `buscar_biblioteca_v3` | No: `RETURN QUERY` asigna por posición y la columna de salida se llama `similarity` en ambas |
| Saltos de línea del `IF`, del `RAISE` y de la lista del `SELECT` | `buscar_biblioteca_v3` | No |
| Espacios de alineación en `b.instrumento_id    =` | `resolver_articulo_exacto` | No |
| CRLF en el cuerpo (producción) frente a LF (repositorio) | ambas | No |

Son idénticos en las dos bases: firma, tipos de retorno, `LANGUAGE`, `STABLE`, `SECURITY INVOKER`, `search_path` y permisos (`EXECUTE` solo `postgres` y `service_role`).

## 3. Propuesta

**Opción recomendada (A): producción adopta el contrato del repositorio.** La migración [`supabase/migrations/20261125000000_sincronizar_rpc_prod.sql`](../../../../supabase/migrations/20261125000000_sincronizar_rpc_prod.sql) hace lo siguiente:

- **Antes de cambiar nada:** comprueba que cada función esté en un estado conocido (00a en CRLF o en LF, o repo en LF o en CRLF). Si no, aborta sin tocar nada.
- **Cambio:** reescribe ambas funciones con el cuerpo exacto del repositorio y reaplica `REVOKE`/`GRANT`.
- **Después:** verifica el md5 resultante y que `anon` y `authenticated` no puedan ejecutarlas. Todo va en una transacción.
- **Idempotencia:** sobre staging, que ya tiene la versión del repo, la reescribe igual.
- **Reversión:** [`supabase/rollbacks/20261125000000_sincronizar_rpc_prod_rollback.sql`](../../../../supabase/rollbacks/20261125000000_sincronizar_rpc_prod_rollback.sql) restituye la variante 00a, en LF.

**Opción B (no recomendada): el repositorio adopta la variante de producción.** No toca producción, pero obligaría a cambiar la prueba SQL y dejaría staging distinto de producción.

**Advertencia operativa.** No usar `supabase db push` contra producción. Su historial termina en `20261102132346`: intentaría aplicar migraciones que allí nunca se registraron, que son `20261016000000`, `20261107000000`, `20261107010000`, `20261112000000`, `20261115000000` y esta. Esta migración se corre solo con el ejecutor seguro.

## 4. Ensayo (PGlite con pgvector, 2026-11-25)

Parte del estado exacto de producción: los cuerpos 00a en CRLF, con el mismo md5 de `prosrc` que producción.

| Paso | `resolver` | `buscar_v3` | Mensaje de error | Consultas |
|---|---|---|---|---|
| Inicial (= producción) | `ec9a0d25` | `96e6ad99` | «invalida» | 1 fila / 1 fila |
| Tras la migración | `37735385` | `4392a97a` | «inválida» | 1 / 1 |
| Migración de nuevo (idempotencia) | `37735385` | `4392a97a` | «inválida» | 1 / 1 |
| Tras el rollback | `dc95a7ea` | `373dad58` | «invalida» | 1 / 1 |
| Migración tras el rollback | `37735385` | `4392a97a` | «inválida» | 1 / 1 |
| Estado desconocido | — | — | **abortó** sin cambios | — |

El ensayo detectó que, tras el rollback (00a en LF), la primera versión de la migración abortaba; se agregaron esas dos huellas a la precondición. La prueba SQL existente (`tests/sql/buscar-biblioteca-v3.sql.test.ts`) sigue pasando.

## 5. Paquete y huellas

| Paso | Destino | Archivo | Bytes | SHA-256 | Firma |
|---|---|---|---:|---|---|
| 1 | staging | `supabase/migrations/20261125000000_sincronizar_rpc_prod.sql` | 6,544 | `9632b97cc90f7cf7df88c9fa716693083add95eedcf6c44a7bf2fa09399eb8b6` | No requiere (validación) |
| 1 | prod | el mismo archivo | 6,544 | `9632b97cc90f7cf7df88c9fa716693083add95eedcf6c44a7bf2fa09399eb8b6` | **Requiere «R1 FIRMADA»** |

**Orden de ejecución:**

1. **Staging:** `pwsh -File docs\corpus\fase2\rpc-sync\ejecutar_staging.ps1`, con la frase `SINCRONIZAR RPC EN STAGING`.
2. **Verificación en solo lectura:** Claude Code comprueba en staging el md5 de `prosrc` (`37735385` y `4392a97a`) y los permisos.
3. **Firma de R1:** por el CLO.
4. **Producción:** `pwsh -File docs\corpus\fase2\rpc-sync\ejecutar_prod.ps1`, con la frase `SINCRONIZAR RPC EN PROD`.
5. **Verificación final en solo lectura** en producción.

## 6. Decisión del CLO

| # | Decisión | Decisión del CLO |
|---|---|---|
| R1 | Adoptar la opción A y ejecutar la migración en staging y luego en producción, exactamente con la huella de §5 | ☐ |

Firma: ____________________ · Abg. y Not. Fredy Omar Pinel Flores (CLO / Director Maya Lex) · Fecha: __________
