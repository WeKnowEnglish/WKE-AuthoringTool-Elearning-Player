-- Admin overrides for master vocabulary metadata (topics / primary topic).
-- Static candidate JSON stays untouched; runtime merges these by id.

create table if not exists public.platform_lexicon_overrides (
  id text primary key,
  primary_topic text,
  topics jsonb not null default '[]'::jsonb,
  primary_stage text
    check (
      primary_stage is null
      or primary_stage in ('PRE_A1_1', 'PRE_A1_2', 'A1_1', 'A1_2', 'A2_1', 'A2_2')
    ),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint platform_lexicon_overrides_id_prefix check (id ~ '^pv_[a-z0-9_]+$'),
  constraint platform_lexicon_overrides_topic_len check (
    primary_topic is null or char_length(trim(primary_topic)) between 1 and 64
  ),
  constraint platform_lexicon_overrides_topics_is_array check (jsonb_typeof(topics) = 'array')
);

create index if not exists platform_lexicon_overrides_updated_idx
  on public.platform_lexicon_overrides (updated_at desc);

alter table public.platform_lexicon_overrides enable row level security;

grant select on public.platform_lexicon_overrides to authenticated;

-- Teachers may read overrides so Dictionary/Find words stay consistent.
create policy platform_lexicon_overrides_teacher_select
  on public.platform_lexicon_overrides for select
  to authenticated
  using (public.is_teacher());

-- Writes only via service role from admin server actions.
