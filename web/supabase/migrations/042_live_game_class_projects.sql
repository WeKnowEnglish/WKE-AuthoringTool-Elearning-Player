-- Link disposable Live Game rounds to the existing teacher/class system and
-- preserve one generic project contribution per completed class-owned round.

alter table public.live_game_report_rounds
  add column class_id uuid references public.teacher_classes (id) on delete set null,
  add column class_title text;

create index live_game_report_rounds_class_ended_idx
  on public.live_game_report_rounds (class_id, ended_at desc)
  where class_id is not null;

create table public.live_game_class_projects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  mode_id text not null,
  project_key text not null,
  title text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (class_id, mode_id, project_key)
);

create index live_game_class_projects_teacher_updated_idx
  on public.live_game_class_projects (teacher_id, updated_at desc);

create table public.live_game_project_contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.live_game_class_projects (id) on delete cascade,
  report_round_id uuid not null unique references public.live_game_report_rounds (id) on delete cascade,
  contribution jsonb not null default '{}'::jsonb,
  contributed_at timestamptz not null default now()
);

create index live_game_project_contributions_project_time_idx
  on public.live_game_project_contributions (project_id, contributed_at desc);

alter table public.live_game_class_projects enable row level security;
alter table public.live_game_project_contributions enable row level security;

create policy live_game_report_rounds_teacher_select
  on public.live_game_report_rounds for select
  to authenticated
  using (host_user_id = auth.uid() and public.is_teacher());

create policy live_game_class_projects_teacher_select
  on public.live_game_class_projects for select
  to authenticated
  using (teacher_id = auth.uid() and public.is_teacher());

create policy live_game_project_contributions_teacher_select
  on public.live_game_project_contributions for select
  to authenticated
  using (
    exists (
      select 1
      from public.live_game_class_projects project
      where project.id = project_id
        and project.teacher_id = auth.uid()
    )
    and public.is_teacher()
  );

grant select on public.live_game_report_rounds to authenticated;
grant select on public.live_game_class_projects to authenticated;
grant select on public.live_game_project_contributions to authenticated;

create or replace function public.record_live_game_class_project_contribution(p_round_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.live_game_report_rounds%rowtype;
  v_class public.teacher_classes%rowtype;
  v_project public.live_game_class_projects%rowtype;
  v_contribution_id uuid;
  v_rounds_played integer;
  v_team_escapes integer;
begin
  select * into v_round
  from public.live_game_report_rounds
  where id = p_round_id
    and status = 'completed';

  if not found or v_round.class_id is null or v_round.host_user_id is null then
    return null;
  end if;

  select * into v_class
  from public.teacher_classes
  where id = v_round.class_id
    and teacher_id = v_round.host_user_id;

  if not found then
    raise exception 'Live Game class ownership mismatch';
  end if;

  insert into public.live_game_class_projects (
    class_id, teacher_id, mode_id, project_key, title
  ) values (
    v_class.id,
    v_class.teacher_id,
    v_round.mode_id,
    'expeditions-v1',
    case when v_round.mode_id = 'english_craft' then 'English Craft Expeditions' else 'Live Learning Project' end
  )
  on conflict (class_id, mode_id, project_key)
  do update set updated_at = now()
  returning * into v_project;

  insert into public.live_game_project_contributions (
    project_id, report_round_id, contribution, contributed_at
  ) values (
    v_project.id,
    v_round.id,
    jsonb_build_object(
      'endReason', v_round.end_reason,
      'questionSetTitle', v_round.question_set_title,
      'learningObjective', v_round.learning_objective,
      'summary', v_round.summary
    ),
    coalesce(v_round.ended_at, now())
  )
  on conflict (report_round_id) do nothing
  returning id into v_contribution_id;

  if v_contribution_id is null then
    return v_project.id;
  end if;

  select * into v_project
  from public.live_game_class_projects
  where id = v_project.id
  for update;

  v_rounds_played := coalesce((v_project.progress ->> 'roundsPlayed')::integer, 0) + 1;
  v_team_escapes := coalesce((v_project.progress ->> 'teamEscapes')::integer, 0)
    + case when v_round.end_reason = 'objective_completed' then 1 else 0 end;

  update public.live_game_class_projects
  set progress = progress || jsonb_build_object(
        'roundsPlayed', v_rounds_played,
        'teamEscapes', v_team_escapes,
        'lastPlayedAt', coalesce(v_round.ended_at, now()),
        'lastLearningObjective', v_round.learning_objective
      ),
      updated_at = now()
  where id = v_project.id;

  return v_project.id;
end;
$$;

revoke all on function public.record_live_game_class_project_contribution(uuid)
  from public, anon, authenticated;
grant execute on function public.record_live_game_class_project_contribution(uuid)
  to service_role;
