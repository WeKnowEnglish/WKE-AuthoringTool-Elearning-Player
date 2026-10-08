-- Durable email outbox; browser access remains revoked by migration 153.
alter table public.teacher_access_requests
  add column duplicate_of uuid references public.teacher_access_requests(id);
with ranked as (
  select id, first_value(id) over (partition by lower(email) order by created_at, id) as canonical
  from public.teacher_access_requests where status = 'pending'
)
update public.teacher_access_requests r set duplicate_of = ranked.canonical
from ranked where r.id = ranked.id and ranked.id <> ranked.canonical;
create index teacher_access_duplicate_idx on public.teacher_access_requests(duplicate_of);

alter table public.admin_email_sends
  alter column sent_by drop not null,
  drop constraint admin_email_sends_status_check,
  add column access_request_id uuid references public.teacher_access_requests(id),
  add column purpose text not null default 'admin_email',
  add column source_id uuid,
  add column dedupe_key text unique,
  add column context jsonb not null default '{}'::jsonb,
  add column payload jsonb,
  add column attempts integer not null default 0,
  add column next_attempt_at timestamptz not null default now(),
  add column first_attempt_at timestamptz,
  add column lease_token uuid,
  add column lease_until timestamptz,
  add column uncertain boolean not null default false,
  add column superseded_by uuid references public.admin_email_sends(id),
  add constraint admin_email_sends_status_check
    check (status in ('pending','sending','sent','delivered','failed','bounced','complained','cancelled'));
create index admin_email_outbox_due_idx on public.admin_email_sends(next_attempt_at, created_at)
  where status in ('pending','sending');
create index admin_email_request_idx on public.admin_email_sends(access_request_id,created_at desc);
create index admin_email_superseded_idx on public.admin_email_sends(superseded_by);
create unique index admin_email_provider_id_idx on public.admin_email_sends(provider_message_id)
  where provider_message_id is not null;

create function public.sync_queued_email_status() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.context->>'retryOf' is not null then
    update public.admin_email_sends set superseded_by=new.id
      where id=(new.context->>'retryOf')::uuid and status='failed' and not uncertain and provider_message_id is null;
  end if;
  if new.purpose='request_admin' then
    update public.teacher_access_requests set notification_status='pending' where id=new.access_request_id;
  elsif new.purpose='teacher_welcome' then
    update public.teacher_access_requests set welcome_email_status='pending' where id=new.access_request_id;
    update public.admin_email_sends set superseded_by=new.id where id<>new.id and status='failed'
      and purpose='teacher_welcome' and access_request_id=new.access_request_id;
  end if;
  return new;
end; $$;
create trigger admin_email_queued_status after insert on public.admin_email_sends
  for each row execute function public.sync_queued_email_status();
revoke all on function public.sync_queued_email_status() from public,anon,authenticated;

create table public.email_delivery_events (
  id text primary key,
  provider_message_id text not null,
  status text not null check (status in ('sent','delivered','failed','bounced','complained')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index email_delivery_events_provider_idx on public.email_delivery_events(provider_message_id);
alter table public.email_delivery_events enable row level security;
revoke all on public.email_delivery_events from anon, authenticated;
grant all on public.email_delivery_events to service_role;

create function public.queue_teacher_request_emails() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_email_sends(recipient_email,subject,body_text,purpose,access_request_id,dedupe_key,context)
  values ('administrator', 'Teacher access request: ' || new.full_name, 'Preparing administrator alert',
    'request_admin',new.id,'request-admin/' || new.id,
    jsonb_build_object('fullName',new.full_name,'email',new.email,'school',new.school,'reason',new.reason));
  insert into public.admin_email_sends(recipient_email,recipient_name,subject,body_text,purpose,access_request_id,dedupe_key,context)
  values (new.email,new.full_name,'We received your teacher access request','Preparing request receipt',
    'request_receipt',new.id,'request-receipt/' || new.id,jsonb_build_object('fullName',new.full_name));
  return new;
end; $$;
create trigger teacher_request_email_jobs after insert on public.teacher_access_requests
  for each row execute function public.queue_teacher_request_emails();

-- Serialize submissions by normalized address without changing another person's saved application.
create function public.submit_teacher_access_request(
  p_full_name text, p_email text, p_school text, p_reason text, p_attribution jsonb default '{}'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)),0));
  select id into v_id from public.teacher_access_requests
    where lower(email) = lower(trim(p_email)) and status = 'pending' and duplicate_of is null
    order by created_at,id limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.teacher_access_requests(full_name,email,school,reason,landing_path,referrer_host,utm_source,utm_medium,utm_campaign)
  values (p_full_name,lower(trim(p_email)),p_school,p_reason,
    p_attribution->>'landing_path',p_attribution->>'referrer_host',p_attribution->>'utm_source',
    p_attribution->>'utm_medium',p_attribution->>'utm_campaign') returning id into v_id;
  return v_id;
end; $$;

create function public.claim_admin_email_send(p_id uuid default null)
returns setof public.admin_email_sends language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  -- Never retry an ambiguous send outside the provider's 24-hour idempotency window.
  update public.admin_email_sends set status='failed',uncertain=true,lease_token=null,lease_until=null,
    failure_reason='Delivery outcome needs checking in Resend before another send.'
    where status in ('pending','sending') and first_attempt_at < now()-interval '23 hours';
  select id into v_id from public.admin_email_sends
    where (p_id is null or id=p_id) and
      ((status='pending' and next_attempt_at <= now()) or (status='sending' and lease_until < now()))
    order by created_at for update skip locked limit 1;
  if v_id is null then return; end if;
  return query update public.admin_email_sends set status='sending',attempts=attempts+1,
    uncertain=uncertain or status='sending',
    lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',
    first_attempt_at=coalesce(first_attempt_at,now()) where id=v_id returning *;
end; $$;

create function public.email_delivery_rank(p_status text) returns integer
language sql immutable as $$ select case p_status when 'complained' then 5 when 'bounced' then 4
  when 'failed' then 3 when 'delivered' then 2 when 'sent' then 1 else 0 end $$;

create function public.finish_admin_email_send(p_id uuid,p_token uuid,p_result jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_row public.admin_email_sends; v_status text; v_provider text; v_event text;
begin
  v_provider:=p_result->>'providerMessageId';
  if v_provider is not null then perform pg_advisory_xact_lock(hashtextextended(v_provider,0)); end if;
  select * into v_row from public.admin_email_sends where id=p_id and lease_token=p_token for update;
  if not found then return false; end if;
  v_status:=p_result->>'status';
  if v_provider is not null then
    select status into v_event from public.email_delivery_events where provider_message_id=v_provider
      order by public.email_delivery_rank(status) desc limit 1;
    if public.email_delivery_rank(v_event)>public.email_delivery_rank(v_status) then v_status:=v_event; end if;
  end if;
  update public.admin_email_sends set status=v_status,provider_message_id=coalesce(v_provider,provider_message_id),
    failure_reason=left(p_result->>'error',1000),uncertain=coalesce((p_result->>'uncertain')::boolean,false),
    sent_at=case when v_provider is not null then now() else sent_at end,
    next_attempt_at=coalesce((p_result->>'nextAttemptAt')::timestamptz,next_attempt_at),lease_token=null,lease_until=null
    where id=p_id;
  if v_row.purpose='request_admin' then
    update public.teacher_access_requests set notification_status=case
      when v_status in ('sent','delivered') then 'sent' when v_status='pending' then 'pending' else 'failed' end,
      notified_at=case when v_status in ('sent','delivered') then now() else null end where id=v_row.access_request_id;
  elsif v_row.purpose='teacher_welcome' then
    update public.teacher_access_requests set welcome_email_status=case
      when v_status in ('sent','delivered') then 'sent' when v_status='pending' then 'pending' else 'failed' end,
      welcome_emailed_at=case when v_status in ('sent','delivered') then now() else null end where id=v_row.access_request_id;
  elsif v_row.purpose='parent_notification' then
    update public.parent_notifications set email_status=case
      when v_status in ('sent','delivered') then 'sent' when v_status='cancelled' then 'disabled'
      when v_status='pending' then 'pending' else 'failed' end where id=v_row.source_id;
  end if;
  return true;
end; $$;

create function public.queue_parent_notification_email() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.email_status='pending' then
    insert into public.admin_email_sends(recipient_email,subject,body_text,purpose,source_id,dedupe_key,context)
    values('parent recipient','We Know English parent portal update','Preparing parent notification',
      'parent_notification',new.id,'parent-notification/' || new.id,
      jsonb_build_object('userId',new.guardian_user_id,'notificationType',new.notification_type));
  end if;
  return new;
end; $$;
create trigger parent_notification_email_jobs after insert on public.parent_notifications
  for each row execute function public.queue_parent_notification_email();

create function public.queue_unread_teacher_emails() returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.admin_email_sends(recipient_email,subject,body_text,purpose,source_id,dedupe_key,context)
  select u.email,'You have unread We Know English teacher messages','Preparing unread message notification',
    'teacher_message',m.conversation_id,
    'teacher-unread/' || m.user_id || '/' || m.conversation_id || '/' || floor(extract(epoch from now())/1800),
    jsonb_build_object('userId',m.user_id,'conversationId',m.conversation_id,'messageAt',c.last_message_at)
  from public.teacher_conversation_members m
  join public.teacher_profiles p on p.user_id=m.user_id
  join auth.users u on u.id=m.user_id
  join public.teacher_conversations c on c.id=m.conversation_id
  where p.message_email_notifications and m.archived_at is null and u.email is not null
    and (u.raw_app_meta_data->>'role'='teacher' or lower(coalesce(u.raw_app_meta_data->>'admin','')) in ('true','1'))
    and exists(select 1 from public.teacher_messages msg where msg.conversation_id=m.conversation_id
      and msg.sender_id<>m.user_id and msg.created_at>coalesce(m.last_read_at,'epoch'::timestamptz))
    -- One notification per unread episode; a new message after the last queued notice can create another.
    and not exists(select 1 from public.admin_email_sends prev where prev.purpose='teacher_message'
      and prev.context->>'userId'=m.user_id::text and prev.source_id=m.conversation_id
      and prev.created_at>=c.last_message_at and prev.status<>'cancelled')
  limit 50 on conflict(dedupe_key) do nothing;
end; $$;

create function public.record_email_delivery_event(p_id text,p_provider_id text,p_status text,p_occurred_at timestamptz)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_provider_id,0));
  insert into public.email_delivery_events(id,provider_message_id,status,occurred_at)
    values(p_id,p_provider_id,p_status,p_occurred_at) on conflict(id) do nothing;
  update public.admin_email_sends set status=p_status,
    failure_reason=case when p_status in ('failed','bounced','complained') then 'Provider reported ' || p_status else failure_reason end
    where provider_message_id=p_provider_id and public.email_delivery_rank(p_status)>public.email_delivery_rank(status);
  update public.teacher_access_requests r set notification_status='failed'
    from public.admin_email_sends s where s.access_request_id=r.id and s.provider_message_id=p_provider_id
      and s.purpose='request_admin' and s.status in ('failed','bounced','complained');
  update public.teacher_access_requests r set welcome_email_status='failed'
    from public.admin_email_sends s where s.access_request_id=r.id and s.provider_message_id=p_provider_id
      and s.purpose='teacher_welcome' and s.status in ('failed','bounced','complained');
  update public.parent_notifications n set email_status='failed'
    from public.admin_email_sends s where s.source_id=n.id and s.provider_message_id=p_provider_id
      and s.purpose='parent_notification' and s.status in ('failed','bounced','complained');
end; $$;

-- Legacy failures remain visible; queue one administrator alert per unresolved canonical request.
-- Do not send historical applicant receipts or change request decisions during migration.
insert into public.admin_email_sends(recipient_email,subject,body_text,purpose,access_request_id,dedupe_key,context)
select 'administrator','Teacher access request: ' || full_name,'Preparing administrator alert','request_admin',id,
  'request-admin/' || id,jsonb_build_object('fullName',full_name,'email',email,'school',school,'reason',reason)
from public.teacher_access_requests where status='pending' and duplicate_of is null and notification_status<>'sent';

-- Member-scoped unread summary, no message bodies or email addresses exposed.
create function public.teacher_unread_conversation_count() returns bigint
language sql stable security definer set search_path=public as $$
  select count(*) from public.teacher_conversation_members m
  where m.user_id=auth.uid() and m.archived_at is null and public.is_teacher_communication_user()
    and exists(select 1 from public.teacher_messages msg where msg.conversation_id=m.conversation_id
      and msg.sender_id<>auth.uid() and msg.created_at>coalesce(m.last_read_at,'epoch'::timestamptz))
$$;

revoke all on function public.queue_teacher_request_emails() from public,anon,authenticated;
revoke all on function public.submit_teacher_access_request(text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.claim_admin_email_send(uuid) from public,anon,authenticated;
revoke all on function public.finish_admin_email_send(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.record_email_delivery_event(text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.teacher_unread_conversation_count() from public,anon;
grant execute on function public.submit_teacher_access_request(text,text,text,text,jsonb) to service_role;
grant execute on function public.claim_admin_email_send(uuid) to service_role;
grant execute on function public.finish_admin_email_send(uuid,uuid,jsonb) to service_role;
grant execute on function public.record_email_delivery_event(text,text,text,timestamptz) to service_role;
grant execute on function public.teacher_unread_conversation_count() to authenticated;
revoke all on function public.queue_parent_notification_email() from public,anon,authenticated;
revoke all on function public.queue_unread_teacher_emails() from public,anon,authenticated;
grant execute on function public.queue_unread_teacher_emails() to service_role;
