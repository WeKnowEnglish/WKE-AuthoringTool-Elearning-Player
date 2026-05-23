-- Seed one explore interaction in Welcome / our-first-story for QA/demo.
-- Safe to re-run: only inserts when explore is not already present in that lesson.

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((
    select max(ls.order_index) + 1
    from public.lesson_screens ls
    where ls.lesson_id = l.id
  ), 0) as order_index,
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'explore',
    'background_url', 'https://placehold.co/1200x400/87ceeb/1e3a5f?text=Explore+World',
    'world_length', 3200,
    'scroll_speed_px_per_sec', 140,
    'gates', jsonb_build_array(
      jsonb_build_object(
        'id', 'gate_1',
        'time_limit_sec', 10,
        'prompt', 'Spell the word before you hit the obstacle!',
        'target_word', 'run',
        'image_url', 'https://placehold.co/400x300/e2e8f0/334155?text=run'
      ),
      jsonb_build_object(
        'id', 'gate_2',
        'time_limit_sec', 10,
        'prompt', 'Spell the word before you hit the obstacle!',
        'target_word', 'jump',
        'image_url', 'https://placehold.co/400x300/e2e8f0/334155?text=jump'
      ),
      jsonb_build_object(
        'id', 'gate_3',
        'time_limit_sec', 10,
        'prompt', 'Spell the word before you hit the obstacle!',
        'target_word', 'fast',
        'image_url', 'https://placehold.co/400x300/e2e8f0/334155?text=fast'
      )
    ),
    'encounter', jsonb_build_object(
      'title', 'A strange place',
      'body_text', 'You found a hidden spot. Pick a reward!',
      'image_url', 'https://placehold.co/600x360/fef3c7/92400e?text=Strange+Place',
      'choices', jsonb_build_array(
        jsonb_build_object('id', 'c1', 'label', 'Small treasure', 'gold_bonus', 5),
        jsonb_build_object('id', 'c2', 'label', 'Lucky chest', 'gold_bonus', 10),
        jsonb_build_object('id', 'c3', 'label', 'Golden surprise', 'gold_bonus', 15)
      )
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'welcome'
  and l.slug = 'our-first-story'
  and not exists (
    select 1
    from public.lesson_screens ls2
    where ls2.lesson_id = l.id
      and ls2.screen_type = 'interaction'
      and ls2.payload ->> 'subtype' = 'explore'
  );
