# MAYA LEX V2 — Verificación directa del entorno del Preview

**Fecha:** 2026-07-29 · **Rama:** `feature/mayalex-v2-accelerated-relaunch`
**Métodos:** `vercel env ls` (CLI autenticado), API de Vercel (solo metadatos), log de build real de Vercel (evidencia de runtime), todo con valores redactados. **Ningún secreto fue impreso ni transportado.**

## 1. Veredicto principal — CONFIRMADO CON EVIDENCIA DIRECTA

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿A qué proyecto Supabase apunta `NEXT_PUBLIC_SUPABASE_URL` en el ámbito Preview? | **`aicak…lkqj` = staging esperado (`mayalexhn-staging`)** | Log del build real de Vercel: `[articulos-vigentes] proyecto_destino=aicak…lkqj` (emitido por el runtime del build leyendo `process.env`, en forma redactada) |
| ¿Apunta a producción (`thgrh…cufp`)? | **NO** | Mismo log — el ref no coincide con producción |
| ¿El ámbito Preview tiene variables PayPal? | **NO — cero** | `vercel env ls preview`: no existe ninguna variable `PAYPAL_*` con ámbito Preview (las credenciales PayPal viven solo en Production) |
| ¿Claves server-side presentes en Preview? | Sí: `SUPABASE_SERVICE_ROLE_KEY` (ámbito Preview exclusivo, creada 2026-07-17) | `vercel env ls preview` — solo nombre/ámbito/fecha, el valor jamás |
| ¿Variables cliente de producción expuestas al Preview? | NO — el Preview tiene su propio juego de 3 variables Supabase con ámbito exclusivo Preview | `vercel env ls preview` |

**Conclusión de la pregunta de seguridad crítica: el Preview NO apunta a producción.** El gate "si apunta a producción, detente" no se activa.

## 2. Hallazgo bloqueante distinto — credencial Preview inválida

La verificación destapó un problema real que llevaba semanas oculto:

1. **Las 6 variables del proyecto son de tipo `sensitive`** (verificado vía API): son de **solo-escritura** — ni el CLI, ni la API, ni el propio dashboard pueden releer sus valores. Por eso ninguna auditoría externa anterior pudo confirmarlas (`vercel env pull` las devuelve vacías — no es un bug de esta máquina, es el diseño de las variables sensitive).
2. Con el nuevo fallo-duro del build (esta iteración), el build del Preview reveló que **el 100% de las consultas a Supabase fallaban** — primero `TypeError: Headers.set` (un carácter inválido, típicamente salto de línea pegado en el valor; corregido en código saneando espacios en blanco, seguro porque URLs y JWT nunca los contienen), y tras esa corrección, **`Invalid API key`**: la `SUPABASE_SERVICE_ROLE_KEY` guardada en el ámbito Preview **no valida contra el proyecto staging** (valor equivocado o truncado al pegarlo).
3. **Implicación retroactiva importante:** los "Artículo no encontrado" del Preview anterior no eran evidencia de "staging vacío", sino consultas fallidas silenciadas por el código antiguo. El proyecto staging está `ACTIVE_HEALTHY` (verificado vía API de Supabase). La conclusión de entorno de este informe no cambia (la URL apunta a staging — eso está confirmado por el log), pero la credencial nunca funcionó.

## 3. Corrección requerida (solo el fundador puede hacerla)

Las variables sensitive no pueden corregirse por inspección y las credenciales no deben pasar por terceros. Pasos (≈5 minutos):

1. Supabase → proyecto **`mayalexhn-staging`** (`aicakncgtuiiuomflkqj`) → Project Settings → API → copiar `service_role` key (y de paso `anon` key y la URL).
2. Vercel → proyecto `maya-lex-pinel-deploy` → Settings → Environment Variables → ámbito **Preview** → re-guardar `SUPABASE_SERVICE_ROLE_KEY` (recomendado: también `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SUPABASE_URL`), **pegando sin salto de línea final**.
3. Redeploy de la rama `feature/mayalex-v2-accelerated-relaunch` (botón Redeploy del último deployment de la rama, o un push nuevo).
4. El build validará solo: si la credencial es correcta, pasa el postbuild (198+198+16) y el Preview queda READY; `/api/diagnostico-preview` (nuevo, solo responde en Preview) mostrará el veredicto runtime completo redactado.

## 4. Nota sobre el gate

El fallo actual **no viola** ninguna prohibición: no hay riesgo de escritura contra producción (la URL apunta a staging y además la clave ni siquiera valida). El Preview simplemente no puede construirse hasta que la credencial sea corregida — exactamente el comportamiento que el build determinista debía garantizar.
