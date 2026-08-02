-- Parent Portal Phase 2: explicit guardian visibility and curated stream publications.

alter table public.class_posts
  add column if not exists guardian_visibility text not null default 'none';

alter table public.class_posts
  drop constraint if exists class_posts_guardian_visibility_check;
alter table public.class_posts
  add constraint class_posts_guardian_visibility_check
  check (guardian_visibility in ('none', 'class_guardians', 'tagged_student_guardians'));

-- Current class photos are stored in the public lesson_media bucket. They cannot be guardian-only.
alter table public.class_posts
  drop constraint if exists class_posts_public_photo_not_guardian_visible;
alter table public.class_posts
  add constraint class_posts_public_photo_not_guardian_visible
  check (kind <> 'photo' or guardian_visibility = 'none');

create table if not exists public.class_post_student_tags (
  post_id uuid not null references public.class_posts(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  tagged_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(post_id, student_id)
);

create index if not exists class_post_student_tags_student_idx
  on public.class_post_student_tags(student_id, post_id);

create table if not exists public.parent_stream_publications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('student_highlight', 'milestone')),
  title text not null,
  body text not null default '',
  context_label text,
  status text not null default 'published' check (status in ('published', 'archived')),
  occurred_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_stream_publications_title_len
    check (char_length(trim(title)) between 1 and 200),
  constraint parent_stream_publications_body_len
    check (char_length(body) <= 2000),
  constraint parent_stream_publications_context_len
    check (context_label is null or char_length(context_label) <= 160)
);

create index if not exists parent_stream_publications_student_published_idx
  on public.parent_stream_publications(student_id, published_at desc)
  where status = 'published';

alter table public.class_post_student_tags enable row level security;
alter table public.parent_stream_publications enable row level security;

create policy class_post_student_tags_teacher_select
  on public.class_post_student_tags for select to authenticated
  using (
    exists (
      select 1
      from public.class_posts cp
      where cp.id = class_post_student_tags.post_id
        and cp.teacher_id = auth.uid()
        and public.is_teacher()
    )
  );

create policy class_post_student_tags_teacher_insert
  on public.class_post_student_tags for insert to authenticated
  with check (
    tagged_by = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.class_posts cp
      join public.class_enrollments ce
        on ce.class_id = cp.class_id and ce.student_id = class_post_student_tags.student_id
      where cp.id = class_post_student_tags.post_id
        and cp.teacher_id = auth.uid()
    )
  );

create policy class_post_student_tags_teacher_delete
  on public.class_post_student_tags for delete to authenticated
  using (
    exists (
      select 1 from public.class_posts cp
      where cp.id = class_post_student_tags.post_id
        and cp.teacher_id = auth.uid()
        and public.is_teacher()
    )
  );

create policy parent_stream_publications_teacher_select
  on public.parent_stream_publications for select to authenticated
  using (teacher_id = auth.uid() and public.is_teacher());

create policy parent_stream_publications_teacher_insert
  on public.parent_stream_publications for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.teacher_classes tc
      join public.class_enrollments ce on ce.class_id = tc.id
      where tc.id = parent_stream_publications.class_id
        and tc.teacher_id = auth.uid()
        and tc.archived_at is null
        and ce.student_id = parent_stream_publications.student_id
    )
  );

create policy parent_stream_publications_teacher_update
  on public.parent_stream_publications for update to authenticated
  using (
    teacher_id = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.teacher_classes tc
      join public.class_enrollments ce on ce.class_id = tc.id
      where tc.id = parent_stream_publications.class_id
        and tc.teacher_id = auth.uid()
        and tc.archived_at is null
        and ce.student_id = parent_stream_publications.student_id
    )
  )
  with check (
    teacher_id = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.teacher_classes tc
      join public.class_enrollments ce on ce.class_id = tc.id
      where tc.id = parent_stream_publications.class_id
        and tc.teacher_id = auth.uid()
        and tc.archived_at is null
        and ce.student_id = parent_stream_publications.student_id
    )
  );

create policy parent_stream_publications_teacher_delete
  on public.parent_stream_publications for delete to authenticated
  using (teacher_id = auth.uid() and public.is_teacher());

create or replace function public.set_class_post_guardian_visibility(
  p_post_id uuid,
  p_visibility text,
  p_student_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.class_posts%rowtype;
  v_student_id uuid;
begin
  if p_visibility not in ('none', 'class_guardians', 'tagged_student_guardians') then
    return jsonb_build_object('ok', false, 'error', 'invalid_visibility');
  end if;
  select * into v_post
  from public.class_posts
  where id = p_post_id
  for update;
  if not found or not public.is_teacher() or v_post.teacher_id <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if v_post.kind = 'photo' and p_visibility <> 'none' then
    return jsonb_build_object('ok', false, 'error', 'private_media_required');
  end if;
  if p_visibility = 'tagged_student_guardians'
    and coalesce(cardinality(p_student_ids), 0) = 0 then
    return jsonb_build_object('ok', false, 'error', 'student_tag_required');
  end if;

  if p_student_ids is not null then
    foreach v_student_id in array p_student_ids loop
      if not exists (
        select 1 from public.class_enrollments ce
        where ce.class_id = v_post.class_id and ce.student_id = v_student_id
      ) then
        return jsonb_build_object('ok', false, 'error', 'student_not_in_class');
      end if;
    end loop;
  end if;

  update public.class_posts
  set guardian_visibility = p_visibility
  where id = p_post_id;

  delete from public.class_post_student_tags where post_id = p_post_id;
  if p_visibility = 'tagged_student_guardians' then
    insert into public.class_post_student_tags(post_id, student_id, tagged_by)
    select p_post_id, sid.student_id, auth.uid()
    from unnest(p_student_ids) as sid(student_id)
    on conflict do nothing;
  end if;

  insert into public.guardian_audit_log(
    actor_user_id, action, metadata
  ) values (
    auth.uid(),
    'class_post_guardian_visibility_changed',
    jsonb_build_object('postId', p_post_id, 'visibility', p_visibility)
  );

  return jsonb_build_object('ok', true, 'visibility', p_visibility);
end;
$$;

create or replace function public.parent_student_stream(
  p_student_id uuid,
  p_limit int default 40
)
returns table (
  item_type text,
  source_id uuid,
  title text,
  body text,
  context_label text,
  occurred_at timestamptz,
  link_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_active_guardian(p_student_id) then
    return;
  end if;

  return query
  with stream_items as (
    select
      case cp.kind
        when 'announcement' then 'teacher_update'
        when 'link' then 'teacher_link'
        when 'homework_reminder' then 'homework_update'
        when 'activity' then 'learning_activity'
        else 'teacher_update'
      end::text as item_type,
      cp.id as source_id,
      case cp.kind
        when 'announcement' then 'Class update'
        when 'link' then coalesce(cp.link_title, 'Shared link')
        when 'homework_reminder' then 'Homework update'
        when 'activity' then coalesce(cp.activity_title, 'Learning activity')
        else 'Class update'
      end::text as title,
      cp.body,
      tc.title::text as context_label,
      cp.published_at as occurred_at,
      case
        when cp.kind = 'link' then cp.link_url
        else null
      end::text as link_url
    from public.class_posts cp
    join public.teacher_classes tc on tc.id = cp.class_id
    where cp.kind <> 'photo'
      and (
        (
          cp.guardian_visibility = 'class_guardians'
          and exists (
            select 1 from public.class_enrollments ce
            where ce.class_id = cp.class_id and ce.student_id = p_student_id
          )
        )
        or (
          cp.guardian_visibility = 'tagged_student_guardians'
          and exists (
            select 1 from public.class_post_student_tags tag
            where tag.post_id = cp.id and tag.student_id = p_student_id
          )
        )
      )

    union all

    select
      psp.kind::text as item_type,
      psp.id as source_id,
      psp.title,
      psp.body,
      coalesce(psp.context_label, tc.title)::text as context_label,
      psp.occurred_at,
      null::text as link_url
    from public.parent_stream_publications psp
    join public.teacher_classes tc on tc.id = psp.class_id
    where psp.student_id = p_student_id
      and psp.status = 'published'
  )
  select
    si.item_type, si.source_id, si.title, si.body,
    si.context_label, si.occurred_at, si.link_url
  from stream_items si
  order by si.occurred_at desc, si.source_id desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
end;
$$;

grant select, insert, delete on public.class_post_student_tags to authenticated;
grant select, insert, update, delete on public.parent_stream_publications to authenticated;

revoke execute on function public.set_class_post_guardian_visibility(uuid, text, uuid[])
  from public, anon;
revoke execute on function public.parent_student_stream(uuid, int)
  from public, anon;
grant execute on function public.set_class_post_guardian_visibility(uuid, text, uuid[])
  to authenticated;
grant execute on function public.parent_student_stream(uuid, int)
  to authenticated;
