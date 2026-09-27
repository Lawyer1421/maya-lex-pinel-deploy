# Staging Security & Schema Drift Audit (Fase 1E.3A)

**Naturaleza de este documento:** auditoría de solo lectura. Cero `ALTER`,
`CREATE`, `DROP`, `GRANT`, `REVOKE`, `INSERT`, `UPDATE`, `DELETE` ni
aplicación de migración. Todas las consultas se ejecutaron contra
`aicakncgtuiiuomflkqj` (**Staging**) — `thgrhueckkjdutjvcufp` (Producción)
nunca se tocó. Un test de exposición real se hizo con la **anon key**
(pública por diseño, segura de usar) — la service_role key nunca se leyó ni
se usó.

---

## 1. `biblioteca_vectores` — estado real vs. intención del repositorio

### 1.1 RLS

| | Intención (`supabase/vectores.sql`) | Estado real en Staging |
|---|---|---|
| `relrowsecurity` | `true` (línea 33: `enable row level security`) | **`false`** |
| `relforcerowsecurity` | no se declara `FORCE` en el archivo | `false` |

### 1.2 Políticas

Intención: `service_only_biblioteca` (`USING/WITH CHECK auth.role() = 'service_role'`).

Real: **`pg_policies` devuelve cero filas** para `public.biblioteca_vectores`
en Staging. La política nunca fue creada ahí.

### 1.3 Privilegios de tabla (la parte que SÍ cambia la conclusión)

`information_schema.role_table_grants` para `public.biblioteca_vectores`:

| Rol | Privilegios reales |
|---|---|
| `anon` | REFERENCES, TRIGGER, TRUNCATE — **sin SELECT, sin INSERT, sin UPDATE, sin DELETE** |
| `authenticated` | REFERENCES, TRIGGER, TRUNCATE — **sin SELECT, sin INSERT, sin UPDATE, sin DELETE** |
| `service_role` | REFERENCES, **SELECT**, TRIGGER, TRUNCATE — sin INSERT/UPDATE/DELETE explícito |

**Esto contradice la advertencia genérica de la herramienta de auditoría de
Supabase** ("fully exposed to anon and authenticated") — esa advertencia es
una plantilla que dispara solo por RLS apagado, sin verificar privilegios
reales. Aquí sí se verificaron.

### 1.4 Prueba de exposición directa — EJECUTADA, no inferida

Petición PostgREST real contra Staging, usando la anon key pública (nunca
la service_role key), pidiendo solo la columna `id`, límite 1:

```
GET https://aicakncgtuiiuomflkqj.supabase.co/rest/v1/biblioteca_vectores?select=id&limit=1
Authorization: Bearer <anon key pública>
```

**Resultado: `HTTP 401`**
```json
{"code":"42501","message":"permission denied for table biblioteca_vectores",
 "hint":"Grant the required privileges to the current role with: GRANT SELECT ON public.biblioteca_vectores TO anon;"}
```

**Prueba adicional (más allá de lo mínimo pedido, porque el hallazgo lo
justificaba): invocación real de la RPC `buscar_biblioteca_v2` como `anon`**
(sin filtrar contenido, solo para confirmar si la función bypassea el
privilegio de tabla):

```
POST .../rest/v1/rpc/buscar_biblioteca_v2  (Authorization: Bearer <anon key>)
```

**Resultado: el mismo `HTTP 401` / `permission denied for table
biblioteca_vectores`.** La función es `SECURITY INVOKER` (no `DEFINER`), así
que se ejecuta con los privilegios de quien la llama -- `anon` sigue sin
poder leer la tabla ni siquiera a través de la RPC.

`authenticated`: **NOT_TESTED en vivo** (habría requerido crear o usar una
sesión de usuario real, fuera del alcance "sin crear/modificar usuarios" de
esta fase) -- pero comparte exactamente los mismos privilegios de tabla que
`anon` (tabla §1.3), por lo que la misma conclusión aplica con alta
confianza aunque no se ejecutó la petición HTTP real.

**Conclusión de esta sección: hoy, en la práctica, ni `anon` ni
`authenticated` pueden leer `biblioteca_vectores` -- ni directo ni vía RPC.**
La ausencia de RLS/política es una brecha de diseño real (sin defensa en
profundidad: si algún día alguien otorga `GRANT SELECT ... TO anon` de forma
amplia en esta base -- un error de configuración plausible, no
hipotético -- la tabla completa del corpus jurídico quedaría expuesta sin
ningún control adicional que lo detenga). No es, hoy, una exposición
confirmada.

---

## 2. `feature_flags` — existencia y estado de migración

**`to_regclass('public.feature_flags')` → `null`.** La tabla no existe.
Confirmado directamente, sin inferencia.

**Historial de migraciones en Staging** (`supabase_migrations.schema_migrations`
vía `list_migrations`):
```
20260906005725  suite_productividad_fase0_tablas
20260906014500  suite_productividad_fase0_grants
20260925135739  revision_pendiente_instrumentos
```

**La versión `20260827000000` (feature_flags) NO aparece.**

**Escenario confirmado: A — la migración nunca se aplicó.** (Descartados: B
"registrada pero tabla ausente" -- no está registrada en absoluto; C
"historial distinto" -- el historial es simplemente más corto, no
contradictorio.)

Nota adicional: el historial de migraciones de Staging tiene solo 3
entradas en total -- Staging no ha recibido la mayoría de las migraciones
del repositorio de forma rastreada. Esto es contexto operativo, no un
hallazgo de seguridad nuevo.

---

## 3. Causa de la deriva de `biblioteca_vectores` — solo lo demostrable

`supabase/vectores.sql` **NO es un archivo de migración** -- vive en
`supabase/` (junto a `schema.sql`, `subscriptions.sql`, `analytics.sql`),
fuera de `supabase/migrations/`, confirmado por listado de directorio. Por
diseño, este tipo de archivo se aplica manualmente (mismo patrón ya
establecido en esta sesión para cargas masivas), **no vía el sistema de
migraciones versionadas** -- por eso `schema_migrations` no tiene (ni podría
tener) un registro de si `vectores.sql` corrió o no en Staging.

El propio archivo (líneas 48-56) documenta una advertencia histórica real:
*"Al crear la tabla vía conexión SQL directa (psql/pooler, no el SQL Editor
del dashboard), Supabase NO otorga automáticamente los GRANTs estándar de
PostgREST."* Esto es evidencia indirecta de que la tabla se creó mediante
una conexión directa (consistente con el seeder Python, `scripts/seed_vectores.py`,
mencionado en la cabecera del propio archivo) -- explica por qué el `GRANT
SELECT` a `service_role` sí se aplicó en algún momento (service_role SÍ
tiene SELECT hoy) pero **no se puede probar, con la evidencia disponible, si
las líneas 33-46 (RLS + política) se ejecutaron alguna vez y luego se
revirtieron, o si nunca se ejecutaron.** No se especula más allá de esto.

**Hallazgo adicional de deriva (no solicitado explícitamente, pero
relevante):** `vectores.sql` define una función `buscar_biblioteca` (v1,
sin sufijo). Esa función **no existe en Staging** -- solo existe
`buscar_biblioteca_v2` (la que el código de la aplicación realmente usa,
`SECURITY INVOKER`, `EXECUTE` otorgado a `anon`/`authenticated`/`service_role`).
Esto confirma que `vectores.sql`, tal como está en el repositorio hoy, ya no
describe fielmente el estado real de Staging -- la v2 se creó por otro medio
no capturado en este archivo.

---

## 4. Comparación con un patrón "conocido-bueno" (§9 de la directiva)

Se intentó usar `subscriptions` como comparación del patrón
service-role-only ya validado. **`subscriptions` no existe en Staging en
absoluto** (confirmado, cero filas en `pg_class` para ese nombre) -- Staging
es un subconjunto reducido del esquema de Producción/repositorio, no un
espejo completo. No hay una comparación "conocido-buena" disponible dentro
de Staging para esta verificación puntual.

---

## 5. Clasificación de severidad

**`biblioteca_vectores`: P1.**

No P0: se probó en vivo (no se infirió) que `anon` no puede leer la tabla ni
directo ni vía RPC -- cero exposición confirmada hoy.

No "sin hallazgo": la protección real depende ÚNICAMENTE de la ausencia de
un GRANT (una configuración frágil, de una sola capa) en vez de RLS +
política (defensa en profundidad, la intención documentada del propio
repositorio). Un cambio futuro de grants sin relación aparente con este
código podría exponer todo el corpus sin que nada más lo detenga.

**`feature_flags`: P2.** Deriva de migración confirmada (escenario A), sin
exposición -- la tabla simplemente no existe, así que no hay superficie de
ataque; el impacto es puramente funcional (bloquea el canario de Fase 1E.3),
no de seguridad.

---

## 6. Remediación propuesta — NO EJECUTADA

### 6.1 `biblioteca_vectores` (orden importa, tal como exige la directiva)

```sql
-- Paso 1: política PRIMERO (antes de activar RLS, para no depender de una
-- ventana sin política activa entre dos comandos separados)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'biblioteca_vectores' AND policyname = 'service_only_biblioteca'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "service_only_biblioteca" ON public.biblioteca_vectores
        USING ((SELECT auth.role()) = 'service_role')
        WITH CHECK ((SELECT auth.role()) = 'service_role')
    $pol$;
  END IF;
END $$;

-- Paso 2: activar RLS (ya con la política en su lugar)
ALTER TABLE public.biblioteca_vectores ENABLE ROW LEVEL SECURITY;

-- Paso 3 (opcional, evaluar aparte): FORCE ROW LEVEL SECURITY NO está en la
-- intención original de vectores.sql -- service_role normalmente tiene
-- BYPASSRLS en Supabase, así que FORCE forzaría RLS incluso para el dueño
-- de la tabla sin aportar protección adicional real aquí. NO se propone por
-- defecto; solo si el fundador confirma que quiere ese nivel extra.

-- Paso 4: reconciliar el GRANT de service_role con la intención original
-- (hoy solo tiene SELECT; vectores.sql también otorga INSERT/UPDATE/DELETE).
-- ¿Es necesario? El código de la app (lib/rag/search.ts) solo hace SELECT/RPC
-- en runtime -- verificar si algún proceso de ingesta SÍ necesita
-- INSERT/UPDATE vía service_role antes de otorgarlo (no asumido aquí).
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_vectores TO service_role;
```

### 6.2 `feature_flags`

```sql
-- Aplicar tal cual el archivo ya versionado (idéntico al usado en
-- Producción, sin modificar):
-- supabase/migrations/20260827000000_feature_flags.sql
```

**Ningún comando de esta sección se ejecutó.**

---

## 7. Plan de rollback (para cuando se autorice ejecutar)

**`biblioteca_vectores`:**
```sql
-- Revertir política + RLS (deja la tabla exactamente como está hoy):
DROP POLICY IF EXISTS "service_only_biblioteca" ON public.biblioteca_vectores;
ALTER TABLE public.biblioteca_vectores DISABLE ROW LEVEL SECURITY;
```
No destructivo -- ninguna fila de datos se toca en ningún escenario de esta
remediación.

**`feature_flags`:**
```sql
DROP TABLE IF EXISTS public.feature_flags;
```
Ya documentado como seguro en el propio archivo de migración (tabla nueva y
aislada, sin código de producción leyéndola en el momento de creación).

---

## 8. Preview Auth

**`PREVIEW_AUTH = BLOCKED`** (sin cambios en esta fase -- carry-over de Fase
1E.3, no se intentó reparar ni re-verificar aquí).

---

## 9. Evidencia -- resumen de comandos ejecutados (todos de solo lectura)

1. `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'public.biblioteca_vectores'::regclass;`
2. `SELECT * FROM pg_policies WHERE schemaname='public' AND tablename='biblioteca_vectores';`
3. `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='biblioteca_vectores' AND grantee IN ('anon','authenticated','service_role');`
4. `SELECT proname, prosecdef, has_function_privilege(...) FROM pg_proc ... WHERE proname IN ('buscar_biblioteca','buscar_biblioteca_v2');`
5. `curl` real a PostgREST (`/rest/v1/biblioteca_vectores?select=id&limit=1`) con anon key pública.
6. `curl` real a PostgREST (`/rest/v1/rpc/buscar_biblioteca_v2`) con anon key pública, embedding sintético de ceros.
7. `SELECT to_regclass('public.feature_flags');`
8. Listado de `schema_migrations` vía herramienta de migraciones.
9. `SELECT relname... FROM pg_class WHERE relname='subscriptions';` (comparación conocido-buena, sin resultado -- tabla ausente).

Ninguna de estas operaciones modificó ningún dato ni esquema.
