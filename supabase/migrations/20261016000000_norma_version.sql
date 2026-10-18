-- ═══════════════════════════════════════════════════════════════════════════
-- 20261016000000_norma_version.sql
--
-- P0-1: versionado de normas por fecha. Una fila = una versión de una unidad
-- (artículo / numeral / literal) de un instrumento, con su ventana de vigencia.
--
-- ALCANCE: SOLO STAGING (aicakncgtuiiuomflkqj). NO aplicar en producción.
-- No siembra datos. Rollback: supabase/rollbacks/20261016000000_norma_version_rollback.sql
--
-- Convenciones:
--   * Ventana de vigencia semiabierta [vigente_desde, vigente_hasta); NULL en
--     vigente_hasta = versión abierta (rige hoy).
--   * vigente_desde es la fecha de VIGENCIA, nunca la de publicación. Si el
--     decreto calla, rige 20 días después de publicado (el cálculo vive en
--     lib/legal-retrieval/norma-version.ts; aquí sólo se valida coherencia).
--   * Una versión sin texto (null o vacío), de vigencia UNKNOWN o FALSE, o con
--     fecha en RANGO, nunca puede ser elegible_primary. TRUE_PRESUNTA y la
--     verificación SECUNDARIA SÍ pueden serlo (fallo CLO 16-oct-2026,
--     SI_PRIMARY_CON_AVISO).
--   * Fuentes de distinto nivel_verificacion pueden coexistir para la misma
--     unidad y fecha (precedencia PRIMARIA_IMAGEN > PRIMARIA_TEXTO > SECUNDARIA,
--     resuelta en resolverVersion); dentro de un mismo nivel no hay solapes.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Necesario para la exclusion constraint (igualdad de texto + solape de rangos).
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.norma_version (
  instrumento_id          text        NOT NULL,
  unidad                  text        NOT NULL,
  version_id              text        NOT NULL,
  etiqueta                text,
  texto                   text,
  texto_hash              text,
  vigente_desde           date        NOT NULL,
  vigente_hasta           date,
  vigente_desde_min       date,
  vigente_desde_max       date,
  tipo_evento             text        NOT NULL,
  instrumento_modificador text,
  gaceta_numero           text,
  fecha_publicacion       date,
  fecha_vigencia          date,
  estado_vigencia         text        NOT NULL DEFAULT 'UNKNOWN',
  nivel_verificacion      text        NOT NULL,
  elegible_primary        boolean     NOT NULL DEFAULT false,
  fuente                  text,
  fuente_pdf_hash         text,
  adjudicacion_ref        text,
  precision_fecha         text        NOT NULL,
  nota                    text,
  created_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT norma_version_pk PRIMARY KEY (instrumento_id, unidad, version_id),

  CONSTRAINT norma_version_tipo_evento_chk CHECK (tipo_evento IN (
    'ORIGINAL', 'REFORMA', 'ADICION', 'DEROGACION_EXPRESA',
    'TEXTO_NUEVO_MISMO_NUMERO', 'INCONSTITUCIONALIDAD', 'DESPLAZAMIENTO_ESPECIAL'
  )),
  CONSTRAINT norma_version_estado_vigencia_chk CHECK (
    estado_vigencia IN ('TRUE', 'TRUE_PRESUNTA', 'FALSE', 'UNKNOWN')
  ),
  CONSTRAINT norma_version_nivel_verificacion_chk CHECK (
    nivel_verificacion IN ('PRIMARIA_IMAGEN', 'PRIMARIA_TEXTO', 'SECUNDARIA')
  ),
  CONSTRAINT norma_version_precision_fecha_chk CHECK (
    precision_fecha IN ('DIA', 'MES', 'AÑO', 'RANGO')
  ),

  -- Ventana coherente.
  CONSTRAINT norma_version_ventana_chk CHECK (
    vigente_hasta IS NULL OR vigente_hasta > vigente_desde
  ),
  -- La vigencia no precede a la publicación (vigente_desde ≠ fecha de publicación).
  CONSTRAINT norma_version_vigencia_post_publicacion_chk CHECK (
    fecha_publicacion IS NULL OR vigente_desde >= fecha_publicacion
  ),
  -- Incertidumbre de fecha: el rango, cuando existe, contiene vigente_desde;
  -- una fecha en RANGO exige ambos extremos.
  CONSTRAINT norma_version_rango_chk CHECK (
    (vigente_desde_min IS NULL OR vigente_desde_max IS NULL OR vigente_desde_min <= vigente_desde_max)
    AND (vigente_desde_min IS NULL OR vigente_desde >= vigente_desde_min)
    AND (vigente_desde_max IS NULL OR vigente_desde <= vigente_desde_max)
    AND (precision_fecha <> 'RANGO' OR (vigente_desde_min IS NOT NULL AND vigente_desde_max IS NOT NULL))
  ),
  -- Fail-closed en la propia tabla: elegible_primary sólo con texto, vigencia
  -- TRUE o TRUE_PRESUNTA (nunca UNKNOWN ni FALSE) y fecha que no sea RANGO.
  CONSTRAINT norma_version_elegible_primary_chk CHECK (
    NOT elegible_primary OR (
      texto IS NOT NULL
      AND btrim(texto) <> ''
      AND estado_vigencia IN ('TRUE', 'TRUE_PRESUNTA')
      AND precision_fecha <> 'RANGO'
    )
  ),

  -- Sin versiones solapadas por (instrumento, unidad, nivel_verificacion).
  CONSTRAINT norma_version_sin_solapes EXCLUDE USING gist (
    instrumento_id WITH =,
    unidad WITH =,
    nivel_verificacion WITH =,
    daterange(vigente_desde, vigente_hasta, '[)') WITH &&
  )
);

CREATE INDEX IF NOT EXISTS norma_version_lookup_idx
  ON public.norma_version (instrumento_id, unidad, vigente_desde);

COMMENT ON TABLE public.norma_version IS
  'P0-1: versiones de normas por fecha. Ventana [vigente_desde, vigente_hasta). Sólo staging hasta autorización del fundador.';
COMMENT ON COLUMN public.norma_version.vigente_desde IS
  'Fecha de VIGENCIA (no de publicación). Si el decreto calla: publicación + 20 días.';
COMMENT ON COLUMN public.norma_version.elegible_primary IS
  'true sólo con texto no vacío y vigencia TRUE o TRUE_PRESUNTA; el CHECK lo impide con texto null o vacío, UNKNOWN, FALSE o fecha en RANGO. Una reforma o fallo posterior no incorporado se marca con false y una nota.';

-- RLS: lectura autenticada; sin políticas de escritura (nadie escribe vía API).
ALTER TABLE public.norma_version ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS norma_version_select_authenticated ON public.norma_version;
CREATE POLICY norma_version_select_authenticated
  ON public.norma_version
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.norma_version FROM PUBLIC, anon;
GRANT SELECT ON public.norma_version TO authenticated;

COMMIT;
