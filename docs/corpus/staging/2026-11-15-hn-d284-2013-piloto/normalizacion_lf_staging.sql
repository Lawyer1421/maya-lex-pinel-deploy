-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- SOLO STAGING (mayalexhn-staging, aicakncgtuiiuomflkqj) · lote PILOTO_D284_2013_01 · HN:DECRETO_284_2013
-- Normalización de fin de línea del contenido: «\r\n» → «\n» en las 39 filas.
-- Motivo: la carga del 16-nov-2026 pasó por un editor de Windows y dejó «\r\n». La transcripción cotejada (ba75b190…)
-- y hash_contenido usan «\n»: hoy sha256(contenido) = hash_contenido en 0 de 39 filas y en 39 de 39 al quitar los «\r».
-- Mismo defecto que se corrigió en el lote A04_D35_2013_01 el 2026-11-18 (ADJUDICACION_CLO_D35_2013.md).
-- Solo cambia el fin de línea de «contenido». NO toca texto, hash, embedding, visibilidad, vigencia, rol ni metadata.
-- Atómico: se aborta (sin cambios) si el lote no está exactamente en el estado esperado o si el resultado no cuadra.
-- PRODUCCIÓN: NO APLICAR.
-- ═══════════════════════════════════════════════════════════════════════════════════════════
BEGIN;
DO $do$
DECLARE n int;
BEGIN
  -- Precondición (verificada en solo lectura el 2026-11-18): 39 filas visibles, vigentes, V4, con embedding, 4 CONTEXT;
  -- las 39 con «\r\n», ningún «\r» suelto, y las 39 recuperan su hash_contenido al normalizar.
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01';
  IF n <> 39 THEN RAISE EXCEPTION 'precondición: se esperaban 39 filas del lote y hay %', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01'
    AND revision_pendiente = false AND es_norma_vigente = true AND metadata->>'estado_v' = 'V4' AND embedding IS NOT NULL
    AND metadata->>'transcripcion_sha256' = 'ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca';
  IF n <> 39 THEN RAISE EXCEPTION 'precondición: solo % filas visibles · vigentes · V4 · con embedding · transcripción ba75b190', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01' AND metadata->>'rol' = 'CONTEXT';
  IF n <> 4 THEN RAISE EXCEPTION 'precondición: se esperaban 4 filas CONTEXT y hay %', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01'
    AND position(E'\r' IN replace(contenido, E'\r\n', E'\n')) > 0;
  IF n <> 0 THEN RAISE EXCEPTION 'precondición: hay «\r» sueltos (no seguidos de «\n») en % filas', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01'
    AND encode(sha256(convert_to(replace(contenido, E'\r\n', E'\n'), 'UTF8')), 'hex') = hash_contenido;
  IF n <> 39 THEN RAISE EXCEPTION 'precondición: solo % filas recuperan su hash_contenido al normalizar a LF', n; END IF;

  UPDATE public.biblioteca_vectores SET contenido = replace(contenido, E'\r\n', E'\n')
  WHERE ingest_batch = 'PILOTO_D284_2013_01' AND position(E'\r' IN contenido) > 0;

  -- Postcondición: 39 filas con sha256(contenido) = hash_contenido y sin «\r»; régimen intacto.
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01'
    AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido AND position(E'\r' IN contenido) = 0;
  IF n <> 39 THEN RAISE EXCEPTION 'postcondición: sha256(contenido) = hash_contenido y sin CR en solo % de 39 filas', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01'
    AND revision_pendiente = false AND es_norma_vigente = true AND metadata->>'estado_v' = 'V4' AND embedding IS NOT NULL;
  IF n <> 39 THEN RAISE EXCEPTION 'postcondición: visibilidad/vigencia/V4/embedding alterados (% de 39)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01' AND metadata->>'rol' = 'CONTEXT';
  IF n <> 4 THEN RAISE EXCEPTION 'postcondición: CONTEXT alterado (%)', n; END IF;
END
$do$;
COMMIT;

-- Verificación (solo lectura): esperado 39 · 39 · 0 · 39 · 4, y 0 filas con «\r» en toda la tabla.
SELECT count(*) AS filas,
  count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS sha_ok,
  count(*) FILTER (WHERE position(E'\r' IN contenido) > 0) AS con_cr,
  count(*) FILTER (WHERE revision_pendiente = false AND es_norma_vigente AND metadata->>'estado_v' = 'V4' AND embedding IS NOT NULL) AS visibles_v4,
  count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') AS context,
  (SELECT count(*) FROM public.biblioteca_vectores WHERE position(E'\r' IN contenido) > 0) AS cr_en_toda_la_tabla
FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01';

-- REVERSIÓN: no hace falta una exacta. El estado anterior solo difería en el fin de línea, y «\n» → «\r\n» lo reconstruye:
-- UPDATE public.biblioteca_vectores SET contenido = replace(contenido, E'\n', E'\r\n') WHERE ingest_batch = 'PILOTO_D284_2013_01';
