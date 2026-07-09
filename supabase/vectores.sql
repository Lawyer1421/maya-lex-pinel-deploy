-- ============================================================
-- Maya Lex IA — Biblioteca vectorial pgvector  (idempotente)
-- Migración desde ChromaDB local (76,381 chunks · e5-small 384 dims)
--
-- Ejecutado automáticamente por: scripts/seed_vectores.py
-- El índice HNSW se crea AL FINAL de la carga masiva (más rápido).
--
-- Modelo de embeddings: intfloat/multilingual-e5-small (384 dims)
--   corpus con prefijo "passage: ..." · queries con prefijo "query: ..."
-- ============================================================

create extension if not exists vector;

-- ── Tabla principal ──────────────────────────────────────────
-- id = "{coleccion}:{chunk_id_original}" — evita colisiones entre colecciones
create table if not exists biblioteca_vectores (
  id            text primary key,
  coleccion     text not null,     -- mayalex_normativos | mayalex_procedimental | mayalex_instrumentos
  materia       text,              -- 01_PENAL | 02_CIVIL | 03_NOTARIAL | ... (filtro anti-contaminación)
  contenido     text not null,
  num_articulo  text,
  fuente        text,
  metadata      jsonb,
  embedding     vector(384) not null,
  created_at    timestamptz default now()
);

-- ── Índices de filtro (el HNSW lo crea el seeder al final) ───
create index if not exists idx_biblio_coleccion on biblioteca_vectores(coleccion);
create index if not exists idx_biblio_materia   on biblioteca_vectores(materia);

-- ── RLS: solo service_role ───────────────────────────────────
alter table biblioteca_vectores enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'biblioteca_vectores' and policyname = 'service_only_biblioteca'
  ) then
    execute $pol$
      create policy "service_only_biblioteca" on biblioteca_vectores
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

-- ── RPC de búsqueda semántica ────────────────────────────────
-- Filtro anti-contaminación: materia_filtro aísla penal/civil dentro
-- de la colección compartida, igual que el backend Python local.
create or replace function buscar_biblioteca(
  query_embedding  vector(384),
  coleccion_filtro text,
  materia_filtro   text default null,
  limite           int  default 5
)
returns table (
  contenido    text,
  num_articulo text,
  fuente       text,
  similarity   double precision
)
language sql
stable
security invoker
as $$
  select
    b.contenido,
    b.num_articulo,
    b.fuente,
    1 - (b.embedding <=> query_embedding) as similarity
  from biblioteca_vectores b
  where b.coleccion = coleccion_filtro
    and (materia_filtro is null or b.materia = materia_filtro)
  order by b.embedding <=> query_embedding
  limit least(limite, 20);
$$;
