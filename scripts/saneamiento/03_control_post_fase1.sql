-- FASE 1 · CONTROL POST-APLICACIÓN (solo SELECT). Esperado: CPC base = 995 norma TRUE; cuarentenas ocultas; ninguna norma sin codigo.
select fuente_tipo, jurisdiccion, es_norma_vigente, revision_pendiente, count(*) as filas
from public.biblioteca_vectores
where fuente_tipo in ('codigo','doctrina','guia_procedimental','cuarentena_privada','cuarentena_revision','cuarentena_anonimizada')
   or fuente_tipo is null or jurisdiccion is null
group by 1,2,3,4 order by 1,2,3,4;
