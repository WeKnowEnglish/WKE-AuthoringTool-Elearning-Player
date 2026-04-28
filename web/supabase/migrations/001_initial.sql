-- We Know English — lesson player schema (run in Supabase SQL Editor or via CLI)

-- Helper: teacher role from JWT app_metadata (set in Supabase Dashboard per user)
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'role'),
    ''
  ) = 'teacher';
$$;

-- Modules
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  order_index int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  slug text not null,
  order_index int not null default 0,
  published boolean not null default false,
  estimated_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug)
);

create index lessons_module_id_idx on public.lessons (module_id);

-- Screens / steps
create table public.lesson_screens (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  order_index int not null,
  screen_type text not null check (screen_type in ('start', 'story', 'interaction')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lesson_screens_lesson_order_idx on public.lesson_screens (lesson_id, order_index);

-- Skill tags (metadata for profile aggregation)
create table public.lesson_skills (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  skill_key text not null,
  primary key (lesson_id, skill_key)
);

-- Future student sync (no anon access; unused in anonymous MVP)
create table public.student_lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz,
  resume_screen_index int,
  primary key (user_id, lesson_id)
);

-- RLS
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_screens enable row level security;
alter table public.lesson_skills enable row level security;
alter table public.student_lesson_progress enable row level security;

-- Anon: read published catalog
create policy "modules_select_published_or_teacher"
  on public.modules for select
  using (published = true or public.is_teacher());

create policy "lessons_select_published_or_teacher"
  on public.lessons for select
  using (published = true or public.is_teacher());

create policy "lesson_screens_select_published_or_teacher"
  on public.lesson_screens for select
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and (l.published = true or public.is_teacher())
    )
  );

create policy "lesson_skills_select_published_or_teacher"
  on public.lesson_skills for select
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and (l.published = true or public.is_teacher())
    )
  );

-- Teachers: full CRUD
create policy "modules_teacher_write"
  on public.modules for all
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "lessons_teacher_write"
  on public.lessons for all
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "lesson_screens_teacher_write"
  on public.lesson_screens for all
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "lesson_skills_teacher_write"
  on public.lesson_skills for all
  using (public.is_teacher())
  with check (public.is_teacher());

-- Student progress: only own rows when authenticated
create policy "student_progress_own"
  on public.student_lesson_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed demo content (optional — comment out if you prefer empty DB)
insert into public.modules (title, slug, order_index, published)
values ('Welcome', 'welcome', 0, true);

insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Our first story', 'our-first-story', 0, true, 10
from public.modules where slug = 'welcome';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start',
  jsonb_build_object(
    'type', 'start',
    'image_url', 'https://placehold.co/800x520/e2e8f0/1e293b?text=Start',
    'cta_label', 'Start learning'
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'welcome' and l.slug = 'our-first-story';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story',
  jsonb_build_object(
    'type', 'story',
    'image_url', 'https://placehold.co/800x400/f1f5f9/334155?text=Story',
    'body_text', 'Mai walks to school with her friend Tom. They say hello to their teacher.',
    'read_aloud_text', 'Mai walks to school with her friend Tom. They say hello to their teacher.',
    'tts_lang', 'en-US',
    'guide', jsonb_build_object(
      'tip_text', 'Listen for the words ''school'' and ''teacher''.',
      'image_url', 'https://placehold.co/120x120/fff7ed/9a3412?text=Guide'
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'welcome' and l.slug = 'our-first-story';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'mc_quiz',
    'body_text', 'Who walks with Mai?',
    'question', 'Who walks with Mai?',
    'options', jsonb_build_array(
      jsonb_build_object('id', 'a', 'label', 'Tom'),
      jsonb_build_object('id', 'b', 'label', 'The bus'),
      jsonb_build_object('id', 'c', 'label', 'A cat')
    ),
    'correct_option_id', 'a',
    'guide', jsonb_build_object('tip_text', 'Think about the first sentence.')
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'welcome' and l.slug = 'our-first-story';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill
from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('vocabulary'), ('listening')) as s(skill)
where m.slug = 'welcome' and l.slug = 'our-first-story';
