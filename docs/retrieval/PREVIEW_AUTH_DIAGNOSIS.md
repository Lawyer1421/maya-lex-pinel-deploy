# Diagnóstico de Preview Auth — Fase 1E.3C

**Fecha:** 2026-09-27
**Fase:** Retrieval V3 — 1E.3C (Preview/Staging únicamente)
**SHA de partida:** `63cf4cd89abbbaca22d64cbc96977abfac44a739`

## 1. Flujo actual (mapeado desde el código)

```
Preview login (/login, app/login/page.tsx)
  → createSupabaseBrowserClient()
  → supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl } })
    o supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl } })
  → callbackUrl = buildAuthCallbackUrl(window.location.origin, next)   [lib/auth/redirect.ts]
  → Supabase Auth (proyecto resuelto por NEXT_PUBLIC_SUPABASE_URL del entorno Preview)
  → usuario hace clic en el enlace / vuelve de Google
  → GET /auth/callback?code=...&next=...                              [app/auth/callback/route.ts]
  → createSupabaseServerClient() (SSR, cookies)                       [lib/supabase-ssr.ts]
  → supabase.auth.exchangeCodeForSession(code)
  → si éxito: cookie de sesión + redirect a origin+next saneado
  → si falla: redirect genérico a /login?error=link_invalido (detalle solo en log server-side)
  → petición autenticada a /api/chat con `Authorization: Bearer <access_token>`
  → getVerifiedEmail(req)                                              [lib/rate-limit.ts]
    → valida el token vía supabase.auth.getUser(token) — NUNCA confía en headers/body del llamante
  → isFlagEnabledForUser(flag, email) puede usar esa identidad verificada
```

## 2. Preview deployment inspeccionado

- Deployment: `dpl_4Vm5kuJRhP6Fg1yTSuztLn473WD9`, estado `READY`
- URL: `maya-lex-pinel-deploy-nip0k6y10-fredy-pinel-flores-projects.vercel.app`
- Commit: `63cf4cd89abbbaca22d64cbc96977abfac44a739` (coincide exactamente con el HEAD de esta fase)
- Protección del proyecto: `ssoProtection.enabled = true`, `deploymentType = 'all_except_custom_domains'`

## 3. Preview → Staging Supabase (invariante crítico)

`PREVIEW_AUTH_SUPABASE = STAGING` (alta confianza, no 100% verificable en vivo).

Evidencia:
- Las variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
  `SUPABASE_SERVICE_ROLE_KEY` con `target=preview` son filas **completamente
  separadas** (IDs y timestamps de actualización distintos) de sus
  equivalentes `target=production` — confirmado vía Vercel API, sin
  desencriptar ningún valor.
- El propio código documenta esta separación explícitamente: el commit
  `dcc1340` (2026-08-01, `fix(auth): stop forcing production origin for
  magic link callback`) describe el bug original exactamente como *"el
  magic link se emite contra Supabase Staging (env vars del Preview) pero
  el código se intentaba canjear contra Supabase Producción"* — es decir,
  el propio autor del código confirma que Preview siempre apuntó a
  Staging por diseño.
- No se pudo confirmar el valor literal por decodificación directa
  (no autorizado ni necesario: los publishable/anon keys de Staging ya son
  públicos y conocidos de fases anteriores — `aicakncgtuiiuomflkqj` — y no
  coinciden con ningún patrón de Producción visible en el código).

Si esto fuera falso (Preview apuntando a Producción), sería P0 — no hay
evidencia de eso en ningún punto de esta auditoría ni de las anteriores.

## 4. Falla reproducida — y su límite real

**No se pudo ejecutar un login real (magic link ni Google OAuth) contra el
Preview**, porque **Vercel SSO intercepta la petición antes de que llegue
a la aplicación** — confirmado empíricamente en esta misma fase:

```
GET /login          → 302 → https://vercel.com/sso-api?url=.../login&nonce=...
GET /auth/callback   → 302 → https://vercel.com/sso-api?url=.../auth/callback...&nonce=...
```

Esto significa que **cualquier** solicitud no autenticada contra el
Preview — incluyendo el clic en un enlace mágico desde un cliente de
correo, o el retorno de Google OAuth — es interceptada por Vercel antes de
que `/auth/callback` se ejecute. No se intentó eludir esta protección (ni
se intentará): es exactamente la restricción de la Sección 13 de la
directiva.

## 5. Clasificación de la falla

**`SSO_PROTECTION_INTERFERENCE`** — confirmado, es la causa estructural que
bloquea la verificación end-to-end hoy.

Explícitamente **descartadas** como causa activa (evidencia en contra):

- `APPLICATION_CODE_BUG` — el código de construcción de la URL de callback
  (`buildAuthCallbackUrl`) y el saneamiento de `next`
  (`sanitizeNextPath`) ya fueron corregidos el 2026-08-01 (commit
  `dcc1340`), meses antes de esta rama, y las pruebas existentes
  (`tests/auth-redirect.test.ts`, `tests/auth-callback.test.ts`) los
  cubren. `getVerifiedEmail` (lib/rate-limit.ts) ya validaba
  correctamente vía `auth.getUser(token)` sin confiar en headers/body —
  confirmado y ahora cubierto por pruebas nuevas (§7).
- `CALLBACK_ORIGIN_MISMATCH` — resuelto por el mismo commit `dcc1340`; el
  callback usa el origin real de la solicitud, nunca fuerza
  `mayalexhn.com` para un host `*.vercel.app`.
- `PREVIEW_ENV_MISWIRED` — las tres variables requeridas
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`) están **presentes** en `target=preview`
  (confirmado vía Vercel API, sin exponer valores).

No descartadas por falta de herramienta de inspección — reportadas como
`UNKNOWN`, no como resueltas ni como causa activa:

- `SITE_URL_MISMATCH` / `REDIRECT_URL_MISMATCH` (configuración de Auth en
  el propio proyecto de Supabase Staging: Site URL y Allowed Redirect
  URLs). El MCP de Supabase disponible en esta sesión no expone un
  endpoint de solo lectura para la configuración de Auth (Site URL /
  Redirect URLs viven en el plano de control de Supabase, no en tablas
  Postgres consultables por `execute_sql`). No se puede confirmar ni
  descartar sin acceso al Dashboard o a la Management API de Supabase.

## 6. Seguridad del redirect (Sección 7 de la directiva)

Verificado — y ahora con cobertura de prueba explícita a nivel de handler,
no solo de la función pura:

- El callback **siempre** redirige al origin real de la solicitud
  (`new URL(request.url).origin`), nunca a un origin hardcodeado ni al de
  Producción cuando la solicitud llegó desde Preview.
- `next` se sanea con `sanitizeNextPath` — fuente única compartida entre
  `/login` (construcción del callback) y `/auth/callback` (procesamiento);
  rechaza URLs absolutas, protocolo-relativas (`//evil.com`) y esquemas
  embebidos, cayendo siempre a `/chat`.
- Nuevo test de integración (`tests/auth-callback-session-exchange.test.ts`)
  prueba el *handler* completo, no solo `sanitizeNextPath` de forma
  aislada: un `next=https://evil.com` con intercambio de sesión exitoso
  redirige a `{origin}/chat`, nunca a `evil.com`.

## 7. Pruebas de seguridad de autenticación — nuevas (Sección 11)

Dos archivos nuevos, sin modificar ningún archivo de producción existente:

**`tests/get-verified-email-security.test.ts`** (7 pruebas) — prueba que
`getVerifiedEmail`:
- Sin `Authorization` → `null`, sin invocar a Supabase.
- Un header `X-User-Email`/`X-User-Id` falsificado se ignora por completo
  (no existe código que lo lea).
- `Authorization` sin prefijo `Bearer ` → `null`.
- Token inválido/expirado (Supabase responde error) → `null`, nunca el
  correo reclamado.
- Token válido → correo verificado por Supabase Auth, normalizado
  (`trim().toLowerCase()`).
- Supabase no configurado → `null`, nunca lanza.
- `createServerSupabaseClient` lanza → `null`, nunca propaga la excepción.

**`tests/auth-callback-session-exchange.test.ts`** (4 pruebas) — prueba el
handler `GET /auth/callback` completo:
- Sin `code` → redirige a `/login?error=link_invalido` sin llamar a
  Supabase.
- `exchangeCodeForSession` falla → redirige a error genérico, **sin fugar
  el mensaje de error de Supabase** en la URL de redirección (el detalle
  solo se registra server-side).
- Éxito → redirige al origin real + `next` saneado.
- Éxito con `next` malicioso → el open redirect se rechaza, cae a
  `{origin}/chat`.

Todas las pruebas ya existentes (`tests/auth-redirect.test.ts`,
`tests/auth-callback.test.ts`) siguen pasando sin modificación — no se
debilitó ninguna aserción.

## 8. Reparación — política aplicada

No se requirió ni se aplicó ningún cambio de código de aplicación: el
código ya era correcto (corregido en `dcc1340`, 2026-08-01). Se añadieron
únicamente pruebas nuevas que antes no existían para cerrar la brecha de
cobertura identificada por la directiva (fallo de intercambio de sesión,
resistencia a headers falsificados).

**No se requiere ninguna mutación externa de Supabase Auth ni de variables
de entorno de Vercel en este momento** — no porque no exista un blocker,
sino porque el blocker confirmado (`SSO_PROTECTION_INTERFERENCE`) no se
resuelve con una mutación de configuración menor: requeriría o bien (a)
que el fundador pruebe el flujo desde un navegador donde ya tiene sesión
de Vercel iniciada (sin cambio de configuración, solo una limitación de
cómo se puede probar), o (b) debilitar la protección SSO de Preview —
explícitamente prohibido sin autorización separada, y no recomendado por
esta auditoría sin que el fundador entienda el trade-off de seguridad
completo.

## 9. Bloqueadores restantes

1. **`SSO_PROTECTION_INTERFERENCE`** (confirmado) — Vercel SSO intercepta
   `/auth/callback` antes de que la aplicación lo procese, para cualquier
   solicitud no autenticada contra Vercel. Esto bloquea la verificación
   automatizada end-to-end del flujo de login, incluyendo por parte de
   este agente. **No bloquea necesariamente al fundador**, si prueba el
   flujo desde un navegador donde ya tiene sesión de Vercel activa para
   este equipo — eso no fue posible verificar en esta fase porque
   requeriría credenciales personales del fundador, fuera de alcance de
   un agente automatizado.
2. **Configuración de Auth de Supabase Staging (Site URL / Redirect URLs
   allowlist)** — `UNKNOWN`, sin herramienta de inspección de solo lectura
   disponible en esta sesión.
3. Variable de entorno con nombre mal escrito, presente pero inofensiva:
   `NEXT_PUBLIC_SUBABASE_ANON_KEY` (falta la "P" de Supabase) en
   `target=preview,production` — confirmado por grep que **ningún código
   del repositorio la referencia**; no representa un riesgo de
   funcionamiento ni de seguridad, solo ruido de configuración.

## 10. Propiedades de seguridad confirmadas (sin secretos expuestos)

- El callback de auth nunca puede redirigir a un origin externo
  (`sanitizeNextPath` + uso del origin real de la solicitud).
- `getVerifiedEmail` no puede ser engañado por ningún header o campo del
  cuerpo controlado por el cliente — la única fuente de verdad es
  `auth.getUser(token)` contra Supabase.
- Un fallo de intercambio de sesión nunca expone el mensaje de error de
  Supabase al cliente — se registra solo server-side.
- Preview y Producción usan credenciales de Supabase completamente
  separadas (filas de entorno distintas en Vercel).
