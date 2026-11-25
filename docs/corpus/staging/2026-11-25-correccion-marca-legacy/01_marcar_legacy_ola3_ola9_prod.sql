-- Corrección · marca de sustitución en el legacy de OLA 3 (Constitución) y OLA 9 (Código Tributario) · 2026-11-25
-- DESTINO EXCLUSIVO: mayalex-ia-pinel-hn (producción) (thgrhueckkjdutjvcufp). Solo tras la firma del CLO en DICTAMEN_CORRECCION_MARCA_LEGACY.md.
-- No cambia la visibilidad ni el texto de ninguna fila. Solo escribe en `metadata` la marca que los paquetes firmados quisieron escribir:
-- esas 593 filas tenían metadata NULL y `NULL || jsonb` dio NULL. Sin la marca, la reversión 99 de OLA 3 y OLA 9 no re-expondría el legacy.
-- Las filas se identifican contra los respaldos que creó el paso 00 de cada ola (visibles al respaldar).

BEGIN;
DO $do$ DECLARE n int; BEGIN
  UPDATE public.biblioteca_vectores b
    SET metadata = jsonb_build_object('sustituido_por_lote', 'OLA3_CON_2021_01', 'sustituido_fecha', '2026-11-24', 'revision_pendiente_motivo', 'Sustituida por HN:CONSTITUCION_REPUBLICA V5 (OLA3); oculta, no borrada')
  WHERE b.id LIKE 'mayalex_normativos:constitucion_1982_a%' AND b.metadata IS NULL AND b.revision_pendiente = true
    AND b.id IN (SELECT r.id FROM public.biblioteca_vectores_ola3_con_2021_01_backup r WHERE r.revision_pendiente = false);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 378 THEN RAISE EXCEPTION 'OLA3: marcadas % (esperadas 378)', n; END IF;

  UPDATE public.biblioteca_vectores b
    SET metadata = jsonb_build_object('sustituido_por_lote', 'OLA9_CTRIB_2024_01', 'sustituido_fecha', '2026-11-24', 'revision_pendiente_motivo', 'Sustituida por HN:CODIGO_TRIBUTARIO V5 (OLA9); oculta, no borrada')
  WHERE b.id LIKE 'mayalex_normativos:tributario_2016_a%' AND b.metadata IS NULL AND b.revision_pendiente = true
    AND b.id IN (SELECT r.id FROM public.biblioteca_vectores_ola9_ctrib_2024_01_backup r WHERE r.revision_pendiente = false);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 215 THEN RAISE EXCEPTION 'OLA9: marcadas % (esperadas 215)', n; END IF;

  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE metadata IS NULL AND revision_pendiente = true;
  IF n <> 0 THEN RAISE EXCEPTION 'quedan % filas ocultas con metadata NULL (esperado 0)', n; END IF;
END $do$;
COMMIT;
