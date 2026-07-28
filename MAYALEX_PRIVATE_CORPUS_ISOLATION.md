# MAYALEX — Aislamiento del corpus privado (`private_instruments_staging`)

Ambiente: `mayalexhn-staging` (ref `aicakncgtuiiuomflkqj`). Ninguna verificación de esta fase leyó contenido — solo grants, políticas, definiciones de rutinas y un conteo sintético (`TEST-ISOLATION-001`, eliminado al finalizar la prueba).

## 1. `anon` no puede consultarla (VERIFICADO MEDIANTE PRUEBA en vivo)

```sql
set role anon;
select count(*) from public.private_instruments_staging;
-- ERROR: 42501: permission denied for table private_instruments_staging
```

Bloqueado a nivel de **GRANT**, antes incluso de evaluar RLS — `anon` solo tiene `REFERENCES`, `TRIGGER`, `TRUNCATE` sobre esta tabla (confirmado en `information_schema.role_table_grants`), nunca `SELECT`.

## 2. `authenticated` no puede consultarla directamente (VERIFICADO MEDIANTE PRUEBA en vivo)

```sql
set role authenticated;
select count(*) from public.private_instruments_staging;
-- ERROR: 42501: permission denied for table private_instruments_staging
```

Mismo patrón que `anon` — mismos grants limitados.

## 3. No participa en funciones RAG públicas (VERIFICADO EN CONFIGURACIÓN)

```sql
select routine_name from information_schema.routines
where routine_schema='public' and routine_definition ilike '%private_instruments_staging%';
-- 0 filas
```

Ninguna de las 4 RPC de búsqueda (`buscar_biblioteca`, `buscar_biblioteca_v2`, `buscar_conocimiento_comunidad`, `buscar_plantilla`) ni ninguna otra función en `public` referencia esta tabla.

## 4. No alimenta páginas ni SEO (VERIFICADO EN CÓDIGO)

`app/leyes/[articulo]/page.tsx`, `app/consultas/[slug]/page.tsx` y `app/sitemap.ts` importan exclusivamente de `lib/seo/articulos-vigentes.ts`, que consulta `biblioteca_vectores` en el proyecto de **producción** (`thgrhueckkjdutjvcufp`) — una base de datos físicamente distinta al proyecto de staging donde vive `private_instruments_staging`. No existe ninguna ruta de código que conecte ambas.

## 5. No alimenta el Modo Litigante (VERIFICADO EN DISEÑO — el Modo Litigante no está implementado)

`MAYALEX_MODO_LITIGANTE_V1_DESIGN.md` (fase anterior) declara explícitamente esta tabla como fuente prohibida en su lista de exclusión (sección 2). Como el Modo Litigante no tiene código implementado todavía (confirmado NO-GO), esto es una garantía de diseño pendiente de verificar en código una vez exista una implementación real — no hay riesgo actual porque no hay consumidor.

## 6. No comparte alias con colecciones públicas (VERIFICADO EN CÓDIGO)

No existe ningún mecanismo de alias en el código de producción actual (confirmado en `MAYALEX_BLUE_GREEN_ALIAS_RUNBOOK.md`). `private_instruments_staging` es una tabla física independiente, con su propio nombre, sin relación de sinónimo/vista/alias con `hn_normas_verificadas_staging` ni con ninguna otra colección `HN_*_STAGING`.

## 7. Prueba automatizada (CI, sin red)

`tests/sql/private-instruments-isolation.sql.test.ts` — 6 pruebas contra PostgreSQL real (PGlite, no mocks), reproduciendo el estado exacto verificado en vivo (RLS habilitado, 0 políticas, grants limitados a `REFERENCES/TRIGGER/TRUNCATE` para `anon`/`authenticated`, `service_role` con `BYPASSRLS` como en Supabase real):

```
✓ anon no puede leer (permission denied a nivel de GRANT, antes de evaluar RLS)
✓ authenticated no puede leer directamente
✓ service_role sí puede leer (acceso administrativo, nunca expuesto al cliente)
✓ anon no puede insertar ni modificar
✓ quarantine_legacy_staging — anon no puede leer
✓ quarantine_legacy_staging — authenticated no puede leer
```

Resultado: **6 de 6 pruebas aprobadas.**

## 8. Confirmación

No se descargó ni mostró ningún fragmento de `contenido` real. La única fila insertada durante la verificación (`TEST-ISOLATION-001`, datos 100% sintéticos) fue eliminada al finalizar la prueba — `private_instruments_staging` permanece vacía.
