# Fase 0 de Remediación — MAYA LEX IA PINEL HN

**Commit base auditado**: `0a5627276b931ee7883caf2faf65e6626040741e` (rama `main`) · **Rama de trabajo**: `security/baseline-p0-subscriptions` (local, sin push)

---

## Fase A — Estado congelado del repositorio

Ver `MAYALEX_FASE0_INVENTARIO_GIT.csv` para la tabla completa archivo → estado → tipo → riesgo → acción.

**Resumen verificado (comandos ejecutados en esta sesión)**:
- `HEAD`: `0a5627276b931ee7883caf2faf65e6626040741e`.
- 108 archivos rastreados en total (`git ls-files | wc -l`).
- 8 archivos modificados sin commit, 5 directorios/archivos sin rastrear (excluyendo los 8 documentos de auditoría generados en esta sesión).
- **`src/` está 100% sin rastrear** (0 de 13 archivos en git, confirmado con `git ls-files src/`), y no está cubierto por ninguna regla de `.gitignore` (`git check-ignore` devuelve código de salida 1 — no ignorado, simplemente nunca agregado).
- **¿El commit auditado puede reconstruir la aplicación?** Sí para el código ya rastreado — pero `app/pricing/PricingCheckoutPanel.tsx` (no rastreado) es importado por `app/pricing/page.tsx` (modificado, no commiteado) según el patrón de nombres — **no verificado si `main` en su estado commiteado compila sin ese archivo**, porque el archivo modificado que lo importaría todavía no está en el commit. Esto es una discrepancia real entre "lo que el commit dice que es la app" y "lo que hay en disco".
- **¿El código desplegado en Vercel pudo provenir del estado local no commiteado?** No — Vercel construye exclusivamente desde lo que existe en la rama `main` de GitHub, nunca desde el disco local. El deployment `g8g8rrnb5` refleja únicamente el commit `0a56272`, sin ninguno de los cambios locales pendientes.

## Fase B — Verificación del deployment `g8g8rrnb5`

**Clasificación: NO VERIFICABLE (SHA exacto) — COINCIDENCIA FUERTEMENTE PROBABLE (por metadata circunstancial)**

- `id`: `dpl_Aekez3vrZ4xJeJQC1E49RDDMuPHr`.
- `target`: `production`, `status`: `Ready`.
- `created`: `Fri Jul 24 2026 13:03:03 GMT-0600` — coincide, al segundo, con los 13 segundos posteriores al commit `0a56272` (`2026-07-24 13:02:50 -0600`, mensaje "Merge feat/seo-programatico-leyes"), tiempo consistente con el disparo automático de un webhook de GitHub → Vercel tras un push.
- **No se pudo extraer el SHA de git exacto** desde la salida de `vercel inspect` (CLI 54.18.2) sin recurrir a la API REST de Vercel con un token de autenticación — se optó deliberadamente por NO extraer ni usar ese token en esta sesión, para no manipular credenciales más allá de lo estrictamente necesario (regla de esta tarea).
- **¿Pudo el deployment incluir archivos no commiteados?** No — Vercel solo tiene acceso al repositorio de GitHub, nunca al disco local de esta máquina. Los 8 archivos modificados/sin rastrear localmente son física y estructuralmente invisibles para el proceso de build de Vercel.

## Fase C — Backup de PayPal

Ver `MAYALEX_FASE0_INVENTARIO_SECRETOS.csv`, fila 1. Resumen:

- Ruta: `backups/paypal-pre-migration-2026-07-17T12-35-55-071Z.json` (7,928 bytes).
- Estado git: **correctamente excluido** por `.gitignore:44` (`backups/`) — corrección a la primera auditoría de esta sesión, que había reportado erróneamente que este directorio no estaba excluido.
- Contenido detectado (por conteo de patrones, sin imprimir valores): 4 direcciones de correo, 4 identificadores de suscripción con formato PayPal real (`I-XXXXXXXXXXXX`), 31 UUIDs, campos `email`/`tier`/`status` presentes.
- **No se detectaron credenciales de API** (`client_id`, `client_secret`, `access_token`, `webhook_id` ausentes como claves).
- **Rotación de credenciales**: NO requerida — el archivo contiene datos de clientes, no secretos de aplicación.
- **Recomendación**: cifrar o mover a almacenamiento seguro fuera del directorio del proyecto; definir política de retención. No se movió, eliminó ni cifró en esta sesión.

## Fase D — Escaneo de secretos

Ver `MAYALEX_FASE0_INVENTARIO_SECRETOS.csv` completo. Resumen:
- Ningún `.env` real fue commiteado en ningún momento del historial (`git log --all --diff-filter=A --name-only` sin coincidencias).
- `.env.local.example` fue verificado específicamente por tener un valor de longitud sospechosa (66 caracteres) en `PAYPAL_CLIENT_SECRET` — confirmado como placeholder reconocible (patrón de marcador detectado sin exponer el valor completo), no un secreto real.
- No se encontraron patrones de claves de Anthropic/OpenAI/Supabase con valores reales en el árbol de trabajo rastreado.
- **Limitación declarada**: no se ejecutó un escaneo dedicado commit-por-commit de todo el historial con una herramienta especializada (tipo gitleaks) — no estaba ya instalada y no se instaló ninguna herramienta nueva por regla de esta tarea.

## Fase E — Inspección P0 de Supabase

Ver `MAYALEX_FASE0_PLAN_RLS.md` para las 12 respuestas completas y el hallazgo forense central: **`supabase/subscriptions.sql` ya define correctamente `ENABLE ROW LEVEL SECURITY` para esta tabla — el estado real de producción diverge del schema de referencia versionado**, indicando que esta parte del script nunca se re-aplicó tras agregarse, no que nadie haya diseñado la protección.

## Fase F — Migración RLS

`supabase/migrations/20260727000000_enable_rls_subscriptions.sql` — no ejecutada contra ninguna base real. Probada exhaustivamente contra Postgres real embebido (PGlite) en `tests/sql/rls-subscriptions.sql.test.ts`: **11/11 pruebas passing**, cubriendo el estado ANTES (reproduce el bug real), la aplicación de la migración, y el rollback.

## Fase G — Recuperación del repositorio

### `.gitignore` propuesto (NO reemplaza el existente — solo se agregarían estas líneas)

```gitignore
# Artefactos de build de TypeScript (ya cubierto por *.tsbuildinfo, se mantiene explícito por claridad)
tsconfig.tsbuildinfo

# Documentación de auditoría generada por sesiones de trabajo (opcional —
# el propietario puede preferir rastrearla; se deja como propuesta, no
# como cambio aplicado)
# MAYALEX_*.md
# MAYALEX_*.csv
```

**Nota**: `backups/`, `.env*`, `node_modules/`, `.next/`, `.vercel` ya están correctamente cubiertos en el `.gitignore` actual — no requieren cambio.

### Clasificación de archivos (Fase G, solicitada explícitamente)

| Categoría | Archivos |
|---|---|
| **Deben rastrearse** (tras revisión humana) | `app/api/extract-text/route.ts`, `app/pricing/page.tsx`, `components/ChatInterface.tsx`, `lib/supabase-browser.ts`, `lib/supabase-ssr.ts`, `lib/supabase.ts`, `package.json`, `package-lock.json` — si se confirma que los cambios son intencionales y correctos |
| **NO deben rastrearse nunca** | `backups/*.json` (ya excluido correctamente), `.env.local` (ya excluido correctamente) |
| **Requieren revisión humana antes de decidir** | `src/**` (arquitectura de pagos paralela completa — decisión de producto, no técnica), `app/pricing/PricingCheckoutPanel.tsx`, `migrations/002_pending_orders.sql`, `supabase/migrations/20260720000000_auditor_extensions.sql` |
| **Contienen datos potencialmente sensibles** | `backups/paypal-pre-migration-*.json` (ya fuera de git) |
| **Generados / no deben tocarse** | `.next/`, `tsconfig.tsbuildinfo`, `package-lock.json` (se regenera, pero se rastrea por convención estándar de Node) |
| **Pertenecen a producción real (no tocar sin autorización)** | Ninguno de los archivos locales — la producción real vive en Vercel/Supabase, no en este disco |

### Rama de seguridad

`security/baseline-p0-subscriptions` creada localmente en esta sesión. **Archivos incluidos en el commit local de esta Fase 0** (verificados antes de commitear, ninguno contiene secretos según el escaneo de la Fase D):

```
supabase/migrations/20260727000000_enable_rls_subscriptions.sql
tests/sql/rls-subscriptions.sql.test.ts
MAYALEX_FASE0_REMEDIACION_SEGURIDAD.md
MAYALEX_FASE0_INVENTARIO_GIT.csv
MAYALEX_FASE0_INVENTARIO_SECRETOS.csv
MAYALEX_FASE0_PLAN_RLS.md
MAYALEX_FASE0_RUNBOOK_DEPLOYMENT.md
```

**No se incluyen** en este commit: `src/`, los 8 archivos modificados de otro trabajo en curso, ni los documentos de la auditoría anterior (`MAYALEX_AUDITORIA_INTEGRAL_*`, `MAYALEX_SEGUNDA_AUDITORIA_*`, etc.) — se mantienen fuera deliberadamente para que este commit de seguridad quede aislado y revisable de forma independiente.

## Fase H — Entorno fuera de OneDrive

Procedimiento documentado (no ejecutado en esta sesión, ver también la auditoría anterior para el diagnóstico completo del error de OneDrive):

```powershell
# 1. Crear la carpeta
New-Item -ItemType Directory -Force C:\dev\mayalex

# 2. Clonar SOLO las fuentes autorizadas (el historial de git completo,
#    que ya excluye correctamente .env* y backups/)
git clone https://github.com/Lawyer1421/maya-lex-pinel-deploy.git C:\dev\mayalex
cd C:\dev\mayalex

# 3. Restaurar dependencias desde el lockfile exacto (npm ci, no npm install,
#    para reproducibilidad exacta con package-lock.json)
npm ci

# 4. Variables de entorno locales seguras — copiar MANUALMENTE (no en script)
#    solo .env.local desde la ubicación actual, revisando antes que no se
#    arrastre ningún otro archivo sensible
# Copy-Item "<ruta actual>\.env.local" ".env.local"

# 5-7. Verificación
npx tsc --noEmit
npx vitest run
npm run build

# 8. Registrar versiones
node --version; npm --version
```

**No ejecutado en esta sesión** — documentado como procedimiento para el propietario o para una ejecución futura autorizada explícitamente para tocar rutas fuera del árbol auditado.

Dado que `src/` no está rastreado, **clonar desde GitHub en `C:\dev\mayalex` NO traería ese código** — si se desea reconstruir una línea base que lo incluya, debe primero decidirse su destino (Fase G) y commitearse en esta misma máquina antes de clonar en la ubicación limpia.

## Fase I — Pruebas de regresión (preparadas, no todas ejecutables sin credenciales de prueba)

| Área | Estado |
|---|---|
| Login Google / magic link | No ejecutado — requiere sesión de navegador real, fuera del alcance de esta sesión de terminal |
| Lectura del plan (free/académico/pro) | Cubierto indirectamente por `tests/access.test.ts` ya existente (mock de `resolveCurrentAccess`) |
| PayPal checkout / webhook / cancelación / renovación / expiración | Cubierto por la suite ya existente (`tests/webhook-handler.test.ts`, `tests/state-machine.test.ts`, `tests/duplicate-guard.test.ts`) — no reejecutados individualmente en esta sesión más allá de `npx vitest run` completo |
| Consulta jurídica | No ejecutado — requeriría uso real de `/api/chat`, consumiría cuota real |
| Carga de documentos | No ejecutado — ver hallazgo P1-8 de la auditoría anterior (posible defecto ya identificado) |
| Acceso administrativo | No aplicable — no existe panel de administración en el código (confirmado en auditorías previas) |
| Aislamiento entre usuarios | **Cubierto por las nuevas pruebas RLS** (`tests/sql/rls-subscriptions.sql.test.ts`) a nivel de base de datos |

**Resultado de `npx vitest run` (suite completa) en esta sesión**: 95 passed, 1 skipped (13 archivos — 12 previos + el nuevo de RLS).

## Fase J — Plan de despliegue

Ver `MAYALEX_FASE0_RUNBOOK_DEPLOYMENT.md` para el procedimiento completo de 15 pasos con criterios GO/NO-GO.
