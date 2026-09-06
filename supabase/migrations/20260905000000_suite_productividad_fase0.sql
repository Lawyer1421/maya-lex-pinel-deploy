-- ═══════════════════════════════════════════════════════════════════════════
-- 20260905000000_suite_productividad_fase0.sql
-- Resolución del Fundador v3 — Fase 0: infraestructura de la Suite de
-- Productividad Jurídica (expedientes, artefactos de estudio, memoria de
-- conversación, comparador de casos). Ver docs/governance/DECISION_LOG.md,
-- entrada 2026-09-05, para el contexto completo de las decisiones abajo.
--
-- APLICADA a aicakncgtuiiuomflkqj (mayalexhn-staging) el 2026-09-05 -- las
-- 6 tablas + GRANTs, en dos pasos (la reconciliación de feature_flags NO
-- se aplicó ahí: esa tabla no existe en staging, solo en producción). Tests
-- de RLS corridos vía SET LOCAL ROLE authenticated + request.jwt.claims con
-- 2 usuarios sintéticos (rls-test-a/b@mayalexhn-staging.local) -- 🟢 en las
-- 6 tablas (positivo: dueño lee/escribe/borra lo suyo; negativo: el otro
-- usuario no ve, no puede UPDATE/DELETE, ni insertar filas hijas vía las
-- políticas EXISTS de conversation_messages/expediente_embeddings).
-- Staging limpio después: 0 filas en las 6 tablas, 0 usuarios de prueba.
-- Ver docs/governance/DECISION_LOG.md, entrada 2026-09-05, para el detalle
-- completo y scripts/test-rls-suite-fase0.ts para la metodología.
--
-- NO APLICADA a producción (thgrhueckkjdutjvcufp) todavía -- pendiente de
-- sí explícito posterior de Fredy. NO es un DRY-RUN teórico: el resultado
-- de arriba es de una ejecución real contra staging, no una simulación.
--
-- CONTEXTO VERIFICADO ANTES DE ESCRIBIR ESTA MIGRACIÓN (no asumido):
--   - Ninguna de las 6 tablas de este archivo existe hoy en thgr
--     (information_schema.tables, verificado 2026-09-05) — el plan original
--     decía "expedientes (igual, pero con RLS performante)" como si ya
--     existiera; es falso. Esto es un CREATE completo, no un ALTER.
--   - `feature_flags` SÍ existe (creada en 20260827000000_feature_flags.sql,
--     Operación "Facultades Completas"), con 6 flags de un triage distinto
--     y no relacionado a este plan: flag_corpus_p0, flag_corpus_profesional,
--     flag_osint, flag_expediente (case_documents), flag_voz, flag_paywall.
--     `case_documents` (mencionada en la descripción de flag_expediente)
--     NUNCA existió como tabla real — confirmado contra information_schema.
--   - Identidad de usuario: la app SÍ tiene Supabase Auth real (magic link +
--     Google OAuth, app/auth/callback/route.ts) — auth.uid() resuelve a un
--     usuario real con sesión. El resto del negocio (subscriptions,
--     queries_log) usa `user_identifier` (texto, email) vía service_role,
--     un sistema de identidad PARALELO y no relacionado. Decisión explícita
--     de Fredy + Auditor (2026-09-05): las tablas de esta Suite usan
--     `user_id uuid REFERENCES auth.users(id)` + RLS real vía auth.uid(),
--     NO el patrón user_identifier/service_role del resto del esquema —
--     más defensa en profundidad, justificada por la sensibilidad de datos
--     de clientes (secreto profesional) frente a datos de facturación.
--   - `lib/supabase.ts` tiene un tipo TypeScript `conversations` (JSONB
--     array `messages`, `user_identifier`) que NO corresponde a ninguna
--     tabla real — código muerto de un diseño abandonado. No se toca en
--     esta migración (es un archivo .ts, no SQL); queda anotado para
--     limpieza separada. Las tablas reales de esta Suite se llaman
--     `conversation_sessions` / `conversation_messages` para no colisionar
--     con ese nombre ni su forma.
--
-- DISEÑO DE ACCESO (decisión explícita, 2026-09-05):
--   - Rutas API síncronas (crear/leer/listar expediente, postear mensaje,
--     generar artefacto) usan createSupabaseServerClient() (sesión real del
--     usuario vía cookies, respeta RLS) — NUNCA service_role para estas
--     operaciones. RLS es la barrera real, no una capa decorativa.
--   - EXCEPCIÓN estructural, no una violación de la regla anterior: el job
--     de Inngest que procesa un expediente en background (Fase 1.2) no
--     tiene sesión de usuario (no hay cookies en un evento en cola) — debe
--     escribir el resultado vía service_role. Esto es seguro porque
--     `expediente_id`/`user_id` ya quedaron fijados en el INSERT original,
--     hecho por la ruta API CON sesión validada, antes de encolar el job;
--     el job de background nunca elige a qué usuario pertenece un
--     expediente, solo completa una fila que ya tenía dueño verificado.
--     RLS sigue protegiendo la LECTURA de esa fila para todo el resto del
--     sistema (UI, otras rutas), incluso aunque el job que la completó haya
--     usado service_role para el UPDATE puntual.
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ── 1) expedientes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expedientes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_caso   text NOT NULL,
  tipo_caso     text,
  materia       text,
  -- queued -> extracting -> analyzing -> embedding -> done, o failed en
  -- cualquier punto. Fase 1.3 del plan muestra estos estados en UI.
  estado        text NOT NULL DEFAULT 'queued'
                  CHECK (estado IN ('queued','extracting','analyzing','embedding','done','failed')),
  -- Salida de Structured Output (AnalisisExpedienteSchema). Cada campo
  -- extraído debe poder ser null + una razón cuando el documento no lo dice
  -- claramente -- decisión explícita 2026-09-05, no inferir hechos del caso.
  analisis      jsonb,
  error_detalle text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedientes FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'expedientes' AND policyname = 'owner_access_expedientes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "owner_access_expedientes" ON public.expedientes
        FOR ALL TO authenticated
        USING ((select auth.uid()) = user_id)
        WITH CHECK ((select auth.uid()) = user_id)
    $pol$;
  END IF;
END $$;

-- ── 2) study_artifacts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_artifacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('mapa_conceptual','diagrama_flujo','presentacion')),
  titulo     text NOT NULL,
  -- Para mapa_conceptual/diagrama_flujo: topología (nodos+edges) que emite
  -- el LLM -- el layout (coordenadas) lo calcula Dagre en el cliente, nunca
  -- se persiste aquí (P6 del plan: el LLM emite topología, no coordenadas).
  contenido  jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_artifacts FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'study_artifacts' AND policyname = 'owner_access_study_artifacts'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "owner_access_study_artifacts" ON public.study_artifacts
        FOR ALL TO authenticated
        USING ((select auth.uid()) = user_id)
        WITH CHECK ((select auth.uid()) = user_id)
    $pol$;
  END IF;
END $$;

-- ── 3) conversation_sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_sessions' AND policyname = 'owner_access_conversation_sessions'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "owner_access_conversation_sessions" ON public.conversation_sessions
        FOR ALL TO authenticated
        USING ((select auth.uid()) = user_id)
        WITH CHECK ((select auth.uid()) = user_id)
    $pol$;
  END IF;
END $$;

-- ── 4) conversation_messages ────────────────────────────────────────────
-- Tabla normalizada (P3 del plan) -- reemplaza el patrón JSONB-FIFO del
-- tipo `conversations` muerto en lib/supabase.ts, que nunca llegó a tabla
-- real. Sin user_id propio -- el dueño se resuelve vía conversation_id.
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant','system')),
  content         text NOT NULL,
  mode            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_created
  ON public.conversation_messages (conversation_id, created_at);

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_messages' AND policyname = 'owner_access_conversation_messages'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "owner_access_conversation_messages" ON public.conversation_messages
        FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM public.conversation_sessions cs
          WHERE cs.id = conversation_messages.conversation_id
            AND cs.user_id = (select auth.uid())
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM public.conversation_sessions cs
          WHERE cs.id = conversation_messages.conversation_id
            AND cs.user_id = (select auth.uid())
        ))
    $pol$;
  END IF;
END $$;

-- ── 5) user_preferences ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferencias jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_preferences' AND policyname = 'owner_access_user_preferences'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "owner_access_user_preferences" ON public.user_preferences
        FOR ALL TO authenticated
        USING ((select auth.uid()) = user_id)
        WITH CHECK ((select auth.uid()) = user_id)
    $pol$;
  END IF;
END $$;

-- ── 6) expediente_embeddings ────────────────────────────────────────────
-- vector(384) -- decisión explícita 2026-09-05: reutilizar el mismo modelo
-- ya verificado del corpus (Xenova/multilingual-e5-small, local, sin
-- credenciales nuevas), NO introducir OpenAI/1536 dims por defecto.
CREATE TABLE IF NOT EXISTS public.expediente_embeddings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id uuid NOT NULL REFERENCES public.expedientes(id) ON DELETE CASCADE,
  chunk         text NOT NULL,
  embedding     vector(384),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expediente_embeddings_hnsw
  ON public.expediente_embeddings USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.expediente_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expediente_embeddings FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'expediente_embeddings' AND policyname = 'owner_access_expediente_embeddings'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "owner_access_expediente_embeddings" ON public.expediente_embeddings
        FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM public.expedientes e
          WHERE e.id = expediente_embeddings.expediente_id
            AND e.user_id = (select auth.uid())
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM public.expedientes e
          WHERE e.id = expediente_embeddings.expediente_id
            AND e.user_id = (select auth.uid())
        ))
    $pol$;
  END IF;
END $$;

-- ── GRANTs a authenticated (hallazgo real del test de RLS en staging,
-- 2026-09-05: RLS filtra FILAS, no reemplaza los privilegios de TABLA -- sin
-- este GRANT, authenticated recibe "permission denied for table X" antes
-- de que la política de RLS siquiera se evalúe. A diferencia del resto del
-- esquema (subscriptions, queries_log: solo service_role, sin GRANT a
-- authenticated), estas tablas SÍ necesitan acceso directo del cliente. ──
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expedientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_artifacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expediente_embeddings TO authenticated;

-- ── Reconciliación de feature_flags (mismo triage, no un segundo sistema) ─
-- Los 4 flags nuevos de esta Suite, default OFF (mismo principio R1 de
-- 20260827000000_feature_flags.sql: toda capacidad nueva sale apagada).
INSERT INTO public.feature_flags (flag_name, enabled, allowed_emails, description)
VALUES
  ('flag_modo_expediente',      false, '{}', 'Suite Productividad Fase 2 -- Modo Expediente (análisis + chat con contexto de caso)'),
  ('flag_herramientas_estudio', false, '{}', 'Suite Productividad Fase 3 -- mapas conceptuales, diagramas, presentaciones'),
  ('flag_memoria_conversacion', false, '{}', 'Suite Productividad Fase 4 -- historial persistente de conversación'),
  ('flag_casos_similares',      false, '{}', 'Suite Productividad Fase 5 -- comparador de casos por similitud vectorial')
ON CONFLICT (flag_name) DO NOTHING;

-- flag_expediente (triage 2026-08-27) queda documentado como superseded --
-- NO se borra (evita romper cualquier lectura existente de ese flag_name),
-- se actualiza su descripción para que quede trazable. case_documents,
-- mencionada en su descripción original, nunca existió como tabla real.
UPDATE public.feature_flags
SET description = 'OBSOLETO 2026-09-05 -- case_documents nunca se implementó. Superseded por flag_modo_expediente (tabla real: expedientes). Ver docs/governance/DECISION_LOG.md, entrada 2026-09-05.'
WHERE flag_name = 'flag_expediente';

COMMIT;

-- ── VALIDACIÓN POSTERIOR (staging primero, nunca producción sin sí) ──────
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public'
--   AND table_name IN ('expedientes','study_artifacts','conversation_sessions',
--   'conversation_messages','user_preferences','expediente_embeddings');
--   -- deben existir las 6
-- SELECT rowsecurity, forcerowsecurity FROM pg_tables
--   WHERE tablename IN ('expedientes','study_artifacts','conversation_sessions',
--   'conversation_messages','user_preferences','expediente_embeddings');
--   -- todas true, true
-- SELECT flag_name, enabled, description FROM public.feature_flags ORDER BY flag_name;
--   -- deben existir 10 flags (6 viejos + 4 nuevos), todos enabled=false

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- Todas las tablas son nuevas y aisladas, sin código de producción
-- leyéndolas todavía en este commit -- DROP es seguro si algo sale mal:
--   BEGIN;
--   DROP TABLE IF EXISTS public.expediente_embeddings;
--   DROP TABLE IF EXISTS public.conversation_messages;
--   DROP TABLE IF EXISTS public.conversation_sessions;
--   DROP TABLE IF EXISTS public.study_artifacts;
--   DROP TABLE IF EXISTS public.expedientes;
--   DROP TABLE IF EXISTS public.user_preferences;
--   DELETE FROM public.feature_flags WHERE flag_name IN
--     ('flag_modo_expediente','flag_herramientas_estudio',
--      'flag_memoria_conversacion','flag_casos_similares');
--   -- flag_expediente: revertir la descripción a mano si hace falta, no hay
--   -- snapshot automático de su valor anterior en este archivo.
--   COMMIT;
