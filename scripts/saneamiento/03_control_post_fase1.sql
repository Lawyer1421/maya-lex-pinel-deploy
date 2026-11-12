-- FASE 1 · CONTROL POST-APLICACIÓN (solo SELECT).
-- Esperado: CPC base = codigo, vigencia TRUE (995); Romero = doctrina (1481); guía = manual (32);
-- cuarentenas = 70768 filas con revision_pendiente = true y ninguna visible.
select coalesce(fuente_tipo,'(null)') as fuente_tipo, coalesce(jurisdiccion,'(null)') as jurisdiccion,
       es_norma_vigente, revision_pendiente, (metadata ? 'cuarentena') as en_cuarentena, count(*) as filas
from public.biblioteca_vectores
where fuente_tipo in ('codigo','doctrina','manual') or fuente_tipo is null or jurisdiccion is null or (metadata ? 'cuarentena')
group by 1,2,3,4,5 order by 1,2,3,4,5;
