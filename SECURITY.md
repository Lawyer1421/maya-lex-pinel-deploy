# SECURITY

> **EN summary:** Local-only by default; deny-by-default policy for external AI; no secrets or private knowledge in Git; least-privilege agents; tamper-evident audit; destructive or publishing actions need human approval. Report issues privately to the owner.

## 1. Modelo de amenazas (resumen)
Activos: expedientes y protocolos notariales (secreto profesional), manuscritos, datos de estudiantes, claves de API.
Amenazas: fuga a servicios externos, secretos en Git, exposición en red local, DNS-rebinding/CSRF desde un navegador, prompt injection desde documentos, agentes con permisos excesivos, manipulación de la bitácora.

## 2. Localidad de datos
| Clase | Significado | Regla |
|---|---|---|
| `LOCAL` | Proceso/host local o red privada | Permitido |
| `EXTERNAL` | Cualquier servicio fuera del equipo | Denegado salvo 4 condiciones (ARCHITECTURE §1) |

Sensibilidad: `PUBLIC` · `INTERNAL` · `PRIVILEGED` (secreto profesional; **nunca** sale, ni con aprobación). Por defecto todo es `PRIVILEGED`.

## 3. Secretos y conocimiento privado
- `.env` ignorado; solo `.env.example` (sin valores). `knowledge/private/`, `storage/*` ignorados.
- Antes de cada commit: `git diff --cached | grep -iE 'api[_-]?key|secret|password|BEGIN .*PRIVATE'`. Se recomienda activar secret scanning de GitHub.
- Si una clave se filtra: revocar primero, limpiar historial después.

## 4. Red
- Servidor enlaza a `127.0.0.1`; se **niega a arrancar** en otra interfaz salvo `FPW_ALLOW_NON_LOOPBACK=true` (la imagen Docker lo usa, y publica solo `127.0.0.1:puerto`).
- Rechazo de `Host` no loopback (421), `Origin` ajeno (403), cuerpo no JSON (415), >64 KB (413).
- CSP estricta (`default-src 'self'`), `X-Frame-Options: DENY`, `no-store`.
- Contenedores: `cap_drop: ALL`, `no-new-privileges`, sistema de archivos de solo lectura, usuario no root.
- Base de datos: puerto 5432 solo en `127.0.0.1:54322`; RLS activado, sin políticas = denegado.

## 5. Agentes
Permisos declarativos (`knowledge_read/write`, `tools`, `network`, `destructive_actions`). El cargador **falla cerrado** si un manifiesto pide proveedores externos o red no válida. Los documentos recuperados por RAG se tratarán como **datos no confiables** (Fase 1): nunca como instrucciones.

## 6. Auditoría
`storage/audit/audit.jsonl`, append-only, cada entrada incluye `prev` y `hash` (SHA-256). `npm run audit:verify` detecta alteraciones. Se registra *quién, qué, cuándo, resultado, política aplicada*; **nunca** el contenido (solo hash+longitud).

## 7. Acciones que requieren aprobación humana
Borrar/sobrescribir datos o documentos · publicar/desplegar (GitHub, Vercel, Railway) · enviar a proveedor EXTERNAL · enviar correo · conceder nuevos permisos a un agente.

## 8. Cumplimiento profesional
El sistema asiste; **no sustituye** el criterio del abogado/notario. Las obligaciones de confidencialidad profesional prevalecen sobre cualquier comodidad técnica. Antes de procesar datos reales de clientes, verificar el cifrado de disco del equipo.
