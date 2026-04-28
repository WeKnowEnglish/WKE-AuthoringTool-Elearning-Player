-- Grade 3 four-module curriculum: rename legacy module slug, add units 2–4, add Unit 1 lessons 2–4.
-- Prerequisite: 001_initial.sql, 002_grants, 003_seed_grade3_lesson1.sql
-- Gating: Welcome (order 0) then modules order 1–4. Example lesson URLs:
--   /learn/g3-hello-school/lesson-1-hello … lesson-4-polite
--   /learn/g3-numbers-colors/lesson-1-count … lesson-3-how-many
--   /learn/g3-my-day/lesson-1-morning-night … lesson-3-after-school
--   /learn/g3-my-family/lesson-1-meet-family … lesson-4-celebration
-- If an older DB still has slug 'grade-3' from before 003 was updated, normalize it here:
update public.modules
set
  title = 'Grade 3: Hello & school',
  slug = 'g3-hello-school',
  updated_at = now()
where slug = 'grade-3';

-- Units 2–4 (order_index 2, 3, 4)
insert into public.modules (title, slug, order_index, published)
values
  ('Grade 3: Numbers & colors', 'g3-numbers-colors', 2, true),
  ('Grade 3: My day', 'g3-my-day', 3, true),
  ('Grade 3: My family', 'g3-my-family', 4, true);

-- ========== Unit 1: g3-hello-school — lessons 2–4 ==========

insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 2: In our classroom', 'lesson-2-classroom', 1, true, 12
from public.modules where slug = 'g3-hello-school';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/e0f2fe/0c4a6e?text=Our+classroom',
  'cta_label', 'Let''s go!'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-2-classroom';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/f8fafc/334155?text=Classroom',
  'body_text', 'Look at our classroom. We have a big door and bright lights. It is a nice room.',
  'read_aloud_text', 'Look at our classroom. We have a big door and bright lights. It is a nice room.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for classroom and door.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-2-classroom';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/f1f5f9/475569?text=Desk+and+chair',
  'body_text', 'This is a desk. This is a chair. Mai sits at a desk. Tom sits at a desk too.',
  'read_aloud_text', 'This is a desk. This is a chair. Mai sits at a desk. Tom sits at a desk too.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for desk and chair.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-2-classroom';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fff7ed/9a3412?text=Books',
  'body_text', 'Mai has a red book. Tom has a blue bag. The teacher has a white board.',
  'read_aloud_text', 'Mai has a red book. Tom has a blue bag. The teacher has a white board.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for book and bag.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-2-classroom';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'What does Mai have?',
  'question', 'What does Mai have?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'A book'),
    jsonb_build_object('id', 'b', 'label', 'A bag'),
    jsonb_build_object('id', 'c', 'label', 'A chair')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the third story. Mai has something red.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-2-classroom';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('vocabulary'), ('listening')) as s(skill)
where m.slug = 'g3-hello-school' and l.slug = 'lesson-2-classroom';

-- Lesson 3: My friends
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 3: My friends', 'lesson-3-friends', 2, true, 12
from public.modules where slug = 'g3-hello-school';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/fecdd3/9f1239?text=Friends',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-3-friends';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fce7f3/9d174d?text=Same+class',
  'body_text', 'Mai and Tom are in the same class. They like English class. They sit together.',
  'read_aloud_text', 'Mai and Tom are in the same class. They like English class. They sit together.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for class and together.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-3-friends';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/e9d5ff/6b21a8?text=Nice+friend',
  'body_text', 'Mai says Tom is nice. Tom says Mai is a good friend. They laugh together.',
  'read_aloud_text', 'Mai says Tom is nice. Tom says Mai is a good friend. They laugh together.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for friend and nice.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-3-friends';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/ccfbff/155e75?text=Teacher',
  'body_text', 'The teacher says You are good friends. Mai and Tom say Thank you, teacher.',
  'read_aloud_text', 'The teacher says You are good friends. Mai and Tom say Thank you, teacher.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for Thank you.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-3-friends';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'Who does Mai say is nice?',
  'question', 'Who does Mai say is nice?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Tom'),
    jsonb_build_object('id', 'b', 'label', 'The teacher'),
    jsonb_build_object('id', 'c', 'label', 'The book')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the second story.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-3-friends';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('vocabulary'), ('listening')) as s(skill)
where m.slug = 'g3-hello-school' and l.slug = 'lesson-3-friends';

-- Lesson 4: Polite English
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 4: Polite English', 'lesson-4-polite', 3, true, 12
from public.modules where slug = 'g3-hello-school';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/dcfce7/14532d?text=Please+%26+Thank+you',
  'cta_label', 'Let''s learn'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-4-polite';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fef9c3/854d0e?text=Please',
  'body_text', 'Tom wants a pencil. He says Please. Mai says Here you are. Tom says Thank you.',
  'read_aloud_text', 'Tom wants a pencil. He says Please. Mai says Here you are. Tom says Thank you.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for Please and Thank you.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-4-polite';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fee2e2/991b1b?text=Sorry',
  'body_text', 'Mai drops her book. Tom says Sorry. Mai says It is OK. They smile.',
  'read_aloud_text', 'Mai drops her book. Tom says Sorry. Mai says It is OK. They smile.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for Sorry.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-4-polite';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/e0e7ff/3730a3?text=Listen',
  'body_text', 'The teacher says Please listen. The students say Yes, teacher. They are polite.',
  'read_aloud_text', 'The teacher says Please listen. The students say Yes, teacher. They are polite.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for listen and polite.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-4-polite';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'What does Tom say when he wants help?',
  'question', 'What does Tom say when he wants help?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Please'),
    jsonb_build_object('id', 'b', 'label', 'Goodbye'),
    jsonb_build_object('id', 'c', 'label', 'Wow')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the first story when Tom wants a pencil.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-hello-school' and l.slug = 'lesson-4-polite';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('vocabulary'), ('listening')) as s(skill)
where m.slug = 'g3-hello-school' and l.slug = 'lesson-4-polite';

-- ========== Unit 2: g3-numbers-colors ==========

insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 1: Count with me', 'lesson-1-count', 0, true, 12
from public.modules where slug = 'g3-numbers-colors';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/fef3c7/78350f?text=Count+with+me',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-1-count';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/ffedd5/c2410c?text=One+two+three',
  'body_text', 'The teacher says Let us count. One, two, three! The class counts together.',
  'read_aloud_text', 'The teacher says Let us count. One, two, three! The class counts together.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for the numbers one, two, three.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-1-count';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fed7aa/9a3412?text=Books+and+pencils',
  'body_text', 'Mai sees three books on the desk. Tom sees five pencils in a cup.',
  'read_aloud_text', 'Mai sees three books on the desk. Tom sees five pencils in a cup.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for three and five.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-1-count';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fde68a/a16207?text=Classroom+numbers',
  'body_text', 'One door, two windows, ten chairs. The classroom has many numbers.',
  'read_aloud_text', 'One door, two windows, ten chairs. The classroom has many numbers.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for one, two, and ten.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-1-count';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'How many books does Mai see?',
  'question', 'How many books does Mai see?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Three'),
    jsonb_build_object('id', 'b', 'label', 'Five'),
    jsonb_build_object('id', 'c', 'label', 'Ten')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the second story.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-1-count';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('numbers')) as s(skill)
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-1-count';

-- Unit 2 lesson 2: Colors
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 2: Colors everywhere', 'lesson-2-colors', 1, true, 12
from public.modules where slug = 'g3-numbers-colors';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/fbcfe8/9f1239?text=Colors',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-2-colors';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fcf9c9/ca8a04?text=Yellow+and+green',
  'body_text', 'Mai wears a yellow shirt. Tom wears green shoes. The classroom is colorful.',
  'read_aloud_text', 'Mai wears a yellow shirt. Tom wears green shoes. The classroom is colorful.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for yellow and green.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-2-colors';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/d9f99d/4d7c0f?text=Walls+and+door',
  'body_text', 'The wall is white. The board is green. The door is brown. Red books sit on the shelf.',
  'read_aloud_text', 'The wall is white. The board is green. The door is brown. Red books sit on the shelf.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for white, green, brown, and red.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-2-colors';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/a7f3d0/166534?text=Repeat',
  'body_text', 'The teacher points and says Red. Blue. Yellow. The students repeat the colors.',
  'read_aloud_text', 'The teacher points and says Red. Blue. Yellow. The students repeat the colors.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for red, blue, and yellow.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-2-colors';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'What color is Mai''s shirt?',
  'question', 'What color is Mai''s shirt?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Yellow'),
    jsonb_build_object('id', 'b', 'label', 'Green'),
    jsonb_build_object('id', 'c', 'label', 'Red')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the first story about Mai.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-2-colors';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('colors'), ('vocabulary')) as s(skill)
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-2-colors';

-- Unit 2 lesson 3: How many
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 3: How many?', 'lesson-3-how-many', 2, true, 12
from public.modules where slug = 'g3-numbers-colors';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/bbf7d0/166534?text=How+many',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-3-how-many';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/dcfce7/14532d?text=Apples',
  'body_text', 'Mai looks at the table. She says I see two apples. Tom says I see two apples too.',
  'read_aloud_text', 'Mai looks at the table. She says I see two apples. Tom says I see two apples too.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for two apples.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-3-how-many';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fef08a/ca8a04?text=Fruit',
  'body_text', 'Tom says I see one orange. Mai says I see three bananas. Yum!',
  'read_aloud_text', 'Tom says I see one orange. Mai says I see three bananas. Yum!',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for one and three.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-3-how-many';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fecaca/991b1b?text=Answer',
  'body_text', 'The teacher asks How many apples? The students say Two apples!',
  'read_aloud_text', 'The teacher asks How many apples? The students say Two apples!',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for how many.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-3-how-many';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'How many bananas does Mai see?',
  'question', 'How many bananas does Mai see?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Three'),
    jsonb_build_object('id', 'b', 'label', 'Two'),
    jsonb_build_object('id', 'c', 'label', 'One')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the second story.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-3-how-many';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('numbers'), ('vocabulary')) as s(skill)
where m.slug = 'g3-numbers-colors' and l.slug = 'lesson-3-how-many';

-- ========== Unit 3: g3-my-day ==========

insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 1: Good morning, good night', 'lesson-1-morning-night', 0, true, 12
from public.modules where slug = 'g3-my-day';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/fde047/713f12?text=Morning+%26+night',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-1-morning-night';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fffbcc/a16207?text=Wake+up',
  'body_text', 'Tom wakes up in the morning. He says Good morning, Mom! The sun is up.',
  'read_aloud_text', 'Tom wakes up in the morning. He says Good morning, Mom! The sun is up.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for morning and Good morning.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-1-morning-night';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/e0f2fe/0c4a6e?text=At+school',
  'body_text', 'At school the teacher says Good morning, class! The students say Good morning!',
  'read_aloud_text', 'At school the teacher says Good morning, class! The students say Good morning!',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for Good morning again.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-1-morning-night';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/312e81/e0e7ff?text=Night',
  'body_text', 'At night Tom says Good night, Mom! The moon is bright. He sleeps well.',
  'read_aloud_text', 'At night Tom says Good night, Mom! The moon is bright. He sleeps well.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for night and Good night.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-1-morning-night';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'What does Tom say when he wakes up?',
  'question', 'What does Tom say when he wakes up?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Good morning'),
    jsonb_build_object('id', 'b', 'label', 'Good night'),
    jsonb_build_object('id', 'c', 'label', 'Goodbye')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the first story in the morning.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-1-morning-night';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('routines'), ('vocabulary')) as s(skill)
where m.slug = 'g3-my-day' and l.slug = 'lesson-1-morning-night';

-- Unit 3 lesson 2: Days
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 2: Days at school', 'lesson-2-days', 1, true, 12
from public.modules where slug = 'g3-my-day';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/c7d2fe/312e81?text=Days+at+school',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-2-days';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/e0e7ff/3730a3?text=Monday',
  'body_text', 'Mai likes school days. She goes to school on Monday. She goes on Tuesday too.',
  'read_aloud_text', 'Mai likes school days. She goes to school on Monday. She goes on Tuesday too.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for Monday and Tuesday.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-2-days';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/c4b5fd/5b21b6?text=Mid+week',
  'body_text', 'Tom likes Wednesday and Thursday. He likes Friday because the week ends at school.',
  'read_aloud_text', 'Tom likes Wednesday and Thursday. He likes Friday because the week ends at school.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for Wednesday, Thursday, and Friday.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-2-days';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/a5b4fc/3730a3?text=Today',
  'body_text', 'Today is Monday. Mai and Tom say We love Monday!',
  'read_aloud_text', 'Today is Monday. Mai and Tom say We love Monday!',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for today is Monday.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-2-days';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'What day is it in the story?',
  'question', 'What day is it in the story?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Monday'),
    jsonb_build_object('id', 'b', 'label', 'Saturday'),
    jsonb_build_object('id', 'c', 'label', 'Sunday')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the last story.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-2-days';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('routines'), ('vocabulary')) as s(skill)
where m.slug = 'g3-my-day' and l.slug = 'lesson-2-days';

-- Unit 3 lesson 3: After school
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 3: After school', 'lesson-3-after-school', 2, true, 12
from public.modules where slug = 'g3-my-day';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/fecdd3/9f1239?text=After+school',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-3-after-school';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fee2e2/991b1b?text=Go+home',
  'body_text', 'After school Tom goes home first. He says See you tomorrow!',
  'read_aloud_text', 'After school Tom goes home first. He says See you tomorrow!',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for after school and home.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-3-after-school';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fef9c3/854d0e?text=Snack',
  'body_text', 'Mai eats a snack at home. Then she does her homework at a small desk.',
  'read_aloud_text', 'Mai eats a snack at home. Then she does her homework at a small desk.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for snack and homework.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-3-after-school';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/dcfce7/14532d?text=Play+and+read',
  'body_text', 'After homework Mai plays outside. Tom reads a book at home.',
  'read_aloud_text', 'After homework Mai plays outside. Tom reads a book at home.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for play and read.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-3-after-school';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'What does Mai do after her snack?',
  'question', 'What does Mai do after her snack?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Homework'),
    jsonb_build_object('id', 'b', 'label', 'Sleep'),
    jsonb_build_object('id', 'c', 'label', 'Go to school')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the second story.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-day' and l.slug = 'lesson-3-after-school';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('routines'), ('vocabulary')) as s(skill)
where m.slug = 'g3-my-day' and l.slug = 'lesson-3-after-school';

-- ========== Unit 4: g3-my-family ==========

insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 1: Meet my family', 'lesson-1-meet-family', 0, true, 12
from public.modules where slug = 'g3-my-family';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/fce7f3/9d174d?text=My+family',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-1-meet-family';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fbcfe8/9f1239?text=Photo',
  'body_text', 'Mai shows a photo. She says This is my family. I love my family.',
  'read_aloud_text', 'Mai shows a photo. She says This is my family. I love my family.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for family.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-1-meet-family';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/f5d0fe/a21caf?text=Mother+and+father',
  'body_text', 'This is my mother. This is my father. This is my little brother. He is small.',
  'read_aloud_text', 'This is my mother. This is my father. This is my little brother. He is small.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for mother, father, and brother.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-1-meet-family';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/e9d5ff/6b21a8?text=Sisters',
  'body_text', 'My sister reads books. My baby sister sleeps. We are happy at home.',
  'read_aloud_text', 'My sister reads books. My baby sister sleeps. We are happy at home.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for sister and baby.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-1-meet-family';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'Who is small in the story?',
  'question', 'Who is small in the story?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'The little brother'),
    jsonb_build_object('id', 'b', 'label', 'The mother'),
    jsonb_build_object('id', 'c', 'label', 'The father')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the second story.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-1-meet-family';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('family'), ('vocabulary')) as s(skill)
where m.slug = 'g3-my-family' and l.slug = 'lesson-1-meet-family';

-- Unit 4 lesson 2: He and she
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 2: He and she', 'lesson-2-he-she', 1, true, 12
from public.modules where slug = 'g3-my-family';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/e0e7ff/312e81?text=He+and+she',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-2-he-she';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/c7d2fe/312e81?text=Father',
  'body_text', 'Mai points at her father. She says He is tall. He is kind.',
  'read_aloud_text', 'Mai points at her father. She says He is tall. He is kind.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for he is tall.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-2-he-she';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fbcfe8/9f1239?text=Mother',
  'body_text', 'Mai points at her mother. She says She is nice. She can cook good food.',
  'read_aloud_text', 'Mai points at her mother. She says She is nice. She can cook good food.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for she is nice.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-2-he-she';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/dcfce7/14532d?text=Visit',
  'body_text', 'Tom visits Mai. He says Your mother is kind. Mai says Thank you!',
  'read_aloud_text', 'Tom visits Mai. He says Your mother is kind. Mai says Thank you!',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for your mother.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-2-he-she';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'Who is tall in the story?',
  'question', 'Who is tall in the story?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'Mai''s father'),
    jsonb_build_object('id', 'b', 'label', 'Mai''s mother'),
    jsonb_build_object('id', 'c', 'label', 'The baby')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the first story. Mai uses the word he.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-2-he-she';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('family'), ('vocabulary')) as s(skill)
where m.slug = 'g3-my-family' and l.slug = 'lesson-2-he-she';

-- Unit 4 lesson 3: Family day
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 3: A family day', 'lesson-3-family-day', 2, true, 12
from public.modules where slug = 'g3-my-family';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/bbf7d0/166534?text=Family+day',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-3-family-day';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/dcfce7/14532d?text=Park',
  'body_text', 'On Sunday the family goes to the park. The sky is blue. The sun is warm.',
  'read_aloud_text', 'On Sunday the family goes to the park. The sky is blue. The sun is warm.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for Sunday and park.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-3-family-day';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fecaca/991b1b?text=Picnic',
  'body_text', 'Mother brings fruit. Father brings water. The children play on the grass.',
  'read_aloud_text', 'Mother brings fruit. Father brings water. The children play on the grass.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for fruit and water.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-3-family-day';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fef08a/ca8a04?text=Friends',
  'body_text', 'Mai says This is a good day. Tom is there with his own family too. They wave hello.',
  'read_aloud_text', 'Mai says This is a good day. Tom is there with his own family too. They wave hello.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for good day and hello.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-3-family-day';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'Where does the family go?',
  'question', 'Where does the family go?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'The park'),
    jsonb_build_object('id', 'b', 'label', 'The school'),
    jsonb_build_object('id', 'c', 'label', 'The zoo')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the first story on Sunday.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-3-family-day';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('family'), ('vocabulary')) as s(skill)
where m.slug = 'g3-my-family' and l.slug = 'lesson-3-family-day';

-- Unit 4 lesson 4: Celebration / review
insert into public.lessons (module_id, title, slug, order_index, published, estimated_minutes)
select id, 'Lesson 4: We did it!', 'lesson-4-celebration', 3, true, 15
from public.modules where slug = 'g3-my-family';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 0, 'start', jsonb_build_object(
  'type', 'start',
  'image_url', 'https://placehold.co/800x520/fef08a/ca8a04?text=Great+work',
  'cta_label', 'Start'
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-4-celebration';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 1, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/fde047/713f12?text=Remember',
  'body_text', 'Mai thinks about English class. She remembers hello, colors, days, and family words.',
  'read_aloud_text', 'Mai thinks about English class. She remembers hello, colors, days, and family words.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for the words she remembers.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-4-celebration';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 2, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/c7d2fe/312e81?text=Grade+Three',
  'body_text', 'Tom says We learned so much in Grade Three. Mai says I like our lessons.',
  'read_aloud_text', 'Tom says We learned so much in Grade Three. Mai says I like our lessons.',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for learned and lessons.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-4-celebration';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 3, 'story', jsonb_build_object(
  'type', 'story',
  'image_url', 'https://placehold.co/800x400/dcfce7/14532d?text=Teacher',
  'body_text', 'The teacher says You did great work. The class says Thank you, teacher!',
  'read_aloud_text', 'The teacher says You did great work. The class says Thank you, teacher!',
  'tts_lang', 'en-US',
  'guide', jsonb_build_object('tip_text', 'Listen for great work.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-4-celebration';

insert into public.lesson_screens (lesson_id, order_index, screen_type, payload)
select l.id, 4, 'interaction', jsonb_build_object(
  'type', 'interaction', 'subtype', 'mc_quiz',
  'body_text', 'What does the teacher say about the class?',
  'question', 'What does the teacher say about the class?',
  'options', jsonb_build_array(
    jsonb_build_object('id', 'a', 'label', 'You did great work'),
    jsonb_build_object('id', 'b', 'label', 'Good night'),
    jsonb_build_object('id', 'c', 'label', 'Go home now')
  ),
  'correct_option_id', 'a',
  'guide', jsonb_build_object('tip_text', 'Think about the last story.')
)
from public.lessons l join public.modules m on m.id = l.module_id
where m.slug = 'g3-my-family' and l.slug = 'lesson-4-celebration';

insert into public.lesson_skills (lesson_id, skill_key)
select l.id, s.skill from public.lessons l
join public.modules m on m.id = l.module_id
cross join (values ('listening'), ('vocabulary'), ('family')) as s(skill)
where m.slug = 'g3-my-family' and l.slug = 'lesson-4-celebration';
