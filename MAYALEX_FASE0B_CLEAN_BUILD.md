# Build limpio fuera de OneDrive — `C:\dev\mayalex-validation`

## Procedimiento ejecutado (real, no solo diseñado)

1. `git worktree add --detach C:\dev\mayalex-validation 012c9fc0e193b08348ae14d4caf87edcf5cfb233` — worktree real desde el commit de recuperación de `src/`, sin clonar de nuevo desde GitHub (que no tiene esta rama), compartiendo el mismo almacén de objetos de git.
2. Se copió **únicamente** `.env.local` al nuevo directorio (ningún backup, ningún log, ningún otro archivo).
3. `npm ci` (no `npm install`) — instalación reproducible exacta desde `package-lock.json`.
4. `npx tsc --noEmit`, `npx vitest run`, `npx next build`.

## Registro de entorno

| Campo | Valor |
|---|---|
| Node | v22.17.1 |
| npm | 10.9.2 |
| Sistema operativo | Windows (MINGW64_NT-10.0-26200, x86_64) |
| Commit validado | `012c9fc0e193b08348ae14d4caf87edcf5cfb233` |
| Ruta | `C:\dev\mayalex-validation` (fuera de OneDrive) |

## Resultado de `npm ci`

364 paquetes instalados en 23s. **4 vulnerabilidades de severidad alta** reportadas por npm (no corregidas — regla explícita de no actualizar dependencias en esta tarea). Advertencias de deprecación de `tsconfck` y `node-domexception` (transitivas, no accionables directamente).

## Resultado de `npx tsc --noEmit`

**Exit code 0. Sin errores.**

## Resultado de `npx vitest run`

**12 archivos de prueba, 93 passed, 1 skipped (94 total). Exit code 0.**

Diferencia explicada frente a la copia de OneDrive (13 archivos, 95 passed+1 skipped): `tests/alerts-socket.test.ts` (2 pruebas) nunca fue rastreado por git — este worktree, construido estrictamente desde el historial de commits, correctamente no lo incluye. No es un error; es la prueba de que la línea base rastreada es autoconsistente sin depender de archivos sueltos en disco. Se recomienda commitear `tests/alerts-socket.test.ts` junto con `src/hooks/useAlertsSocket.ts` en un futuro commit de recuperación de pruebas.

## Resultado de `npx next build`

**Éxito. Duración total: 29.1 segundos** (compilación 4.7s, TypeScript 5.8s, generación estática 11.1s).

- **1 advertencia no fatal**, idéntica a la ya observada en el build remoto de Vercel: `Module not found: Can't resolve 'pdf-parse/lib/pdf-parse.js'` en `app/api/extract-text/route.ts:58` — **confirma definitivamente que es un defecto real de código, no un artefacto de ningún entorno particular** (se reproduce igual en Windows local limpio, en Windows local con OneDrive fallando, y en el contenedor Linux de Vercel).
- **413 páginas estáticas generadas**, incluyendo exactamente **198 rutas `/leyes/[articulo]`** y **198 rutas `/consultas/[slug]`** — confirma numéricamente la corrección hecha en la segunda auditoría (198 páginas únicas, no 690).
- Variables de entorno requeridas (solo nombres, confirmado por el propio log de Next.js): `.env.local` fue cargado exitosamente por el workaround manual ya existente en `next.config.ts`.
- Rutas generadas: idénticas en estructura a las del deployment `g8g8rrnb5` de Vercel (mismo listado de `app`, `api`, `leyes`, `consultas`, `sitemap.xml`, `robots.txt`).

## Conclusión sobre el problema de OneDrive (cierre definitivo)

Con este build exitoso fuera de OneDrive en la misma máquina, el mismo Node, el mismo npm, el mismo código exacto (commit `012c9fc`), queda **confirmado sin ambigüedad** que el error `El proveedor de archivos de nube no se está ejecutando (os error 362)` documentado en auditorías previas es exclusivamente un problema del proveedor de sincronización de OneDrive interceptando el acceso a archivos dentro de `node_modules`, sin ninguna relación con el código del proyecto, con Next.js en general, ni con esta máquina Windows en sí misma fuera de la carpeta sincronizada.

**Recomendación operativa**: para desarrollo continuo, mantener el código de trabajo activo en `C:\dev\mayalex-validation` (o una ruta equivalente fuera de OneDrive) y usar OneDrive únicamente como respaldo pasivo, no como directorio de trabajo activo de `node_modules`.
