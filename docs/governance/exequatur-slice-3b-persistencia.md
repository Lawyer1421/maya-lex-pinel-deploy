# Exequátur Slice 3B — Persistencia de intentos / progreso

**Rama:** `cursor/exequatur-slice-3b-persistencia-d401`  
**Base:** `origin/main` @ merge PR #43 (Slice 3A HEAD `58f9feb`)  
**Flag:** reutiliza `flag_exq_enabled` (Slice 1). Sin flag nuevo. Sin `FLAG_ACTIVATION` (P3 fundador).  
**SQL:** migración en repo. **No** se aplica a producción en este PR (`SQL_APPLY` es P3).

## Qué entra

Persistencia de intentos de diagnóstico y progreso, con identidad de sesión y RLS.

- Tablas `exequatur_diagnostico_intentos` (append-only) y `exequatur_diagnostico_progreso` (1 fila / usuario).
- `user_id` = `auth.users.id` de `auth.getUser()`. Nunca email ni `user_identifier` de facturación.
- Escritura y lectura con el cliente SSR (JWT + anon key). Nunca `service_role` para estas filas.
- RLS `FORCE`: `authenticated` solo ve/inserta `user_id = auth.uid()`.
- Al leer se re-evalúa `respuestas` con `evaluarDiagnostico`. Las columnas de puntaje no son autoridad.
- `/exequatur/plan` acepta `?intento=<uuid>` propio o, sin query, el último intento propio. Se ignoran `objetivos` / `aciertos` / `total`.
- Fail-closed: tabla ausente, error de insert o intento ajeno → sin plan (no hay fallback a query-string).

## Qué no entra

| Frente | Estado |
|---|---|
| `SQL_APPLY` a staging/prod | P3 fundador |
| `FLAG_ACTIVATION` | P3 fundador |
| Migrar entitlement a UUID (sigue email en billing) | backlog |
| Formularios / ciclo notarial | Slice 4+ |
| Ingesta, campaña, PayPal, RAG, `access.ts` | prohibido |

## Invariantes (heredados)

```
free / académico     → DENY
pro + flag           → ALLOW
admin + flag         → ALLOW_INTERNAL
flag off/ausente/error → DENY

INGESTED != VERIFIED != VIGENTE
user_id de fila = auth.uid()  (IDOR / RLS)
score persistido ≠ autoridad  (re-eval al leer)
```

## Superficie

| Ruta / archivo | Rol |
|---|---|
| `app/exequatur/diagnostico/actions.ts` | Requiere sesión; guarda intento; redirect `?intento=` |
| `app/exequatur/plan` | Carga intento propio o último; ignora score de URL |
| `lib/exequatur/diagnostico/persistencia.ts` | Sesión + persist/load |
| `supabase/migrations/20260919000000_exequatur_diagnostico_intentos.sql` | Schema + RLS (no aplicada) |

## Criterio de cierre de Slice 3B

- Tests de identidad (`user_id` de sesión), IDOR, re-evaluación y fail-closed.
- PGlite: RLS propio vs ajeno, insert spoof, anon denegado, append-only.
- Regresión Slice 1 (auth) y gate único (`layout.tsx`).
- Typecheck verde.
- Sin aplicar SQL, sin secretos, sin write a corpus, sin merge/deploy/flag.
