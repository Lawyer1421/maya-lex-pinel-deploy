-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 1 · SANEAMIENTO DEL CORPUS · 01 VALIDACIÓN (solo SELECT)
-- Proyecto: thgrhueckkjdutjvcufp (PRODUCCIÓN). No modifica nada.
-- Debe devolver EXACTAMENTE los conteos aprobados antes de ejecutar 02_aplicar_fase1.sql.
-- Clave de documento: coalesce(metadata->>'id_documento', fuente, '(sin id)') + coleccion.
-- ═══════════════════════════════════════════════════════════════════════════
with sin_clasificar as (
  select id, coleccion, fuente, contenido, metadata,
         coalesce(metadata->>'id_documento', fuente, '(sin id)') as doc
  from public.biblioteca_vectores
  where fuente_tipo is null or jurisdiccion is null
),
marcado as (
  select doc, coleccion,
         count(*) as filas,
         count(*) filter (where position('(cid:' in contenido) > 0 or position('_Anónim' in contenido) > 0) as filas_marcadas
  from sin_clasificar group by doc, coleccion
)
select
  case
    when fuente = 'CPC_COMENTADO_ROMERO_2024' then 'A1_doctrina_romero'
    when fuente = 'CPC_TEXTO_BASE_D211-2006' then 'A2_codigo_cpc_base'
    when coleccion = 'mayalex_procedimental' and fuente is null and metadata->>'id_documento' is null then 'A3_guia_procedimental'
    when coleccion = 'mayalex_instrumentos' and doc in ('doc_402a2455','doc_652989a9','doc_7d149b6a','doc_9f3735a4','doc_aeb04b6f','doc_b485fd1c','doc_bbe7fc8c','doc_c42e6f5a','doc_28ec8cdd','doc_312fcc89','doc_55802a44') then 'A4_cuarentena_privada'
    when doc in ('doc_c2abdfa2','doc_e6856142') then 'A5_cuarentena_revision_art167'
    else 'A6_cuarentena_anonimizada_o_resto'
  end as bucket,
  count(*) as filas
from sin_clasificar
group by 1
order by 1;
