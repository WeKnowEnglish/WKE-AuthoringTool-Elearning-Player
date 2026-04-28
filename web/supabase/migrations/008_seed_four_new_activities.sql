-- Seed sample screens for four new interaction subtypes.
-- Inserts only when each subtype is missing from the target lesson.

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((select max(ls.order_index) + 1 from public.lesson_screens ls where ls.lesson_id = l.id), 0),
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'letter_mixup',
    'prompt', 'Reorder the letters to make the word.',
    'shuffle_letters', true,
    'case_sensitive', false,
    'items', jsonb_build_array(
      jsonb_build_object('id', 'lm1', 'target_word', 'school', 'accepted_words', jsonb_build_array('School')),
      jsonb_build_object('id', 'lm2', 'target_word', 'teacher', 'accepted_words', jsonb_build_array('Teacher'))
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1 from public.lesson_screens s
    where s.lesson_id = l.id and s.payload ->> 'subtype' = 'letter_mixup'
  );

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((select max(ls.order_index) + 1 from public.lesson_screens ls where ls.lesson_id = l.id), 0),
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'word_shape_hunt',
    'prompt', 'Tap all vocabulary words.',
    'shape_layout', 'wave',
    'shuffle_chunks', false,
    'word_chunks', jsonb_build_array(
      jsonb_build_object('id', 'w1', 'text', 'apple', 'is_vocab', true),
      jsonb_build_object('id', 'w2', 'text', 'window', 'is_vocab', false),
      jsonb_build_object('id', 'w3', 'text', 'banana', 'is_vocab', true),
      jsonb_build_object('id', 'w4', 'text', 'table', 'is_vocab', false)
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1 from public.lesson_screens s
    where s.lesson_id = l.id and s.payload ->> 'subtype' = 'word_shape_hunt'
  );

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((select max(ls.order_index) + 1 from public.lesson_screens ls where ls.lesson_id = l.id), 0),
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'table_complete',
    'prompt', 'Complete the table.',
    'left_column_label', 'Word',
    'right_column_label', 'Meaning',
    'input_mode', 'tokens',
    'rows', jsonb_build_array(
      jsonb_build_object('id', 'r1', 'prompt_text', 'doctor', 'expected_token_id', 'tok1'),
      jsonb_build_object('id', 'r2', 'prompt_text', 'pilot', 'expected_token_id', 'tok2')
    ),
    'token_bank', jsonb_build_array(
      jsonb_build_object('id', 'tok1', 'label', 'helps sick people'),
      jsonb_build_object('id', 'tok2', 'label', 'flies a plane')
    ),
    'case_insensitive', true,
    'normalize_whitespace', true
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1 from public.lesson_screens s
    where s.lesson_id = l.id and s.payload ->> 'subtype' = 'table_complete'
  );

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select
  l.id,
  coalesce((select max(ls.order_index) + 1 from public.lesson_screens ls where ls.lesson_id = l.id), 0),
  'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'sorting_game',
    'prompt', 'Sort each object into the correct container.',
    'shuffle_objects', true,
    'allow_reassign', true,
    'containers', jsonb_build_array(
      jsonb_build_object('id', 'c1', 'display', jsonb_build_object('text', 'Animals')),
      jsonb_build_object('id', 'c2', 'display', jsonb_build_object('text', 'Food'))
    ),
    'objects', jsonb_build_array(
      jsonb_build_object('id', 'o1', 'display', jsonb_build_object('text', 'cat'), 'target_container_id', 'c1'),
      jsonb_build_object('id', 'o2', 'display', jsonb_build_object('text', 'dog'), 'target_container_id', 'c1'),
      jsonb_build_object('id', 'o3', 'display', jsonb_build_object('text', 'apple'), 'target_container_id', 'c2'),
      jsonb_build_object('id', 'o4', 'display', jsonb_build_object('text', 'bread'), 'target_container_id', 'c2')
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school'
  and l.slug = 'lesson-1-hello'
  and not exists (
    select 1 from public.lesson_screens s
    where s.lesson_id = l.id and s.payload ->> 'subtype' = 'sorting_game'
  );
