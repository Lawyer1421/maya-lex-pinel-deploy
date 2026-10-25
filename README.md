# Fredy Private AI Workspace

**ES** — Entorno personal de trabajo con IA, *local-first* y *privacy-first*, para actividades jurídicas/notariales, académicas, editoriales, documentales, investigativas y tecnológicas de Fredy Omar Pinel Flores.

**EN** — A local-first, privacy-first personal AI workspace for legal/notarial, academic, editorial, document, research and technology work.

## Estado / Status
**Fase 0 (Fundación) — completa.** MVP ejecutable en localhost, sin dependencias npm. / **Phase 0 (Foundation) — done.** Runnable localhost MVP, zero npm dependencies.

| Capacidad / Capability | Fase 0 |
|---|---|
| Servidor solo-loopback + UI / Loopback-only server + UI | ✅ |
| Política LOCAL vs EXTERNAL (default-deny) / Policy gate | ✅ |
| Abstracción de proveedores (echo, Ollama, Claude-stub) / Provider abstraction | ✅ |
| 8 agentes diseñados (manifiestos con permisos) / 8 designed agents | ✅ designed, not yet model-driven |
| Auditoría con cadena de hashes / Hash-chained audit log | ✅ |
| Docker + PostgreSQL/pgvector (esquema con RLS) / Docker + DB | ✅ prepared, **not yet tested against a daemon** |
| RAG, MCP, skills, GitHub/Vercel/Railway | ⏳ Fases 1–3 |

## Arranque rápido / Quick start
```bash
node scripts/doctor.js          # qué puede correr esta máquina / what this machine can run
npm start                       # http://127.0.0.1:3000
npm test                        # 17 pruebas / 17 tests
```
Con modelo local / With a local model: instala Ollama, `FPW_DEFAULT_PROVIDER=ollama npm start`.

Docker (cuando haya daemon / when a daemon is available):
```bash
cp .env.example .env            # y cambia POSTGRES_PASSWORD / and change POSTGRES_PASSWORD
docker compose -f docker/docker-compose.yml --env-file .env up --build
docker compose -f docker/docker-compose.yml --env-file .env --profile db up -d db
```

## Documentos / Docs
[ARCHITECTURE](ARCHITECTURE.md) · [SECURITY](SECURITY.md) · [AGENTS](AGENTS.md) · [ROADMAP](ROADMAP.md) · [DECISIONS (requieren aprobación)](DECISIONS.md) · [CLAUDE.md](CLAUDE.md)
