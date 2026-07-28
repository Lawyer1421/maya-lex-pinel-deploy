-- ============================================================================
-- MIGRACIÓN NO EJECUTADA — preparada, no aplicada a producción.
-- ============================================================================
-- Propósito: ruta de actualización futura y opcional para lib/seo/estado-
-- editorial.ts, que hoy usa un manifest JSON versionado en el repo
-- (data/corpus-editorial-status.json). Si en el futuro se prefiere una
-- fuente editable sin desplegar código (ej. un admin marca un artículo como
-- "limpio" tras revisión, sin esperar a un nuevo build), esta tabla permite
-- que estado-editorial.ts cambie de implementación sin que ningún consumidor
-- (páginas, sitemap, RAG) necesite modificarse.
--
-- NO aplicar sin autorización explícita. NO reemplaza el manifest actual
-- por sí sola — requeriría además cambiar la implementación interna de
-- lib/seo/estado-editorial.ts para leer de esta tabla en vez del JSON.
-- ============================================================================

begin;

create table if not exists public.corpus_editorial_status (
  num_articulo text primary key,
  estado text not null check (estado in ('contaminado', 'limpio')),
  motivo text not null,
  actualizado_por text,
  actualizado_en timestamptz not null default now()
);

alter table public.corpus_editorial_status enable row level security;

-- Lectura pública permitida (es información editorial no sensible — el
-- propio estado ya es visible indirectamente en los metadatos robots de
-- las páginas públicas). Escritura restringida a service_role.
create policy "corpus_editorial_status_lectura_publica"
  on public.corpus_editorial_status
  for select
  using (true);

grant select on public.corpus_editorial_status to anon, authenticated;
grant select, insert, update, delete on public.corpus_editorial_status to service_role;

commit;

-- ── ROLLBACK (si se llegara a aplicar y hubiera que revertir) ──────────────
-- begin;
-- drop table if exists public.corpus_editorial_status;
-- commit;
