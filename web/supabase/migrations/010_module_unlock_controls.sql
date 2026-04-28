-- Teacher-controlled module unlock behavior.
alter table public.modules
  add column if not exists unlock_strategy text not null default 'sequential',
  add column if not exists manual_unlocked boolean not null default false;

alter table public.modules
  drop constraint if exists modules_unlock_strategy_check;

alter table public.modules
  add constraint modules_unlock_strategy_check
  check (unlock_strategy in ('sequential', 'always_open', 'manual'));

create index if not exists modules_course_unlock_strategy_idx
  on public.modules (course_id, unlock_strategy);
