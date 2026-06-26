-- =====================================================
-- MAYA LEX IA PINEL HN — Esquema de Base de Datos
-- Ejecutar en: Supabase → SQL Editor
-- =====================================================

-- Tabla principal de control de consultas y rate limiting
CREATE TABLE IF NOT EXISTS public.queries_log (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier  TEXT    NOT NULL,                          -- "ip:1.2.3.4" o "user:uuid"
  query_date       DATE    DEFAULT CURRENT_DATE NOT NULL,
  query_count      INTEGER DEFAULT 1            NOT NULL,
  tier             TEXT    DEFAULT 'free'       NOT NULL,     -- 'free' | 'pro' | 'admin'
  created_at       TIMESTAMPTZ DEFAULT now()   NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now()   NOT NULL,

  CONSTRAINT queries_log_user_date_unique UNIQUE (user_identifier, query_date),
  CONSTRAINT queries_log_tier_check CHECK (tier IN ('free', 'pro', 'academico', 'admin')),
  CONSTRAINT queries_log_count_positive CHECK (query_count >= 0)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_queries_log_user_date
  ON public.queries_log (user_identifier, query_date DESC);

CREATE INDEX IF NOT EXISTS idx_queries_log_date
  ON public.queries_log (query_date DESC);

-- Historial de conversaciones (opcional, para funcionalidades futuras)
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier  TEXT    NOT NULL,
  mode             TEXT    DEFAULT 'analisis' NOT NULL,       -- 'sala_ia' | 'analisis' | 'documento'
  title            TEXT,                                      -- Resumen automático del tema
  messages         JSONB   DEFAULT '[]'::jsonb NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT conversations_mode_check CHECK (mode IN ('sala_ia', 'analisis', 'documento'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
  ON public.conversations (user_identifier, created_at DESC);

-- Tabla de suscripciones (PayPal Subscriptions API)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier     TEXT    NOT NULL UNIQUE,
  paypal_sub_id       TEXT    UNIQUE,                         -- P-XXXX ID de suscripción PayPal
  paypal_payer_id     TEXT,                                   -- Payer ID de PayPal
  tier                TEXT    DEFAULT 'free' NOT NULL,        -- 'free' | 'pro' | 'academico' | 'admin'
  status              TEXT    DEFAULT 'active' NOT NULL,      -- 'active' | 'cancelled' | 'past_due'
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT subscriptions_tier_check   CHECK (tier   IN ('free', 'pro', 'academico', 'admin')),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing'))
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.queries_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;

-- Solo el service_role key (backend) puede leer/escribir
CREATE POLICY "service_role_full_access_queries" ON public.queries_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_conversations" ON public.conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER queries_log_updated_at
  BEFORE UPDATE ON public.queries_log
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- VISTA: Estadísticas de uso diario
-- =====================================================

CREATE OR REPLACE VIEW public.daily_usage_stats AS
SELECT
  query_date,
  COUNT(DISTINCT user_identifier) AS unique_users,
  SUM(query_count)                AS total_queries,
  COUNT(*) FILTER (WHERE tier = 'free') AS free_users,
  COUNT(*) FILTER (WHERE tier = 'pro')  AS pro_users
FROM public.queries_log
GROUP BY query_date
ORDER BY query_date DESC;

-- =====================================================
-- BIBLIOTECA PENAL PINEL — RAG con pgvector
-- Equivalente producción de ChromaDB (python-rag/)
-- Ejecutar DESPUÉS de habilitar la extensión vector en Supabase:
--   Extensions → vector → Enable
-- =====================================================

-- Habilitar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla principal de fragmentos jurídicos
CREATE TABLE IF NOT EXISTS public.biblioteca_penal (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  coleccion      TEXT        NOT NULL DEFAULT 'cpp_honduras',  -- 'cpp_honduras' | 'cp_honduras' | 'csj_jurisprudencia'
  contenido      TEXT        NOT NULL,                         -- Texto del fragmento
  num_articulo   TEXT,                                         -- '294', '178', null si no aplica
  fuente         TEXT        NOT NULL DEFAULT 'CPP Honduras (D.9-99-E)',
  pagina         INTEGER,
  chunk_id       INTEGER,
  embedding      vector(384),                                  -- paraphrase-multilingual-MiniLM-L12-v2 = 384 dims
  metadatos      JSONB       DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice HNSW para búsqueda por similitud coseno (más rápido que ivfflat)
CREATE INDEX IF NOT EXISTS idx_biblioteca_penal_embedding
  ON public.biblioteca_penal
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índice FTS para búsqueda por número de artículo
CREATE INDEX IF NOT EXISTS idx_biblioteca_penal_articulo
  ON public.biblioteca_penal (num_articulo)
  WHERE num_articulo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_biblioteca_penal_coleccion
  ON public.biblioteca_penal (coleccion);

-- RLS
ALTER TABLE public.biblioteca_penal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_biblioteca" ON public.biblioteca_penal
  FOR ALL USING (auth.role() = 'service_role');

-- Lectura pública para búsquedas anónimas (el embedding no contiene datos personales)
CREATE POLICY "public_read_biblioteca" ON public.biblioteca_penal
  FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Búsqueda híbrida (semántica + filtro por artículo)
-- Llamar desde TypeScript: supabase.rpc('buscar_biblioteca_penal', {...})
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.buscar_biblioteca_penal(
  consulta_texto    TEXT,
  consulta_embedding vector(384),
  limite            INT     DEFAULT 5,
  coleccion_filtro  TEXT    DEFAULT 'cpp_honduras',
  umbral_similitud  FLOAT   DEFAULT 0.3
)
RETURNS TABLE (
  id            UUID,
  contenido     TEXT,
  num_articulo  TEXT,
  fuente        TEXT,
  coleccion     TEXT,
  similarity    FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    bp.id,
    bp.contenido,
    bp.num_articulo,
    bp.fuente,
    bp.coleccion,
    1 - (bp.embedding <=> consulta_embedding) AS similarity
  FROM public.biblioteca_penal bp
  WHERE
    bp.coleccion = coleccion_filtro
    AND bp.embedding IS NOT NULL
    AND (1 - (bp.embedding <=> consulta_embedding)) >= umbral_similitud
  ORDER BY bp.embedding <=> consulta_embedding
  LIMIT limite;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTAS DE MIGRACIÓN DESDE CHROMADB
-- ─────────────────────────────────────────────────────────────────────────────
-- Una vez que el índice ChromaDB local esté listo (python-rag/), migrar a Supabase:
--
--   python python-rag/migrate_to_supabase.py \
--     --coleccion cpp_honduras \
--     --supabase-url $SUPABASE_URL \
--     --supabase-key $SUPABASE_SERVICE_KEY
--
-- El script migrate_to_supabase.py (pendiente de crear) exporta los embeddings
-- de ChromaDB e inserta en public.biblioteca_penal con upsert.

-- =====================================================
-- DATOS INICIALES: Admin
-- =====================================================
-- Para agregar al Abogado Pinel como admin:
-- INSERT INTO public.queries_log (user_identifier, query_date, query_count, tier)
-- VALUES ('ip:TU_IP_AQUI', CURRENT_DATE, 0, 'admin')
-- ON CONFLICT (user_identifier, query_date) DO UPDATE SET tier = 'admin';
