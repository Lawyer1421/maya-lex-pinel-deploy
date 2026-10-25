# ROADMAP

> **EN summary:** Seven phases, each with exit criteria. Phase 0 is done. Next: Phase 1 (database + RAG over synthetic data), then local models.

| Fase | Objetivo | Criterio de salida |
|---|---|---|
| **0 Fundación** ✅ | Estructura, docs, política, auditoría, MVP localhost | 17 pruebas verdes; server solo-loopback |
| **1 Datos locales** | Docker probado, Postgres+pgvector (o Supabase, D-02), ingesta, RAG sobre **datos sintéticos**, citas de fuente | Búsqueda con fuente verificable; RLS probado; backup cifrado documentado |
| **2 Modelos locales y agentes reales** | Ollama (D-03), router con modelo, Legal y Notarial activos con listas de verificación, skills y workflows declarativos | Evaluación en casos sintéticos; 0 llamadas de red no previstas (test de egress) |
| **3 Integraciones controladas** | MCP locales, GitHub, Vercel, Railway, adaptador Claude — todo EXTERNAL tras aprobación | Cola de aprobaciones funcional; adaptadores desactivados por defecto |
| **4 Productos** | Convertir los 110+ agentes de ChatGPT en apps/páginas monetizables; web de la firma | Primer producto público **sin** datos del workspace privado |
| **5 Contenido** | Cursos de IA y Derecho, canal YouTube, libros, canciones | Flujos editoriales con Editorial/Academic Agent |
| **6 Endurecimiento** | Auth local, cifrado en reposo, backups, pruebas de intrusión | Revisión de SECURITY.md y simulacro de restauración |

Primeros pasos de Fase 1: probar Docker en equipo con daemon → aprobar D-02/D-05 → corpus sintético → ingesta mínima.
