# DECISIONS — requieren tu aprobación antes de adoptarse

> **EN summary:** Technology choices I will not make for you. Each has a recommendation; nothing here is installed yet.

| ID | Decisión | Recomendación | Riesgo / costo | Cuándo |
|---|---|---|---|---|
| D-01 | Mantener el núcleo sin dependencias npm | Sí | Más código propio | ya aplicado (revocable) |
| D-02 | Supabase CLI completo vs. Postgres+pgvector simple | Empezar con Postgres simple; migraciones ya son compatibles con Supabase | Supabase local = ~10 contenedores, más RAM | Fase 1 |
| D-03 | Servidor de modelos local: Ollama vs. llama.cpp/vLLM | Ollama (simple) | Calidad según hardware (¿GPU/RAM de tu equipo?) | Fase 2 |
| D-04 | Primer proveedor EXTERNAL: Claude | Sí, solo datos PUBLIC/INTERNAL, con aprobación | Costo, fuga si se mal-configura | Fase 3 |
| D-05 | Modelo de embeddings local (dimensión 768 asumida) | Elegir tras medir en español jurídico | Re-indexar si cambia | Fase 1 |
| D-06 | Acceso web para Research Agent (allowlist) | Solo lectura, dominios aprobados, con auditoría | Prompt injection | Fase 3 |
| D-07 | Autenticación local si se usa en LAN/otro dispositivo | Passkey/TOTP | Complejidad | antes de exponer |
| D-08 | Anclaje periódico del hash de auditoría (p. ej. commit de un hash a Git) | Sí | Ninguno relevante | Fase 1 |
| D-09 | Memoria persistente de clientes en Notarial Agent | **No** hasta definir cifrado y retención | Secreto profesional | Fase 2+ |
| D-10 | Empaquetar como app de escritorio (Tauri/Electron) | Posponer | Dependencias pesadas | Fase 6 |

**Preguntas para ti:** ¿qué equipo usarás (RAM/GPU, sistema operativo)? ¿Docker Desktop o Linux? ¿Cifrado de disco activo?
