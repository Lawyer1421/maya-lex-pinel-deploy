# Revisión de evidencia de acceso previo + procedimiento del backup de PayPal

## Fase I — Evidencia de posible acceso previo a `subscriptions`

**Método**: `get_logs(service='api')` contra el proyecto real de producción (`thgrhueckkjdutjvcufp`) — logs de la API REST de Supabase (PostgREST), sin descargar ninguna fila de `subscriptions`, sin PII expuesta en este documento.

**Resultado observado**: la totalidad de las entradas visibles en la ventana de logs disponible son peticiones `GET` a `/rest/v1/biblioteca_vectores` (tráfico real de las páginas `/leyes` y `/consultas` generándose/sirviéndose) — **ninguna petición a `/rest/v1/subscriptions` aparece en la ventana observada**.

**Limitación de la herramienta**: el servicio de logs de Supabase (`get_logs`) devuelve explícitamente solo **las últimas 24 horas**. No existe, con las herramientas disponibles en esta sesión, forma de consultar retención más allá de esa ventana.

**Clasificación (según las 4 categorías solicitadas): SIN EVIDENCIA ENCONTRADA (no "no verificable", porque sí se pudo consultar la fuente; no "evidencia positiva", porque no aparece nada) — acotada explícitamente a la ventana de 24 horas.**

**No se afirma que no haya ocurrido acceso previo** — solo que no hay evidencia de ello en las últimas 24 horas. Dado que la exposición real (GRANT revocado pero sin RLS de respaldo) es de bajo riesgo salvo que alguien haya otorgado `SELECT` a `anon` en algún momento pasado — algo que **tampoco es verificable retroactivamente** sin acceso a logs de auditoría de cambios de schema de más largo plazo (no disponibles con las herramientas de esta sesión).

**Recomendación**: si Supabase ofrece en el plan actual del proyecto retención de logs extendida o exportación a un sistema externo (ej. Logflare/Datadog), activarla hacia adelante para tener visibilidad futura — no aplicable retroactivamente a este incidente.

## Fase J — Backup de PayPal con PII

### Reconfirmación (sin nuevos comandos — resultado idéntico al de la Fase 0 anterior)

- ✅ Excluido de git (`'.gitignore:44'`, patrón `backups/`).
- ✅ No aparece en el historial de git (`git log --all --diff-filter=A` sin coincidencias).
- ✅ No contiene credenciales (sin claves `client_id`/`client_secret`/`access_token`/`webhook_id`).
- ✅ Contiene PII real de 4 clientes (correos, IDs de suscripción de PayPal).

### Procedimiento propuesto (no ejecutado)

1. **Almacenamiento fuera del repositorio**: mover el archivo a un almacenamiento cifrado separado (ej. un bucket privado con cifrado del lado del servidor, o un gestor de secretos/documentos), nunca dentro de la carpeta del proyecto sincronizada por OneDrive.
2. **Cifrado**: cifrar en reposo (ej. `age`, `gpg`, o el cifrado nativo del proveedor de almacenamiento elegido) antes de mover.
3. **Restricción de acceso**: acceso limitado exclusivamente al propietario del producto (Don Fredy) — sin compartir la carpeta que lo contenga.
4. **Retención**: definir un plazo — por ejemplo, conservarlo solo mientras dure la migración a la máquina de estados de PayPal que lo generó (ya completada según las tareas #1-31 de esta sesión), y eliminarlo una vez confirmado que ya no tiene valor operativo.
5. **Eliminación de copias innecesarias**: verificar si existen otras copias del mismo backup en otras ubicaciones (otros equipos, correo, chat) y consolidar en una sola ubicación segura.
6. **Registro de responsable y finalidad**: documentar en un lugar centralizado (no en este repositorio) quién es responsable del archivo y por qué se conserva.
7. **Evitar sincronización indiscriminada**: dado que el directorio del proyecto está dentro de OneDrive, y `backups/` ya está excluido de git, verificar además si OneDrive mismo sincroniza esa carpeta a la nube de Microsoft — si es así, el archivo con PII real ya está replicado fuera de este equipo aunque nunca haya tocado GitHub. **Esto no fue verificado en esta sesión** y es un hallazgo pendiente de confirmar.

### Clasificación del punto

**Riesgo de privacidad** (no bloqueador técnico, no simplemente mejora operativa) — el archivo no bloquea ningún trabajo técnico, pero representa datos personales reales sin cifrado ni política de retención definida, lo cual es un riesgo de privacidad real y accionable independientemente del resto de esta Fase 0B.
