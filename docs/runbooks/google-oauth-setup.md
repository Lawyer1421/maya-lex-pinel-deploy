# Runbook: configuración de Google Sign-In (BLOQUEADO — requiere acción externa)

## Por qué el código por sí solo no basta

`signInWithOAuth({ provider: 'google' })` (usado en `app/login/page.tsx`)
y el manejo del callback (`app/auth/callback/route.ts`) están
implementados y probados con mocks, pero **Google Sign-In no funcionará
hasta que se configure, desde fuera de este repositorio**:

1. **Google Cloud Console**: crear un proyecto (o usar uno existente),
   habilitar "Google Identity Services", crear credenciales OAuth 2.0
   (tipo "Web application") con:
   - Authorized JavaScript origins: `https://mayalexhn.com`
   - Authorized redirect URI: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
     (la URL exacta la da el dashboard de Supabase, sección Auth → Providers → Google)

2. **Supabase Dashboard → Authentication → Providers → Google**:
   activar el provider y pegar el `Client ID`/`Client Secret` generados
   en el paso 1.

3. **Supabase Dashboard → Authentication → Settings**: revisar la
   opción de vinculación manual de cuentas (el nombre exacto varía según
   versión — busque algo como "Enable manual linking" o el
   comportamiento por defecto de "Confirm email"). **Esto es crítico**:
   determina si Supabase fusiona automáticamente una cuenta de Google
   con una cuenta de correo/contraseña existente que comparta el mismo
   correo, ANTES de que el código de esta app pueda intervenir.
   Recomendado: dejar la vinculación automática **desactivada**, para
   que un correo ya registrado por contraseña nunca se fusione en
   silencio solo porque alguien inició sesión con Google usando ese
   mismo correo — el usuario deberá autenticarse con su método original
   primero.

4. **Redirect URLs permitidas** (Supabase Dashboard → Authentication →
   URL Configuration): agregar `https://mayalexhn.com/auth/callback` y,
   para pruebas locales, `http://localhost:3000/auth/callback`.

## Qué SÍ está implementado y probado (sin credenciales reales)

- Botón "Continuar con Google" (`app/login/page.tsx`).
- Manejo del callback OAuth, incluyendo extracción de `provider` desde
  `app_metadata` (`app/auth/callback/route.ts`).
- Clasificación pura de resultado de vinculación
  (`lib/identity-linking.ts::classifyIdentityLinkOutcome`) — probada con
  8 casos en `tests/identity-linking.test.ts` sin necesitar Google real.
- Tabla de auditoría `identity_link_events` — probada contra Postgres
  real (`tests/sql/profiles.sql.test.ts`).

## Qué NO se pudo probar en este sprint

El flujo OAuth real de extremo a extremo (clic en "Continuar con
Google" → pantalla de consentimiento de Google → callback → sesión
creada) requiere las credenciales de los pasos 1-2 arriba, que no
existen en este proyecto de Supabase todavía. Igual que con el runbook
de PayPal Sandbox, esto queda documentado como bloqueado por falta de
configuración externa, no fabricado ni simulado como si hubiera pasado.
