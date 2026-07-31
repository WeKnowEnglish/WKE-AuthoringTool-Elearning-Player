-- Activity shares + pin for class stream posts.

alter table public.class_posts
  drop constraint if exists class_posts_kind_check;

alter table public.class_posts
  add column if not exists activity_space_item_id uuid
    references public.teacher_space_items (id) on delete set null,
  add column if not exists activity_title text,
  add column if not exists activity_play_path text,
  add column if not exists pinned_at timestamptz;

alter table public.class_posts
  add constraint class_posts_kind_check
  check (kind in (
    'announcement',
    'photo',
    'link',
    'homework_reminder',
    'activity'
  ));

alter table public.class_posts
  drop constraint if exists class_posts_activity_requires_fields;

alter table public.class_posts
  add constraint class_posts_activity_requires_fields check (
    kind <> 'activity' or (
      activity_title is not null
      and char_length(trim(activity_title)) between 1 and 200
      and activity_play_path is not null
      and char_length(trim(activity_play_path)) between 1 and 512
    )
  );

alter table public.class_posts
  drop constraint if exists class_posts_activity_title_len;

alter table public.class_posts
  add constraint class_posts_activity_title_len check (
    activity_title is null or char_length(trim(activity_title)) between 1 and 200
  );

alter table public.class_posts
  drop constraint if exists class_posts_activity_play_path_len;

alter table public.class_posts
  add constraint class_posts_activity_play_path_len check (
    activity_play_path is null
    or char_length(trim(activity_play_path)) between 1 and 512
  );

create index if not exists class_posts_class_pinned_idx
  on public.class_posts (class_id, pinned_at desc nulls last, published_at desc);

grant update on public.class_posts to authenticated;

drop policy if exists class_posts_owner_update on public.class_posts;

create policy class_posts_owner_update
  on public.class_posts for update
  to authenticated
  using (public.is_teacher() and teacher_id = auth.uid())
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
