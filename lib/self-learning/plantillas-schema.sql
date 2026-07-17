-- ============================================================
-- Maya Lex IA — Plantillas jurídicas genéricas (sin datos personales)
-- Alimenta el modo 'documento' (generación de instrumentos) con
-- plantillas reales del ejercicio profesional de Don Fredy — nunca
-- como conocimiento citable en respuestas, solo como estructura
-- de redacción reutilizable.
-- ============================================================

create extension if not exists vector;

create table if not exists plantillas_juridicas (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now() not null,

  tipo_instrumento    text not null,   -- 'poder_administracion' | 'poder_pleitos' | 'testamento' | 'protocolizacion' | 'sociedad' | 'traspaso' | otros
  titulo              text,
  contenido_plantilla text not null,   -- texto genericado, con [MARCADORES]
  variables           jsonb default '[]'::jsonb,  -- lista de placeholders usados, ej. ["NOMBRE_PODERDANTE","DNI_APODERADO"]

  -- Auditoría (nunca expuesto a usuarios finales, solo para trazabilidad interna)
  fuente_archivo      text,
  verificado_sin_pii  boolean default false,  -- true solo si el gate de Claude + regex confirmaron limpieza

  embedding           vector(384) not null
);

create index if not exists idx_plantillas_tipo on plantillas_juridicas(tipo_instrumento);

alter table plantillas_juridicas enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'plantillas_juridicas' and policyname = 'service_only_plantillas'
  ) then
    execute $pol$
      create policy "service_only_plantillas" on plantillas_juridicas
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

-- GRANT explícito desde el inicio (lección de incidentes previos con
-- tablas creadas por conexión SQL directa en vez del dashboard).
grant select, insert, update, delete on plantillas_juridicas to service_role;

create or replace function buscar_plantilla(
  query_embedding vector(384),
  tipo_filtro     text default null,
  limite          int  default 3
)
returns table (
  id                  uuid,
  tipo_instrumento    text,
  titulo              text,
  contenido_plantilla text,
  variables           jsonb,
  similarity          double precision
)
language sql
stable
security invoker
as $$
  select
    p.id, p.tipo_instrumento, p.titulo, p.contenido_plantilla, p.variables,
    1 - (p.embedding <=> query_embedding) as similarity
  from plantillas_juridicas p
  where p.verificado_sin_pii = true
    and (tipo_filtro is null or p.tipo_instrumento = tipo_filtro)
  order by p.embedding <=> query_embedding
  limit least(limite, 10);
$$;

grant execute on function buscar_plantilla to service_role;
