# MAYALEX_SYSTEM_MAP

Base: `main` @ `4e33312` (merge del PR #88). Hecho solo con lo que el repositorio comprueba; lo que no se pudo ver dice «no verificado».

## Flujo de producción hoy (`app/api/chat/route.ts`)
```
USER → auth/límites (lib/auth, lib/rate-limit, lib/flags)
     → clasificarConsulta (lib/router/clasificar_consulta.ts)         ruta RAG / aclaración
     → buscarRAG (lib/rag/search.ts)
          ├─ resolverArticuloExacto (lib/legal-retrieval/exact-resolver.ts)   instrumento + artículo
          ├─ semantic-retriever (Supabase `biblioteca_vectores`, pgvector) + rerank opcional (lib/rag/rerank.ts, flag Cohere)
          └─ instrument-gate / retrieval-outcome (estados EXACT_SUCCESS … NO_VERIFIED_EVIDENCE)
     → Evidence Gate fail-closed (evidence-engine.ts: CORPUS_EVIDENCE_NOT_FOUND → abstención)
     → modelo: **Anthropic** (lib/model-config.ts: Sonnet 4.6 / Haiku 4.5, allowlist cerrada), streaming
     → verificación de cita (lib/mcp/verificar-cita.ts), supresión de sugerencias (lib/chat)
     → respuesta + log (after())
```
- `lib/legal-retrieval/norma-version.ts`: motor de versiones/vigencia por fecha (migración `20261016…norma_version`).
- `lib/ingesta-oficial/`: pipeline de ingesta con estados, hash y validaciones. `lib/legal-retrieval/official-sources/`: adaptadores (CEDIJ verificado en vivo, ver `docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md`).
- `lib/mcp/`: acceso y verificación de cita (no es aún un bus de herramientas).
- `lib/self-learning/`: plantillas/moderación (no es el bucle de aprendizaje controlado).
- `lib/websearch/tavily.ts`: búsqueda web (fallback; no restringido aún a fuentes oficiales).
- Pagos: PayPal (`lib/paypal`, `app/api/paypal`). **No tocar sin Fredy.**

## AI Gateway shadow (OpenAI) — apagado
`lib/ai-gateway/shadow` (Responses API, gpt-6-luna, `store:false`, fail-closed: kill switch → privacidad → corpus público → procedencia → credencial → breaker → presupuesto → adaptador → esquema → validador de citas) y `lib/ai-gateway/canary` (paquete de autorización G6). `SHADOW_GATEWAY_ENABLED=false`, presupuesto 0, manifiesto de procedencia vacío. Es subordinado: nunca altera la respuesta HTTP (12 escenarios de independencia).

## Datos
Supabase proyecto `thgrhueckkjdutjvcufp`, tabla `biblioteca_vectores` (84,204 filas a 2026-09-30; 9.9 % sin `fuente`; `es_norma_vigente` NULL en 79.9 %; capa privada `doc_*` ≈ 65,776 filas aislada del corpus público). RLS: ver `MAYALEX_FASE0_PLAN_RLS.md`.

## Tests
~110 archivos en `tests/`, ~1,980 pruebas offline; Golden Set del gateway en `tests/golden/`. No hay aún golden sets por materia con métricas de calidad jurídica.

## Lo que NO existe todavía (objetivo del mandato)
`lib/legal-os/` (router de intención/jurisdicción, skills, agentes, bus de herramientas, grafo, observabilidad por consulta, bucle de aprendizaje, evals por materia), proveedor OpenAI en producción, capa de jurisprudencia, matriz de brechas automática.
