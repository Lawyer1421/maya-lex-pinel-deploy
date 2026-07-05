-- ============================================================
-- Maya Lex IA — Analytics Schema  (idempotente)
-- Ejecutar en: Supabase SQL Editor  O  npm run migrate:analytics
-- ============================================================

-- ── Tabla: consultas ─────────────────────────────────────────
create table if not exists consultas (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now() not null,

  -- Query
  pregunta_anonimizada  text,
  modo                  text,           -- sala_ia | analisis | documento | sala_penal ...
  ruta_rag              text,           -- A | B | C | D

  -- Modelo
  modelo                text,
  proveedor             text,           -- anthropic | openrouter

  -- Performance
  tokens_input          integer,
  tokens_output         integer,
  tiempo_ms             integer,

  -- Funcionalidades
  web_search_usado      boolean default false,

  -- Usuario
  usuario_hash          text,
  tier_usuario          text,           -- free | pro | admin

  -- Status
  exito                 boolean default true
);

-- ── Tabla: feedback ──────────────────────────────────────────
create table if not exists feedback (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now() not null,
  consulta_id  uuid references consultas(id) on delete set null,
  util         boolean not null,        -- true=👍 | false=👎
  comentario   text
);

-- ── RLS: solo service_role puede leer/escribir ───────────────
alter table consultas enable row level security;
alter table feedback   enable row level security;

-- Políticas idempotentes (DO block evita error si ya existen)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'consultas' and policyname = 'service_only_consultas'
  ) then
    execute $pol$
      create policy "service_only_consultas" on consultas
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'feedback' and policyname = 'service_only_feedback'
  ) then
    execute $pol$
      create policy "service_only_feedback" on feedback
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

-- ── Índices ──────────────────────────────────────────────────
create index if not exists idx_consultas_created   on consultas(created_at desc);
create index if not exists idx_consultas_modo       on consultas(modo);
create index if not exists idx_consultas_usuario    on consultas(usuario_hash);
create index if not exists idx_consultas_proveedor  on consultas(proveedor);
create index if not exists idx_feedback_consulta    on feedback(consulta_id);
