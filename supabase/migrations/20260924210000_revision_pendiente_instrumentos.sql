-- ═══════════════════════════════════════════════════════════════════════════
-- 20260924210000_revision_pendiente_instrumentos.sql
--
-- Disposición preventiva de 41 filas de tipo_fuente='instrumento' (escrituras,
-- poderes) identificadas como el único bolsón de riesgo real tras clasificar
-- las 217 candidatas sin placeholder de anonimización que coincidían con
-- patrones de comparecencia/otorgante/gerente general/apoderado (ver
-- docs/governance/DECISION_LOG.md, entrada 2026-09-24 -- levantamiento
-- parcial del NO-GO del 13-sep).
--
-- Decisión del fundador (2026-09-24): excluir estas 41 filas puntualmente de
-- las funciones de búsqueda, de forma reversible, mientras las revisa en
-- privado. Si alguna resulta falso positivo, se reintegra con un solo UPDATE
-- (ver ROLLBACK abajo) -- no se borra ni se mueve ningún dato.
--
-- Se usa una columna booleana (no una tabla de cuarentena separada ni un
-- DELETE) porque el universo es pequeño, específico y con expectativa de
-- reintegración parcial -- una columna es la operación más barata y más
-- fácil de revertir fila por fila. El aislamiento real (tabla separada)
-- queda reservado para si una revisión futura confirma un volumen mayor.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.biblioteca_vectores
  ADD COLUMN IF NOT EXISTS revision_pendiente boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.biblioteca_vectores.revision_pendiente IS
  'true = excluida temporalmente de búsqueda mientras el fundador revisa manualmente posible dato personal sin redactar (ver docs/governance/DECISION_LOG.md, 2026-09-24). No implica que el contenido sea inválido ni se borra nada.';

UPDATE public.biblioteca_vectores
SET revision_pendiente = true
WHERE id = ANY(ARRAY[
  'mayalex_instrumentos:doc_063e52b2_p00_c015',
  'mayalex_instrumentos:doc_18d29482_p00_c012',
  'mayalex_instrumentos:doc_22f8ad2e_p00_c002',
  'mayalex_instrumentos:doc_328b7de8_p00_c041',
  'mayalex_instrumentos:doc_338918f1_p00_c003',
  'mayalex_instrumentos:doc_35a87f93_p00_c015',
  'mayalex_instrumentos:doc_41525391_p00_c002',
  'mayalex_instrumentos:doc_455483f2_p00_c008',
  'mayalex_instrumentos:doc_606cc127_p00_c041',
  'mayalex_instrumentos:doc_6713dc7f_p00_c012',
  'mayalex_instrumentos:doc_6cce66c5_p00_c010',
  'mayalex_instrumentos:doc_6ec880fb_p00_c008',
  'mayalex_instrumentos:doc_773400b2_p00_c010',
  'mayalex_instrumentos:doc_79e42164_p00_c015',
  'mayalex_instrumentos:doc_7cda2702_p00_c002',
  'mayalex_instrumentos:doc_7d22cda7_p00_c002',
  'mayalex_instrumentos:doc_841113b3_p00_c005',
  'mayalex_instrumentos:doc_9258685b_p00_c005',
  'mayalex_instrumentos:doc_9557244d_p00_c006',
  'mayalex_instrumentos:doc_a696d377_p00_c010',
  'mayalex_instrumentos:doc_ab9a2f30_p00_c018',
  'mayalex_instrumentos:doc_adc206c9_p00_c003',
  'mayalex_instrumentos:doc_af42e1a4_p00_c002',
  'mayalex_instrumentos:doc_b7aaf412_p00_c010',
  'mayalex_instrumentos:doc_b96fa09d_p00_c002',
  'mayalex_instrumentos:doc_bac108f6_p00_c015',
  'mayalex_instrumentos:doc_c0b49420_p00_c001',
  'mayalex_instrumentos:doc_c74caa3d_p00_c002',
  'mayalex_instrumentos:doc_c7822b8a_p00_c018',
  'mayalex_instrumentos:doc_cf0d5de2_p00_c002',
  'mayalex_instrumentos:doc_d01ad4a0_p00_c002',
  'mayalex_instrumentos:doc_d41af71a_p00_c018',
  'mayalex_instrumentos:doc_d5aec639_p00_c008',
  'mayalex_instrumentos:doc_d811fec7_p00_c006',
  'mayalex_instrumentos:doc_dba9650b_p00_c001',
  'mayalex_instrumentos:doc_ddbbf12e_p00_c041',
  'mayalex_instrumentos:doc_e2c162ec_p00_c002',
  'mayalex_instrumentos:doc_e7199b42_p00_c005',
  'mayalex_instrumentos:doc_eb53b376_p00_c018',
  'mayalex_instrumentos:doc_f6b36ab5_p00_c010',
  'mayalex_instrumentos:doc_f89bea98_p00_c002'
]);

-- Exclusión a nivel de motor SQL: la función que alimenta la búsqueda
-- semántica (lib/rag/search.ts -> buscarEnSupabase) ya no puede devolver
-- estas filas, sin importar similitud ni colección. La ruta de búsqueda
-- exacta por artículo (consultarPorVigencia, fuente_tipo='codigo') no
-- necesita el mismo cambio: las 41 filas tienen fuente_tipo NULL, nunca
-- pasan ese filtro.
CREATE OR REPLACE FUNCTION public.buscar_biblioteca_v2(
  query_embedding vector,
  coleccion_filtro text,
  materia_filtro text DEFAULT NULL::text,
  limite integer DEFAULT 5,
  solo_norma_vigente boolean DEFAULT false
)
RETURNS TABLE(id text, contenido text, num_articulo text, fuente text, fuente_tipo text, jurisdiccion text, es_norma_vigente boolean, similarity double precision)
LANGUAGE sql
STABLE
AS $function$
  SELECT b.id, b.contenido, b.num_articulo, b.fuente,
         b.fuente_tipo, b.jurisdiccion, b.es_norma_vigente,
         1 - (b.embedding <=> query_embedding) AS similarity
  FROM biblioteca_vectores b
  WHERE b.coleccion = coleccion_filtro
    AND (materia_filtro IS NULL OR b.materia = materia_filtro)
    AND (NOT solo_norma_vigente OR b.es_norma_vigente = true)
    AND b.revision_pendiente = false
  ORDER BY b.embedding <=> query_embedding
  LIMIT least(limite, 20);
$function$;

COMMIT;

-- ── VALIDACIÓN POSTERIOR ───────────────────────────────────────────────────
-- select count(*) from public.biblioteca_vectores where revision_pendiente;
--   -> debe ser 41.
-- select pg_get_functiondef('public.buscar_biblioteca_v2'::regproc);
--   -> debe incluir "AND b.revision_pendiente = false".

-- ── ROLLBACK (total o fila por fila) ────────────────────────────────────────
-- Reintegrar TODAS: update public.biblioteca_vectores set revision_pendiente = false where revision_pendiente = true;
-- Reintegrar UNA (falso positivo confirmado):
--   update public.biblioteca_vectores set revision_pendiente = false where id = '<id>';
-- Revertir el cambio de función: reemplazar por la definición anterior sin
-- la condición "AND b.revision_pendiente = false" (ver migración previa
-- 20260924000000_auditor_devops_ro_and_legal_feedback_telemetry.sql para el
-- historial de esta función, aunque esa migración no la tocaba -- la
-- definición original está también en el pg_get_functiondef capturado en el
-- chat de esta sesión, 2026-09-24).
