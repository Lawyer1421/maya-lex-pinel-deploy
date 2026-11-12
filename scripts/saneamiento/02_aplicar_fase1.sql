-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 1 · SANEAMIENTO DEL CORPUS · 02 APLICAR (PRODUCCIÓN: NO EJECUTAR SIN AUTORIZACIÓN EXPRESA)
-- Requisitos: 01_validacion_fase1.sql devuelve los conteos aprobados:
--   A1 1481 · A2 995 · A3 32 · A4 14 · A5 2 · A6 70752  (total 73276).
-- Si el total sin clasificar no es 73276 la transacción aborta (ya aplicado o cambió el corpus).
--
-- Diseño de cuarentena: Luna busca con buscar_biblioteca_v2, que filtra revision_pendiente = false y NO filtra fuente_tipo.
-- Por eso una fila solo se saca de búsqueda con revision_pendiente = true. El fuente_tipo por sí solo NO la oculta.
-- Las columnas instrumento_id / ingest_batch no existen en producción: el «instrumento» se guarda en metadata (jsonb).
-- ═══════════════════════════════════════════════════════════════════════════
BEGIN;

DO $guardia$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE fuente_tipo IS NULL OR jurisdiccion IS NULL;
  IF n <> 73276 THEN
    RAISE EXCEPTION 'Guardia: se esperaban 73276 filas sin clasificar y hay %. No se aplica.', n;
  END IF;
END
$guardia$;

-- Conjunto de documentos de cada bloque, fijado dentro de la transacción.
CREATE TEMP TABLE _bloque ON COMMIT DROP AS
SELECT id,
  CASE
    WHEN fuente = 'CPC_COMENTADO_ROMERO_2024' THEN 'A1'
    WHEN fuente = 'CPC_TEXTO_BASE_D211-2006' THEN 'A2'
    WHEN coleccion = 'mayalex_procedimental' AND fuente IS NULL AND metadata->>'id_documento' IS NULL THEN 'A3'
    WHEN coleccion = 'mayalex_instrumentos' AND coalesce(metadata->>'id_documento', fuente) IN ('doc_402a2455','doc_652989a9','doc_7d149b6a','doc_9f3735a4','doc_aeb04b6f','doc_b485fd1c','doc_bbe7fc8c','doc_c42e6f5a','doc_28ec8cdd','doc_312fcc89','doc_55802a44') THEN 'A4'
    WHEN coalesce(metadata->>'id_documento', fuente) IN ('doc_c2abdfa2','doc_e6856142') THEN 'A5'
    ELSE 'A6'
  END AS bloque
FROM public.biblioteca_vectores
WHERE fuente_tipo IS NULL OR jurisdiccion IS NULL;

-- A1 · doctrina (sin vigencia, visible solo como contexto doctrinal).
UPDATE public.biblioteca_vectores b SET fuente_tipo = 'doctrina', jurisdiccion = 'HN', es_norma_vigente = NULL
FROM _bloque t WHERE t.id = b.id AND t.bloque = 'A1';

-- A2 · código explícito; vigencia TRUE para que R3 lo cite como norma primaria; instrumento en metadata.
UPDATE public.biblioteca_vectores b SET fuente_tipo = 'codigo', jurisdiccion = 'HN', es_norma_vigente = true,
  metadata = coalesce(b.metadata, '{}'::jsonb) || jsonb_build_object('instrumento', 'Decreto No. 211-2006 (Código Procesal Civil)')
FROM _bloque t WHERE t.id = b.id AND t.bloque = 'A2';

-- A3 · guía práctica: contexto procedimental, nunca «codigo».
UPDATE public.biblioteca_vectores b SET fuente_tipo = 'guia_procedimental', jurisdiccion = 'HN', es_norma_vigente = NULL
FROM _bloque t WHERE t.id = b.id AND t.bloque = 'A3';

-- A4 · cuarentena privada: oculta a búsqueda (revision_pendiente) y fuera de norma.
UPDATE public.biblioteca_vectores b SET fuente_tipo = 'cuarentena_privada', es_norma_vigente = NULL, revision_pendiente = true
FROM _bloque t WHERE t.id = b.id AND t.bloque = 'A4';

-- A5 · cuarentena de revisión de origen (texto posiblemente generado): oculta y fuera de norma.
UPDATE public.biblioteca_vectores b SET fuente_tipo = 'cuarentena_revision', es_norma_vigente = NULL, revision_pendiente = true
FROM _bloque t WHERE t.id = b.id AND t.bloque = 'A5';

-- A6 · cuarentena anonimizada (≥20 % marcado y recuperables por fragmento): oculta y fuera de norma.
UPDATE public.biblioteca_vectores b SET fuente_tipo = 'cuarentena_anonimizada', es_norma_vigente = NULL, revision_pendiente = true
FROM _bloque t WHERE t.id = b.id AND t.bloque = 'A6';

-- Verificación final dentro de la transacción: nada sin clasificar debe quedar fuera de los bloques, y todas las cuarentenas ocultas.
DO $verifica$
DECLARE restantes int; cuarentenas_visibles int;
BEGIN
  SELECT count(*) INTO restantes FROM public.biblioteca_vectores WHERE (fuente_tipo IS NULL OR jurisdiccion IS NULL);
  IF restantes <> 0 THEN RAISE EXCEPTION 'Verificación: quedan % filas sin clasificar.', restantes; END IF;
  SELECT count(*) INTO cuarentenas_visibles FROM public.biblioteca_vectores
    WHERE fuente_tipo IN ('cuarentena_privada','cuarentena_revision','cuarentena_anonimizada') AND revision_pendiente = false;
  IF cuarentenas_visibles <> 0 THEN RAISE EXCEPTION 'Verificación: % filas en cuarentena siguen visibles.', cuarentenas_visibles; END IF;
END
$verifica$;

COMMIT;
