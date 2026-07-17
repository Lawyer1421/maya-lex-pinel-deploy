-- ============================================================
-- Maya Lex IA — Self-Learning / Conocimiento Comunitario
-- (idempotente — NO ejecutado automáticamente)
--
-- ⚠️  NO CORRER contra producción sin revisión y aprobación explícita.
-- Diseñado para ejecutarse con el mismo patrón que
-- scripts/migrate-analytics.ts, pero de forma DELIBERADAMENTE separada
-- para que su ejecución sea una decisión consciente, no accidental.
--
-- Diseño clave: el conocimiento comunitario vive en tablas SEPARADAS
-- de biblioteca_vectores (el corpus curado: CPC, CPP, doctrina oficial).
-- Nunca se mezclan en la misma búsqueda sin distinguir la fuente —
-- el modelo siempre sabe si está citando doctrina oficial o un aporte
-- de la comunidad, y los pesa con jerarquía distinta (ver prompt).
-- ============================================================

create extension if not exists vector;

-- ── Tabla: documentos_aprendizaje ─────────────────────────────
-- Un registro por documento/análisis subido por un usuario.
-- Contiene el texto YA ANONIMIZADO (nunca el original con PII).
create table if not exists documentos_aprendizaje (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null,

  -- Autor (mismo esquema que subscriptions/queries_log: email:{correo})
  autor_identifier    text not null,

  -- Contenido
  titulo              text,
  contenido_original  text not null,   -- SOLO server-side, nunca se expone via API pública
  contenido_anonimizado text,          -- lo que realmente se embebe/indexa
  tipo_documento       text not null,  -- 'demanda' | 'sentencia' | 'analisis' | 'opinion' | 'dictamen'
  materia              text,           -- 01_PENAL | 02_CIVIL | 03_NOTARIAL | ... (mismo catálogo que biblioteca_vectores)

  -- Moderación — estado obligatorio antes de ser buscable
  estado_moderacion    text not null default 'pendiente',
    -- 'pendiente'    → recién subido, aún no procesado
    -- 'en_revision'  → falló el gate automático, requiere revisión humana
    -- 'aprobado'     → pasó moderación, indexado y buscable
    -- 'rechazado'    → contenido inseguro/irrelevante, nunca se indexa
  motivo_moderacion    text,           -- por qué se rechazó o marcó en_revision
  pii_detectada        boolean default false,  -- true si el gate encontró datos personales
  revisor_admin        text,           -- correo del admin que aprobó/rechazó manualmente (si aplica)
  fecha_revision       timestamptz,

  -- Métricas de calidad (del gate automático)
  score_calidad        numeric(3,2),  -- 0.00-1.00, criterio de Claude en moderar.ts

  -- Metadata libre para extensión futura sin nueva migración
  metadata              jsonb default '{}'::jsonb
);

create index if not exists idx_docap_estado   on documentos_aprendizaje(estado_moderacion);
create index if not exists idx_docap_autor    on documentos_aprendizaje(autor_identifier);
create index if not exists idx_docap_materia  on documentos_aprendizaje(materia);
create index if not exists idx_docap_created  on documentos_aprendizaje(created_at desc);

-- ── Tabla: vectores_conocimiento ──────────────────────────────
-- Chunks embebidos de documentos APROBADOS únicamente.
-- Mismo modelo de embeddings que biblioteca_vectores (e5-small, 384 dims)
-- para mantener compatibilidad de espacio vectorial si algún día se
-- decide fusionar búsquedas — pero por defecto se buscan por separado.
create table if not exists vectores_conocimiento (
  id             text primary key,   -- "{documento_id}:{chunk_num}"
  documento_id   uuid not null references documentos_aprendizaje(id) on delete cascade,
  materia        text,               -- heredado del documento padre (filtro anti-contaminación)
  tipo_documento text not null,
  contenido      text not null,
  embedding      vector(384) not null,
  created_at     timestamptz default now()
);

create index if not exists idx_veccon_documento on vectores_conocimiento(documento_id);
create index if not exists idx_veccon_materia   on vectores_conocimiento(materia);
-- Índice HNSW: crear DESPUÉS de la primera carga masiva (no al inicio, tabla vacía)
-- create index idx_veccon_hnsw on vectores_conocimiento using hnsw (embedding vector_cosine_ops) with (m=16, ef_construction=64);

-- ── RLS ─────────────────────────────────────────────────────────
alter table documentos_aprendizaje enable row level security;
alter table vectores_conocimiento  enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'documentos_aprendizaje' and policyname = 'service_only_documentos_aprendizaje'
  ) then
    execute $pol$
      create policy "service_only_documentos_aprendizaje" on documentos_aprendizaje
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'vectores_conocimiento' and policyname = 'service_only_vectores_conocimiento'
  ) then
    execute $pol$
      create policy "service_only_vectores_conocimiento" on vectores_conocimiento
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

-- ── Privilegios de tabla (lección aprendida: BYPASSRLS ≠ GRANT) ──
-- Ver supabase/vectores.sql para la explicación completa de por qué
-- esto es necesario cuando las tablas se crean via conexión SQL directa.
grant select, insert, update, delete on documentos_aprendizaje to service_role;
grant select, insert, update, delete on vectores_conocimiento  to service_role;

-- ── RPC de búsqueda — SOLO documentos aprobados ──────────────────
-- Nunca busca en 'pendiente'/'en_revision'/'rechazado' — el WHERE
-- estado_moderacion='aprobado' vía el JOIN es la única puerta de entrada.
create or replace function buscar_conocimiento_comunidad(
  query_embedding  vector(384),
  materia_filtro   text default null,
  tipo_filtro      text default null,
  limite           int  default 5
)
returns table (
  contenido      text,
  tipo_documento text,
  documento_id   uuid,
  similarity     double precision
)
language sql
stable
security invoker
as $$
  select
    v.contenido,
    v.tipo_documento,
    v.documento_id,
    1 - (v.embedding <=> query_embedding) as similarity
  from vectores_conocimiento v
  join documentos_aprendizaje d on d.id = v.documento_id
  where d.estado_moderacion = 'aprobado'
    and (materia_filtro is null or v.materia = materia_filtro)
    and (tipo_filtro    is null or v.tipo_documento = tipo_filtro)
  order by v.embedding <=> query_embedding
  limit least(limite, 20);
$$;

grant execute on function buscar_conocimiento_comunidad to service_role;
