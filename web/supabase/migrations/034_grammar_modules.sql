-- Teacher-authored grammar poster JSON (draft + published). Bundled files remain the fallback seed.

create table if not exists public.grammar_modules (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  difficulty text check (difficulty is null or difficulty in ('A1', 'A2', 'B1')),
  source_file text not null check (source_file ~ '^[a-z0-9-]+\.json$'),
  thumbnail_emoji text,
  sort_order int,
  topic_group text,
  module_json jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists grammar_modules_status_updated_idx
  on public.grammar_modules (status, updated_at desc);

alter table public.grammar_modules enable row level security;

grant select, insert, update on public.grammar_modules to authenticated;
grant select on public.grammar_modules to anon;

create policy "grammar_modules_teacher_select"
  on public.grammar_modules for select
  to authenticated
  using (public.is_teacher());

create policy "grammar_modules_teacher_insert"
  on public.grammar_modules for insert
  to authenticated
  with check (public.is_teacher());

create policy "grammar_modules_teacher_update"
  on public.grammar_modules for update
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "grammar_modules_published_select"
  on public.grammar_modules for select
  to authenticated
  using (status = 'published');

create policy "grammar_modules_published_anon_select"
  on public.grammar_modules for select
  to anon
  using (status = 'published');
