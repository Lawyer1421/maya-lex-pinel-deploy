# ARCHITECTURE

> **EN summary:** A modular monorepo. A loopback-only app calls a Master Agent that routes to specialist agents. Every model call crosses one policy gate (LOCAL allowed, EXTERNAL default-denied) through a provider-abstraction layer, and is written to a tamper-evident audit log. Knowledge and secrets live outside Git. Design is original; it borrows only generic ideas (declarative agents, local stacks), no third-party code.

## 1. Principios
1. **Local por defecto**: `LOCAL` permitido; `EXTERNAL` requiere (a) `FPW_ALLOW_EXTERNAL=true`, (b) proveedor en allowlist, (c) aprobación humana por solicitud, (d) dato no `PRIVILEGED`.
2. **Desacoplamiento**: contrato de proveedor `{id, locality, complete()}`. Sustituir modelo = nuevo adaptador.
3. **Mínimo privilegio** declarativo por agente.
4. **Trazabilidad**: auditoría append-only encadenada por hash.
5. **Modular y por fases**: cada capa funciona sola y puede apagarse.

## 2. Vista de componentes
```
 Navegador (127.0.0.1) ─► apps/workspace (HTTP, CSP, Host/Origin checks)
                               │
                     ┌─────────┴──────────┐
                     ▼                    ▼
              core/agents            core/audit  (JSONL + hash chain → DB mirror, Fase 1)
        (registro + router Master)
                     │  system prompt + permisos
                     ▼
              core/policy.authorize()   ◄── core/config (.env)
                     │ allow / deny
                     ▼
              core/providers (registry)
        ┌────────────┼──────────────┐
      echo        ollama (LOCAL*)   claude / otros (EXTERNAL, off)
  * LOCAL solo si la URL resuelve a loopback/privada; si no, se reclasifica EXTERNAL.

 Fase 1+: database/ (Postgres+pgvector, RLS) · services/ (ingesta, embeddings) · knowledge/ (privado, ignorado)
 Fase 2+: skills/ · workflows/ · mcp/ (servidores locales)   Fase 3+: integrations/ (GitHub, Vercel, Railway…)
```

## 3. Mapa del monorepo
| Carpeta | Rol | Estado |
|---|---|---|
| `apps/` | Interfaces (hoy `workspace`) | Fase 0 |
| `core/` | config, policy, audit, providers, agents | Fase 0 |
| `agents/` | Manifiestos declarativos (8) | diseñados |
| `database/` | Migraciones SQL (RLS deny-by-default) | preparado |
| `docker/` | Dockerfile + compose (puertos solo 127.0.0.1) | preparado, sin probar |
| `services/ skills/ workflows/ mcp/ integrations/` | Extensiones | placeholders |
| `knowledge/ storage/` | Datos privados/runtime (ignorados) | — |
| `scripts/ tests/ docs/` | Herramientas, pruebas, ADRs | Fase 0 |

## 4. Flujo de una consulta
1. UI → `POST /api/chat` (mismo origen, JSON, ≤64 KB).
2. Master (`route`) elige agente por palabras clave (v0, transparente).
3. Sensibilidad por defecto = `PRIVILEGED`; solo se puede *bajar* explícitamente.
4. `authorize()` decide; la decisión (permitida o denegada) se audita con hash+longitud, nunca texto.
5. El proveedor responde; se audita el hash de la respuesta.

## 5. Decisiones tomadas (ver `docs/decisions/`)
- ADR-0001: Node 22 sin dependencias para el núcleo (cadena de suministro mínima, auditable por una persona).
- ADR-0002: Política de localidad con *default-deny* y localidad derivada de la URL.
- ADR-0003: Agentes como manifiestos JSON validados al cargar (sin YAML hasta aprobar dependencia).

## 6. Riesgos conocidos
| Riesgo | Mitigación actual | Pendiente |
|---|---|---|
| Fuga a nube vía proveedor mal configurado | default-deny + reclasificación por URL + pruebas | Fase 1: verificación de egress en Docker |
| Router por palabras clave impreciso | transparente, usuario puede forzar agente | Fase 2: router con modelo local |
| Sin autenticación en UI | solo loopback + Host/Origin | D-07: auth local si se expone en LAN |
| Auditoría local manipulable por quien tenga disco | cadena de hashes detecta edición parcial | anclar hash periódicamente (D-08) |
| Docker no probado en este entorno | `compose config` válido | probar en máquina con daemon |
| Alucinación en temas jurídicos | prompts exigen incertidumbre; borradores | RAG con fuentes citables (Fase 1) |
