# AGENTS

> **EN summary:** Eight specialist agents, defined as JSON manifests in `agents/<id>/agent.json`. In Phase 0 they are *designed* (permissions, memory, scope) and routable; they are not yet autonomous. None can use external providers or network; destructive actions are forbidden or need approval.

## Contrato del manifiesto
```jsonc
{ "id", "name", "status": "designed|active", "role",
  "routing_keywords": [], "delegates_to": [],
  "permissions": { "knowledge_read": [], "knowledge_write": [], "tools": [],
                   "network": "none|allowlist", "external_providers": false,
                   "destructive_actions": "forbidden|requires_approval" },
  "memory": { "scope": "agent-private", "retention": "session", "long_term": false } }
```

## Agentes
| Agente | Función | Lee | Escribe | Herramientas (futuras) | Destructivo |
|---|---|---|---|---|---|
| **Master** | Orquesta y enruta | — | — | route, audit.read | prohibido |
| **Legal** | Análisis y borradores jurídicos (Honduras) | legal | — | rag.search | prohibido |
| **Notarial** | Escrituras, actas, poderes; listas de verificación formal | notarial, legal | — | rag.search, template.fill | prohibido |
| **Academic** | Sílabos, clases, rúbricas, exámenes | academic | academic | rag.search | prohibido |
| **Editorial** | Libros, artículos, canciones, inglés americano | editorial | editorial | rag.search | prohibido |
| **Research** | Investigación con fuentes citadas | research, legal, academic | research | rag.search | prohibido |
| **Document** | Ingesta, OCR, conversión | inbox | inbox | file.parse, rag.index | con aprobación |
| **Technology** | Código, Docker, Git, despliegues | technology | — | git.read | con aprobación |

## Memoria
Fase 0: solo de sesión, sin persistencia. Notarial **nunca** tendrá memoria a largo plazo de datos de clientes sin decisión explícita (D-09). Memoria persistente futura = tablas `fpw.*` con RLS por agente.

## Reglas de delegación
Solo Master delega. Un agente no puede ampliar sus propios permisos ni los de otro. Toda delegación se audita.

## Cómo añadir un agente
1) ADR breve, 2) manifiesto con permisos mínimos, 3) prueba en `tests/agents.test.js`, 4) fila en esta tabla.
