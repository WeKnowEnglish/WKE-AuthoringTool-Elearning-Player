-- Private-information live activity foundation.
-- Student clients never query these tables directly. Next.js routes authorize the signed
-- Virtual Classroom cookie, then return one student's server-side projection.

create table if not exists public.secret_role_rounds (
  id text primary key,
  session_id text not null references public.class_sessions (id) on delete cascade,
  created_by text not null,
  title text not null,
  scenario text not null default '',
  learning_objective text not null default '',
  success_criteria text not null default '',
  discussion_prompt text not null default '',
  phase text not null default 'briefing'
    check (phase in ('briefing', 'discussion', 'decision', 'reveal', 'debrief', 'completed')),
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opened_at timestamptz,
  revealed_at timestamptz,
  completed_at timestamptz
);

create index if not exists secret_role_rounds_session_idx
  on public.secret_role_rounds (session_id, created_at desc);

create index if not exists secret_role_rounds_host_idx
  on public.secret_role_rounds (created_by, created_at desc);

create table if not exists public.secret_role_cards (
  id text primary key,
  round_id text not null references public.secret_role_rounds (id) on delete cascade,
  title text not null,
  private_information text not null,
  mission text not null,
  sentence_frames_json jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (round_id, id)
);

create index if not exists secret_role_cards_round_idx
  on public.secret_role_cards (round_id, position, id);

create table if not exists public.secret_role_assignments (
  round_id text not null references public.secret_role_rounds (id) on delete cascade,
  student_id text not null,
  display_name text not null,
  card_id text not null,
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (round_id, student_id),
  foreign key (round_id, card_id)
    references public.secret_role_cards (round_id, id) on delete cascade
);

create index if not exists secret_role_assignments_card_idx
  on public.secret_role_assignments (card_id);

create table if not exists public.secret_role_responses (
  round_id text not null references public.secret_role_rounds (id) on delete cascade,
  student_id text not null,
  answer text not null default '',
  reasoning text not null default '',
  submitted_at timestamptz not null default now(),
  primary key (round_id, student_id)
);

alter table public.secret_role_rounds enable row level security;
alter table public.secret_role_cards enable row level security;
alter table public.secret_role_assignments enable row level security;
alter table public.secret_role_responses enable row level security;

revoke all on public.secret_role_rounds from public, anon, authenticated;
revoke all on public.secret_role_cards from public, anon, authenticated;
revoke all on public.secret_role_assignments from public, anon, authenticated;
revoke all on public.secret_role_responses from public, anon, authenticated;

grant all on public.secret_role_rounds to service_role;
grant all on public.secret_role_cards to service_role;
grant all on public.secret_role_assignments to service_role;
grant all on public.secret_role_responses to service_role;

-- Round, cards, and assignments must appear atomically. If any insert fails, PostgreSQL rolls the
-- function call back so no student can enter a partially assigned activity.
create or replace function public.create_secret_role_round(
  p_round jsonb,
  p_cards jsonb,
  p_assignments jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_round_id text := nullif(trim(p_round->>'id'), '');
begin
  if v_round_id is null then
    raise exception 'Round id is required';
  end if;

  insert into public.secret_role_rounds (
    id,
    session_id,
    created_by,
    title,
    scenario,
    learning_objective,
    success_criteria,
    discussion_prompt,
    phase,
    settings_json
  ) values (
    v_round_id,
    p_round->>'sessionId',
    p_round->>'createdBy',
    p_round->>'title',
    coalesce(p_round->>'scenario', ''),
    coalesce(p_round->>'learningObjective', ''),
    coalesce(p_round->>'successCriteria', ''),
    coalesce(p_round->>'discussionPrompt', ''),
    'briefing',
    coalesce(p_round->'settings', '{}'::jsonb)
  );

  insert into public.secret_role_cards (
    id,
    round_id,
    title,
    private_information,
    mission,
    sentence_frames_json,
    position
  )
  select
    card.id,
    v_round_id,
    card.title,
    card.private_information,
    card.mission,
    coalesce(card.sentence_frames, '[]'::jsonb),
    card.position
  from jsonb_to_recordset(p_cards) as card(
    id text,
    title text,
    private_information text,
    mission text,
    sentence_frames jsonb,
    position integer
  );

  insert into public.secret_role_assignments (
    round_id,
    student_id,
    display_name,
    card_id
  )
  select
    v_round_id,
    assignment.student_id,
    assignment.display_name,
    assignment.card_id
  from jsonb_to_recordset(p_assignments) as assignment(
    student_id text,
    display_name text,
    card_id text
  );

  return v_round_id;
end;
$$;

revoke all on function public.create_secret_role_round(jsonb, jsonb, jsonb) from public;
revoke all on function public.create_secret_role_round(jsonb, jsonb, jsonb) from anon, authenticated;
grant execute on function public.create_secret_role_round(jsonb, jsonb, jsonb) to service_role;
