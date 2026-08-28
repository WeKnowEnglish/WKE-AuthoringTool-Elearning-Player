-- Consolidated legacy migration version 008.
-- Supabase tracks one migration per version prefix.

-- Legacy source: 008_courses_and_module_tags.sql

-- Add course hierarchy and module tags for discovery/search.

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  target text not null,
  order_index int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.modules
  add column course_id uuid references public.courses (id) on delete restrict;

insert into public.courses (title, slug, target, order_index, published)
values ('General Course', 'general-course', 'general', 0, true)
on conflict (slug) do nothing;

update public.modules
set course_id = c.id
from public.courses c
where c.slug = 'general-course'
  and public.modules.course_id is null;

alter table public.modules
  alter column course_id set not null;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.module_tags (
  module_id uuid not null references public.modules (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (module_id, tag_id)
);

create index courses_order_published_idx on public.courses (order_index, published);
create index modules_course_order_published_idx on public.modules (course_id, order_index, published);
create index courses_title_lower_idx on public.courses ((lower(title)));
create index courses_slug_lower_idx on public.courses ((lower(slug)));
create index modules_title_lower_idx on public.modules ((lower(title)));
create index modules_slug_lower_idx on public.modules ((lower(slug)));
create index tags_label_lower_idx on public.tags ((lower(label)));
create index module_tags_tag_id_idx on public.module_tags (tag_id);

alter table public.courses enable row level security;
alter table public.tags enable row level security;
alter table public.module_tags enable row level security;

create policy "courses_select_published_or_teacher"
  on public.courses for select
  using (published = true or public.is_teacher());

create policy "courses_teacher_write"
  on public.courses for all
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "tags_select_published_modules_or_teacher"
  on public.tags for select
  using (
    public.is_teacher()
    or exists (
      select 1
      from public.module_tags mt
      join public.modules m on m.id = mt.module_id
      where mt.tag_id = public.tags.id
        and m.published = true
    )
  );

create policy "tags_teacher_write"
  on public.tags for all
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "module_tags_select_published_modules_or_teacher"
  on public.module_tags for select
  using (
    public.is_teacher()
    or exists (
      select 1
      from public.modules m
      where m.id = module_id
        and m.published = true
    )
  );

create policy "module_tags_teacher_write"
  on public.module_tags for all
  using (public.is_teacher())
  with check (public.is_teacher());

grant select on public.courses to anon, authenticated;
grant select on public.tags to anon, authenticated;
grant select on public.module_tags to anon, authenticated;

grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.module_tags to authenticated;

-- Legacy source: 008_seed_four_new_activities.sql

-- Seed sample screens for four new interaction subtypes.
-- Inserts only when each subtype is missing from the target lesson.

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((select max(ls.order_index) + 1 from public.lesson_screens ls where ls.lesson_id = l.id), 0),
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'letter_mixup',
    'prompt', 'Reorder the letters to make the word.',
    'shuffle_letters', true,
    'case_sensitive', false,
    'items', jsonb_build_array(
      jsonb_build_object('id', 'lm1', 'target_word', 'school', 'accepted_words', jsonb_build_array('School')),
      jsonb_build_object('id', 'lm2', 'target_word', 'teacher', 'accepted_words', jsonb_build_array('Teacher'))
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1 from public.lesson_screens s
    where s.lesson_id = l.id and s.payload ->> 'subtype' = 'letter_mixup'
  );

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((select max(ls.order_index) + 1 from public.lesson_screens ls where ls.lesson_id = l.id), 0),
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'word_shape_hunt',
    'prompt', 'Tap all vocabulary words.',
    'shape_layout', 'wave',
    'shuffle_chunks', false,
    'word_chunks', jsonb_build_array(
      jsonb_build_object('id', 'w1', 'text', 'apple', 'is_vocab', true),
      jsonb_build_object('id', 'w2', 'text', 'window', 'is_vocab', false),
      jsonb_build_object('id', 'w3', 'text', 'banana', 'is_vocab', true),
      jsonb_build_object('id', 'w4', 'text', 'table', 'is_vocab', false)
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1 from public.lesson_screens s
    where s.lesson_id = l.id and s.payload ->> 'subtype' = 'word_shape_hunt'
  );

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((select max(ls.order_index) + 1 from public.lesson_screens ls where ls.lesson_id = l.id), 0),
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'table_complete',
    'prompt', 'Complete the table.',
    'left_column_label', 'Word',
    'right_column_label', 'Meaning',
    'input_mode', 'tokens',
    'rows', jsonb_build_array(
      jsonb_build_object('id', 'r1', 'prompt_text', 'doctor', 'expected_token_id', 'tok1'),
      jsonb_build_object('id', 'r2', 'prompt_text', 'pilot', 'expected_token_id', 'tok2')
    ),
    'token_bank', jsonb_build_array(
      jsonb_build_object('id', 'tok1', 'label', 'helps sick people'),
      jsonb_build_object('id', 'tok2', 'label', 'flies a plane')
    ),
    'case_insensitive', true,
    'normalize_whitespace', true
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1 from public.lesson_screens s
    where s.lesson_id = l.id and s.payload ->> 'subtype' = 'table_complete'
  );

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((select max(ls.order_index) + 1 from public.lesson_screens ls where ls.lesson_id = l.id), 0),
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'sorting_game',
    'prompt', 'Sort each object into the correct container.',
    'shuffle_objects', true,
    'allow_reassign', true,
    'containers', jsonb_build_array(
      jsonb_build_object('id', 'c1', 'display', jsonb_build_object('text', 'Animals')),
      jsonb_build_object('id', 'c2', 'display', jsonb_build_object('text', 'Food'))
    ),
    'objects', jsonb_build_array(
      jsonb_build_object('id', 'o1', 'display', jsonb_build_object('text', 'cat'), 'target_container_id', 'c1'),
      jsonb_build_object('id', 'o2', 'display', jsonb_build_object('text', 'dog'), 'target_container_id', 'c1'),
      jsonb_build_object('id', 'o3', 'display', jsonb_build_object('text', 'apple'), 'target_container_id', 'c2'),
      jsonb_build_object('id', 'o4', 'display', jsonb_build_object('text', 'bread'), 'target_container_id', 'c2')
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1 from public.lesson_screens s
    where s.lesson_id = l.id and s.payload ->> 'subtype' = 'sorting_game'
  );
