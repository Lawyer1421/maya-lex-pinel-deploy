-- ═══════════════════════════════════════════════════════════════════════════
-- 20260919000000_exequatur_diagnostico_intentos.sql
-- Exequátur Slice 3B — persistencia de intentos / progreso
--
-- NO APLICADA A PRODUCCIÓN en el PR. SQL_APPLY es P3 del fundador
-- (staging primero). El runtime falla cerrado si la tabla no existe.
--
-- Identidad: auth.users.id (UUID de sesión), NUNCA email ni user_identifier
-- de facturación. RLS: cada usuario solo ve/escribe SUS filas.
-- Intentos son append-only para authenticated. El score persistido es
-- denormalización; la app re-evalúa desde `respuestas` al leer.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.exequatur_diagnostico_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  banco_version integer NOT NULL,
  curriculum_version integer NOT NULL,
  respuestas jsonb NOT NULL DEFAULT '{}'::jsonb,
  aciertos integer NOT NULL CHECK (aciertos >= 0),
  total integer NOT NULL CHECK (total > 0),
  item_aciertos text[] NOT NULL DEFAULT '{}',
  item_fallos text[] NOT NULL DEFAULT '{}',
  item_sin_respuesta text[] NOT NULL DEFAULT '{}',
  objetivos_pendientes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exq_intentos_user_created
  ON public.exequatur_diagnostico_intentos (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.exequatur_diagnostico_progreso (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  ultimo_intento_id uuid REFERENCES public.exequatur_diagnostico_intentos (id) ON DELETE SET NULL,
  objetivos_pendientes text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exequatur_diagnostico_intentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exequatur_diagnostico_intentos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exequatur_diagnostico_progreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exequatur_diagnostico_progreso FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exq_intentos_select_own ON public.exequatur_diagnostico_intentos;
CREATE POLICY exq_intentos_select_own
  ON public.exequatur_diagnostico_intentos
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS exq_intentos_insert_own ON public.exequatur_diagnostico_intentos;
CREATE POLICY exq_intentos_insert_own
  ON public.exequatur_diagnostico_intentos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS exq_intentos_service ON public.exequatur_diagnostico_intentos;
CREATE POLICY exq_intentos_service
  ON public.exequatur_diagnostico_intentos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS exq_progreso_select_own ON public.exequatur_diagnostico_progreso;
CREATE POLICY exq_progreso_select_own
  ON public.exequatur_diagnostico_progreso
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS exq_progreso_insert_own ON public.exequatur_diagnostico_progreso;
CREATE POLICY exq_progreso_insert_own
  ON public.exequatur_diagnostico_progreso
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS exq_progreso_update_own ON public.exequatur_diagnostico_progreso;
CREATE POLICY exq_progreso_update_own
  ON public.exequatur_diagnostico_progreso
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS exq_progreso_service ON public.exequatur_diagnostico_progreso;
CREATE POLICY exq_progreso_service
  ON public.exequatur_diagnostico_progreso
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.exequatur_diagnostico_intentos FROM PUBLIC, anon;
REVOKE ALL ON public.exequatur_diagnostico_progreso FROM PUBLIC, anon;

GRANT SELECT, INSERT ON public.exequatur_diagnostico_intentos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.exequatur_diagnostico_progreso TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exequatur_diagnostico_intentos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exequatur_diagnostico_progreso TO service_role;

COMMIT;
