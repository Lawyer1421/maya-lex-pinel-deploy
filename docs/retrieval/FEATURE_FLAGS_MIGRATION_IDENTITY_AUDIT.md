# Auditoría de identidad de migración — `feature_flags` (Staging vs. repo vs. Production)

**Fecha:** 2026-09-27
**Fase:** Retrieval V3 — 1E.3B.1 (read-only, sin escrituras de base de datos)
**Alcance:** determinar si la discrepancia entre el nombre de archivo del
repositorio y la versión registrada en `schema_migrations` de Staging
representa un riesgo, y cuál es la vía más segura de reconciliación —
sin ejecutar ningún write en esta fase.

## 1. Inventario del repositorio

`supabase/migrations/` (orden cronológico completo, para contexto):

```
20260717010000_paypal_state_machine.sql
20260717020000_paypal_event_id_and_atomic_access.sql
20260727000000_enable_rls_subscriptions.sql
20260728000000_corpus_editorial_status.sql
20260827000000_feature_flags.sql          <- migración en cuestión
20260906000000_flag_rerank.sql
20260919000000_exequatur_diagnostico_intentos.sql
20260922010000_documentos_temporales_storage.sql
20260925055249_revision_pendiente_instrumentos.sql
```

No existe ningún otro archivo con prefijo `20260927*` en el repositorio.
No hay colisión de nombre de archivo con la versión que Staging registró
(`20260927175536`).

## 2. Historial de migraciones — Staging (`aicakncgtuiiuomflkqj`)

Lectura directa de `supabase_migrations.schema_migrations`:

| version          | name                              |
|------------------|------------------------------------|
| 20260906005725   | suite_productividad_fase0_tablas  |
| 20260906014500   | suite_productividad_fase0_grants  |
| 20260925135739   | revision_pendiente_instrumentos   |
| 20260927175536   | feature_flags                     |

- `20260827000000` **NO existe** como versión registrada en Staging.
- `20260927175536` **SÍ existe** — es el registro que dejó `apply_migration`
  en la Fase 1E.3B, con `name = 'feature_flags'` (el nombre lógico se
  preservó; solo el número de versión no coincide con el del archivo).
- No se pudo leer `statements`/checksum column-by-column en este audit
  porque no se solicitó una consulta adicional sobre esas columnas
  internas; el campo relevante para esta reconciliación (`version`,
  `name`) ya es suficiente para la decisión de abajo.

## 3. Historial de migraciones — Production (`thgrhueckkjdutjvcufp`) — solo lectura

| version          | name                                              |
|------------------|----------------------------------------------------|
| 20260828030447   | feature_flags                                      |
| 20260829001651   | gap2_stubs_123a_123b                               |
| 20260908012708   | flag_rerank                                        |
| 20260920141254   | flag_exq_enabled_seed                              |
| 20260922160104   | documentos_temporales_storage                      |
| 20260924205745   | auditor_devops_ro_and_legal_feedback_telemetry     |
| 20260925055249   | revision_pendiente_instrumentos                    |

**Hallazgo central de este audit:** Production **tampoco** tiene registrada
la migración `feature_flags` bajo el literal `20260827000000` del archivo.
La tiene registrada como `20260828030447` — un día después de la fecha de
autoría del archivo, casi con certeza porque la aplicación original a
Production **también** se hizo con una herramienta que autogenera la
versión por el timestamp de ejecución (el mismo patrón que
`apply_migration` acaba de repetir en Staging).

Esto significa que la discrepancia observada en Staging (`20260927175536`
≠ `20260827000000`) **no es una anomalía nueva** — es el comportamiento ya
establecido y ya vigente en Production desde antes de esta sesión. Ningún
archivo del repositorio fue leído, modificado ni renombrado para llegar a
esta conclusión; se trata de una lectura read-only de
`supabase_migrations.schema_migrations` en ambos proyectos.

No se modificó Production en ningún momento de este audit ni de la fase
anterior (1E.3B).

## 4. Comparación de schema en vivo (Staging) vs. intención del repositorio

| Aspecto        | Repositorio (`20260827000000_feature_flags.sql`) | Staging (en vivo) |
|-----------------|---------------------------------------------------|--------------------|
| Columnas        | `flag_name text PK, enabled boolean NOT NULL DEFAULT false, allowed_emails text[] NOT NULL DEFAULT '{}', description text, updated_at timestamptz NOT NULL DEFAULT now(), updated_by text` | Idéntico, columna por columna (verificado vía `information_schema.columns`) |
| PK              | `flag_name`                                        | `feature_flags_pkey` sobre `flag_name` — coincide |
| RLS             | `ENABLE ROW LEVEL SECURITY`                        | `relrowsecurity = true` |
| FORCE RLS       | `FORCE ROW LEVEL SECURITY`                         | `relforcerowsecurity = true` |
| Política        | `service_only_feature_flags` (`auth.role() = 'service_role'`) | Idéntica, presente |
| Semilla         | 6 flags, todos `enabled=false`, `allowed_emails='{}'` | Idéntico — 6 filas, todas `false` |

**`SCHEMA_EQUIVALENT = YES`** — no hay ninguna diferencia estructural,
de seguridad ni de datos entre lo que el archivo del repositorio pretende
crear y lo que existe hoy en Staging. La única discrepancia es el número
de versión bajo el cual quedó indexado en `schema_migrations`.

## 5. Riesgo de reaplicación futura

Inspección de las herramientas de migración de este repositorio:

- No existe `supabase/config.toml` en el repositorio — el proyecto **no
  está vinculado** (`supabase link`) a ningún ref de Supabase CLI de forma
  rastreable en el repo.
- `package.json` no tiene ningún script `migrate`, `db:push`, ni invoca
  `supabase` CLI en absoluto. Los únicos scripts relacionados con datos son
  `migrate:analytics`, `migrate:paypal-state-machine` y
  `reconcile:paypal:*` — todos scripts TypeScript ad-hoc propios del
  proyecto, no el mecanismo de migraciones de Supabase.
- `.github/workflows/ci.yml` solo ejecuta `typecheck` y `test` (vitest,
  sin red real, sin secrets, según su propio comentario de cabecera). No
  hay ningún job que ejecute `supabase db push`, `supabase migration up`
  ni equivalente.
- `.github/workflows/grokbot-audit.yml` no fue inspeccionado en detalle
  por no ser relevante a migraciones (nombre indica auditoría de bot, no
  despliegue de schema).

**Conclusión:** no existe ningún mecanismo automatizado en este repositorio
que lea `supabase/migrations/*.sql` y decida "pendiente vs. aplicado"
comparando contra `schema_migrations`. Todas las aplicaciones de migración
observadas hasta ahora (Production y Staging) se hicieron manualmente o vía
la herramienta MCP `apply_migration`, nunca vía `supabase db push` en CI.

Por lo tanto: **no**, no hay riesgo de que un pipeline existente vuelva a
ejecutar `20260827000000_feature_flags.sql` automáticamente — no existe tal
pipeline hoy. El único riesgo sería que un humano (o un futuro agente)
ejecute manualmente `supabase db push` con el CLI vinculado a Staging,
viera que `20260827000000` no aparece en el historial remoto, y la vuelva a
aplicar. Esto se mitiga completamente por el hecho de que la migración es
**idempotente por diseño**: usa `CREATE TABLE IF NOT EXISTS`, `DO $$ ... IF
NOT EXISTS ...`, y `ON CONFLICT (flag_name) DO NOTHING`. Reaplicarla no
tendría ningún efecto destructivo aunque ocurriera.

## 6. Opciones de reconciliación evaluadas

### Opción A — dejar el historial como está
- **Efecto en Staging:** ninguno; ya está en el estado correcto y funcional.
- **Efecto en Production:** ninguno (no se toca).
- **Efecto en git/historial:** ninguno.
- **Riesgo de despliegue futuro:** mínimo — ya se demostró (§5) que no hay
  pipeline que dependa de la coincidencia exacta de versión, y la migración
  es idempotente si algún día se reaplicara manualmente.
- **Reversibilidad:** total — no se ha hecho ningún cambio que revertir.
- **Precedente:** esta es exactamente la situación que ya existe en
  Production (`20260828030447` en vez de `20260827000000`) y el proyecto
  ha funcionado sin incidentes desde entonces.

### Opción B — renombrar el archivo del repositorio a `20260927175536_feature_flags.sql`
- **Efecto en Staging:** ninguno directo.
- **Efecto en Production:** **negativo** — Production usa `20260828030447`,
  no `20260927175536`. Renombrar el archivo del repo para que coincida con
  Staging lo desalinearía de Production, sencillamente moviendo el mismo
  problema de un entorno a otro. No existe un único número que pueda
  satisfacer a ambos entornos, porque cada uno ya generó su propio
  timestamp de ejecución de forma independiente.
- **Efecto en git/historial:** reescribe la identidad de un archivo ya
  commiteado y potencialmente ya citado en documentación
  (`docs/governance/DECISION_LOG.md`, `CLAUDE.md`) — rompe trazabilidad
  histórica sin beneficio real.
- **Riesgo de despliegue futuro:** introduce confusión adicional (ahora
  ni Staging ni Production coinciden con el nuevo nombre).
- **Reversibilidad:** requiere un segundo commit para deshacer.
- **Veredicto: descartada.**

### Opción C — crear una migración de reconciliación/no-op
- Consistiría en un archivo nuevo (p. ej.
  `20260927999999_reconcile_feature_flags_identity.sql`) que no haga nada
  (`SELECT 1;` o comentario) solo para "anclar" documentalmente el
  desfase.
- **Efecto en Staging/Production:** ninguno funcional — es un no-op.
- **Efecto en git/historial:** añade ruido al directorio de migraciones sin
  aportar nada que este mismo documento de auditoría no explique ya.
- **Riesgo de despliegue futuro:** ninguno nuevo, pero tampoco resuelve
  nada — es documentación disfrazada de SQL.
- **Reversibilidad:** total, pero innecesaria.
- **Veredicto: no aporta valor sobre simplemente documentar (este archivo).**

### Opción D — reparar el historial con herramienta soportada (`supabase migration repair`)
- El CLI de Supabase ofrece `supabase migration repair --status applied
  <version>` para insertar/corregir una fila de `schema_migrations` sin
  ejecutar el SQL, exactamente para este escenario.
- **Efecto en Staging:** cambiaría `20260927175536` → `20260827000000` en
  `schema_migrations` (o insertaría una fila adicional, según el modo).
  Es un **write** a `schema_migrations` — explícitamente fuera de alcance
  de esta fase (§7 de la directiva) y no ejecutado.
- **Efecto en Production:** ninguno si se aplica solo a Staging, pero deja
  a ambos entornos con identidades distintas de todos modos (Production
  seguiría en `20260828030447`), por lo que **tampoco resuelve la
  inconsistencia entre entornos** — solo la alinearía con el archivo del
  repo, no con Production.
- **Riesgo de despliegue futuro:** bajo, pero requiere el CLI de Supabase
  vinculado (`supabase link`), que hoy no existe en este repo (§5) — habría
  que introducir esa dependencia operativa solo para este ajuste cosmético.
- **Reversibilidad:** alta (es una operación soportada y documentada por
  Supabase), pero sigue siendo un write real sobre una tabla de sistema.
- **Veredicto: técnicamente viable para una fase futura si se autoriza
  explícitamente, pero no justificada hoy dado que no resuelve la
  discrepancia con Production y el schema ya es correcto.**

### Opción E — otro enfoque: documentar y no tocar nada (elegida)
Ver recomendación en §8.

## 7. Cumplimiento de restricciones

No se ejecutó ningún `INSERT`/`UPDATE`/`DELETE` sobre
`supabase_migrations.schema_migrations` en ningún proyecto. Todas las
consultas de este audit fueron `SELECT` de solo lectura contra Staging y
Production. No se renombró ningún archivo del repositorio. No se tocó
Production. No se desplegó nada.

## 8. Recomendación

**Opción A — dejar el historial como está, documentado en este archivo.**

Justificación:

1. El schema en vivo en Staging es **idéntico** a la intención del
   repositorio (§4) — no hay deuda funcional ni de seguridad pendiente.
2. Production **ya tiene exactamente el mismo tipo de desfase**
   (`20260828030447` vs. `20260827000000`) desde antes de esta sesión, y
   el proyecto ha operado con normalidad — este es el patrón establecido
   del proyecto para migraciones aplicadas por herramienta MCP en vez de
   CLI, no una anomalía introducida ahora.
3. No existe ningún pipeline automatizado (§5) que decida "pendiente" por
   coincidencia exacta de nombre de versión, así que no hay riesgo de
   reaplicación accidental.
4. Aunque alguien ejecutara manualmente el archivo original algún día, la
   migración es idempotente (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) —
   no causaría duplicados ni corrupción.
5. Cualquier intento de "corregir" el número (Opciones B o D) o bien
   traslada el problema a otro entorno (B) o requiere introducir tooling
   nuevo y un write sobre tabla de sistema para un beneficio puramente
   cosmético (D), sin resolver la inconsistencia real entre Staging y
   Production (que ya existía y es preexistente a este trabajo).

**No se requiere ninguna acción de reconciliación en este momento.** Esta
auditoría documenta el hallazgo para que futuras fases (o futuros agentes)
no lo malinterpreten como un error de la Fase 1E.3B.
