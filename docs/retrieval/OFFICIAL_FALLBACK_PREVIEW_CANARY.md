# Official Fallback — Preview Canary Runbook (Fase 1E.3)

**Naturaleza de este documento:** precheck de solo lectura antes de escribir
`flag_official_source_fallback` en cualquier base de datos. **Ningún dato en
este documento resultó de una escritura** — toda verificación fue `SELECT`,
lectura de metadata de Vercel (nunca desencripta secretos), o inspección de
código fuente ya versionado.

**Veredicto de esta fase:** `READY_FOR_CANARY_FLAG_WRITE = NO` — se
encontraron dos bloqueadores reales, documentados abajo (§Bloqueadores), que
deben resolverse (o al menos reconocerse explícitamente) antes de escribir el
flag.

## Addendum de ejecución — Fase 1E.3C.8 (2026-09-27, autorizado)

Ambos bloqueadores de este precheck quedaron resueltos en fases
posteriores: `feature_flags` se sembró con RLS+FORCE RLS+política
`service_only` (Fase 1E.3B), y Preview Auth quedó verificado end-to-end con
la identidad real del fundador (Fases 1E.3C–1E.3C.7). Con autorización
explícita del fundador, se insertó la fila `flag_official_source_fallback`
con `enabled=true` y `allowed_emails` conteniendo exactamente un correo —
el del fundador, ya conocido por Supabase Auth y por el propio sistema de
sesión, no repetido en este documento — exclusivamente contra Staging
(`aicakncgtuiiuomflkqj`); Production (`thgrhueckkjdutjvcufp`) nunca fue
referenciada. Validado inmediatamente después: la fila existe con esa
allowlist de un solo correo (canario de un solo usuario, normalizado
`trim().toLowerCase()` igual que `lib/flags.ts`/`getVerifiedEmail`), y las
otras 6 filas de `feature_flags` permanecen `enabled=false`, sin tocar.

**Rollback inmediato (preferido — no destructivo):**

```sql
UPDATE public.feature_flags SET enabled = false WHERE flag_name = 'flag_official_source_fallback';
```

**Rollback alternativo (solo si se requiere eliminar el registro por completo):**

```sql
DELETE FROM public.feature_flags WHERE flag_name = 'flag_official_source_fallback';
```

`READY_FOR_CANARY_FLAG_WRITE` de este documento queda superado por esta
ejecución — el resto del archivo abajo es el registro histórico del
precheck original, no el estado actual.

---

## 1. Estado del deployment de Preview

| Campo | Valor |
|---|---|
| Deployment ID | `dpl_ANn9RuBBWHM3kDn7D2Sr8bzBq3fN` |
| URL | `maya-lex-pinel-deploy-aimsjsnly-fredy-pinel-flores-projects.vercel.app` |
| Estado | `READY` |
| Branch | `refactor/retrieval-v3-exact-resolver` |
| Commit | `637c80904c604effd4c2746e1a01f63d6f87d980` (coincide exacto con HEAD de esta fase) |
| Protección de deployment | SSO habilitado (`ssoProtection.enabled: true`, `all_except_custom_domains`) — confirmado que sigue exigiendo login de Vercel para cualquier visitante sin sesión (probado con `curl` y con el browser de esta sesión: ambos recibieron `302` a `vercel.com/sso-api`). No se intentó eludir. |

## 2. Aislamiento Supabase de Preview

**`PREVIEW_SUPABASE = STAGING`** (confianza alta, evidencia indirecta —
ver limitación abajo).

Evidencia:
1. `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` tienen filas
   **separadas y con IDs distintos** para `target=["preview"]` vs.
   `target=["production"]` en Vercel (`gqwX9WirouKubuCA` vs. `1uGjdK4DjbKuceMw`
   para la URL; actualizadas en momentos distintos) — si compartieran valor no
   habría razón para mantenerlas como filas separadas.
2. Comentario explícito en el código fuente ya versionado
   (`lib/auth/redirect.ts:17-23`, cita textual): *"el magic link se emite
   contra Supabase Staging (env vars de Preview) pero el canje del código
   terminaba corriendo contra Supabase Producción en mayalexhn.com —
   proyectos distintos"* — describe un bug real ya corregido, que solo pudo
   existir porque Preview y Producción usan proyectos Supabase DISTINTOS.

**Limitación reconocida:** Vercel nunca desencripta el valor de una env var
vía API (`decrypted: false` siempre), y el deployment de Preview está detrás
de SSO -- no pude leer el valor literal de `NEXT_PUBLIC_SUPABASE_URL` para
Preview de forma directa (ni vía API de Vercel ni vía fetch del bundle
cliente, que habría sido la técnica de verificación directa). La conclusión
`STAGING` se apoya en evidencia estructural + documentación de código, no en
una lectura literal del valor. Si se requiere certeza absoluta antes de
activar el canario, el propio fundador puede confirmarlo en 10 segundos desde
el dashboard de Vercel (Settings → Environment Variables → Preview →
`NEXT_PUBLIC_SUPABASE_URL` → revelar valor).

**Producción:** `thgrhueckkjdutjvcufp` (confirmado con la misma técnica en
fases anteriores de esta sesión, vía inspección del bundle JS público de
`mayalexhn.com`, sin SSO de por medio).

## 3. Infraestructura del flag en Staging

**`ROW_EXISTS = NO` — y más importante: la TABLA `feature_flags` no existe
en absoluto en el proyecto Staging (`aicakncgtuiiuomflkqj`).**

Confirmado con `list_tables` contra staging: la tabla no aparece en el
listado completo de tablas públicas (sí aparecen `hn_normas_verificadas_staging`,
`biblioteca_vectores`, etc., pero ningún `feature_flags`).

**Esto es un BLOQUEADOR real, no solo la ausencia de una fila.** Ver
§Bloqueadores.

## 4. Estado del flag en Producción

**`PRODUCTION_OFF = YES`.**

`SELECT flag_name, enabled FROM feature_flags WHERE flag_name =
'flag_official_source_fallback'` en `thgrhueckkjdutjvcufp` → `[]` (cero
filas). El flag no existe en Producción — ausencia de fila es
fail-closed por diseño de `isFlagEnabledForUser()`.

## 5. Semántica del feature flag (inspección de código, `lib/flags.ts` + `app/api/chat/route.ts`)

Confirmado por lectura directa del código (sin ejecutar nada):

| Requisito | Confirmado |
|---|---|
| Flag desconocido/ausente → false | Sí (`if (!row \|\| !row.enabled) return false;`) |
| Flag OFF → CERO llamada a CEDIJ | Sí -- `shouldAttemptOfficialFallback()` retorna `false` antes de construir ninguna `OfficialSourceQuery`; probado en Fase 1E.2 (test A: `fetchMock` nunca invocado). |
| Solo identidad del fundador (allowlist) → ruta de canario | Sí -- `allowed_emails` no vacío exige coincidencia exacta normalizada (trim+lowercase). |
| Usuarios globales permanecen OFF | Sí -- mismo mecanismo: `allowed_emails` con contenido excluye a cualquier correo no listado. |
| Fallo de lectura del flag → fail-closed | Sí -- cualquier `error`/excepción en `isFlagEnabledForUser()` retorna `false` (nunca `true` por fallo). |

## 6. Verificación de targeting del fundador

**`FOUNDER_CAN_BE_TARGETED = YES (mecanismo de código), con una advertencia operativa real -- ver Bloqueadores.**

`getVerifiedEmail(req)` (`lib/rate-limit.ts:114-131`) obtiene el correo
llamando a `supabase.auth.getUser(token)` con el Bearer token de la request
-- una validación criptográfica real contra el propio Supabase Auth del
proyecto activo (Staging, en Preview). No es spoofeable con un header
arbitrario: un token inválido/expirado hace que la función retorne `null`,
nunca un correo fabricado. Ese correo (normalizado) es el que se compara
contra `allowed_emails`.

No se expuso ningún token, cookie, ni dato de sesión real en esta
verificación -- solo se leyó el código fuente.

## 7. Verificación de auth en Preview

**`BLOCKED` (pendiente de confirmación) -- ver Bloqueadores.**

A nivel de código, `buildAuthCallbackUrl()` (`lib/auth/redirect.ts`) usa el
`origin` real de la request (nunca fuerza `mayalexhn.com`) -- esto es,
literalmente, la corrección de un bug histórico documentado en el propio
código (`AUTH_CALLBACK_REDIRECT_MISMATCH`) que garantiza que login/callback
en Preview permanecen en el origin de Preview, nunca redirigen a Producción.
Esa parte del mecanismo es sólida.

Sin embargo, en esta misma sesión de trabajo (episodio anterior, "PR #53
Preview Activation Gate") se encontraron DOS problemas de autenticación en
Preview sin confirmación posterior de que hayan quedado resueltos:
1. El enlace mágico (magic link) fallaba con "Invalid API key" -- posible
   desajuste entre `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
   del scope Preview.
2. El login con Google fallaba con "Error 401: deleted_client" en el
   proyecto Supabase Staging (Client ID de Google Cloud Console eliminado).

Ninguno de los dos se confirmó corregido en el resto de esta sesión. Si
siguen sin resolverse, el fundador **no podría autenticarse en Preview en
absoluto**, lo cual haría `FOUNDER_CAN_BE_TARGETED` teóricamente correcto
pero prácticamente inalcanzable -- no llegaría a generarse ningún Bearer
token válido para que `getVerifiedEmail` lo valide.

## 8. Bloqueadores encontrados (ambos deben resolverse o reconocerse antes de escribir el flag)

1. **La tabla `feature_flags` no existe en Staging.** Requiere aplicar
   `supabase/migrations/20260827000000_feature_flags.sql` (ya existente en
   el repo, nunca ejecutada contra `aicakncgtuiiuomflkqj`) antes de poder
   insertar ninguna fila de flag ahí.
2. **Login en Preview con estado de reparación no confirmado.** Magic
   link y Google OAuth mostraron errores reales en un episodio anterior de
   esta misma sesión; sin confirmación de que sigan funcionando, el
   fundador no podría generar una sesión autenticada en Preview para ser
   objetivo del canario.

## 9. Matriz de pruebas para el canario (diseño únicamente -- NO ejecutado)

| Caso | Escenario | Esperado |
|---|---|---|
| A | Corpus interno con éxito (consulta ya cubierta) | Sin intento de CEDIJ -- `outcome.state` nunca es `OFFICIAL_FALLBACK_REQUIRED` |
| B | Corpus insuficiente + legislación, canario activo | `OFFICIAL_FALLBACK_REQUIRED` → intento CEDIJ → metadata oficial si se encuentra |
| C | "Artículo 9999 del Código Procesal Penal" | `NO_VERIFIED_EVIDENCE`, CERO fallback amplio a CEDIJ |
| D | `sala_ia` | Sin fallback oficial (ruta siempre `D`) |
| E | CEDIJ sin resultados | Abstención segura, nunca una afirmación de que la ley no existe |

Estos 5 casos ya están probados exhaustivamente con red mockeada en
`tests/official-fallback-orchestrator.test.ts` y
`tests/chat-route-fail-closed.test.ts` (Fase 1E.2). Esta fase NO ejecuta el
fallback real contra CEDIJ desde el canario -- eso ocurre solo después de
activar el flag.

## 10. Línea base de latencia

**No disponible de forma segura en esta fase.** No existe telemetría
Langfuse probada end-to-end para este pipeline (fuera de alcance de esta
fase autorizar/depender de ella), y esta fase es explícitamente read-only --
generar tráfico real contra Preview para medir latencia excedería el
alcance "precheck" de la directiva. Recomendación: medir la línea base
manualmente (herramientas del navegador, `Network` tab) en la primera
prueba real que el fundador haga en Preview, antes de comparar contra el
comportamiento con el canario activo.

## 11. Mutación exacta propuesta para Staging — NO EJECUTADA

**Proyecto Supabase objetivo:** `aicakncgtuiiuomflkqj` (mayalexhn-staging)
**Tabla:** `public.feature_flags`

### Paso 1 (prerrequisito) — crear la tabla, aplicando la migración ya existente en el repo:

```sql
-- Aplicar tal cual: supabase/migrations/20260827000000_feature_flags.sql
-- (ya versionada, nunca ejecutada contra este proyecto)
```

### Paso 2 — sembrar el flag, OFF (mismo patrón que 20260906000000_flag_rerank.sql):

```sql
INSERT INTO public.feature_flags (flag_name, enabled, allowed_emails, description)
VALUES (
  'flag_official_source_fallback',
  false,
  '{}',
  'Retrieval v3 Fase 1E.2 -- fallback a CEDIJ (legislación) cuando el corpus interno no trae evidencia. Default OFF.'
)
ON CONFLICT (flag_name) DO NOTHING;
```

### Paso 3 (activación del canario, acción SEPARADA y posterior, solo cuando el fundador lo autorice explícitamente) — mismo mecanismo ya usado para `flag_rerank`:

```sql
UPDATE public.feature_flags
SET enabled = true,
    allowed_emails = ARRAY['<correo del fundador aquí>'],
    updated_at = now(),
    updated_by = 'control_plane_manual_activation_preview_canary'
WHERE flag_name = 'flag_official_source_fallback';
```

**Ningún paso de estos tres se ejecutó.**

## 12. Mutación de rollback (inmediata, sin deploy)

```sql
UPDATE public.feature_flags
SET enabled = false
WHERE flag_name = 'flag_official_source_fallback';
```

Alternativa igual de válida (quitar solo el targeting, dejar la fila):

```sql
UPDATE public.feature_flags
SET allowed_emails = '{}'
WHERE flag_name = 'flag_official_source_fallback';
```

(Nota: `allowed_emails='{}'` con `enabled=true` activaría el flag para
**todos** los usuarios -- la vacía como "sin restricción" es la semántica ya
existente de `isFlagEnabledForUser()`. Para desactivar completamente, usar
`enabled=false`, no vaciar `allowed_emails`.)

Ningún redeploy de código es necesario para ninguna de las dos direcciones
-- el flag se lee en cada request.

## 13. Criterios PASS antes de activar (checklist)

| Criterio | Estado |
|---|---|
| Preview definitivamente en Staging | ⚠️ Alta confianza, no 100% verificado (ver §2) |
| Flag de Producción OFF | ✅ |
| Targeting del fundador exacto | ✅ (mecanismo de código) |
| Auth de Preview funcional | ❌ **No confirmado** -- ver Bloqueador 2 |
| Lectura del flag fail-closed | ✅ |
| Adapter CEDIJ ya verificado en vivo | ✅ (Fases 1E.1 / 1E.1B, dos sesiones independientes) |
| Cero otros usuarios objetivo | ✅ (por diseño, mientras `allowed_emails` tenga un solo correo) |
| Rollback listo | ✅ (§12) |
| Cero escrituras de producción | ✅ |

## 14. Resultado

**`READY_FOR_CANARY_FLAG_WRITE = NO`** -- por los dos bloqueadores de §8.
Ninguno es un problema del código de Retrieval v3 (Fases 1A-1E.2) -- ambos
son infraestructura/entorno preexistente. Recomendación: resolver ambos (o
que el fundador confirme explícitamente que ya están resueltos) antes de la
siguiente fase que sí proponga ejecutar la escritura.
