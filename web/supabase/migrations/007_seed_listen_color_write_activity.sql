-- Seed one listen_color_write interaction in Grade 3 Lesson 1 for QA/demo.
-- Safe to re-run: only inserts when the subtype is not already present in that lesson.

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
    'subtype', 'listen_color_write',
    'image_url', 'https://placehold.co/800x450/e2e8f0/334155?text=Listen+Color+Write',
    'body_text', 'Listen and mark each target with a color or a word.',
    'prompt_audio_url', 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
    'allow_replay', true,
    'allow_overwrite', true,
    'require_all_targets', true,
    'shuffle_text_options', false,
    'palette', jsonb_build_array(
      jsonb_build_object('id', 'red', 'label', 'Red', 'color_hex', '#ef4444'),
      jsonb_build_object('id', 'blue', 'label', 'Blue', 'color_hex', '#3b82f6'),
      jsonb_build_object('id', 'green', 'label', 'Green', 'color_hex', '#22c55e')
    ),
    'text_options', jsonb_build_array(
      jsonb_build_object('id', 'cat', 'label', 'cat'),
      jsonb_build_object('id', 'dog', 'label', 'dog'),
      jsonb_build_object('id', 'sun', 'label', 'sun')
    ),
    'targets', jsonb_build_array(
      jsonb_build_object(
        'id', 'lcw_t1',
        'x_percent', 12,
        'y_percent', 22,
        'w_percent', 20,
        'h_percent', 22,
        'label', 'Color this target red',
        'expected_mode', 'color',
        'expected_value', 'red'
      ),
      jsonb_build_object(
        'id', 'lcw_t2',
        'x_percent', 42,
        'y_percent', 30,
        'w_percent', 20,
        'h_percent', 22,
        'label', 'Write cat here',
        'expected_mode', 'text',
        'expected_value', 'cat'
      ),
      jsonb_build_object(
        'id', 'lcw_t3',
        'x_percent', 70,
        'y_percent', 24,
        'w_percent', 18,
        'h_percent', 20,
        'label', 'Write dog here',
        'expected_mode', 'text',
        'expected_value', 'dog'
      )
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1
    from public.lesson_screens ls2
    where ls2.lesson_id = l.id
      and ls2.screen_type = 'interaction'
      and ls2.payload ->> 'subtype' = 'listen_color_write'
  );
