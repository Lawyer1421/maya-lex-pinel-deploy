-- PROPUESTA OFFLINE — NO APLICAR. Vive fuera de supabase/migrations a propósito.
-- G4-A: columna de procedencia verificada para el corpus normativo. Requiere autorización expresa de Fredy
-- y revisión del CLO antes de moverse a supabase/migrations. No se ejecutó en ningún entorno.
--
-- Principio: una fila es "pública probada" solo si existe aprobación humana (V4/V5) con hash de contenido
-- verificado contra el PDF oficial. NINGUNA fila existente se marca pública por defecto (default NULL).

ALTER TABLE biblioteca_vectores
  ADD COLUMN IF NOT EXISTS procedencia_publica jsonb NULL;
-- Forma esperada (espejo de EntradaProcedencia en lib/ai-gateway/shadow/public-provenance.ts):
-- { "contenido_sha256": "<64 hex>", "fuente_oficial": {"url": "https://…", "gaceta": "…", "pdf_sha256": "<64 hex>"},
--   "estado_verificacion": "V4"|"V5", "aprobado_por": "…", "aprobado_en": "YYYY-MM-DD" }

ALTER TABLE biblioteca_vectores
  ADD CONSTRAINT procedencia_publica_forma CHECK (
    procedencia_publica IS NULL OR (
      procedencia_publica ? 'contenido_sha256' AND procedencia_publica ? 'fuente_oficial'
      AND procedencia_publica->>'estado_verificacion' IN ('V4','V5')
      AND procedencia_publica ? 'aprobado_por' AND procedencia_publica ? 'aprobado_en'
    )
  );

-- Las filas con datos personales (capa 'instrumento', doc_*) NUNCA deben recibir esta marca.
-- Pendiente de decisión: si la fuente de verdad es esta columna o el manifiesto versionado en el repositorio.
