# Exequátur Slice 3B — Persistencia de intentos / progreso

**Rama autorizada:** `feat/exequatur-slice-3b-persistence`  
**Base:** `a4a55fcd6b77d4e7cc8b7b26887e831efa1cb8ad` (`origin/main`, merge PR #43)  
**Referencia técnica (no merge):** `cursor/exequatur-slice-3b-persistencia-d401` / PR #44  
**Flag:** reutiliza `flag_exq_enabled` (Slice 1). Sin flag nuevo. Sin `FLAG_ACTIVATION` (P3).  
**SQL:** migración en repo. **No** se aplica a producción en este PR (`SQL_APPLY` es P3).

## Decisiones de Control Plane (cerradas)

| ID | Determinación |
|---|---|
| P0 | Prototipo #44 = referencia técnica. No se mergea. Transferencia limpia a esta rama. |
| P1 | Modelo B: `user_id = auth.uid()` con FK `auth.users` / `ON DELETE CASCADE`. Billing sigue en `user_identifier` email. |
| P2 | Retención indefinida de `[{ item_id, selected_option }]`. No imprimir payloads en logs. |
| SEC | Cero políticas o GRANT de `service_role` en estas dos tablas. Solo `auth.uid() = user_id`. |

## Qué entra

- Tablas `exequatur_diagnostico_intentos` (append-only) y `exequatur_diagnostico_progreso` (1 fila / usuario).
- Cliente exclusivo: `createSupabaseServerClient()`. `service_role` prohibido.
- RLS `FORCE`: `authenticated` solo `user_id = auth.uid()`.
- Al leer se re-evalúa `respuestas`. El score persistido no es autoridad.
- `/exequatur/plan?intento=<uuid>` propio o último propio. Query-score ignorada.
- Fail-closed si la tabla no existe o el intento es ajeno.

## Qué no entra

| Frente | Estado |
|---|---|
| `SQL_APPLY` a staging/prod | P3 fundador |
| `FLAG_ACTIVATION` | P3 fundador |
| Refactor global billing → UUID | backlog; no bloquea Exequátur |
| Formularios / ciclo notarial | Slice 4+ |
| Ingesta, campaña, PayPal, RAG, `access.ts` | prohibido |

## Invariantes

```
free / académico     → DENY
pro + flag           → ALLOW
admin + flag         → ALLOW_INTERNAL
flag off/ausente/error → DENY

INGESTED != VERIFIED != VIGENTE
user_id de fila = auth.uid()
score persistido ≠ autoridad
service_role ≠ bypass en estas tablas
```

## Criterio de cierre

- 17 escenarios de seguridad (app + PGlite con cambio real de roles).
- Typecheck verde.
- Sin aplicar SQL, sin secretos, sin write a corpus, sin merge/deploy/flag.
