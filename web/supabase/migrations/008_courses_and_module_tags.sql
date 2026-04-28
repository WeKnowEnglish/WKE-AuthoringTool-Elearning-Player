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
