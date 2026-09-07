-- ═══════════════════════════════════════════════════════════════════════════
-- 20260906000000_flag_rerank.sql
-- Stack Maestro — Punto 2: feature flag para el rerank Cohere.
--
-- ESTADO: PROPUESTA. No aplicada a ningún proyecto Supabase (ni staging ni
-- thgr) al momento de este commit. Solo archivo en el repo.
--
-- CONTEXTO:
--   El rerank Cohere (lib/rag/rerank.ts, rerank-v3.5) YA está integrado y
--   activo de forma incondicional en buscarEnSupabase (lib/rag/search.ts,
--   commit c6da65a "feat(rag): retrieval en dos etapas", 2026-09-01). Hoy,
--   si COHERE_API_KEY está en el entorno, el rerank corre para todo usuario;
--   si falta, degrada a orden pgvector.
--
--   `flag_rerank` introduce un interruptor server-side sobre ese paso. El
--   cableado del flag en search.ts NO se hace en este commit — depende de una
--   decisión de diseño del fundador (ver docs/runbooks/cohere-rerank-flag.md):
--   qué significa exactamente "flag OFF". Esta migración solo crea la fila
--   para que el flag exista, apagado (R1).
--
-- DEPENDE DE: 20260827000000_feature_flags.sql (tabla public.feature_flags).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO public.feature_flags (flag_name, enabled, allowed_emails, description)
VALUES
  ('flag_rerank', false, '{}',
   'Stack Maestro P2 -- rerank Cohere rerank-v3.5 como 2a etapa del retrieval RAG (lib/rag/rerank.ts). Default OFF (R1). Cableado en search.ts pendiente de decision de diseno -- ver docs/runbooks/cohere-rerank-flag.md')
ON CONFLICT (flag_name) DO NOTHING;

COMMIT;

-- ── VALIDACIÓN POSTERIOR ─────────────────────────────────────────────────
-- SELECT flag_name, enabled FROM public.feature_flags WHERE flag_name = 'flag_rerank';
--   -> 1 fila, enabled = false

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- Ningún código lee `flag_rerank` todavía en este commit -- borrar la fila
-- es seguro:
--   DELETE FROM public.feature_flags WHERE flag_name = 'flag_rerank';
