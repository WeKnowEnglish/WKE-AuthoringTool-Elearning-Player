-- Optional public preview of open trial times on a published Classroom Wall.
-- Returns start, duration, and timezone only. Slot ids, notes, and held/booked rows stay private.

alter table public.teacher_spaces
  add column if not exists show_trial_times boolean not null default false;

comment on column public.teacher_spaces.show_trial_times is
  'When true (and the space is published with trials enabled), the public wall lists upcoming open trial times. Booking still requires a parent account.';

create or replace function public.list_public_trial_times(p_handle text)
returns table (
  starts_at timestamptz,
  duration_minutes integer,
  timezone text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.starts_at, s.duration_minutes, s.timezone
  from public.teacher_availability_slots s
  join public.teacher_spaces ts on ts.teacher_id = s.teacher_id
  where ts.handle = lower(trim(coalesce(p_handle, '')))
    and ts.is_published = true
    and ts.trials_enabled = true
    and ts.show_trial_times = true
    and s.status = 'open'
    and s.starts_at > now()
    and s.starts_at < now() + interval '14 days'
  order by s.starts_at
  limit 8;
$$;

revoke all on function public.list_public_trial_times(text) from public;
grant execute on function public.list_public_trial_times(text) to anon, authenticated;
