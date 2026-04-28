-- Grade 3 Unit 1 — Lesson 1: start + 3 story screens + mc_quiz + skill tags.
-- Student URL: /learn/g3-hello-school/lesson-1-hello
-- Module order_index 1 unlocks after all lessons in Welcome (order_index 0) are complete.

insert into public.modules (title, slug, order_index, published)
values ('Grade 3: Hello & school', 'g3-hello-school', 1, true);

insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 1: Hello, Grade 3!', 'lesson-1-hello', 0, true, 15
from public.modules
where slug = 'g3-hello-school';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start',
  jsonb_build_object(
    'type', 'start',
    'image_url', 'https://placehold.co/800x520/dcfce7/14532d?text=Grade+3+English',
    'cta_label', 'Let''s start!'
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-1-hello';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story',
  jsonb_build_object(
    'type', 'story',
    'image_url', 'https://placehold.co/800x400/e0f2fe/0c4a6e?text=At+school',
    'body_text', 'Mai and Tom are at school. They are in Grade Three. Today is their first English class. They feel happy.',
    'read_aloud_text', 'Mai and Tom are at school. They are in Grade Three. Today is their first English class. They feel happy.',
    'tts_lang', 'en-US',
    'guide', jsonb_build_object(
      'tip_text', 'Listen for the words school, class, and happy.',
      'image_url', 'https://placehold.co/120x120/ecfeff/155e75?text=Tip'
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-1-hello';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story',
  jsonb_build_object(
    'type', 'story',
    'image_url', 'https://placehold.co/800x400/fef3c7/78350f?text=Hello',
    'body_text', 'Mai says, Hello! Tom says, Hi! Mai says, My name is Mai. Tom says, My name is Tom. They smile.',
    'read_aloud_text', 'Mai says, Hello! Tom says, Hi! Mai says, My name is Mai. Tom says, My name is Tom. They smile.',
    'tts_lang', 'en-US',
    'guide', jsonb_build_object(
      'tip_text', 'Listen for Hello, Hi, and My name is.',
      'image_url', 'https://placehold.co/120x120/fffbeb/92400e?text=Tip'
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-1-hello';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story',
  jsonb_build_object(
    'type', 'story',
    'image_url', 'https://placehold.co/800x400/f3e8ff/5b21b6?text=Classroom',
    'body_text', 'The teacher says, Good morning, class! The students say, Good morning, teacher! The teacher smiles and says, Welcome to English.',
    'read_aloud_text', 'The teacher says, Good morning, class! The students say, Good morning, teacher! The teacher smiles and says, Welcome to English.',
    'tts_lang', 'en-US',
    'guide', jsonb_build_object(
      'tip_text', 'Listen for teacher, class, and Welcome to English.',
      'image_url', 'https://placehold.co/120x120/fae8ff/86198f?text=Tip'
    )
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-1-hello';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction',
  jsonb_build_object(
    'type', 'interaction',
    'subtype', 'mc_quiz',
    'body_text', 'Who is with Mai at school?',
    'question', 'Who is with Mai at school?',
    'options', jsonb_build_array(
      jsonb_build_object('id', 'a', 'label', 'Tom'),
      jsonb_build_object('id', 'b', 'label', 'The teacher'),
      jsonb_build_object('id', 'c', 'label', 'The bus')
    ),
    'correct_option_id', 'a',
    'guide', jsonb_build_object('tip_text', 'Think about the first story. Two students are at school together.')
  )
from public.lessons l
join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-1-hello';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill
from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('vocabulary'), ('listening')) as s(skill)
where m.slug = 'g3-hello-school' and l.slug = 'lesson-1-hello';
