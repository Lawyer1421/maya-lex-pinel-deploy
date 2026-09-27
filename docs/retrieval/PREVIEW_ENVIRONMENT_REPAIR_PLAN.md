# Plan de reparación del entorno de Preview — Fase 1E.3C.3

**Fecha:** 2026-09-27
**Fase:** Retrieval V3 — 1E.3C.3 (solo diagnóstico / lectura — sin mutaciones)
**SHA de partida:** `880597fc18718a6ac3041fd6c555cc84c88519d4`

## 0. Addendum de ejecución — Fase 1E.3C.4 (autorizada, 2026-09-27)

Con autorización explícita del fundador, la reparación propuesta en §12 se
ejecutó parcialmente usando el Vercel CLI ya autenticado (no el tool MCP
`edit_project_env`/`create_project_env`, confirmado roto en esta sesión —
mismo patrón de fallo que `create_deployment`):

- `NEXT_PUBLIC_SUPABASE_URL` (Preview): `vercel env rm` + `vercel env add`
  con el valor actual de `https://aicakncgtuiiuomflkqj.supabase.co`
  (obtenido vía `get_project_url`, Staging), sin trailing newline
  (`printf '%s'`, no `echo`). Nueva fila: `LnsSai6xvcYKCWYw`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Preview): mismo procedimiento, con el
  anon key legado de Staging (público por diseño de Supabase), usando
  `--type config` (el CLI exige elegir explícitamente entre `secret` y
  `config` para cualquier variable `NEXT_PUBLIC_*` que "parezca" una
  credencial — se eligió `config` porque un anon key está pensado para
  exponerse al navegador, igual que su configuración original). Nueva
  fila: `MHX5era63ZS4z6Ca`.
- `SUPABASE_SERVICE_ROLE_KEY` (Preview): **sin tocar, intencionalmente**
  — ninguna herramienta disponible en esta sesión puede obtener el valor
  actual de ese secreto en Staging (Supabase MCP nunca lo expone), y no
  se solicitó al fundador que lo pegara en el chat. El síntoma
  diagnosticado ("Invalid API key") es específico del flujo de
  `anon key` del navegador, no del `service_role`.
- Redeploy: `vercel redeploy maya-lex-pinel-deploy-mjwbosaiq-...vercel.app
  --target preview` — reconstruyó el mismo commit (`67aa98f`) con las
  variables nuevas. Nuevo deployment: `dpl_3c8JoQ52Hs1rzBppygmr76dteAQb`,
  `READY`, mismo alias de rama estable, SSO confirmado aún activo (`302`
  a `vercel.com/sso-api`).
- Producción verificada intacta: mismas filas de env (`1uGjdK4DjbKuceMw`,
  `DiIpYaLmtGrzru5a`, `pJHFiCD00pM899kz`) sin cambios de `updatedAt`;
  ningún deployment nuevo de `target=production` — el más reciente sigue
  siendo de `main`, de antes de esta sesión.
- No verificado todavía: si "Invalid API key" efectivamente desapareció
  en un login real — requiere que el fundador lo pruebe desde su propia
  sesión de Vercel (Fase 1E.3C.1, Opción A), ya que este agente sigue sin
  poder pasar la barrera SSO para probarlo directamente.

## 1. Estado del deployment de Retrieval-v3

| | |
|---|---|
| URL antigua referenciada | `maya-lex-pinel-deploy-nip0k6y10-...vercel.app` |
| Deployment antiguo | `dpl_4Vm5kuJRhP6Fg1yTSuztLn473WD9`, commit `63cf4cd`, listado como `READY` en el historial de la API de Vercel |
| Probado sin sesión de Vercel (este agente) | `302` a `vercel.com/sso-api` — **no** un `404` directo |
| Reportado por el fundador (con su sesión propia, pasando la barrera SSO) | `404 DEPLOYMENT_NOT_FOUND` |

**No se pudo reproducir el 404 exacto desde esta sesión** porque este agente
nunca pasa la barrera SSO de Vercel (por diseño, nunca se intentó eludir) —
solo se observa el gate de autenticación, no lo que hay detrás. Esto es
consistente con un comportamiento documentado de Vercel: el listado de
`list_deployments`/`get_deployment` es metadata histórica de la API, que
puede seguir mostrando `state: READY` para un build cuyo binario de
servicio ya fue recogido por garbage collection o cuya edge routing ya no
lo sirve. No se especula más allá de esto — se reporta como observado por
el fundador, no verificado independientemente por este agente.

**Deployment ACTUAL que sí coincide exactamente con el HEAD de la rama**:

| | |
|---|---|
| Deployment | `dpl_HnePV82fhLMFBDPiii6eZzsfvEj7` |
| URL | `maya-lex-pinel-deploy-dwzcx9rpp-fredy-pinel-flores-projects.vercel.app` |
| Commit | `880597fc18718a6ac3041fd6c555cc84c88519d4` — coincide exactamente con el HEAD actual de `refactor/retrieval-v3-exact-resolver` |
| Estado | `READY` |
| Probado (este agente, sin sesión) | `302` a `vercel.com/sso-api` — vivo y sirviendo, protegido por SSO como se espera |

**`RETRIEVAL_PREVIEW = EXISTS_MATCHING_HEAD`**

Esto confirma además la respuesta a la Sección 11 de la directiva: un
deployment de Preview fresco para esta rama **se generó automáticamente**
con el último `git push` (el commit de la Fase 1E.3C.1) — no fue necesario
ni se hizo ningún commit vacío ni ningún redeploy manual. La integración
Git de Vercel ya despliega Preview en cada push a esta rama.

## 2. Aislamiento del Preview de Langfuse

`feat/langfuse-observability` → `maya-lex-pinel-deploy-63d5bqxt1-...vercel.app`
permanece completamente fuera de esta rama. No se mutó, no se usó como
evidencia de nada de Retrieval V3, y no se propuso ningún merge hacia ni
desde esa rama. Se referencia en este documento únicamente porque el
síntoma de auth observado ahí (§4-5) resulta ser **relevante para
Retrieval-v3 también** — ver el hallazgo central de la Sección 3.

## 3. Auditoría de variables de entorno de Preview — hallazgo central

**Hallazgo crítico:** las variables de Preview de este proyecto **no están
segmentadas por rama** — `customEnvironmentIds: []` (o ausente) en las
tres variables requeridas confirma que aplican de forma idéntica a
**cualquier** deployment de Preview del proyecto, sin importar la rama.
Esto significa que el síntoma observado en el Preview de
`feat/langfuse-observability` ("Invalid API key", `deleted_client`) **no
es un problema de esa rama** — es un problema a nivel del entorno
`Preview` completo de Vercel, y por lo tanto **afecta igual al Preview de
`refactor/retrieval-v3-exact-resolver`**, incluyendo el deployment fresco
`dpl_HnePV82fhLMFBDPiii6eZzsfvEj7`.

| Variable | Estado | Scope | customEnvironmentIds |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **PRESENT** | `preview` | `[]` (aplica a toda rama de Preview) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **PRESENT** | `preview` | `[]` |
| `SUPABASE_SERVICE_ROLE_KEY` | **PRESENT** | `preview` | `[]` |
| `NEXT_PUBLIC_SUBABASE_ANON_KEY` (typo — falta la "P") | **PRESENT (ruido, no leído por ningún código)** | `preview, production` | `[]` |

La variable mal escrita **no es la causa** — es la variable de nombre
correcto (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) la que el código realmente
usa (`lib/supabase-browser.ts`, `lib/supabase.ts`, `lib/supabase-ssr.ts`
la referencian todas con el nombre correcto), y **esa** es la que produce
"Invalid API key" en tiempo de ejecución. Confirmado por grep: ningún
archivo del repositorio lee `NEXT_PUBLIC_SUBABASE_ANON_KEY`.

## 4. Causa raíz de "Invalid API key" — diagnóstico sin exponer secretos

`NEXT_PUBLIC_SUPABASE_ANON_KEY` inicializa el cliente de navegador en
[`lib/supabase-browser.ts`](../../lib/supabase-browser.ts):

```ts
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**Hallazgo de código (asimetría, no corregida en esta fase):** este
cliente de navegador usa los valores de `process.env` **directamente, sin
sanear espacios en blanco**. En cambio,
[`lib/supabase.ts`](../../lib/supabase.ts) (cliente servidor,
`createServerSupabaseClient`, usado por `getVerifiedEmail` y el resto del
backend) **sí** sanea explícitamente:

```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\s+/g, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\s+/g, '');
```

— con un comentario que documenta exactamente este riesgo: *"cualquier
espacio, tabulación o salto de línea proviene de un copy/paste al guardar
la variable... hace que Headers.set lance TypeError en cada request."*

Esta asimetría es un defecto de código real, recién descubierto en esta
fase — **no se corrigió aquí**, conforme a la instrucción de la directiva
de detenerse antes de tocar código. Se documenta como hallazgo para una
fase de reparación separada.

`"Invalid API key"` es un mensaje que solo puede originarse en el
**servidor de Supabase Auth**, rechazando una solicitud que sí incluyó un
`apikey`/`Authorization` — es decir, algún valor SÍ se envió y Supabase lo
rechazó. Esto descarta `MISSING` (que produciría un error distinto, del
propio SDK: `"supabaseKey is required"`, lanzado en el cliente antes de
llegar a la red) y descarta `WRONG_VARIABLE_NAME` (la variable con el
nombre correcto existe y el código la referencia correctamente).

**`PREVIEW_ANON_KEY_STATUS = PRESENT_BUT_INVALID`**

No se puede distinguir, sin decodificar el valor cifrado (no permitido en
esta fase), entre estas dos sub-causas igualmente plausibles y **no
excluyentes entre sí**:

1. El valor almacenado en Vercel tiene espacios/tabulaciones/saltos de
   línea residuales de un copy/paste — el cliente de navegador, al no
   sanear, envía un JWT corrupto.
2. El valor almacenado es una clave `anon` válida mal emparejada con la
   URL de otro proyecto (o una clave `anon` que dejó de ser válida por
   rotación en el panel de Supabase desde que se guardó por última vez en
   Vercel — `updatedAt: 1785716683560`, no actualizada desde entonces).

Ambas se resuelven con la misma reparación mínima (§12).

## 5. Emparejamiento URL / anon key

No se puede leer el valor cifrado de ninguna de las dos variables de
Preview (`decrypted: false` en ambas) — por lo tanto:

- `URL_PROJECT = UNKNOWN` (inspección directa). Evidencia circunstancial
  sigue apuntando a Staging: es una fila de Vercel completamente separada
  (ID `gqwX9WirouKubuCA`) de su equivalente en `production` (ID
  `1uGjdK4DjbKuceMw`), y el comentario del commit `dcc1340` documenta que
  Preview siempre se diseñó para usar Staging.
- `ANON_KEY_PROJECT = UNKNOWN` (mismo motivo).
- `PAIR_MATCH = UNKNOWN`.

**Importante — revisión de confianza respecto a la Fase 1E.3C:** en esa
fase se reportó `PREVIEW_AUTH_SUPABASE = STAGING` con alta confianza,
basada en la misma evidencia circunstancial de arriba. El síntoma nuevo
("Invalid API key") **no contradice directamente** esa conclusión — un
emparejamiento Producción-completo-y-válido NO produciría este error,
sino un login exitoso contra el proyecto equivocado (que sería peor: fuga
de datos entre entornos). El hecho de que la autenticación **falle**
limpiamente es más consistente con una clave corrupta/desactualizada que
con un swap completo hacia Producción. Aun así, **no se puede confirmar
ni descartar por completo sin decodificar el valor**, así que se clasifica
formalmente como potencial:

**`P1 PREVIEW ENV MISWIRING (o corrupción de valor) — no confirmado, no descartado`**

No se ejecuta ninguna reparación hasta autorización explícita (§12).

## 6. Service role — solo presencia

`SUPABASE_SERVICE_ROLE_KEY` está **PRESENT** en `target=preview`, fila
propia (ID `anrGiuyHr4KuJbYj`), separada de la fila de `production` (ID
`pJHFiCD00pM899kz`). No se puede establecer su proyecto asociado sin
decodificar el valor (los `service_role` keys no son JWTs seguros de
decodificar públicamente de la misma forma que un `anon` key — y aunque
lo fueran, esta fase no lo intenta). `SERVICE_ROLE_PROJECT = UNKNOWN` por
inspección directa; no hay evidencia de que sea el de Producción (fila
separada, mismo patrón que las otras dos variables). No se detectó ningún
indicio de `P0`.

## 7. Google OAuth — `401 deleted_client`

`deleted_client` es un código de error específico y bien documentado del
**propio servidor OAuth de Google** (`accounts.google.com`), devuelto
únicamente cuando el `client_id` de OAuth referenciado ya no existe en
Google Cloud Console (fue eliminado, o el proyecto de GCP que lo
contenía fue eliminado/suspendido). Es un error categóricamente distinto
de:

- `redirect_uri_mismatch` (URL de callback no coincide con la registrada) — descartado explícitamente por el propio texto del error.
- Un secreto de cliente incorrecto (fallaría en el intercambio de token del lado del servidor, no como `401` en la redirección inicial de autorización).
- Pantalla de consentimiento no publicada (`access_denied`/`org_internal`, texto distinto).

No hay ninguna herramienta de lectura disponible en esta sesión para
inspeccionar directamente ni la configuración del proveedor Google en
Supabase Auth Staging ni Google Cloud Console — el diagnóstico se basa en
la especificidad del propio mensaje de error, que Google documenta de
forma unívoca para este escenario.

**Corroboración independiente encontrada en el propio historial del
repositorio:** el commit `dcc1340` (2026-08-01) — semanas antes de que
existiera esta rama — ya dejó registrado explícitamente: *"Google OAuth no
tocado (GOOGLE_OAUTH_CONFIGURATION_PENDING)"*. Esto confirma que Google
OAuth llevaba tiempo marcado como pendiente/no confiable, independiente de
cualquier cambio de esta sesión.

**`GOOGLE_OAUTH_ROOT_CAUSE = DELETED_PROVIDER_CLIENT`** (inferido con alta
confianza por la especificidad del error y corroborado por el historial;
no confirmado por lectura directa de la configuración del proveedor, sin
herramienta disponible para ello).

## 8. Prioridad de reparación — magic link primero

Conforme a la directiva: el canary founder-only **no depende de Google
OAuth**. El magic link es sistemáticamente más simple (una sola clave
`anon` correctamente pareada con la URL correcta, sin dependencia de un
proveedor OAuth externo). Orden de reparación propuesto:

1. Corregir/confirmar `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` de Preview (§12).
2. Verificar login por magic link contra el Preview fresco.
3. Verificar que el callback aterriza en el Preview (no en Producción) — ya probado a nivel de código en la Fase 1E.3C.
4. Verificar identidad del fundador vía `getVerifiedEmail`.

Google OAuth permanece documentado como roto por separado
(`DELETED_PROVIDER_CLIENT`) y **no bloquea** el canary founder-only vía
magic link.

## 9. Configuración de Auth de Staging (Site URL / Redirect URLs)

Confirmado de nuevo en esta fase: no existe ninguna tabla en el schema
`auth` de Postgres (`audit_log_entries`, `identities`, `sessions`,
`sso_providers`, `oauth_clients`, etc. — se listaron las 26 tablas
existentes) que almacene Site URL / Redirect URLs — esa configuración vive
en el plano de control de Supabase (Dashboard / Management API), fuera
del alcance de las herramientas de solo lectura disponibles en esta
sesión.

**`STAGING_REDIRECT_CONFIG = UNKNOWN`** (sin cambios respecto a la Fase
1E.3C). No se propone ningún wildcard `*` amplio. La única recomendación
segura, si se confirma que hace falta, es agregar la URL exacta del
Preview fresco actual como entrada puntual — pero dado que Vercel genera
una URL nueva por cada deployment, esta entrada quedaría obsoleta en el
siguiente push. Una alternativa más estable y ya soportada por Supabase
es registrar el **alias de rama** de Vercel
(`maya-lex-pinel-deploy-git-re-fc9d85-fredy-pinel-flores-projects.vercel.app`,
confirmado estable entre deployments de esta misma rama — ver §1), que sí
permanece constante mientras la rama exista. Esto no se ejecuta en esta
fase.

## 10. Por qué desapareció el Preview anterior

No se puede probar la causa exacta con las herramientas disponibles.
Opciones no descartadas: expiración/garbage-collection automática de
deployments antiguos no promovidos, o límite de retención del plan de
Vercel. Se descarta `alias stale` como causa (el alias de rama apunta
correctamente al deployment más reciente,
`dpl_HnePV82fhLMFBDPiii6eZzsfvEj7`, confirmado). **`UNKNOWN`** — no se
especula más allá de la evidencia disponible.

## 11. Plan de Preview fresco

No requerido — ya existe (`dpl_HnePV82fhLMFBDPiii6eZzsfvEj7`, §1). Ningún
commit vacío fue necesario ni se creó ninguno.

## 12. Reparación de entorno propuesta — NO EJECUTADA

| Variable | Target | Proyecto origen | Acción | Clasificación |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview únicamente | Staging (`aicakncgtuiiuomflkqj`) | UPDATE — reemplazar por la URL exacta del proyecto Staging, sin espacios/saltos de línea | pública, no secreta — segura de escribir, nunca de mostrar por conveniencia |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview únicamente | Staging (`aicakncgtuiiuomflkqj`) | UPDATE — reemplazar por el anon/publishable key **actual** de Staging (obtenido vía `get_publishable_keys`, ya confirmado como valor público no secreto), sin espacios/saltos de línea | pública — no se ecoa el valor en ningún reporte |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview únicamente | Staging (`aicakncgtuiiuomflkqj`) | Ninguna acción propuesta todavía — su síntoma (si lo hay) no se manifestó en "Invalid API key" (ese es un error de Auth vía anon key, no de service_role); revisar solo si la reparación de arriba no resuelve el problema | secreto — nunca mostrar ni loguear |
| `NEXT_PUBLIC_SUBABASE_ANON_KEY` (typo) | Preview + Production | — | Puede dejarse como ruido inofensivo indefinidamente, o eliminarse como limpieza — ningún código la lee, cero riesgo funcional en cualquiera de los dos casos | pública — bajo riesgo cualquiera de las dos acciones |

Ninguna de estas mutaciones se ejecutó. Requieren autorización explícita
separada antes de aplicarse.

## 13. Reparación de configuración de Auth propuesta — NO EJECUTADA

Si tras la reparación de §12 el magic link sigue fallando por rechazo de
`redirectTo`/`emailRedirectTo` (un síntoma distinto a "Invalid API key" —
sería un mensaje de Supabase sobre URL no permitida, no sobre API key
inválida), la reparación propuesta sería agregar a la allowlist de
Redirect URLs de Staging la entrada puntual del alias de rama estable
(§9) — no un wildcard amplio. Esto tampoco se ejecuta en esta fase.

Para Google OAuth (`DELETED_PROVIDER_CLIENT`): la reparación requeriría
crear un nuevo OAuth Client ID en Google Cloud Console y actualizar la
configuración del proveedor Google en Supabase Auth Staging con el nuevo
`client_id`/`client_secret` — una acción fuera del alcance de las
herramientas disponibles en esta sesión (requiere la consola de Google
Cloud) y **no bloqueante** para el canary vía magic link (§8). Se
documenta por separado, sin proponerse como acción de esta fase.

## 14. Secuenciación

1. (Fase separada, autorizada explícitamente) Actualizar
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de Preview
   con los valores actuales y verificados de Staging.
2. Vercel redeploya automáticamente el Preview de esta rama en el
   siguiente push, o el fundador dispara un redeploy manual del
   deployment existente para recoger las nuevas variables (las variables
   de entorno de Vercel se inyectan en tiempo de build/runtime, no
   retroactivamente en un deployment ya construido).
3. El fundador, en un navegador con su propia sesión de Vercel ya
   iniciada (Fase 1E.3C.1, Opción A), abre el Preview y prueba magic link.
4. Si "Invalid API key" persiste, inspeccionar si el redirect URL es
   ahora el bloqueador (§13) — no antes.
5. Google OAuth permanece documentado como roto por separado, sin
   bloquear el canary.

## 15. Rollback

Si la actualización de §12 causa un problema nuevo (por ejemplo, un typo
al pegar el nuevo valor): revertir la variable de Preview a su valor
anterior mediante el mismo mecanismo de Vercel (los valores de variables
de entorno en Vercel no versionan automáticamente, por lo que el valor
anterior debe conservarse fuera de banda antes de sobrescribir — esto se
señala explícitamente para la fase de ejecución, no se resuelve aquí).
Ningún cambio de esta fase requiere rollback: no se escribió nada.

## 16. Regla de seguridad — cumplimiento

No se copiaron claves de Producción a Preview. No se reutilizó el
`service_role` de Producción. No se debilitó ninguna RLS. No se
deshabilitó SSO de Vercel. No se creó ningún Preview público. Ningún
secreto, token de auth, ni valor de `service_role`/`anon` cifrado se
mostró en este documento ni en el reporte de chat — el único valor
`anon` de Staging citado (`ref: aicakncgtuiiuomflkqj`, decodificado del
JWT público ya conocido de fases anteriores) es, por diseño de Supabase,
información no secreta.
