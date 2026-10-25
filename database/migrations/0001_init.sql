-- 0001_init: core schema. Compatible with plain PostgreSQL+pgvector and with Supabase.
-- Principle: deny by default. RLS is enabled on every table; policies are added per module.
create extension if not exists vector;
create extension if not exists pgcrypto;
create schema if not exists fpw;

-- Mirror of the hash-chained audit file (file stays the source of truth in Phase 0).
create table fpw.audit_log (
  seq         bigint primary key,
  ts          timestamptz not null,
  actor       text not null,
  action      text not null,
  target      text,
  outcome     text not null check (outcome in ('ok','denied','error')),
  meta        jsonb not null default '{}',
  prev        text not null,
  hash        text not null unique
);

create table fpw.documents (
  id          uuid primary key default gen_random_uuid(),
  domain      text not null,                       -- legal | notarial | academic | editorial | research | inbox
  sensitivity text not null default 'PRIVILEGED' check (sensitivity in ('PUBLIC','INTERNAL','PRIVILEGED')),
  title       text not null,
  source_path text,                                -- path under knowledge/ or storage/ — never committed
  sha256      text not null,
  created_at  timestamptz not null default now()
);

create table fpw.chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references fpw.documents(id) on delete cascade,
  ordinal     int  not null,
  content     text not null,
  embedding   vector(768),                         -- dimension fixed by chosen local embedding model (D-05)
  unique (document_id, ordinal)
);
create index on fpw.chunks using hnsw (embedding vector_cosine_ops);

-- Human approvals for destructive / external actions.
create table fpw.approvals (
  id          uuid primary key default gen_random_uuid(),
  requested_by text not null,                      -- agent id
  action      text not null,
  detail      jsonb not null default '{}',
  status      text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table fpw.audit_log  enable row level security;
alter table fpw.documents  enable row level security;
alter table fpw.chunks     enable row level security;
alter table fpw.approvals  enable row level security;
-- No policies yet => only the table owner/service role can access. Policies arrive with the module that needs them.
