-- Published question-set summaries with bank counts in one round-trip.
-- Called only from the Next.js host API via service_role (never from browsers).
-- Returns metadata + aggregates only — never prompts, options, or answer payloads.

create or replace function public.list_live_game_published_question_set_summaries()
returns table (
  id uuid,
  slug text,
  title text,
  level text,
  topic text,
  learning_objective text,
  description text,
  version int,
  visibility text,
  sort_order int,
  harvest_count int,
  deposit_count int,
  craft_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.slug,
    s.title,
    s.level,
    s.topic,
    s.learning_objective,
    s.description,
    s.version,
    s.visibility,
    s.sort_order,
    coalesce(count(*) filter (where q.enabled and q.bank = 'harvest'), 0)::int as harvest_count,
    coalesce(count(*) filter (where q.enabled and q.bank = 'deposit'), 0)::int as deposit_count,
    coalesce(count(*) filter (where q.enabled and q.bank = 'craft'), 0)::int as craft_count
  from public.live_game_question_sets s
  left join public.live_game_questions q on q.set_id = s.id
  where s.status = 'published'
  group by
    s.id,
    s.slug,
    s.title,
    s.level,
    s.topic,
    s.learning_objective,
    s.description,
    s.version,
    s.visibility,
    s.sort_order
  order by s.sort_order asc, s.title asc;
$$;

revoke all on function public.list_live_game_published_question_set_summaries()
  from public, anon, authenticated;
grant execute on function public.list_live_game_published_question_set_summaries()
  to service_role;

comment on function public.list_live_game_published_question_set_summaries() is
  'Host-setup summaries: published sets with per-bank enabled question counts. No question content.';
