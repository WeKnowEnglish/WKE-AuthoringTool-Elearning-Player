-- Private class noticeboard posts (announcements + photos) for enrolled students.

create table if not exists public.class_posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'announcement'
    check (kind in ('announcement', 'photo')),
  body text not null default '',
  image_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint class_posts_body_len check (char_length(body) <= 4000),
  constraint class_posts_image_url_len check (
    image_url is null or char_length(trim(image_url)) between 1 and 2048
  ),
  constraint class_posts_photo_requires_image check (
    kind <> 'photo' or image_url is not null
  ),
  constraint class_posts_announcement_has_body check (
    kind <> 'announcement' or char_length(trim(body)) >= 1
  )
);

create index if not exists class_posts_class_published_idx
  on public.class_posts (class_id, published_at desc);

alter table public.class_posts enable row level security;

grant select, insert, delete on public.class_posts to authenticated;

create policy class_posts_owner_select
  on public.class_posts for select
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

create policy class_posts_owner_insert
  on public.class_posts for insert
  to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and exists (
      select 1
      from public.teacher_classes tc
      where tc.id = class_id
        and tc.teacher_id = auth.uid()
    )
  );

create policy class_posts_owner_delete
  on public.class_posts for delete
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid());

-- Enrolled students can read posts for their classes.
create policy class_posts_student_select
  on public.class_posts for select
  to authenticated
  using (
    public.is_student()
    and exists (
      select 1
      from public.class_enrollments ce
      where ce.class_id = class_posts.class_id
        and ce.student_id = auth.uid()
    )
  );
