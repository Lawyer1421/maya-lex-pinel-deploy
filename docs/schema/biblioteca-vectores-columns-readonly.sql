-- SOLO LECTURA. Correr en thgr… (producción) y en aicak… (staging) y comparar. No modifica nada.

-- 1) Columnas: tipos y nulabilidad.
select ordinal_position, column_name, data_type, udt_name,
       character_maximum_length, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'biblioteca_vectores'
order by ordinal_position;

-- 2) Tipo exacto con modificadores (confirma vector(384)).
select a.attnum, a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod) as tipo_completo, a.attnotnull
from pg_catalog.pg_attribute a
where a.attrelid = 'public.biblioteca_vectores'::regclass and a.attnum > 0 and not a.attisdropped
order by a.attnum;
