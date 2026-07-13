-- Snapshot metadata for live-game challenges (question set version + bank).

alter table public.live_game_challenges
  add column if not exists question_set_id uuid
    references public.live_game_question_sets (id) on delete set null,
  add column if not exists question_set_version int
    check (question_set_version is null or question_set_version >= 1),
  add column if not exists question_bank text
    check (question_bank is null or question_bank in ('harvest', 'deposit', 'craft'));

create index if not exists live_game_challenges_question_set_idx
  on public.live_game_challenges (question_set_id, question_bank)
  where question_set_id is not null;
