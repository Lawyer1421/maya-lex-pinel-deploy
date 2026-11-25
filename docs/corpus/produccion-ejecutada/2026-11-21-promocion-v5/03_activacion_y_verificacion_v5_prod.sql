-- 03_activacion_y_verificacion_v5_prod.sql | DESTINO EXCLUSIVO: mayalexhn-prod / thgrhueckkjdutjvcufp.
-- Ejecutar solo tras 00a, 00 y todas las partes 01 y todas las partes 02; confirme manualmente el project ref.
-- Esta transacción falla cerrada ante filas faltantes, extras por lote, embedding ausente o temporal, SHA-256 inválido o precondiciones alteradas.
-- Promoción exacta: 302 A03 + 19 D35 v8 + 39 D284 = 360 filas. Preserva roles y vigencias adjudicados; no modifica otros lotes.
BEGIN;
DO $do$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND metadata->>'norm_id' = 'HN:CODIGO_NINEZ' AND instrumento_id = 'CODIGO_NINEZ' AND jurisdiccion = 'HN' AND fuente_tipo = 'codigo' AND revision_pendiente = true AND es_norma_vigente IS NULL AND embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector AND metadata->>'transcripcion_sha256' = '99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido;
  IF n <> 302 THEN RAISE EXCEPTION 'Precondición A03: % filas ocultas, con embedding y hash correcto (esperadas 302)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A04_D35_2013_01' AND metadata->>'norm_id' = 'HN:DECRETO_35_2013' AND instrumento_id = 'DECRETO_35_2013' AND jurisdiccion = 'HN' AND fuente_tipo = 'ley' AND revision_pendiente = true AND es_norma_vigente IS NULL AND embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector AND metadata->>'transcripcion_sha256' = '6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido;
  IF n <> 19 THEN RAISE EXCEPTION 'Precondición D35: % filas ocultas, con embedding y hash correcto (esperadas 19)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01' AND metadata->>'norm_id' = 'HN:DECRETO_284_2013' AND instrumento_id = 'DECRETO_284_2013' AND jurisdiccion = 'HN' AND fuente_tipo = 'ley' AND revision_pendiente = true AND es_norma_vigente IS NULL AND embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector AND metadata->>'transcripcion_sha256' = 'ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido;
  IF n <> 39 THEN RAISE EXCEPTION 'Precondición D284: % filas ocultas, con embedding y hash correcto (esperadas 39)', n; END IF;
END
$do$;
-- A03: clasificación D4/D5 del pliego A03, preservando la reserva CONTEXT y C07.
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = true,
    metadata = metadata || jsonb_build_object('estado_v', 'V5', 'vigencia', 'TRUE_PRESUNTA', 'adjudicacion', 'ADJUDICACION_CLO_CODIGO_NINEZ.md (D1–D8, 2026-11-18)', 'adjudicado_por', 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)', 'revision_pendiente', false, 'motivo_rol', 'PRIMARY elegible: texto de La Gaceta 33,222 con D3 (D1 acreditada)')
  WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND num_articulo IN ('1', '5', '20', '31-A', '31-B', '32', '96', '97', '98', '99', '100-A', '102', '102-A', '104', '104-A', '105', '113', '128', '139', '140', '141', '142', '143', '145', '146', '147', '147-A', '147-B', '147-C', '147-D', '147-E', '148', '149', '150', '152', '154', '162', '163', '164', '165', '166', '167', '168', '169', '173', '180', '180-A', '180-B', '181', '182', '183', '184', '185', '186', '187', '187-A', '188', '189', '190', '191', '192', '193', '194', '195', '196', '197', '198', '199', '200', '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212', '213', '214', '215', '216', '217', '218', '219', '220', '221', '222', '223', '224', '225', '226', '227', '228', '229', '230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240', '241', '242', '243', '244', '245', '246', '247', '248', '249', '250', '251', '252', '253', '254', '255', '256', '257', '258', '259', '260', '261', '262', '263', '264', '265', '280-A', '282');
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = true,
    metadata = metadata || jsonb_build_object('estado_v', 'V5', 'vigencia', 'TRUE_PRESUNTA', 'adjudicacion', 'ADJUDICACION_CLO_CODIGO_NINEZ.md (D1–D8, 2026-11-18)', 'adjudicado_por', 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)', 'revision_pendiente', false, 'rol', 'CONTEXT', 'motivo_rol', 'RESERVA_D1_B: texto del consolidado dictaminado por el CLO; procedencia pendiente de La Gaceta 28,053 / PDF CEDIJ')
  WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND num_articulo IN ('2', '3', '4', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '100', '101', '103', '106', '107', '108', '109', '110', '111', '112', '114', '115', '116', '117', '118', '119', '120', '121', '122', '123', '124', '125', '126', '127', '129', '130', '131', '132', '133', '135', '136', '137', '138', '144', '151', '153', '155', '156', '157', '158', '159', '160', '161', '172', '174', '175', '176', '177', '178', '179', '266', '267', '268', '269', '270', '271', '272', '273', '274', '275', '276', '277', '278', '279', '280', '281', '283', '284', '285', '286', '287', '288');
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = null,
    metadata = metadata || jsonb_build_object('estado_v', 'V5', 'vigencia', 'PENDIENTE_C07', 'adjudicacion', 'ADJUDICACION_CLO_CODIGO_NINEZ.md (D1–D8, 2026-11-18)', 'adjudicado_por', 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)', 'revision_pendiente', false, 'rol', 'CONTEXT', 'motivo_rol', 'C07: derogación posterior por el D.130-2017 sin cotejar', 'interpretacion_pendiente_clo', 'INTERPRETACION_PENDIENTE_CLO (C07): derogación posterior por el D.130-2017 (art. 632, num. 12); La Gaceta 34,940 / 39,940 y fecha de efecto sin cotejar')
  WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND num_articulo IN ('21');
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = false,
    metadata = metadata || jsonb_build_object('estado_v', 'V5', 'vigencia', 'DEROGADO', 'adjudicacion', 'ADJUDICACION_CLO_CODIGO_NINEZ.md (D1–D8, 2026-11-18)', 'adjudicado_por', 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)', 'revision_pendiente', false, 'rol', 'CONTEXT', 'motivo_rol', 'DEROGADO: art. 11 del D.35-2013')
  WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND num_articulo IN ('62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '134', '170', '171');

UPDATE public.biblioteca_vectores
   SET metadata = metadata || jsonb_build_object('promocion_desde', 'V4', 'promocion_fecha', '2026-11-21',
       'promocion_autorizacion', 'Declaración escrita del CLO recibida el 2026-11-21; alcance limitado a estos 360 registros')
 WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND metadata->>'estado_v' = 'V5';

-- D35 v8: vigencia TRUE_PRESUNTA; arts. 1-11 CONTEXT, 12-19 PRIMARY.
UPDATE public.biblioteca_vectores
   SET revision_pendiente = false, es_norma_vigente = true,
       metadata = metadata || jsonb_build_object(
         'vigencia', 'TRUE_PRESUNTA', 'vigencia_desde', '2013-09-06',
         'vigencia_base', 'art. 19; La Gaceta 33,222 del 6-sep-2013; sin reforma ni derogación del propio decreto en el registro de MayaLex (16-nov-2026)',
         'revision_pendiente', false, 'estado_v', 'V5', 'estado_fuente', 'CLO_ADJUDICADO',
         'adjudicacion', 'ADJUDICACION_CLO_D35_2013 §7',
         'adjudicado_por', 'Abg. y Not. Fredy Omar Pinel Flores — propietario_despacho (CLO / Director Maya Lex) — 2026-11-16',
         'promocion_desde', 'V4', 'promocion_fecha', '2026-11-21',
         'promocion_autorizacion', 'Declaración escrita del CLO recibida el 2026-11-21; alcance limitado a estos 360 registros')
 WHERE ingest_batch = 'A04_D35_2013_01';
UPDATE public.biblioteca_vectores
   SET metadata = (metadata - 'rol' - 'motivo_rol') || jsonb_build_object('motivo_rol', 'PRIMARY elegible: arts. 12-19 del D.35-2013 (ADJUDICACION_CLO_D35_2013 §7, D5)')
 WHERE ingest_batch = 'A04_D35_2013_01' AND num_articulo_norm IN ('12','13','14','15','16','17','18','19');
UPDATE public.biblioteca_vectores
   SET metadata = metadata || jsonb_build_object('rol', 'CONTEXT', 'motivo_rol', 'DISPOSICION_MODIFICATORIA: reproduce texto reformado o adicionado de otra ley; no es el texto vigente de esa ley (ADJUDICACION_CLO_D35_2013 §7, D5)')
 WHERE ingest_batch = 'A04_D35_2013_01' AND num_articulo_norm IN ('1','2','3','4','5','6','7','8','9','10');
UPDATE public.biblioteca_vectores
   SET metadata = metadata || jsonb_build_object(
       'rol', 'CONTEXT',
       'motivo_rol', 'DISPOSICION_DEROGATORIA: deroga los arts. 62-82, 134 (íntegro), 170 y 171 y los literales ch)-f) del art. 141 del D.73-96 (resuelto por el CLO el 2026-11-18, PASAJES_134_141.md §6); se mantiene CONTEXT por el reparto 11/8 de D5 (ADJUDICACION_CLO_D35_2013 §7)',
       'interpretacion_estado', 'RESUELTO_CLO_2026_11_18',
       'interpretacion_resuelta_clo', 'RESUELTO_CLO_2026_11_18 (Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho, 2026-11-18): el art. 11 del D.35-2013 deroga íntegramente el art. 134 del D.73-96 («Artículos» es plural tipográfico; el delito de explotación económica pasa al art. 179-F del Código Penal, adicionado por el art. 8 del mismo decreto) y los literales ch), d), e) y f) del art. 141 del D.73-96, que queda con a), b) y c) por el art. 1. Las notas 23 y 24 del consolidado A03 son un error editorial de atribución. Base: La Gaceta 33,222 (ejemplares TSC y CEDIJ) y fuente orientativa del D.73-96 (15e3875d…); el cotejo con La Gaceta 28,053 se reserva para D1-D2 de HN:CODIGO_NINEZ (PASAJES_134_141.md §6).',
       'interpretacion_pendiente_clo_anterior', 'INTERPRETACION_PENDIENTE_CLO: alcance de la derogación de los arts. 134 y 141 (literales ch, d, e, f) del D.73-96; no se aplica a ninguna versión del Código de la Niñez hasta la decisión del CLO (PASAJES_134_141.md)',
       'motivo_rol', 'DISPOSICION_DEROGATORIA: deroga los arts. 62-82, 134 (íntegro), 170 y 171 y los literales ch)-f) del art. 141 del D.73-96 (resuelto por el CLO el 2026-11-18, PASAJES_134_141.md §6); se mantiene CONTEXT por el reparto 11/8 de D5 (ADJUDICACION_CLO_D35_2013 §7)')
 WHERE ingest_batch = 'A04_D35_2013_01' AND num_articulo_norm = '11';
UPDATE public.biblioteca_vectores
   SET metadata = metadata || jsonb_build_object('rol', 'CONTEXT',
       'motivo_rol', 'DISPOSICION_MODIFICATORIA: reproduce texto reformado o adicionado de otra ley; no es el texto vigente de esa ley (ADJUDICACION_CLO_D35_2013 §7, D5)',
       'interpretacion_pendiente_clo', 'INTERPRETACION_PENDIENTE_CLO (C07): el art. 21 de la Niñez reformado aquí fue derogado después por el D.130-2017 (art. 632 num. 12); La Gaceta 34,940 / 39,940 y fecha de efecto sin cotejar (EVENTOS_ARTICULO_21.md)')
 WHERE ingest_batch = 'A04_D35_2013_01' AND num_articulo_norm = '1';

-- D284: TRUE_PRESUNTA desde 2014-06-05; arts. 13, 14, 26 y 27 CONTEXT.
UPDATE public.biblioteca_vectores
   SET revision_pendiente = false, es_norma_vigente = true,
       metadata = metadata || jsonb_build_object(
         'vigencia', 'TRUE_PRESUNTA', 'vigencia_desde', '2014-06-05',
         'vigencia_base', 'art. 39; La Gaceta 33,445; sin reforma ni derogación halladas (búsqueda 15-nov-2026)',
         'revision_pendiente', false, 'estado_v', 'V5', 'estado_fuente', 'CLO_ADJUDICADO',
         'adjudicacion', 'ADJUDICACION_CLO_D284_2013 §7',
         'adjudicado_por', 'Abg. y Not. Fredy Omar Pinel Flores — propietario_despacho (CLO / Director Maya Lex) — 2026-11-16',
         'promocion_desde', 'V4', 'promocion_fecha', '2026-11-21',
         'promocion_autorizacion', 'Declaración escrita del CLO recibida el 2026-11-21; alcance limitado a estos 360 registros')
 WHERE ingest_batch = 'PILOTO_D284_2013_01';
UPDATE public.biblioteca_vectores
   SET metadata = metadata || jsonb_build_object('rol', 'CONTEXT',
       'motivo_rol', 'DISPOSICION_MODIFICATORIA: transcribe texto de otra ley; no es el texto vigente de esa ley (ADJUDICACION_CLO_D284_2013 §7, D5)')
 WHERE ingest_batch = 'PILOTO_D284_2013_01' AND num_articulo_norm IN ('13','14','26','27');
UPDATE public.biblioteca_vectores
   SET metadata = (metadata - 'rol' - 'motivo_rol') || jsonb_build_object('motivo_rol', 'PRIMARY elegible: texto del D.284-2013 (ADJUDICACION_CLO_D284_2013 §7, D5)')
 WHERE ingest_batch = 'PILOTO_D284_2013_01' AND num_articulo_norm NOT IN ('13','14','26','27');

-- Totales y hashes: cualquier diferencia revierte la transacción completa.
DO $verify_v5$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND metadata->>'norm_id' = 'HN:CODIGO_NINEZ' AND metadata->>'estado_v' = 'V5' AND revision_pendiente = false;
  IF n <> 302 THEN RAISE EXCEPTION 'V5 A03: % filas visibles (esperadas 302)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido AND embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector;
  IF n <> 302 THEN RAISE EXCEPTION 'V5 A03: % hashes/embeddings correctos (esperados 302)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A04_D35_2013_01' AND metadata->>'norm_id' = 'HN:DECRETO_35_2013' AND metadata->>'estado_v' = 'V5' AND revision_pendiente = false;
  IF n <> 19 THEN RAISE EXCEPTION 'V5 D35: % filas visibles (esperadas 19)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A04_D35_2013_01' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido AND embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector;
  IF n <> 19 THEN RAISE EXCEPTION 'V5 D35: % hashes/embeddings correctos (esperados 19)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01' AND metadata->>'norm_id' = 'HN:DECRETO_284_2013' AND metadata->>'estado_v' = 'V5' AND revision_pendiente = false;
  IF n <> 39 THEN RAISE EXCEPTION 'V5 D284: % filas visibles (esperadas 39)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido AND embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector;
  IF n <> 39 THEN RAISE EXCEPTION 'V5 D284: % hashes/embeddings correctos (esperados 39)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND metadata->>'estado_v' = 'V5' AND es_norma_vigente = true AND NOT (metadata ? 'rol');
  IF n <> 136 THEN RAISE EXCEPTION 'A03 PRIMARY: % (esperados 136)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND metadata->>'estado_v' = 'V5' AND es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT';
  IF n <> 141 THEN RAISE EXCEPTION 'A03 CONTEXT vigentes: % (esperados 141)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND metadata->>'estado_v' = 'V5' AND es_norma_vigente = false AND metadata->>'rol' = 'CONTEXT';
  IF n <> 24 THEN RAISE EXCEPTION 'A03 CONTEXT derogados: % (esperados 24)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A03_CODIGO_NINEZ_01' AND metadata->>'estado_v' = 'V5' AND es_norma_vigente IS NULL AND metadata->>'rol' = 'CONTEXT';
  IF n <> 1 THEN RAISE EXCEPTION 'A03 CONTEXT NULL: % (esperados 1)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A04_D35_2013_01' AND metadata->>'estado_v' = 'V5' AND es_norma_vigente = true AND NOT (metadata ? 'rol');
  IF n <> 8 THEN RAISE EXCEPTION 'D35 PRIMARY: % (esperados 8)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A04_D35_2013_01' AND metadata->>'estado_v' = 'V5' AND es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT';
  IF n <> 11 THEN RAISE EXCEPTION 'D35 CONTEXT: % (esperados 11)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A04_D35_2013_01' AND metadata->>'estado_v' = 'V5' AND metadata ? 'interpretacion_pendiente_clo';
  IF n <> 1 THEN RAISE EXCEPTION 'D35 constancia C07: % (esperados 1)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'A04_D35_2013_01' AND metadata->>'estado_v' = 'V5' AND metadata->>'interpretacion_estado' = 'RESUELTO_CLO_2026_11_18';
  IF n <> 1 THEN RAISE EXCEPTION 'D35 interpretación resuelta: % (esperados 1)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01' AND metadata->>'estado_v' = 'V5' AND es_norma_vigente = true AND NOT (metadata ? 'rol');
  IF n <> 35 THEN RAISE EXCEPTION 'D284 PRIMARY: % (esperados 35)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'PILOTO_D284_2013_01' AND metadata->>'estado_v' = 'V5' AND es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT';
  IF n <> 4 THEN RAISE EXCEPTION 'D284 CONTEXT: % (esperados 4)', n; END IF;
END
$verify_v5$;
COMMIT;
-- Resultado final por lote (solo lectura).
SELECT metadata->>'norm_id' AS norm_id, ingest_batch, count(*) AS filas,
       count(*) FILTER (WHERE metadata->>'estado_v' = 'V5' AND revision_pendiente = false) AS visibles_v5,
       count(*) FILTER (WHERE es_norma_vigente = true AND NOT (metadata ? 'rol')) AS primary_vigentes,
       count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT' AND es_norma_vigente = true) AS context_vigentes,
       count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT' AND es_norma_vigente = false) AS context_derogados,
       count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT' AND es_norma_vigente IS NULL) AS context_null,
       count(*) FILTER (WHERE embedding IS NOT NULL) AS con_embedding,
       count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS sha_ok
FROM public.biblioteca_vectores
WHERE ingest_batch IN ('A03_CODIGO_NINEZ_01','A04_D35_2013_01','PILOTO_D284_2013_01')
GROUP BY metadata->>'norm_id', ingest_batch
ORDER BY norm_id;
