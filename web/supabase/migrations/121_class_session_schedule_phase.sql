-- Schedule/join loop: occurrence bind + session kind + class phase on class_sessions.

alter table public.class_sessions
  add column if not exists meeting_slot_id uuid
    references public.class_meeting_slots (id) on delete set null,
  add column if not exists occurrence_starts_at timestamptz,
  add column if not exists occurrence_ends_at timestamptz,
  add column if not exists session_kind text not null default 'extra'
    check (session_kind in ('scheduled', 'extra')),
  add column if not exists class_phase text not null default 'live'
    check (class_phase in ('prep', 'waiting', 'live', 'ended'));

comment on column public.class_sessions.meeting_slot_id is
  'Weekly slot this session is bound to (null for extra / one-off).';
comment on column public.class_sessions.occurrence_starts_at is
  'Concrete occurrence start for the bound weekly slot.';
comment on column public.class_sessions.occurrence_ends_at is
  'Concrete occurrence end for the bound weekly slot.';
comment on column public.class_sessions.session_kind is
  'scheduled = bound to a slot occurrence; extra = unscheduled / one-off.';
comment on column public.class_sessions.class_phase is
  'prep = teacher early; waiting = T-15 student lobby; live = class open; ended = closed.';

-- Existing active sessions behave as live extras until rebound.
update public.class_sessions
set
  session_kind = coalesce(session_kind, 'extra'),
  class_phase = case
    when status = 'ended' then 'ended'
    else coalesce(nullif(class_phase, ''), 'live')
  end
where true;

create index if not exists class_sessions_class_occurrence_idx
  on public.class_sessions (class_id, occurrence_starts_at desc)
  where class_id is not null;

create index if not exists class_sessions_class_phase_active_idx
  on public.class_sessions (class_id, class_phase, status)
  where class_id is not null and status = 'active';
