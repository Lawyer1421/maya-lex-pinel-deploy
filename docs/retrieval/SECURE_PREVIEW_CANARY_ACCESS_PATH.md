# Ruta segura de acceso al canary de Preview — Fase 1E.3C.1

**Fecha:** 2026-09-27
**Fase:** Retrieval V3 — 1E.3C.1 (solo diseño / lectura — sin escrituras)
**SHA de partida:** `bd8fa470c71b052c4813b0cc57ff7a5a743873a8`

## Contexto

La Fase 1E.3C confirmó que el código de aplicación de autenticación ya es
correcto (`dcc1340`, 2026-08-01) y que el bloqueador real hoy es
`SSO_PROTECTION_INTERFERENCE`: Vercel intercepta `/login` y
`/auth/callback` del Preview antes de que la app de MayaLex los reciba,
para cualquier solicitud no autenticada contra Vercel. Este documento
evalúa cómo ejecutar un canary founder-only sin debilitar esa protección.

## 1. Opciones investigadas

### A. Sesión de navegador del fundador ya autenticada contra Vercel SSO

Vercel llama a este mecanismo **"Vercel Authentication"**
(`ssoProtection` en la API de proyectos, con `deploymentType` entre
`"preview" | "prod_deployment_urls_and_all_previews" | "all"` — este
proyecto usa `all_except_custom_domains`). Su diseño explícito es: los
miembros del equipo de Vercel dueño del proyecto **no necesitan ningún
bypass** — al visitar un deployment protegido sin sesión, Vercel los
redirige a `vercel.com/sso-api`, inician sesión con su cuenta de Vercel
(la misma cuenta que ya administra este proyecto — creador de todos los
deployments inspeccionados: `abogadofredypinelfirmalegal-4662`), y a
partir de ahí el navegador queda con una sesión válida para **todos** los
deployments protegidos de ese equipo, sin re-preguntar en cada visita.

Esto incluye `/auth/callback`: una vez que el navegador tiene esa sesión
de Vercel, un clic en el enlace mágico de Supabase (o el retorno de
Google OAuth) hacia esa misma URL de Preview **pasa a través de la
protección de Vercel de forma transparente** y llega a la aplicación real
de MayaLex, donde el flujo Supabase ya verificado en la Fase 1E.3C se
ejecuta sin cambios.

**`FOUNDER_BROWSER_CANARY_PATH = VIABLE`** — no requiere ninguna
mutación de infraestructura, ningún secreto nuevo, ningún cambio de
dominio. Solo requiere que el fundador abra la URL del Preview en un
navegador donde ya tenga sesión iniciada en vercel.com con la cuenta
dueña de este proyecto.

### B. "Protection Bypass for Automation" (secreto de bypass)

Mecanismo real y soportado por Vercel
(`PATCH /v1/projects/{idOrName}/protection-bypass`, expuesto también como
`VERCEL_AUTOMATION_BYPASS_SECRET`). Uso: header
`x-vercel-protection-bypass: <secreto>` (con `x-vercel-set-bypass-cookie:
true` para persistirlo como cookie de navegador) o como query param
`?x-vercel-protection-bypass=<secreto>` para servicios que no pueden fijar
headers.

Propiedades (documentación oficial, no verificado en vivo — **no se
generó ningún secreto en esta fase**):

- **Alcance exacto:** a nivel de **proyecto completo**, no de un
  deployment o rama específica. Un secreto generado bypassa la protección
  de Vercel en *cualquier* deployment protegido del proyecto, no solo en
  el Preview de `refactor/retrieval-v3-exact-resolver`.
- **¿Project-wide o deployment-specific?** Project-wide (confirmado por
  el endpoint: `PATCH /v1/projects/{idOrName}/protection-bypass`, sin
  parámetro de deployment).
- **¿Revocable?** Sí — el mismo endpoint acepta `revoke` para revocar y
  regenerar.
- **¿Bypassa solo la protección de Vercel o también el Auth de MayaLex?**
  **Solo la capa de Vercel.** No autentica contra Supabase ni contra la
  app — simplemente deja pasar la solicitud HTTP hasta el código de
  MayaLex, donde el login real (magic link / Google OAuth /
  `getVerifiedEmail`) sigue aplicando sin cambios.
- **¿Se puede restringir a Preview?** No hay una opción documentada para
  limitarlo únicamente a deployments de Preview — es un secreto único a
  nivel de proyecto. En la práctica, dado que Production de este proyecto
  se sirve por dominio personalizado (`mayalexhn.com`, ya exento de SSO
  por `all_except_custom_domains`), el secreto solo tendría efecto
  práctico sobre Preview — pero eso es una consecuencia de la topología
  actual, no una restricción del mecanismo en sí.

**No se generó este secreto en esta fase** (explícitamente prohibido por
la directiva).

### C. Enlace compartible con bypass user-scoped (`PATCH /aliases/{id}/protection-bypass`)

Mecanismo distinto y más acotado que B: opera sobre un **alias/deployment
específico** (no el proyecto completo), admite un `ttl` opcional (expira
solo si se fija; si no, no expira) y admite `revoke`. Documentado
explícitamente como el mecanismo detrás de "shareable links" y "user
scoped access for Vercel Authentication".

- **Alcance:** un alias o deployment puntual — más estrecho que B.
- **Revocable:** sí, mismo endpoint.
- **¿Bypassa Auth de MayaLex?** No, igual que B — solo la capa de Vercel.
- **¿Restringible a Preview?** Sí, por construcción — se aplica al alias
  de ESTE Preview, no a todo el proyecto.

**Tampoco se generó ningún enlace en esta fase** — requeriría
autorización del fundador separada, igual que B.

### D. Dominio personalizado temporal en Preview

La protección actual es `all_except_custom_domains` — cualquier dominio
personalizado (no `*.vercel.app`) queda automáticamente exento de SSO.
Confirmado por lectura: el proyecto hoy solo tiene 2 dominios
(`mayalexhn.com` y `maya-lex-pinel-deploy.vercel.app`, ninguno restringido
a esta rama) — no existe ya un dominio de Preview.

Evaluación de riesgo (sin adjuntar nada):

- **Alcance público:** total — cualquiera que descubra el dominio (logs
  de Certificate Transparency al emitirse el certificado TLS, DNS
  enumeration, un enlace compartido por error) tendría acceso sin
  restricción de Vercel al Preview — incluyendo código de Retrieval V3
  aún no publicado y el adaptador CEDIJ en vivo.
- **Configuración de Supabase:** requeriría una entrada nueva en el
  allowlist de Redirect URLs de Staging para ese dominio.
- **Cambios DNS:** requiere crear un registro DNS nuevo (subdominio) y
  esperar verificación de Vercel.
- **Indexación accidental:** un dominio nuevo sin `robots.txt`/`noindex`
  explícito puede ser rastreado antes de que alguien recuerde
  bloquearlo.
- **Propiedad del dominio:** requeriría usar un subdominio de
  `mayalexhn.com` (el único dominio propio disponible) — asocia
  visiblemente el Preview no publicado con la marca de producción.
- **Limpieza:** manual — desatar el dominio, borrar el registro DNS, y
  recordar retirar la entrada del allowlist de Supabase. Alto riesgo de
  quedar olvidado y expuesto indefinidamente.

**No recomendado** — es la opción de mayor riesgo de las cinco, y
contradice directamente la prioridad de seguridad de la directiva
("Avoid: public Preview").

### E. Ejecución local de la rama exacta contra Staging real

Viable. Ejecutar `npm run dev` (o `next build && next start`) localmente
con las mismas variables que usa hoy el Preview (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — las tres ya
confirmadas presentes en `target=preview` de Vercel) copiadas por el
fundador a un `.env.local` no commiteado.

- **Alcance de variables necesarias:** las tres de Staging arriba, más
  `HF_API_TOKEN` si se quiere ejercitar retrieval semántico real, y
  cualquier flag de Anthropic/Cohere si se quiere una respuesta completa
  del LLM (no estrictamente necesario solo para probar el canary de
  identidad).
- **URL de callback:** `http://localhost:3000/auth/callback` — Supabase
  Auth debe tener esta URL (o un patrón que la cubra) en su allowlist de
  Redirect URLs de Staging para que `signInWithOtp`/`signInWithOAuth` no
  la rechace. Esto es exactamente la misma incógnita `UNKNOWN` señalada
  en la Fase 1E.3C (§5 del diagnóstico) — pero `localhost` suele estar
  pre-habilitado por convención de desarrollo en la mayoría de proyectos
  Supabase, a diferencia de una URL de Preview dinámica de Vercel.
- **Método de autenticación del fundador:** el mismo `/login` real de la
  app (magic link o Google OAuth), sin ningún atajo — el fundador recibe
  el correo real y hace clic, o completa el flujo real de Google.
- **Diferencias con Vercel Preview:** (a) runtime local (Node de la
  máquina del fundador) en vez del runtime de Vercel/edge; (b) sin la capa
  de protección de Vercel en absoluto — nunca se ejercita ni se resuelve
  la pregunta de `SSO_PROTECTION_INTERFERENCE`; (c) cookies sobre `http://
  localhost` en vez de `https://*.vercel.app` — puede diferir en atributos
  `Secure`/`SameSite` aunque el código de `@supabase/ssr` normalmente
  maneja esto de forma transparente.
- **Qué SÍ prueba:** que toda la cadena de aplicación —
  login → Supabase Auth real (Staging) → `/auth/callback` →
  `getVerifiedEmail` → `isFlagEnabledForUser` → disparo de
  `OFFICIAL_FALLBACK_REQUIRED` → adaptador CEDIJ real — funciona de
  extremo a extremo con datos e infraestructura reales, sin ningún
  atajo de seguridad.
- **Qué NO prueba:** que el mismo flujo funcione específicamente *a
  través de la topología de Vercel* (Edge Network, el propio
  `SSO_PROTECTION_INTERFERENCE`, ni el allowlist de Redirect URLs para
  el host de Preview real).

### F. Otro mecanismo soportado

Se revisó también el patrón de **OIDC de fuentes confiables** (Vercel
"Trusted Sources" / GitHub Actions OIDC,
`x-vercel-trusted-oidc-idp-token`) — está diseñado para pipelines de CI
autenticados vía el emisor OIDC de GitHub, no para que un humano complete
un flujo de login interactivo en un navegador. No aplica aquí mejor que
la Opción A, y añadiría una integración nueva (GitHub Actions ↔ Vercel)
sin necesidad. Descartado por no aportar ninguna ventaja sobre A o E para
este caso de uso.

## 2. Matriz de decisión

| Opción | Seguridad | Fidelidad al Preview real | Interacción manual | Reversibilidad | Riesgo |
|---|---|---|---|---|---|
| **A. Sesión del fundador (Vercel SSO ya autenticado)** | Máxima — cero artefactos nuevos, es el mecanismo diseñado por Vercel para esto exacto | Máxima — es el Preview real, runtime real | Mínima — abrir la URL en un navegador ya autenticado | N/A — nada que revertir | Mínimo |
| B. Secreto de automation bypass (project-wide) | Media — secreto real, alcance de todo el proyecto | Alta — Preview real, solo se salta la capa de acceso | Baja tras generarlo | Buena — revocable | Medio — alcance más amplio de lo necesario para un solo Preview |
| C. Enlace compartible user-scoped (por alias, con TTL) | Media-alta — acotado a un deployment, expira si se fija TTL | Alta — Preview real | Baja tras generarlo | Buena — revocable/TTL | Medio-bajo — sigue siendo un bearer credential en una URL |
| D. Dominio personalizado temporal | Mínima — expone el Preview públicamente sin ninguna barrera de Vercel | Alta técnicamente, pero cambia el modelo de accesibilidad | Alta — DNS + verificación + limpieza manual | Pobre — requiere limpieza manual, riesgo de olvido | Alto — descartada |
| E. Harness local contra Staging real | Alta — sin artefactos de Vercel, solo credenciales que el fundador ya posee legítimamente | Media — mismo código y Staging real, pero runtime distinto y no ejercita Vercel/SSO | Media — copiar variables a `.env.local` una vez | Trivial — borrar `.env.local` | Bajo |

## 3. Recomendación

**Opción A como ruta primaria — sesión del fundador ya autenticada contra
Vercel SSO.** Es la única opción que:

- No crea ningún secreto, enlace ni dominio nuevo que gestionar o
  recordar revocar.
- Usa exactamente el mecanismo que Vercel diseñó para este caso de uso
  (miembros del equipo acceden a sus propios deployments protegidos sin
  fricción).
- Prueba el Preview real, con la topología real de Vercel, cerrando
  también la incógnita de `SSO_PROTECTION_INTERFERENCE` de la Fase
  1E.3C de una vez.
- Requiere cero interacción de este agente con infraestructura — la
  única acción pendiente es que el fundador, en su propio navegador ya
  autenticado en vercel.com, abra la URL del Preview y complete el login
  real (magic link o Google) tal como lo haría cualquier usuario.

**Opción E como complemento, no como sustituto** — útil para validar de
forma inmediata y sin ninguna dependencia de Vercel que la cadena
`getVerifiedEmail → isFlagEnabledForUser → OFFICIAL_FALLBACK_REQUIRED →
CEDIJ` funciona end-to-end con Staging real, en cuanto el flag se siembre
en una fase posterior autorizada — sin esperar a que el fundador tenga
tiempo de hacer la prueba manual en Preview.

**Opciones B, C y D no se recomiendan como ruta principal**: B y C son
viables técnicamente y quedan documentadas por si la Opción A resultara
inviable por algún motivo no anticipado (p. ej. el fundador probando desde
un dispositivo sin su sesión de Vercel), pero introducen un artefacto de
seguridad nuevo que gestionar sin necesidad, cuando la Opción A ya
resuelve el problema sin ninguno. D se descarta explícitamente por su
perfil de riesgo.

## 4. Qué NO se hizo en esta fase

- No se generó ningún secreto de automation bypass (Opción B).
- No se generó ningún enlace compartible (Opción C).
- No se adjuntó ningún dominio personalizado (Opción D).
- No se sembró `flag_official_source_fallback`.
- No se escribió en ninguna base de datos.
- No se tocó Production.
- No se desplegó ni se hizo merge de nada.
