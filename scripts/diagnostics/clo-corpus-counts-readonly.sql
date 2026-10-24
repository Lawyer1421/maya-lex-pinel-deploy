-- scripts/diagnostics/clo-corpus-counts-readonly.sql
-- DIAGNÓSTICO DE SOLO LECTURA (solo SELECT) del corpus de public.biblioteca_vectores. Salvaguardas CLO, 24-oct-2026.
--
-- Qué devuelve: SOLO CONTEOS. Nunca el contenido de un artículo ni de un documento, ni ids de fila, ni nombres de fuente.
-- Quién lo corre: el Auditor, con la identidad correcta (rol de solo lectura). Este archivo NO se ejecuta desde el repositorio ni desde CI.
-- Qué NO hace: sin INSERT/UPDATE/DELETE/DDL, sin funciones con efectos, sin migraciones. El texto (`contenido`) aparece únicamente dentro
-- de un predicado de expresión regular que produce un conteo.
--
-- Definición de instrument_id: la tabla NO tiene una columna instrument_id. Se usa metadata->>'instrument_id' y, si falta,
-- metadata->>'norm_id' (el identificador de instrumento que sí existe en los metadatos). Se informan además, por separado, las filas sin
-- `fuente` (identidad documental real usada por el Exact Resolver), para no confundir las dos definiciones.
--
-- Cada consulta es independiente: puede correrse sola. Consultas 1-5 y 7: una pasada sobre la tabla; la 6 solo recorre materia = '03_NOTARIAL'.

-- 1. Totales y filas sin identidad de instrumento (tres definiciones, todas conteos).
select
  count(*)                                                                                  as filas_total,
  count(*) filter (where embedding is not null)                                             as filas_con_embedding,
  count(*) filter (where coalesce(metadata->>'instrument_id', metadata->>'norm_id') is null) as instrument_id_nulo_metadata,
  count(*) filter (where fuente is null)                                                    as fuente_nula,
  count(*) filter (where coalesce(metadata->>'instrument_id', metadata->>'norm_id') is null
                     and fuente is null)                                                    as sin_instrument_id_y_sin_fuente
from public.biblioteca_vectores;

-- 2. Filas por instrument_id (metadata.instrument_id, o metadata.norm_id si falta). NULL = sin identificador.
select
  coalesce(metadata->>'instrument_id', metadata->>'norm_id', '(NULL)') as instrument_id,
  count(*)                                                              as filas,
  count(distinct coleccion)                                             as colecciones
from public.biblioteca_vectores
group by 1
order by filas desc
limit 100;

-- 3. Filas por tipo de fuente (fuente_tipo) y por colección.
select
  coalesce(fuente_tipo, '(NULL)') as fuente_tipo,
  coalesce(coleccion, '(NULL)')   as coleccion,
  count(*)                        as filas
from public.biblioteca_vectores
group by 1, 2
order by filas desc;

-- 4. Filas por país (jurisdiccion), y por país x tipo de fuente (para ver sentencias no hondureñas).
select
  coalesce(jurisdiccion, '(NULL)') as pais,
  coalesce(fuente_tipo, '(NULL)')  as fuente_tipo,
  count(*)                         as filas
from public.biblioteca_vectores
group by 1, 2
order by filas desc;

-- 5. Filas creadas en las últimas 48 horas (total y por colección/materia). 0 filas = sin altas recientes.
select
  coalesce(coleccion, '(NULL)') as coleccion,
  coalesce(materia, '(NULL)')   as materia,
  count(*)                      as filas_ultimas_48h,
  min(created_at)               as primera,
  max(created_at)               as ultima
from public.biblioteca_vectores
where created_at >= now() - interval '48 hours'
group by 1, 2
order by filas_ultimas_48h desc;

-- 6. 03_NOTARIAL (protocolo y práctica): filas con POSIBLES datos personales. Solo conteos; el contenido se evalúa dentro del predicado
--    y nunca se devuelve. Patrones (heurísticos, pueden dar falsos positivos):
--      DNI  = 13 dígitos (xxxx-xxxx-xxxxx);  RTN = 14 dígitos (xxxx-xxxx-xxxxxx);  protocolo = «protocolo» seguido de un número.
select
  coalesce(coleccion, '(NULL)')                                                                   as coleccion,
  count(*)                                                                                        as filas_03_notarial,
  count(*) filter (where contenido ~ '\m\d{4}-?\d{4}-?\d{5}\M')                                    as con_posible_dni,
  count(*) filter (where contenido ~ '\m\d{4}-?\d{4}-?\d{6}\M')                                    as con_posible_rtn,
  count(*) filter (where contenido ~* 'protocolo\s*(n[uú]m(ero|\.)?|no\.?|n[°º])?\s*\d')           as con_numero_de_protocolo,
  count(*) filter (where contenido ~ '\m\d{4}-?\d{4}-?\d{5}\M'
                      or contenido ~ '\m\d{4}-?\d{4}-?\d{6}\M'
                      or contenido ~* 'protocolo\s*(n[uú]m(ero|\.)?|no\.?|n[°º])?\s*\d')           as con_algun_indicio
from public.biblioteca_vectores
where materia = '03_NOTARIAL'
group by 1
order by filas_03_notarial desc;

-- 7. Filas por fuente x país (jurisdiccion) x tipo de fuente (fuente_tipo). Solo conteos; `fuente` es el nombre de la fuente, no su contenido.
--    Sirve para medir cuántas filas quedarían como PRIMARY o CONTEXT con la política de país (instrumento validado + país vacío o HN = candidato
--    a PRIMARY; país explícito distinto de HN = CONTEXT) y para ver qué fuentes no declaran país ni tipo.
select
  coalesce(fuente, '(NULL)')         as fuente,
  coalesce(jurisdiccion, '(NULL)')   as jurisdiccion,
  coalesce(fuente_tipo, '(NULL)')    as fuente_tipo,
  count(*)                           as filas
from public.biblioteca_vectores
group by 1, 2, 3
order by filas desc
limit 500;
