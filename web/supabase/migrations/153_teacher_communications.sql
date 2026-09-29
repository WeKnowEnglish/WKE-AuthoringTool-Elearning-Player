-- Teacher communications foundation: auditable admin email and private direct messages.

create table if not exists public.admin_email_sends (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid not null references auth.users(id) on delete restrict,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  body_text text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint admin_email_sends_recipient_email_len
    check (char_length(recipient_email) between 3 and 320),
  constraint admin_email_sends_recipient_name_len
    check (recipient_name is null or char_length(recipient_name) <= 120),
  constraint admin_email_sends_subject_len
    check (char_length(subject) between 1 and 160),
  constraint admin_email_sends_body_len
    check (char_length(body_text) between 1 and 10000),
  constraint admin_email_sends_failure_reason_len
    check (failure_reason is null or char_length(failure_reason) <= 1000)
);

create index if not exists admin_email_sends_created_idx
  on public.admin_email_sends(created_at desc);
create index if not exists admin_email_sends_recipient_idx
  on public.admin_email_sends(lower(recipient_email), created_at desc);

-- Email history is service-role only. Admin authorization is enforced again by
-- the server action before the service-role client is created.
alter table public.admin_email_sends enable row level security;
revoke all on public.admin_email_sends from anon, authenticated;

create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  directory_visible boolean not null default true,
  message_email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_profiles_display_name_len
    check (char_length(display_name) between 1 and 80),
  constraint teacher_profiles_avatar_url_len
    check (avatar_url is null or char_length(avatar_url) <= 1000)
);

-- Backfill current teachers without exposing their email addresses in the public profile.
insert into public.teacher_profiles(user_id, display_name)
select
  id,
  left(
    coalesce(
      nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(email, ''), '@', 1), ''),
      'Teacher'
    ),
    80
  )
from auth.users
where raw_app_meta_data ->> 'role' = 'teacher'
  or lower(coalesce(raw_app_meta_data ->> 'admin', '')) in ('true', '1')
  or lower(coalesce(email, '')) = 'bradydmyers@gmail.com'
on conflict (user_id) do nothing;

create table if not exists public.teacher_conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'direct'
    check (conversation_type in ('direct', 'announcement')),
  created_by uuid not null references auth.users(id) on delete restrict,
  direct_pair_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint teacher_conversations_direct_key
    check (
      (conversation_type = 'direct' and direct_pair_key is not null)
      or (conversation_type = 'announcement' and direct_pair_key is null)
    )
);

create table if not exists public.teacher_conversation_members (
  conversation_id uuid not null references public.teacher_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  archived_at timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists teacher_conversation_members_user_idx
  on public.teacher_conversation_members(user_id, archived_at, conversation_id);

create table if not exists public.teacher_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.teacher_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint teacher_messages_body_len check (char_length(body) between 1 and 4000)
);

create index if not exists teacher_messages_conversation_created_idx
  on public.teacher_messages(conversation_id, created_at);

alter table public.teacher_profiles enable row level security;
alter table public.teacher_conversations enable row level security;
alter table public.teacher_conversation_members enable row level security;
alter table public.teacher_messages enable row level security;

-- Match the application role gate, including its bootstrap administrator fallback.
create or replace function public.is_teacher_communication_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_teacher()
    or lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'admin', '')) in ('true', '1')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bradydmyers@gmail.com';
$$;

create or replace function public.teacher_is_conversation_member(
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_conversation_members member
    where member.conversation_id = p_conversation_id
      and member.user_id = auth.uid()
  );
$$;

create policy teacher_profiles_select_directory
  on public.teacher_profiles for select to authenticated
  using (
    public.is_teacher_communication_user()
    and (directory_visible = true or user_id = auth.uid())
  );

create policy teacher_profiles_insert_self
  on public.teacher_profiles for insert to authenticated
  with check (public.is_teacher_communication_user() and user_id = auth.uid());

create policy teacher_profiles_update_self
  on public.teacher_profiles for update to authenticated
  using (public.is_teacher_communication_user() and user_id = auth.uid())
  with check (public.is_teacher_communication_user() and user_id = auth.uid());

create policy teacher_conversations_select_member
  on public.teacher_conversations for select to authenticated
  using (public.teacher_is_conversation_member(id));

create policy teacher_conversation_members_select_member
  on public.teacher_conversation_members for select to authenticated
  using (public.teacher_is_conversation_member(conversation_id));

create policy teacher_messages_select_member
  on public.teacher_messages for select to authenticated
  using (public.teacher_is_conversation_member(conversation_id));

create policy teacher_messages_insert_member
  on public.teacher_messages for insert to authenticated
  with check (
    public.is_teacher_communication_user()
    and sender_id = auth.uid()
    and public.teacher_is_conversation_member(conversation_id)
  );

create or replace function public.get_or_create_teacher_direct_conversation(
  p_other_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_pair_key text;
  v_conversation_id uuid;
begin
  if v_current_user_id is null or not public.is_teacher_communication_user() then
    raise exception 'Teacher authentication required';
  end if;
  if p_other_user_id is null or p_other_user_id = v_current_user_id then
    raise exception 'Choose another teacher';
  end if;
  if not exists (
    select 1 from public.teacher_profiles
    where user_id = p_other_user_id and directory_visible = true
  ) then
    raise exception 'Teacher is not available for messaging';
  end if;

  v_pair_key := case
    when v_current_user_id::text < p_other_user_id::text
      then v_current_user_id::text || ':' || p_other_user_id::text
    else p_other_user_id::text || ':' || v_current_user_id::text
  end;

  insert into public.teacher_conversations(
    conversation_type, created_by, direct_pair_key
  ) values ('direct', v_current_user_id, v_pair_key)
  on conflict (direct_pair_key) do update
    set updated_at = public.teacher_conversations.updated_at
  returning id into v_conversation_id;

  insert into public.teacher_conversation_members(conversation_id, user_id)
  values
    (v_conversation_id, v_current_user_id),
    (v_conversation_id, p_other_user_id)
  on conflict (conversation_id, user_id) do update
    set archived_at = null;

  return v_conversation_id;
end;
$$;

create or replace function public.mark_teacher_conversation_read(
  p_conversation_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.teacher_conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and user_id = auth.uid()
    and public.is_teacher_communication_user()
  returning true;
$$;

create or replace function public.touch_teacher_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.teacher_conversations
  set last_message_at = new.created_at, updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists teacher_messages_touch_conversation on public.teacher_messages;
create trigger teacher_messages_touch_conversation
after insert on public.teacher_messages
for each row execute function public.touch_teacher_conversation_from_message();

grant select, insert, update on public.teacher_profiles to authenticated;
grant select on public.teacher_conversations to authenticated;
grant select on public.teacher_conversation_members to authenticated;
grant select, insert on public.teacher_messages to authenticated;

revoke execute on function public.teacher_is_conversation_member(uuid) from public, anon;
revoke execute on function public.is_teacher_communication_user() from public, anon;
revoke execute on function public.get_or_create_teacher_direct_conversation(uuid) from public, anon;
revoke execute on function public.mark_teacher_conversation_read(uuid) from public, anon;
grant execute on function public.teacher_is_conversation_member(uuid) to authenticated;
grant execute on function public.is_teacher_communication_user() to authenticated;
grant execute on function public.get_or_create_teacher_direct_conversation(uuid) to authenticated;
grant execute on function public.mark_teacher_conversation_read(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'teacher_messages'
  ) then
    alter publication supabase_realtime add table public.teacher_messages;
  end if;
end;
$$;
