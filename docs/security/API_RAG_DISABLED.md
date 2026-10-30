# `/api/rag` deshabilitado (P25)

**Fecha:** 28-oct-2026 · **Orden:** CLO, autorizada por Fredy · **Estado:** DESHABILITADO SIEMPRE (410 Gone), sin interruptor por variable de entorno.

## Motivo (auditoría del 28-oct-2026)

`/api/rag` estaba en `main` con estos problemas:

1. **Sin autenticación ni límite de uso** en el archivo de la ruta; `middleware.ts` deja pasar todo.
2. **Usa `service_role`** (vía `buscarRAG` → `createServerSupabaseClient`), que salta RLS.
3. **El llamador elige cualquier colección** (`coleccion` en la consulta o el cuerpo) y cualquier `k`.
4. **Devuelve el texto completo** de los fragmentos (incluidos los que son solo CONTEXT) más el contexto formateado.
5. **Consume el token de HuggingFace** (`HF_API_TOKEN`) en cada búsqueda semántica: cualquiera podía gastarlo.

## Qué hace ahora

`app/api/rag/route.ts` responde **410 Gone** en JSON a todos los métodos (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS):

```json
{ "error": "endpoint deshabilitado por seguridad", "code": "API_RAG_DESHABILITADO" }
```

El archivo **no importa nada**: no se crea ni se importa el cliente de Supabase con `service_role`, no se llama a la búsqueda, no se calcula ningún embedding y no se llama a HuggingFace. No lee variables de entorno. La lógica original se conserva, **sin enrutar**, en `lib/rag/api-rag-legacy.ts` (nadie la importa; `tests/api-rag-disabled.test.ts` lo verifica).

## Qué queda afectado

| Afectado | Detalle |
| --- | --- |
| Llamadores de `/api/rag` | **Ninguno** en el repositorio: ni el frontend, ni otras rutas, ni scripts, ni pruebas, ni Legal OS, ni las salas, ni CI (inventario en el PR). Solo se mencionaba en comentarios de la propia ruta y en `docs/governance/DECISION_LOG.md` (líneas 1599 y 1699) y `docs/runbooks/cohere-rerank-flag.md` (líneas 13 y 74), que hablan de él como endpoint de depuración. |
| Clientes externos desconocidos | Cualquier herramienta fuera del repositorio que llame a `/api/rag` recibirá 410. No hay forma de saberlo desde el código; revisar los registros de Vercel si se quiere confirmar. |
| `/api/chat` y la recuperación interna | **Sin cambios.** `buscarRAG` y el corpus siguen funcionando para el chat; solo se cerró esta puerta pública. |

## Condiciones para reabrirlo (todas, y por decisión del CLO)

1. **Autenticación**: sesión verificada del usuario (como `/api/chat`).
2. **Límite de uso** por usuario.
3. **Lista cerrada de colecciones** permitidas (nunca el valor del llamador tal cual).
4. **`k` entre 1 y 10**; valores fuera de rango se rechazan o se acotan.
5. **Sin texto CONTEXT**: solo fragmentos con `rol_evidencia = PRIMARY`; el contenido de filas CONTEXT (vigencia nula o falsa, doctrina, práctica notarial) no se devuelve.
6. **Sin `service_role`**: lectura con un rol limitado (ver la propuesta en `docs/retrieval/CLO_ANEXOS_2_3_INVENTARIO_Y_PROPUESTAS.md`, §3, en el PR #106).

Mientras no se cumplan, `app/api/rag/route.ts` no debe volver a importar `lib/rag/search`, `lib/supabase` ni `lib/rag/embed`. Reabrir exige reemplazar `tests/api-rag-disabled.test.ts` por pruebas de esas seis condiciones.
