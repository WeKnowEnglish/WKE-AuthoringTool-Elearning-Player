-- Parent Portal Phase 1: guardian identity, invitations, relationships, and audit trail.
-- Guardian access is relationship-derived so one Auth user may also remain a teacher.

create table if not exists public.parent_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'vi')),
  notification_preferences jsonb not null default
    '{"inApp":true,"importantEmail":true,"weeklyEmail":false}'::jsonb
    check (jsonb_typeof(notification_preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_profiles_display_name_len
    check (char_length(display_name) <= 120)
);

create table if not exists public.guardian_invitations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  relationship_type text not null default 'guardian'
    check (relationship_type in ('parent', 'guardian')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  last_sent_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guardian_invitations_email_normalized
    check (
      invited_email = lower(trim(invited_email))
      and char_length(invited_email) between 3 and 320
      and position('@' in invited_email) > 1
    ),
  constraint guardian_invitations_expiry_after_create
    check (expires_at > created_at)
);

-- Token hashes are deliberately isolated from the queryable invitation record.
-- No authenticated grants or RLS policies are added for this table.
create table if not exists public.guardian_invitation_tokens (
  invitation_id uuid primary key references public.guardian_invitations(id) on delete cascade,
  token_hash text not null unique,
  rotated_at timestamptz not null default now(),
  constraint guardian_invitation_tokens_sha256_hex
    check (token_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_type text not null default 'guardian'
    check (relationship_type in ('parent', 'guardian')),
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  source_invitation_id uuid references public.guardian_invitations(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_guardians_unique_guardian unique(student_id, guardian_user_id),
  constraint student_guardians_not_self check (student_id <> guardian_user_id)
);

create table if not exists public.guardian_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  student_id uuid references auth.users(id) on delete set null,
  guardian_user_id uuid references auth.users(id) on delete set null,
  invitation_id uuid references public.guardian_invitations(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint guardian_audit_log_action_len
    check (char_length(action) between 3 and 80)
);

create unique index if not exists guardian_invitations_one_pending_email_idx
  on public.guardian_invitations(student_id, invited_email)
  where status = 'pending';

create index if not exists guardian_invitations_student_status_idx
  on public.guardian_invitations(student_id, status, created_at desc);

create index if not exists guardian_invitations_invited_by_idx
  on public.guardian_invitations(invited_by, created_at desc);

create index if not exists student_guardians_guardian_status_idx
  on public.student_guardians(guardian_user_id, status, updated_at desc);

create index if not exists student_guardians_student_status_idx
  on public.student_guardians(student_id, status, updated_at desc);

create index if not exists guardian_audit_log_student_created_idx
  on public.guardian_audit_log(student_id, created_at desc);

create or replace function public.normalize_guardian_email(p_email text)
returns text
language sql
immutable
strict
as $$
  select lower(trim(p_email));
$$;

create or replace function public.teacher_can_manage_guardians(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teacher()
    and exists (
      select 1
      from public.class_enrollments ce
      join public.teacher_classes tc on tc.id = ce.class_id
      where ce.student_id = p_student_id
        and tc.teacher_id = auth.uid()
        and tc.archived_at is null
    );
$$;

create or replace function public.is_active_guardian(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.student_guardians sg
      where sg.student_id = p_student_id
        and sg.guardian_user_id = auth.uid()
        and sg.status = 'active'
    );
$$;

create or replace function public.create_guardian_invitation(
  p_student_id uuid,
  p_email text,
  p_relationship_type text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.normalize_guardian_email(p_email);
  v_invitation public.guardian_invitations%rowtype;
  v_now timestamptz := now();
  v_is_resend boolean := false;
begin
  if auth.uid() is null or not public.teacher_can_manage_guardians(p_student_id) then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_relationship_type not in ('parent', 'guardian') then
    return jsonb_build_object('ok', false, 'error', 'invalid_relationship_type');
  end if;
  if char_length(v_email) < 3 or char_length(v_email) > 320 or position('@' in v_email) <= 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token_hash');
  end if;
  if p_expires_at <= v_now + interval '5 minutes' then
    return jsonb_build_object('ok', false, 'error', 'invalid_expiry');
  end if;

  update public.guardian_invitations
  set status = 'expired', updated_at = v_now
  where student_id = p_student_id
    and invited_email = v_email
    and status = 'pending'
    and expires_at <= v_now;

  select * into v_invitation
  from public.guardian_invitations
  where student_id = p_student_id
    and invited_email = v_email
    and status = 'pending'
  for update;

  if found then
    if v_invitation.last_sent_at > v_now - interval '60 seconds' then
      return jsonb_build_object('ok', false, 'error', 'rate_limited');
    end if;
    v_is_resend := true;
    update public.guardian_invitations
    set relationship_type = p_relationship_type,
        invited_by = auth.uid(),
        expires_at = p_expires_at,
        email_status = 'pending',
        last_sent_at = v_now,
        updated_at = v_now
    where id = v_invitation.id
    returning * into v_invitation;
  else
    insert into public.guardian_invitations (
      student_id,
      invited_email,
      relationship_type,
      status,
      email_status,
      invited_by,
      expires_at,
      last_sent_at
    ) values (
      p_student_id,
      v_email,
      p_relationship_type,
      'pending',
      'pending',
      auth.uid(),
      p_expires_at,
      v_now
    ) returning * into v_invitation;
  end if;

  insert into public.guardian_invitation_tokens(invitation_id, token_hash, rotated_at)
  values (v_invitation.id, p_token_hash, v_now)
  on conflict (invitation_id) do update
    set token_hash = excluded.token_hash,
        rotated_at = excluded.rotated_at;

  insert into public.guardian_audit_log (
    actor_user_id,
    student_id,
    invitation_id,
    action,
    metadata
  ) values (
    auth.uid(),
    p_student_id,
    v_invitation.id,
    case when v_is_resend then 'invitation_resent' else 'invitation_created' end,
    jsonb_build_object('relationshipType', p_relationship_type)
  );

  return jsonb_build_object(
    'ok', true,
    'invitationId', v_invitation.id,
    'resent', v_is_resend
  );
end;
$$;

create or replace function public.set_guardian_invitation_email_status(
  p_invitation_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  if p_status not in ('pending', 'sent', 'failed') then
    return false;
  end if;
  select student_id into v_student_id
  from public.guardian_invitations
  where id = p_invitation_id;
  if v_student_id is null or not public.teacher_can_manage_guardians(v_student_id) then
    return false;
  end if;
  update public.guardian_invitations
  set email_status = p_status, updated_at = now()
  where id = p_invitation_id;
  return found;
end;
$$;

create or replace function public.cancel_guardian_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.guardian_invitations%rowtype;
begin
  select * into v_invitation
  from public.guardian_invitations
  where id = p_invitation_id
  for update;
  if not found or not public.teacher_can_manage_guardians(v_invitation.student_id) then
    return false;
  end if;
  if v_invitation.status <> 'pending' then
    return false;
  end if;
  update public.guardian_invitations
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = p_invitation_id;
  delete from public.guardian_invitation_tokens where invitation_id = p_invitation_id;
  insert into public.guardian_audit_log (
    actor_user_id, student_id, invitation_id, action
  ) values (
    auth.uid(), v_invitation.student_id, p_invitation_id, 'invitation_cancelled'
  );
  return true;
end;
$$;

create or replace function public.guardian_invitation_preview(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_confirmed_at timestamptz;
  v_invitation public.guardian_invitations%rowtype;
  v_student_name text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;
  select lower(email), email_confirmed_at into v_email, v_confirmed_at
  from auth.users where id = v_user_id;
  if v_confirmed_at is null then
    return jsonb_build_object('ok', false, 'error', 'verified_email_required');
  end if;
  select gi.* into v_invitation
  from public.guardian_invitations gi
  join public.guardian_invitation_tokens git on git.invitation_id = gi.id
  where git.token_hash = p_token_hash
    and gi.status = 'pending'
    and gi.expires_at > now();
  if not found or v_email <> v_invitation.invited_email then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_wrong_account');
  end if;
  select display_name into v_student_name
  from public.student_profiles
  where user_id = v_invitation.student_id;
  return jsonb_build_object(
    'ok', true,
    'studentId', v_invitation.student_id,
    'studentName', coalesce(v_student_name, 'your child'),
    'relationshipType', v_invitation.relationship_type,
    'expiresAt', v_invitation.expires_at
  );
end;
$$;

create or replace function public.accept_guardian_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_confirmed_at timestamptz;
  v_invitation public.guardian_invitations%rowtype;
  v_relationship public.student_guardians%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;
  select lower(email), email_confirmed_at into v_email, v_confirmed_at
  from auth.users where id = v_user_id;
  if v_confirmed_at is null then
    return jsonb_build_object('ok', false, 'error', 'verified_email_required');
  end if;

  select gi.* into v_invitation
  from public.guardian_invitations gi
  join public.guardian_invitation_tokens git on git.invitation_id = gi.id
  where git.token_hash = p_token_hash
  for update of gi;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;
  if v_invitation.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;
  if v_invitation.expires_at <= now() then
    update public.guardian_invitations
    set status = 'expired', updated_at = now()
    where id = v_invitation.id;
    delete from public.guardian_invitation_tokens where invitation_id = v_invitation.id;
    insert into public.guardian_audit_log (
      actor_user_id, student_id, invitation_id, action
    ) values (
      v_user_id, v_invitation.student_id, v_invitation.id, 'invitation_expired'
    );
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;
  if v_email <> v_invitation.invited_email then
    return jsonb_build_object('ok', false, 'error', 'wrong_account');
  end if;
  if v_invitation.student_id = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'student_cannot_guard_self');
  end if;

  insert into public.parent_profiles(user_id, display_name)
  values (v_user_id, left(split_part(v_email, '@', 1), 120))
  on conflict (user_id) do nothing;

  insert into public.student_guardians (
    student_id,
    guardian_user_id,
    relationship_type,
    status,
    source_invitation_id,
    invited_by,
    activated_at,
    revoked_at,
    revoked_by,
    updated_at
  ) values (
    v_invitation.student_id,
    v_user_id,
    v_invitation.relationship_type,
    'active',
    v_invitation.id,
    v_invitation.invited_by,
    now(),
    null,
    null,
    now()
  )
  on conflict (student_id, guardian_user_id) do update
    set relationship_type = excluded.relationship_type,
        status = 'active',
        source_invitation_id = excluded.source_invitation_id,
        invited_by = excluded.invited_by,
        activated_at = excluded.activated_at,
        revoked_at = null,
        revoked_by = null,
        updated_at = excluded.updated_at
  returning * into v_relationship;

  update public.guardian_invitations
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now(),
      updated_at = now()
  where id = v_invitation.id;
  delete from public.guardian_invitation_tokens where invitation_id = v_invitation.id;

  insert into public.guardian_audit_log (
    actor_user_id,
    student_id,
    guardian_user_id,
    invitation_id,
    action,
    metadata
  ) values (
    v_user_id,
    v_invitation.student_id,
    v_user_id,
    v_invitation.id,
    'invitation_accepted',
    jsonb_build_object('relationshipId', v_relationship.id)
  );

  return jsonb_build_object(
    'ok', true,
    'studentId', v_invitation.student_id,
    'relationshipId', v_relationship.id
  );
end;
$$;

create or replace function public.revoke_guardian_relationship(p_relationship_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relationship public.student_guardians%rowtype;
begin
  select * into v_relationship
  from public.student_guardians
  where id = p_relationship_id
  for update;
  if not found or not public.teacher_can_manage_guardians(v_relationship.student_id) then
    return false;
  end if;
  if v_relationship.status <> 'active' then
    return false;
  end if;
  update public.student_guardians
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = auth.uid(),
      updated_at = now()
  where id = p_relationship_id;
  insert into public.guardian_audit_log (
    actor_user_id, student_id, guardian_user_id, action, metadata
  ) values (
    auth.uid(),
    v_relationship.student_id,
    v_relationship.guardian_user_id,
    'relationship_revoked',
    jsonb_build_object('relationshipId', p_relationship_id)
  );
  return true;
end;
$$;

create or replace function public.parent_linked_students()
returns table (
  student_id uuid,
  display_name text,
  learning_band text,
  class_id uuid,
  class_title text,
  enrolled_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.user_id,
    sp.display_name,
    sp.learning_band,
    current_class.class_id,
    current_class.class_title,
    current_class.enrolled_at
  from public.student_guardians sg
  join public.student_profiles sp on sp.user_id = sg.student_id
  left join lateral (
    select tc.id as class_id, tc.title as class_title, ce.enrolled_at
    from public.class_enrollments ce
    join public.teacher_classes tc on tc.id = ce.class_id
    where ce.student_id = sg.student_id
      and tc.archived_at is null
    order by ce.enrolled_at desc, tc.created_at desc
    limit 1
  ) current_class on true
  where sg.guardian_user_id = auth.uid()
    and sg.status = 'active'
  order by sp.display_name, sp.user_id;
$$;

alter table public.parent_profiles enable row level security;
alter table public.guardian_invitations enable row level security;
alter table public.guardian_invitation_tokens enable row level security;
alter table public.student_guardians enable row level security;
alter table public.guardian_audit_log enable row level security;

create policy parent_profiles_select_own
  on public.parent_profiles for select to authenticated
  using (user_id = auth.uid());

create policy parent_profiles_insert_own
  on public.parent_profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy parent_profiles_update_own
  on public.parent_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy guardian_invitations_teacher_select
  on public.guardian_invitations for select to authenticated
  using (public.teacher_can_manage_guardians(student_id));

create policy student_guardians_teacher_select
  on public.student_guardians for select to authenticated
  using (public.teacher_can_manage_guardians(student_id));

create policy guardian_audit_log_teacher_select
  on public.guardian_audit_log for select to authenticated
  using (
    student_id is not null
    and public.teacher_can_manage_guardians(student_id)
  );

grant select, insert, update on public.parent_profiles to authenticated;
grant select on public.guardian_invitations to authenticated;
grant select on public.student_guardians to authenticated;
grant select on public.guardian_audit_log to authenticated;

revoke all on public.guardian_invitation_tokens from public, anon, authenticated;

revoke execute on function public.create_guardian_invitation(uuid, text, text, text, timestamptz)
  from public, anon;
revoke execute on function public.set_guardian_invitation_email_status(uuid, text)
  from public, anon;
revoke execute on function public.cancel_guardian_invitation(uuid) from public, anon;
revoke execute on function public.guardian_invitation_preview(text) from public, anon;
revoke execute on function public.accept_guardian_invitation(text) from public, anon;
revoke execute on function public.revoke_guardian_relationship(uuid) from public, anon;
revoke execute on function public.parent_linked_students() from public, anon;

grant execute on function public.normalize_guardian_email(text) to authenticated;
grant execute on function public.teacher_can_manage_guardians(uuid) to authenticated;
grant execute on function public.is_active_guardian(uuid) to authenticated;
grant execute on function public.create_guardian_invitation(uuid, text, text, text, timestamptz)
  to authenticated;
grant execute on function public.set_guardian_invitation_email_status(uuid, text)
  to authenticated;
grant execute on function public.cancel_guardian_invitation(uuid) to authenticated;
grant execute on function public.guardian_invitation_preview(text) to authenticated;
grant execute on function public.accept_guardian_invitation(text) to authenticated;
grant execute on function public.revoke_guardian_relationship(uuid) to authenticated;
grant execute on function public.parent_linked_students() to authenticated;
