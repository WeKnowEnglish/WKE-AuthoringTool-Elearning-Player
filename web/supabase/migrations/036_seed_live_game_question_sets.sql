-- Seed system Live Game question sets (Phase Q1). Idempotent for system sets.

-- grade56-adjectives
insert into public.live_game_question_sets (
  id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order
) values (
  'a1000001-0000-4000-8000-000000000001', 'grade56-adjectives', 'Grade 5–6 Adjectives', 'A2',
  'Adjectives', 'Understand adjective meanings in context and spell target words.', 'Enormous, tiny, crowded, polite, generous, exhausted, curious, and 53 more adjectives in context.',
  1, 'published', 'system', 1
)
on conflict (slug) do update set
  title = excluded.title,
  level = excluded.level,
  topic = excluded.topic,
  learning_objective = excluded.learning_objective,
  description = excluded.description,
  version = excluded.version,
  status = excluded.status,
  visibility = excluded.visibility,
  sort_order = excluded.sort_order,
  updated_at = now();

delete from public.live_game_questions where set_id = 'a1000001-0000-4000-8000-000000000001';

insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'bb8783f9-8f13-4bdb-82c0-bf45a675ac3c', 'a1000001-0000-4000-8000-000000000001', 'harvest', 0,
  'We went to an enormous science museum. The word enormous means:', '{"type":"multiple_choice","options":["small","exciting","very big","colorful"],"correctAnswers":["very big"]}'::jsonb, true, 'adj-001'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'fcae4a80-ecbc-4629-886a-58b930094d2f', 'a1000001-0000-4000-8000-000000000001', 'harvest', 1,
  'Mia found a tiny insect on the leaf. The word tiny means:', '{"type":"multiple_choice","options":["very small","dangerous","noisy","strange"],"correctAnswers":["very small"]}'::jsonb, true, 'adj-002'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '5d49ee3e-2b40-4d08-80d3-63f16768ceff', 'a1000001-0000-4000-8000-000000000001', 'harvest', 2,
  'The shopping center was crowded on Saturday afternoon. This means:', '{"type":"multiple_choice","options":["it was closed","it was full of people","it was very clean","it had no shops"],"correctAnswers":["it was full of people"]}'::jsonb, true, 'adj-003'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '675fcd31-83e2-4a78-87b2-bf3ea2fae420', 'a1000001-0000-4000-8000-000000000001', 'harvest', 3,
  'The streets were empty early in the morning. This means:', '{"type":"multiple_choice","options":["there were very few people","there were many cars","the streets were dirty","the streets were narrow"],"correctAnswers":["there were very few people"]}'::jsonb, true, 'adj-004'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'f1cb17f0-f7e0-4d30-8a9a-3dc602985f64', 'a1000001-0000-4000-8000-000000000001', 'harvest', 4,
  'We visited an ancient temple during our trip. The word ancient means:', '{"type":"multiple_choice","options":["very modern","very old","very tall","very famous"],"correctAnswers":["very old"]}'::jsonb, true, 'adj-005'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '2000d214-1495-45ce-8d64-2fc33996d859', 'a1000001-0000-4000-8000-000000000001', 'harvest', 5,
  'Our school has a modern computer room. The word modern means:', '{"type":"multiple_choice","options":["old-fashioned","new and up to date","small and dark","difficult to use"],"correctAnswers":["new and up to date"]}'::jsonb, true, 'adj-006'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'c48677a7-7b86-4010-857c-5a00e54de020', 'a1000001-0000-4000-8000-000000000001', 'harvest', 6,
  'The waiter was very polite and spoke kindly to us. The word polite means:', '{"type":"multiple_choice","options":["showing good manners","speaking loudly","feeling worried","working slowly"],"correctAnswers":["showing good manners"]}'::jsonb, true, 'adj-007'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9ad13611-72bc-4118-8431-b262ffdc818b', 'a1000001-0000-4000-8000-000000000001', 'harvest', 7,
  'It was rude to interrupt the teacher while she was speaking. The word rude means:', '{"type":"multiple_choice","options":["helpful","not polite","cheerful","careful"],"correctAnswers":["not polite"]}'::jsonb, true, 'adj-008'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'f83be9bd-9b82-4498-8437-9fe59891bf1f', 'a1000001-0000-4000-8000-000000000001', 'harvest', 8,
  'Leo is generous because he often shares his snacks with others. The word generous means:', '{"type":"multiple_choice","options":["willing to give and share","afraid of losing things","unable to make friends","interested in cooking"],"correctAnswers":["willing to give and share"]}'::jsonb, true, 'adj-009'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a874b08b-8084-4255-8968-7e5887e2438f', 'a1000001-0000-4000-8000-000000000001', 'harvest', 9,
  'Max was selfish and kept all the game pieces for himself. The word selfish means:', '{"type":"multiple_choice","options":["thinking mainly about yourself","helping everyone","feeling very tired","working carefully"],"correctAnswers":["thinking mainly about yourself"]}'::jsonb, true, 'adj-010'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'c0187b7c-c578-40c6-813d-56b67f522c26', 'a1000001-0000-4000-8000-000000000001', 'harvest', 10,
  'Our coach was patient and explained the activity three times. This means the coach:', '{"type":"multiple_choice","options":["became angry quickly","waited calmly","forgot the instructions","spoke very quietly"],"correctAnswers":["waited calmly"]}'::jsonb, true, 'adj-011'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '6cb54ecb-f662-4c31-8efc-483efeb03118', 'a1000001-0000-4000-8000-000000000001', 'harvest', 11,
  'I felt nervous before giving my speech. This means I felt:', '{"type":"multiple_choice","options":["worried","hungry","proud","bored"],"correctAnswers":["worried"]}'::jsonb, true, 'adj-012'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9be444b1-478b-41d7-8855-c250e5749bd3', 'a1000001-0000-4000-8000-000000000001', 'harvest', 12,
  'Ava felt proud after completing the difficult project. This means she was:', '{"type":"multiple_choice","options":["pleased with what she had done","afraid of making a mistake","angry with her classmates","confused by the project"],"correctAnswers":["pleased with what she had done"]}'::jsonb, true, 'adj-013'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'c9b19f34-9d25-415a-8b30-7330ba96c014', 'a1000001-0000-4000-8000-000000000001', 'harvest', 13,
  'We were disappointed when the football match was canceled. This means we felt:', '{"type":"multiple_choice","options":["pleased","surprised and excited","unhappy because something did not happen","tired after playing"],"correctAnswers":["unhappy because something did not happen"]}'::jsonb, true, 'adj-014'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '8bdf7476-67ce-4bc6-876c-4ccea2e1b351', 'a1000001-0000-4000-8000-000000000001', 'harvest', 14,
  'Ben is very cheerful and usually has a smile on his face. The word cheerful means:', '{"type":"multiple_choice","options":["happy and positive","quiet and shy","serious and worried","tired and weak"],"correctAnswers":["happy and positive"]}'::jsonb, true, 'adj-015'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '7fbecd90-4ccf-4644-829d-00a870d43774', 'a1000001-0000-4000-8000-000000000001', 'harvest', 15,
  'The new student was shy and did not speak much. This means the student:', '{"type":"multiple_choice","options":["felt uncomfortable meeting people","was angry with the class","wanted to be the leader","spoke too loudly"],"correctAnswers":["felt uncomfortable meeting people"]}'::jsonb, true, 'adj-016'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9806ca2c-7996-4fa2-8f7b-77ca0ad370b3', 'a1000001-0000-4000-8000-000000000001', 'harvest', 16,
  'The soup was delicious , so I asked for another bowl. The word delicious means:', '{"type":"multiple_choice","options":["very tasty","too hot","expensive","unhealthy"],"correctAnswers":["very tasty"]}'::jsonb, true, 'adj-017'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '30207fd3-28f3-4ee7-8ce0-4bee566d2a3f', 'a1000001-0000-4000-8000-000000000001', 'harvest', 17,
  'The milk smelled awful , so we did not drink it. The word awful means:', '{"type":"multiple_choice","options":["very pleasant","very bad","fresh and cold","sweet and tasty"],"correctAnswers":["very bad"]}'::jsonb, true, 'adj-018'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '563c6041-2dbd-4b7b-81bc-b53ff5fdf4c9', 'a1000001-0000-4000-8000-000000000001', 'harvest', 18,
  'The path was very narrow , so only one person could walk along it. The word narrow means:', '{"type":"multiple_choice","options":["not wide","very long","difficult to find","covered in water"],"correctAnswers":["not wide"]}'::jsonb, true, 'adj-019'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '0fa62035-0299-41c2-8cd3-7b0fd834e0bb', 'a1000001-0000-4000-8000-000000000001', 'harvest', 19,
  'The river is wide near the bridge. This means:', '{"type":"multiple_choice","options":["the river is deep","the river has a large distance from one side to the other","the river is very clean","the river moves quickly"],"correctAnswers":["the river has a large distance from one side to the other"]}'::jsonb, true, 'adj-020'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '54cfdf86-f078-4b05-89e9-bacb6993aaf8', 'a1000001-0000-4000-8000-000000000001', 'harvest', 20,
  'The classroom was too noisy for us to hear the instructions. The word noisy means:', '{"type":"multiple_choice","options":["full of loud sounds","completely empty","very bright","cold and uncomfortable"],"correctAnswers":["full of loud sounds"]}'::jsonb, true, 'adj-021'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '7b58cebf-d102-468f-8e90-23300231fed6', 'a1000001-0000-4000-8000-000000000001', 'harvest', 21,
  'The library is usually quiet , so it is a good place to study. The word quiet means:', '{"type":"multiple_choice","options":["not making much noise","full of interesting books","difficult to enter","crowded with students"],"correctAnswers":["not making much noise"]}'::jsonb, true, 'adj-022'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '3e6f82b0-f179-4ec7-8c92-a0a66aad4c8b', 'a1000001-0000-4000-8000-000000000001', 'harvest', 22,
  'This dictionary is very useful when I do my homework. The word useful means:', '{"type":"multiple_choice","options":["helpful for a purpose","difficult to understand","old and damaged","expensive to buy"],"correctAnswers":["helpful for a purpose"]}'::jsonb, true, 'adj-023'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'ac4095f8-9ede-4288-8a56-c1c97fbd4855', 'a1000001-0000-4000-8000-000000000001', 'harvest', 23,
  'It is dangerous to cross the road without looking. The word dangerous means:', '{"type":"multiple_choice","options":["likely to cause harm","easy to do","exciting and fun","allowed by the rules"],"correctAnswers":["likely to cause harm"]}'::jsonb, true, 'adj-024'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '4219b86a-6bfa-4f00-87e6-d8915e5fa73d', 'a1000001-0000-4000-8000-000000000001', 'harvest', 24,
  'The chair has a soft seat and supports my back. It is very ______.', '{"type":"multiple_choice","options":["crowded","comfortable","ancient","nervous"],"correctAnswers":["comfortable"]}'::jsonb, true, 'adj-025'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '76302410-4580-4f47-8f56-02e686c95d31', 'a1000001-0000-4000-8000-000000000001', 'harvest', 25,
  'I have never seen a purple tree before. It looks very ______.', '{"type":"multiple_choice","options":["usual","patient","unusual","polite"],"correctAnswers":["unusual"]}'::jsonb, true, 'adj-026'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '35924069-8735-4d58-8ae6-5e4453156de2', 'a1000001-0000-4000-8000-000000000001', 'harvest', 26,
  'The instructions were easy to follow because they were very ______.', '{"type":"multiple_choice","options":["clear","empty","rude","narrow"],"correctAnswers":["clear"]}'::jsonb, true, 'adj-027'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '93bf569f-8624-444b-859c-146756e8f609', 'a1000001-0000-4000-8000-000000000001', 'harvest', 27,
  'We could not lift the box because it was too ______.', '{"type":"multiple_choice","options":["light","heavy","quiet","friendly"],"correctAnswers":["heavy"]}'::jsonb, true, 'adj-028'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a71817fa-d0f4-4957-8dad-88a792a7685a', 'a1000001-0000-4000-8000-000000000001', 'harvest', 28,
  'The glass fell on the floor, but it did not break. It was surprisingly ______.', '{"type":"multiple_choice","options":["strong","weak","nervous","delicious"],"correctAnswers":["strong"]}'::jsonb, true, 'adj-029'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '94eb0883-2212-40ed-8ccf-957d23f4c72a', 'a1000001-0000-4000-8000-000000000001', 'harvest', 29,
  'The maths problem was ______, but I solved it after thinking carefully.', '{"type":"multiple_choice","options":["generous","difficult","crowded","modern"],"correctAnswers":["difficult"]}'::jsonb, true, 'adj-030'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9f6cd679-a92a-46b0-8112-4fe3a69c8edd', 'a1000001-0000-4000-8000-000000000001', 'harvest', 30,
  'After walking for five hours, we felt exhausted . The word exhausted means:', '{"type":"multiple_choice","options":["very tired","very hungry","very worried","very cold"],"correctAnswers":["very tired"]}'::jsonb, true, 'adj-031'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'b733844b-f7b7-4c99-8502-98ca4454adfb', 'a1000001-0000-4000-8000-000000000001', 'harvest', 31,
  'The lake was freezing , so nobody wanted to swim in it. The word freezing means:', '{"type":"multiple_choice","options":["extremely cold","slightly dirty","very deep","full of fish"],"correctAnswers":["extremely cold"]}'::jsonb, true, 'adj-032'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a63b6110-8b63-43c6-8426-fa9e0e7a63cf', 'a1000001-0000-4000-8000-000000000001', 'harvest', 32,
  'Be careful with the soup because it is boiling . The word boiling means:', '{"type":"multiple_choice","options":["extremely hot","ready to eat","very salty","almost empty"],"correctAnswers":["extremely hot"]}'::jsonb, true, 'adj-033'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '72d5636d-00ea-4b33-8ffb-830fdf32e3b6', 'a1000001-0000-4000-8000-000000000001', 'harvest', 33,
  'Our clothes were wet after we walked home in the rain. The word wet means:', '{"type":"multiple_choice","options":["covered with water","covered with dirt","too small","very warm"],"correctAnswers":["covered with water"]}'::jsonb, true, 'adj-034'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'c2b6069e-9962-4e88-854f-f7827109f6ed', 'a1000001-0000-4000-8000-000000000001', 'harvest', 34,
  'The ground was dry because it had not rained for weeks. The word dry means:', '{"type":"multiple_choice","options":["not wet","very soft","full of plants","difficult to cross"],"correctAnswers":["not wet"]}'::jsonb, true, 'adj-035'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '16b81434-17d7-48d1-8bb7-397442f6dc9d', 'a1000001-0000-4000-8000-000000000001', 'harvest', 35,
  'The surface of the glass table was smooth . The word smooth means:', '{"type":"multiple_choice","options":["even and not rough","broken into pieces","covered with paint","heavy to carry"],"correctAnswers":["even and not rough"]}'::jsonb, true, 'adj-036'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '3a2047cb-a328-4633-859d-db8f3090ba5b', 'a1000001-0000-4000-8000-000000000001', 'harvest', 36,
  'The old wall felt rough when I touched it. The word rough means:', '{"type":"multiple_choice","options":["not smooth","very clean","soft and warm","easy to move"],"correctAnswers":["not smooth"]}'::jsonb, true, 'adj-037'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '43ef6e36-31cf-4126-8443-027c247fab10', 'a1000001-0000-4000-8000-000000000001', 'harvest', 37,
  'The classroom was bright because sunlight came through the large windows. The word bright means:', '{"type":"multiple_choice","options":["full of light","full of students","difficult to find","painted white"],"correctAnswers":["full of light"]}'::jsonb, true, 'adj-038'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'cd4a9552-5f80-4d0a-80d9-b294dc5b6236', 'a1000001-0000-4000-8000-000000000001', 'harvest', 38,
  'The cave was very dark , so we used a flashlight. The word dark means:', '{"type":"multiple_choice","options":["having little or no light","being very cold","being difficult to enter","having many tunnels"],"correctAnswers":["having little or no light"]}'::jsonb, true, 'adj-039'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9aa22ab1-4e42-4b59-82a0-6b6ba317864b', 'a1000001-0000-4000-8000-000000000001', 'harvest', 39,
  'We bought fruit from a local market near our hotel. The word local means:', '{"type":"multiple_choice","options":["from the nearby area","from another country","open all night","very expensive"],"correctAnswers":["from the nearby area"]}'::jsonb, true, 'adj-040'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '11255a44-90a0-403b-89eb-5a671e099115', 'a1000001-0000-4000-8000-000000000001', 'harvest', 40,
  'Our class welcomed a foreign student from another country. The word foreign means:', '{"type":"multiple_choice","options":["from a different country","from the same town","new to the school","unable to speak"],"correctAnswers":["from a different country"]}'::jsonb, true, 'adj-041'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '7d110e85-9c44-4b95-862f-5aa101c24967', 'a1000001-0000-4000-8000-000000000001', 'harvest', 41,
  'The bicycle was too expensive , so I did not have enough money to buy it. The word expensive means:', '{"type":"multiple_choice","options":["costing a lot of money","difficult to ride","made a long time ago","too large to use"],"correctAnswers":["costing a lot of money"]}'::jsonb, true, 'adj-042'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a618387b-11a1-4883-8f46-1c0449d0ad3f', 'a1000001-0000-4000-8000-000000000001', 'harvest', 42,
  'These notebooks were very cheap , so I bought three of them. The word cheap means:', '{"type":"multiple_choice","options":["not costing much money","difficult to find","made from paper","available in many colors"],"correctAnswers":["not costing much money"]}'::jsonb, true, 'adj-043'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'f86003ce-47cc-4d24-860a-f91ca01f99ef', 'a1000001-0000-4000-8000-000000000001', 'harvest', 43,
  'Fruit, vegetables, and exercise can help us stay healthy . The word healthy means:', '{"type":"multiple_choice","options":["well and strong","tired and sleepy","hungry and thirsty","quiet and calm"],"correctAnswers":["well and strong"]}'::jsonb, true, 'adj-044'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'ec047ebf-6ac1-494a-8e19-e40230ca8be6', 'a1000001-0000-4000-8000-000000000001', 'harvest', 44,
  'Theo was too lazy to clean his room, so his clothes stayed on the floor. The word lazy means:', '{"type":"multiple_choice","options":["not willing to work","unable to find something","excited about a task","worried about a problem"],"correctAnswers":["not willing to work"]}'::jsonb, true, 'adj-045'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9afeb017-5619-4017-85ab-628e464bb686', 'a1000001-0000-4000-8000-000000000001', 'harvest', 45,
  'The brave firefighter entered the building to help the family. The word brave means:', '{"type":"multiple_choice","options":["willing to face danger","unable to understand danger","afraid to help people","angry about a problem"],"correctAnswers":["willing to face danger"]}'::jsonb, true, 'adj-046'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '03e043e6-9bf8-4aa7-8934-8f70d05061a3', 'a1000001-0000-4000-8000-000000000001', 'harvest', 46,
  'Maya was honest and told the teacher that she had broken the ruler. The word honest means:', '{"type":"multiple_choice","options":["telling the truth","making a mistake","speaking quietly","feeling sorry"],"correctAnswers":["telling the truth"]}'::jsonb, true, 'adj-047'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a3145d61-1383-41cb-8457-c4d5a01b4b48', 'a1000001-0000-4000-8000-000000000001', 'harvest', 47,
  'Please be careful when you carry the glasses. The word careful means:', '{"type":"multiple_choice","options":["trying to avoid mistakes or damage","trying to finish very quickly","asking someone else for help","feeling unable to continue"],"correctAnswers":["trying to avoid mistakes or damage"]}'::jsonb, true, 'adj-048'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a2be59e0-b72c-4be1-8aef-d65c4878d485', 'a1000001-0000-4000-8000-000000000001', 'harvest', 48,
  'It was careless to leave the door open when we went outside. The word careless means:', '{"type":"multiple_choice","options":["not paying enough attention","trying to be helpful","feeling afraid of something","working very slowly"],"correctAnswers":["not paying enough attention"]}'::jsonb, true, 'adj-049'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'd9707f71-55e7-45f1-8cb7-3a00a70c85e0', 'a1000001-0000-4000-8000-000000000001', 'harvest', 49,
  'The curious child asked many questions about the robot. The word curious means:', '{"type":"multiple_choice","options":["wanting to learn more","unable to remember","ready to leave","unhappy with the answer"],"correctAnswers":["wanting to learn more"]}'::jsonb, true, 'adj-050'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '5be34a2d-7db7-4644-8e47-7dcc0c762d9a', 'a1000001-0000-4000-8000-000000000001', 'harvest', 50,
  'The singer became famous after millions of people watched her video. The word famous means:', '{"type":"multiple_choice","options":["known by many people","liked by one person","able to sing loudly","interested in music"],"correctAnswers":["known by many people"]}'::jsonb, true, 'adj-051'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '307e01dc-1ddf-469d-8f4c-651d16ab4971', 'a1000001-0000-4000-8000-000000000001', 'harvest', 51,
  'We were lucky because we found the missing key before the shop closed. The word lucky means:', '{"type":"multiple_choice","options":["having something good happen by chance","working carefully for a long time","knowing exactly what to do","feeling unhappy about a result"],"correctAnswers":["having something good happen by chance"]}'::jsonb, true, 'adj-052'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '23a61b91-56c1-4b81-83ab-dc1ad490f6ac', 'a1000001-0000-4000-8000-000000000001', 'harvest', 52,
  'Sam was unlucky when his bicycle got a flat tire during the race. The word unlucky means:', '{"type":"multiple_choice","options":["having something bad happen by chance","being unable to ride quickly","not preparing for an activity","losing something important"],"correctAnswers":["having something bad happen by chance"]}'::jsonb, true, 'adj-053'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '1ca43531-1a94-4967-8818-679581b70fd9', 'a1000001-0000-4000-8000-000000000001', 'harvest', 53,
  'I was surprised when my classmates gave me a birthday cake. The word surprised means:', '{"type":"multiple_choice","options":["feeling something unexpected happened","feeling angry about a mistake","feeling tired after working","feeling unsure about an answer"],"correctAnswers":["feeling something unexpected happened"]}'::jsonb, true, 'adj-054'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '7c006a4c-85a1-4a39-8211-c93b267ae91a', 'a1000001-0000-4000-8000-000000000001', 'harvest', 54,
  'The children were frightened when they heard a strange sound outside. The word frightened means:', '{"type":"multiple_choice","options":["afraid","interested","pleased","confused"],"correctAnswers":["afraid"]}'::jsonb, true, 'adj-055'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '61ad4f4c-59d6-4efe-866b-c83c2ddac9ea', 'a1000001-0000-4000-8000-000000000001', 'harvest', 55,
  'We became bored because the bus journey lasted six hours. The word bored means:', '{"type":"multiple_choice","options":["not interested and wanting something to do","worried about arriving late","excited about the journey","unable to find a seat"],"correctAnswers":["not interested and wanting something to do"]}'::jsonb, true, 'adj-056'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a3192a30-8cd5-432e-8b98-4f767a9fb85f', 'a1000001-0000-4000-8000-000000000001', 'harvest', 56,
  'The students were excited about visiting the space center. The word excited means:', '{"type":"multiple_choice","options":["very happy and interested about something coming","too tired to join an activity","afraid that something will go wrong","unhappy about a change"],"correctAnswers":["very happy and interested about something coming"]}'::jsonb, true, 'adj-057'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '41799777-1cd4-48b6-8033-a9fd94f133ce', 'a1000001-0000-4000-8000-000000000001', 'harvest', 57,
  'The restaurant was busy , and every table had customers. The word busy means:', '{"type":"multiple_choice","options":["having a lot of activity or work","having very little food","being closed for the day","being difficult to reach"],"correctAnswers":["having a lot of activity or work"]}'::jsonb, true, 'adj-058'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'e5a8dee3-bd28-439f-83b1-c2e6b05bc653', 'a1000001-0000-4000-8000-000000000001', 'harvest', 58,
  'The game has simple rules, so everyone learned how to play quickly. The word simple means:', '{"type":"multiple_choice","options":["easy to understand","difficult to remember","unfair to some players","slow and uninteresting"],"correctAnswers":["easy to understand"]}'::jsonb, true, 'adj-059'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '7d7e22c5-1e10-4c65-88aa-465f6223cbec', 'a1000001-0000-4000-8000-000000000001', 'harvest', 59,
  'This necklace is special because it belonged to my grandmother. The word special means:', '{"type":"multiple_choice","options":["important or different in a meaningful way","easy to replace","expensive to repair","difficult to wear"],"correctAnswers":["important or different in a meaningful way"]}'::jsonb, true, 'adj-060'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '89172098-b868-4ed0-8b4c-35adff25ef5d', 'a1000001-0000-4000-8000-000000000001', 'deposit', 0,
  'Spell the word: very big', '{"type":"deposit_spell","targetWord":"enormous","spellHint":"very big"}'::jsonb, true, 'deposit-adj-001'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '05ce889e-b6ef-4eb4-8a9e-eff0cb4e3ec7', 'a1000001-0000-4000-8000-000000000001', 'deposit', 1,
  'Spell the word: very small', '{"type":"deposit_spell","targetWord":"tiny","spellHint":"very small"}'::jsonb, true, 'deposit-adj-002'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '80b94ab9-d53c-4888-8a36-5e090f2baa5a', 'a1000001-0000-4000-8000-000000000001', 'deposit', 2,
  'Spell the word: it was full of people', '{"type":"deposit_spell","targetWord":"crowded","spellHint":"it was full of people"}'::jsonb, true, 'deposit-adj-003'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'bbfd3157-3f02-422c-8f07-da80d2dcf22c', 'a1000001-0000-4000-8000-000000000001', 'deposit', 3,
  'Spell the word: there were very few people', '{"type":"deposit_spell","targetWord":"empty","spellHint":"there were very few people"}'::jsonb, true, 'deposit-adj-004'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'c00ce619-b360-4841-8a4b-dd99a01286ec', 'a1000001-0000-4000-8000-000000000001', 'deposit', 4,
  'Spell the word: very old', '{"type":"deposit_spell","targetWord":"ancient","spellHint":"very old"}'::jsonb, true, 'deposit-adj-005'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '0a7a808d-8107-4782-859e-58334d48af84', 'a1000001-0000-4000-8000-000000000001', 'deposit', 5,
  'Spell the word: new and up to date', '{"type":"deposit_spell","targetWord":"modern","spellHint":"new and up to date"}'::jsonb, true, 'deposit-adj-006'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'd7fd1333-747f-4bd2-8e80-5b92df076291', 'a1000001-0000-4000-8000-000000000001', 'deposit', 6,
  'Spell the word: showing good manners', '{"type":"deposit_spell","targetWord":"polite","spellHint":"showing good manners"}'::jsonb, true, 'deposit-adj-007'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '004f15e2-0631-42ee-8378-f8b751670c97', 'a1000001-0000-4000-8000-000000000001', 'deposit', 7,
  'Spell the word: not polite', '{"type":"deposit_spell","targetWord":"rude","spellHint":"not polite"}'::jsonb, true, 'deposit-adj-008'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'ae55b6b0-e93d-4112-80ea-6142a9037dc6', 'a1000001-0000-4000-8000-000000000001', 'deposit', 8,
  'Spell the word: willing to give and share', '{"type":"deposit_spell","targetWord":"generous","spellHint":"willing to give and share"}'::jsonb, true, 'deposit-adj-009'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'edf0ac5b-a000-4880-8850-814ad236f6a7', 'a1000001-0000-4000-8000-000000000001', 'deposit', 9,
  'Spell the word: thinking mainly about yourself', '{"type":"deposit_spell","targetWord":"selfish","spellHint":"thinking mainly about yourself"}'::jsonb, true, 'deposit-adj-010'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '521fbd2e-2737-4854-8c2b-14efda2d4730', 'a1000001-0000-4000-8000-000000000001', 'deposit', 10,
  'Spell the word: waited calmly', '{"type":"deposit_spell","targetWord":"patient","spellHint":"waited calmly"}'::jsonb, true, 'deposit-adj-011'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '0727e36c-fd0c-4e85-8f97-13fc8e427fe8', 'a1000001-0000-4000-8000-000000000001', 'deposit', 11,
  'Spell the word: worried', '{"type":"deposit_spell","targetWord":"nervous","spellHint":"worried"}'::jsonb, true, 'deposit-adj-012'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '21cf5846-0c64-4372-8965-6edd0ec6357c', 'a1000001-0000-4000-8000-000000000001', 'deposit', 12,
  'Spell the word: pleased with what she had done', '{"type":"deposit_spell","targetWord":"proud","spellHint":"pleased with what she had done"}'::jsonb, true, 'deposit-adj-013'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'dc228d64-c05e-4800-8b75-758c6d9fc4cb', 'a1000001-0000-4000-8000-000000000001', 'deposit', 13,
  'Spell the word: unhappy because something did not happen', '{"type":"deposit_spell","targetWord":"disappointed","spellHint":"unhappy because something did not happen"}'::jsonb, true, 'deposit-adj-014'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'ea061e09-cf6e-43a3-88bf-ca32ffb96db5', 'a1000001-0000-4000-8000-000000000001', 'deposit', 14,
  'Spell the word: happy and positive', '{"type":"deposit_spell","targetWord":"cheerful","spellHint":"happy and positive"}'::jsonb, true, 'deposit-adj-015'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '3bd20b28-4a80-4f36-8dd6-691c56dbcf77', 'a1000001-0000-4000-8000-000000000001', 'deposit', 15,
  'Spell the word: felt uncomfortable meeting people', '{"type":"deposit_spell","targetWord":"shy","spellHint":"felt uncomfortable meeting people"}'::jsonb, true, 'deposit-adj-016'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '0f0f4c9a-8dcb-4a0d-8ff5-675bbcb9fd1e', 'a1000001-0000-4000-8000-000000000001', 'deposit', 16,
  'Spell the word: very tasty', '{"type":"deposit_spell","targetWord":"delicious","spellHint":"very tasty"}'::jsonb, true, 'deposit-adj-017'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '2af3ded7-678c-4cbd-8c11-6f84199d064c', 'a1000001-0000-4000-8000-000000000001', 'deposit', 17,
  'Spell the word: very bad', '{"type":"deposit_spell","targetWord":"awful","spellHint":"very bad"}'::jsonb, true, 'deposit-adj-018'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'f406bb3b-777c-4de2-8fa6-25ebff686615', 'a1000001-0000-4000-8000-000000000001', 'deposit', 18,
  'Spell the word: not wide', '{"type":"deposit_spell","targetWord":"narrow","spellHint":"not wide"}'::jsonb, true, 'deposit-adj-019'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9bd9722d-9721-4e3e-8ae0-1db7c38ad7a7', 'a1000001-0000-4000-8000-000000000001', 'deposit', 19,
  'Spell the word: the river has a large distance from one side to the other', '{"type":"deposit_spell","targetWord":"wide","spellHint":"the river has a large distance from one side to the other"}'::jsonb, true, 'deposit-adj-020'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a3a860a6-8209-429a-872f-b787d71a7781', 'a1000001-0000-4000-8000-000000000001', 'deposit', 20,
  'Spell the word: full of loud sounds', '{"type":"deposit_spell","targetWord":"noisy","spellHint":"full of loud sounds"}'::jsonb, true, 'deposit-adj-021'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'ab5ae9e3-b3b3-4689-88d1-7e7797088145', 'a1000001-0000-4000-8000-000000000001', 'deposit', 21,
  'Spell the word: not making much noise', '{"type":"deposit_spell","targetWord":"quiet","spellHint":"not making much noise"}'::jsonb, true, 'deposit-adj-022'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'f0adcceb-4457-48f5-80c9-763563e32040', 'a1000001-0000-4000-8000-000000000001', 'deposit', 22,
  'Spell the word: helpful for a purpose', '{"type":"deposit_spell","targetWord":"useful","spellHint":"helpful for a purpose"}'::jsonb, true, 'deposit-adj-023'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '27b93b50-e4a6-43c0-80df-1fc433468ba9', 'a1000001-0000-4000-8000-000000000001', 'deposit', 23,
  'Spell the word: likely to cause harm', '{"type":"deposit_spell","targetWord":"dangerous","spellHint":"likely to cause harm"}'::jsonb, true, 'deposit-adj-024'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'bf7b5374-ec7e-4e56-89a8-e9d62baba31b', 'a1000001-0000-4000-8000-000000000001', 'deposit', 24,
  'Spell the word: comfortable', '{"type":"deposit_spell","targetWord":"comfortable","spellHint":"comfortable"}'::jsonb, true, 'deposit-adj-025'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '63cbb971-b788-4b06-800c-04440b984eb2', 'a1000001-0000-4000-8000-000000000001', 'deposit', 25,
  'Spell the word: unusual', '{"type":"deposit_spell","targetWord":"unusual","spellHint":"unusual"}'::jsonb, true, 'deposit-adj-026'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'ab3a2e6a-305e-42ec-8f27-a57c614575de', 'a1000001-0000-4000-8000-000000000001', 'deposit', 26,
  'Spell the word: clear', '{"type":"deposit_spell","targetWord":"clear","spellHint":"clear"}'::jsonb, true, 'deposit-adj-027'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'e4732e19-e7bb-499b-80b3-8ef3d51f0f68', 'a1000001-0000-4000-8000-000000000001', 'deposit', 27,
  'Spell the word: heavy', '{"type":"deposit_spell","targetWord":"heavy","spellHint":"heavy"}'::jsonb, true, 'deposit-adj-028'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '37eb3021-54cd-4b80-851c-d8bec9b8df9a', 'a1000001-0000-4000-8000-000000000001', 'deposit', 28,
  'Spell the word: strong', '{"type":"deposit_spell","targetWord":"strong","spellHint":"strong"}'::jsonb, true, 'deposit-adj-029'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'dd5e8833-31e4-463b-870b-3ff935178ea6', 'a1000001-0000-4000-8000-000000000001', 'deposit', 29,
  'Spell the word: difficult', '{"type":"deposit_spell","targetWord":"difficult","spellHint":"difficult"}'::jsonb, true, 'deposit-adj-030'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '55bebe68-b43f-4342-802f-e7386a3d9f3a', 'a1000001-0000-4000-8000-000000000001', 'deposit', 30,
  'Spell the word: very tired', '{"type":"deposit_spell","targetWord":"exhausted","spellHint":"very tired"}'::jsonb, true, 'deposit-adj-031'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'fa344511-1263-41fd-87c2-44b40c207663', 'a1000001-0000-4000-8000-000000000001', 'deposit', 31,
  'Spell the word: extremely cold', '{"type":"deposit_spell","targetWord":"freezing","spellHint":"extremely cold"}'::jsonb, true, 'deposit-adj-032'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '3f87b5ef-178d-4870-85f1-91455c91da1b', 'a1000001-0000-4000-8000-000000000001', 'deposit', 32,
  'Spell the word: extremely hot', '{"type":"deposit_spell","targetWord":"boiling","spellHint":"extremely hot"}'::jsonb, true, 'deposit-adj-033'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'ba4f752a-5d04-4c14-85dd-dfadb6e01ba9', 'a1000001-0000-4000-8000-000000000001', 'deposit', 33,
  'Spell the word: covered with water', '{"type":"deposit_spell","targetWord":"wet","spellHint":"covered with water"}'::jsonb, true, 'deposit-adj-034'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a939a067-a764-499a-8719-430c331d1b27', 'a1000001-0000-4000-8000-000000000001', 'deposit', 34,
  'Spell the word: not wet', '{"type":"deposit_spell","targetWord":"dry","spellHint":"not wet"}'::jsonb, true, 'deposit-adj-035'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '403b958b-dda1-44ec-82dd-2c433fbd004c', 'a1000001-0000-4000-8000-000000000001', 'deposit', 35,
  'Spell the word: even and not rough', '{"type":"deposit_spell","targetWord":"smooth","spellHint":"even and not rough"}'::jsonb, true, 'deposit-adj-036'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '57a6ff2e-d136-4231-847f-9568d5cbbe68', 'a1000001-0000-4000-8000-000000000001', 'deposit', 36,
  'Spell the word: not smooth', '{"type":"deposit_spell","targetWord":"rough","spellHint":"not smooth"}'::jsonb, true, 'deposit-adj-037'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9a63cef1-cdd8-480e-8786-07f62ee141dd', 'a1000001-0000-4000-8000-000000000001', 'deposit', 37,
  'Spell the word: full of light', '{"type":"deposit_spell","targetWord":"bright","spellHint":"full of light"}'::jsonb, true, 'deposit-adj-038'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '867ab8f2-2ef7-4048-8071-5b7e8594482f', 'a1000001-0000-4000-8000-000000000001', 'deposit', 38,
  'Spell the word: having little or no light', '{"type":"deposit_spell","targetWord":"dark","spellHint":"having little or no light"}'::jsonb, true, 'deposit-adj-039'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '76db41ea-8375-4e87-86e3-7aa9e83efb2d', 'a1000001-0000-4000-8000-000000000001', 'deposit', 39,
  'Spell the word: from the nearby area', '{"type":"deposit_spell","targetWord":"local","spellHint":"from the nearby area"}'::jsonb, true, 'deposit-adj-040'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '120de959-c191-43af-84be-4d2df3f4134a', 'a1000001-0000-4000-8000-000000000001', 'deposit', 40,
  'Spell the word: from a different country', '{"type":"deposit_spell","targetWord":"foreign","spellHint":"from a different country"}'::jsonb, true, 'deposit-adj-041'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'b9b9ce05-b133-465c-85dc-258dbe3bde13', 'a1000001-0000-4000-8000-000000000001', 'deposit', 41,
  'Spell the word: costing a lot of money', '{"type":"deposit_spell","targetWord":"expensive","spellHint":"costing a lot of money"}'::jsonb, true, 'deposit-adj-042'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '0fdd3939-a5db-4885-8fb1-1f185c592872', 'a1000001-0000-4000-8000-000000000001', 'deposit', 42,
  'Spell the word: not costing much money', '{"type":"deposit_spell","targetWord":"cheap","spellHint":"not costing much money"}'::jsonb, true, 'deposit-adj-043'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a363aa96-4586-4815-8202-270768056138', 'a1000001-0000-4000-8000-000000000001', 'deposit', 43,
  'Spell the word: well and strong', '{"type":"deposit_spell","targetWord":"healthy","spellHint":"well and strong"}'::jsonb, true, 'deposit-adj-044'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '0cdeabb5-216e-49ed-83eb-092c05f8e9a6', 'a1000001-0000-4000-8000-000000000001', 'deposit', 44,
  'Spell the word: not willing to work', '{"type":"deposit_spell","targetWord":"lazy","spellHint":"not willing to work"}'::jsonb, true, 'deposit-adj-045'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '28503d11-8cb8-4dfb-8b9d-b889442e4b87', 'a1000001-0000-4000-8000-000000000001', 'deposit', 45,
  'Spell the word: willing to face danger', '{"type":"deposit_spell","targetWord":"brave","spellHint":"willing to face danger"}'::jsonb, true, 'deposit-adj-046'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '15ac4097-351b-4e56-825d-e11d63338c89', 'a1000001-0000-4000-8000-000000000001', 'deposit', 46,
  'Spell the word: telling the truth', '{"type":"deposit_spell","targetWord":"honest","spellHint":"telling the truth"}'::jsonb, true, 'deposit-adj-047'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'd91e053e-63a9-4bd1-8670-09a66dffeb64', 'a1000001-0000-4000-8000-000000000001', 'deposit', 47,
  'Spell the word: trying to avoid mistakes or damage', '{"type":"deposit_spell","targetWord":"careful","spellHint":"trying to avoid mistakes or damage"}'::jsonb, true, 'deposit-adj-048'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '646cf232-5a18-403e-857c-23c7d1c8ed48', 'a1000001-0000-4000-8000-000000000001', 'deposit', 48,
  'Spell the word: not paying enough attention', '{"type":"deposit_spell","targetWord":"careless","spellHint":"not paying enough attention"}'::jsonb, true, 'deposit-adj-049'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '36693300-66db-420f-8ead-8fc528fa2d79', 'a1000001-0000-4000-8000-000000000001', 'deposit', 49,
  'Spell the word: wanting to learn more', '{"type":"deposit_spell","targetWord":"curious","spellHint":"wanting to learn more"}'::jsonb, true, 'deposit-adj-050'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '6aaf2b8a-f796-42b0-80f3-023e967a4a5e', 'a1000001-0000-4000-8000-000000000001', 'deposit', 50,
  'Spell the word: known by many people', '{"type":"deposit_spell","targetWord":"famous","spellHint":"known by many people"}'::jsonb, true, 'deposit-adj-051'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9bcf7493-f333-48a9-82f9-695ab9f407eb', 'a1000001-0000-4000-8000-000000000001', 'deposit', 51,
  'Spell the word: having something good happen by chance', '{"type":"deposit_spell","targetWord":"lucky","spellHint":"having something good happen by chance"}'::jsonb, true, 'deposit-adj-052'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'cff8437d-4072-4833-8224-babd79b7fad7', 'a1000001-0000-4000-8000-000000000001', 'deposit', 52,
  'Spell the word: having something bad happen by chance', '{"type":"deposit_spell","targetWord":"unlucky","spellHint":"having something bad happen by chance"}'::jsonb, true, 'deposit-adj-053'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'daebbaf6-66cc-443d-8994-6dd6e34d29d0', 'a1000001-0000-4000-8000-000000000001', 'deposit', 53,
  'Spell the word: feeling something unexpected happened', '{"type":"deposit_spell","targetWord":"surprised","spellHint":"feeling something unexpected happened"}'::jsonb, true, 'deposit-adj-054'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '72f73dd2-8f02-4c25-8baa-cb8e184f6588', 'a1000001-0000-4000-8000-000000000001', 'deposit', 54,
  'Spell the word: afraid', '{"type":"deposit_spell","targetWord":"frightened","spellHint":"afraid"}'::jsonb, true, 'deposit-adj-055'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '6b06cd10-81a2-4f8b-8215-bcf2bb0dc902', 'a1000001-0000-4000-8000-000000000001', 'deposit', 55,
  'Spell the word: not interested and wanting something to do', '{"type":"deposit_spell","targetWord":"bored","spellHint":"not interested and wanting something to do"}'::jsonb, true, 'deposit-adj-056'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '8fce720c-218c-42ed-8f90-c47062a22231', 'a1000001-0000-4000-8000-000000000001', 'deposit', 56,
  'Spell the word: very happy and interested about something coming', '{"type":"deposit_spell","targetWord":"excited","spellHint":"very happy and interested about something coming"}'::jsonb, true, 'deposit-adj-057'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'a0b07e0d-4bc6-44ac-8f54-91757b9e146a', 'a1000001-0000-4000-8000-000000000001', 'deposit', 57,
  'Spell the word: having a lot of activity or work', '{"type":"deposit_spell","targetWord":"busy","spellHint":"having a lot of activity or work"}'::jsonb, true, 'deposit-adj-058'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'c3a6f1de-acf8-47af-84a5-e13e572022d1', 'a1000001-0000-4000-8000-000000000001', 'deposit', 58,
  'Spell the word: easy to understand', '{"type":"deposit_spell","targetWord":"simple","spellHint":"easy to understand"}'::jsonb, true, 'deposit-adj-059'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'b056cd40-fa8a-4e72-8c94-e0c1580b19e3', 'a1000001-0000-4000-8000-000000000001', 'deposit', 59,
  'Spell the word: important or different in a meaningful way', '{"type":"deposit_spell","targetWord":"special","spellHint":"important or different in a meaningful way"}'::jsonb, true, 'deposit-adj-060'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '57594abd-76c4-4521-8625-5b6874b6dfe9', 'a1000001-0000-4000-8000-000000000001', 'craft', 0,
  'Put the sentence in order:', '{"type":"drag_sentence","wordBank":["The","enormous","museum","was","very","interesting"],"correctOrder":["The","enormous","museum","was","very","interesting"],"slotCount":6}'::jsonb, true, 'adj-craft-bridge'
);

-- daily-routines-a1
insert into public.live_game_question_sets (
  id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order
) values (
  'a1000001-0000-4000-8000-000000000002', 'daily-routines-a1', 'Daily Routines', 'A1',
  'Routines', 'Describe everyday routines using present-simple verbs and frequency words.', 'Wake up, get dressed, have breakfast, go to school, homework, usually and never.',
  1, 'published', 'system', 2
)
on conflict (slug) do update set
  title = excluded.title,
  level = excluded.level,
  topic = excluded.topic,
  learning_objective = excluded.learning_objective,
  description = excluded.description,
  version = excluded.version,
  status = excluded.status,
  visibility = excluded.visibility,
  sort_order = excluded.sort_order,
  updated_at = now();

delete from public.live_game_questions where set_id = 'a1000001-0000-4000-8000-000000000002';

insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '4418db42-d4c5-4e33-8128-65e4665ff294', 'a1000001-0000-4000-8000-000000000002', 'harvest', 0,
  'What do you usually do first in the morning?', '{"type":"multiple_choice","options":["wake up","go to bed","eat dinner","do homework"],"correctAnswers":["wake up"]}'::jsonb, true, 'routine-wake'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '3d400879-8fdd-4893-83a7-39a0752c3e8f', 'a1000001-0000-4000-8000-000000000002', 'harvest', 1,
  'Choose the best sentence.', '{"type":"multiple_choice","options":["I get dressed before school.","I get dressed the library.","I dressed get school.","I am get dressed."],"correctAnswers":["I get dressed before school."]}'::jsonb, true, 'routine-dressed'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'c8b6aa16-077b-48fe-8875-b7a2f7b7867e', 'a1000001-0000-4000-8000-000000000002', 'harvest', 2,
  'Which activity means eating in the morning?', '{"type":"multiple_choice","options":["have breakfast","have dinner","go home","take a shower"],"correctAnswers":["have breakfast"]}'::jsonb, true, 'routine-breakfast'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'b97bbb11-b205-4247-8d0e-ae671e410808', 'a1000001-0000-4000-8000-000000000002', 'harvest', 3,
  'After school, I ___ my homework.', '{"type":"multiple_choice","options":["do","make","play","go"],"correctAnswers":["do"]}'::jsonb, true, 'routine-homework'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'b519da58-2e25-4f08-8b1a-0456447f36e6', 'a1000001-0000-4000-8000-000000000002', 'harvest', 4,
  'Which word means ''on most days''?', '{"type":"multiple_choice","options":["usually","never","now","yesterday"],"correctAnswers":["usually"]}'::jsonb, true, 'routine-usually'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '03543409-dcde-4e15-83a6-218956d9d22b', 'a1000001-0000-4000-8000-000000000002', 'harvest', 5,
  'Mina does not walk to school on any day. She ___ walks to school.', '{"type":"multiple_choice","options":["never","always","usually","sometimes"],"correctAnswers":["never"]}'::jsonb, true, 'routine-never'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '24548ccb-0bc1-4ec8-8543-fee44feeaf6f', 'a1000001-0000-4000-8000-000000000002', 'deposit', 0,
  'Spell the word: wake up in the morning', '{"type":"deposit_spell","targetWord":"wake","spellHint":"wake up in the morning"}'::jsonb, true, 'deposit-routine-wake'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '870b3c8d-3681-4125-8f1c-0982c79b130d', 'a1000001-0000-4000-8000-000000000002', 'deposit', 1,
  'Spell the word: get dressed before school', '{"type":"deposit_spell","targetWord":"dressed","spellHint":"get dressed before school"}'::jsonb, true, 'deposit-routine-dressed'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '440e21e4-8413-4d67-89f9-757e85e0d880', 'a1000001-0000-4000-8000-000000000002', 'deposit', 2,
  'Spell the word: eat in the morning', '{"type":"deposit_spell","targetWord":"breakfast","spellHint":"eat in the morning"}'::jsonb, true, 'deposit-routine-breakfast'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '36dadb46-0a32-457b-8a39-38bfe66c56e6', 'a1000001-0000-4000-8000-000000000002', 'deposit', 3,
  'Spell the word: work after school', '{"type":"deposit_spell","targetWord":"homework","spellHint":"work after school"}'::jsonb, true, 'deposit-routine-homework'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '4c53acc0-4962-4fac-815d-c0dfad3515dc', 'a1000001-0000-4000-8000-000000000002', 'deposit', 4,
  'Spell the word: on most days', '{"type":"deposit_spell","targetWord":"usually","spellHint":"on most days"}'::jsonb, true, 'deposit-routine-usually'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'c01ae2f3-d32e-4b87-88ec-72334241f06a', 'a1000001-0000-4000-8000-000000000002', 'deposit', 5,
  'Spell the word: not on any day', '{"type":"deposit_spell","targetWord":"never","spellHint":"not on any day"}'::jsonb, true, 'deposit-routine-never'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '992bb4cc-2c99-4fca-8cbe-01e9ecb9e03d', 'a1000001-0000-4000-8000-000000000002', 'craft', 0,
  'Put the routine in order:', '{"type":"drag_sentence","wordBank":["I","usually","do my homework","after school"],"correctOrder":["I","usually","do my homework","after school"],"slotCount":4}'::jsonb, true, 'routine-craft'
);

-- school-life-a1
insert into public.live_game_question_sets (
  id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order
) values (
  'a1000001-0000-4000-8000-000000000003', 'school-life-a1', 'School Life', 'A1',
  'School', 'Understand and use common words for school places and activities.', 'Classroom, library, subjects, break time, homework, borrow and study.',
  1, 'published', 'system', 3
)
on conflict (slug) do update set
  title = excluded.title,
  level = excluded.level,
  topic = excluded.topic,
  learning_objective = excluded.learning_objective,
  description = excluded.description,
  version = excluded.version,
  status = excluded.status,
  visibility = excluded.visibility,
  sort_order = excluded.sort_order,
  updated_at = now();

delete from public.live_game_questions where set_id = 'a1000001-0000-4000-8000-000000000003';

insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'f5e6e289-7330-42d6-8054-2d4e371285d7', 'a1000001-0000-4000-8000-000000000003', 'harvest', 0,
  'Where can you borrow a book?', '{"type":"multiple_choice","options":["library","playground","canteen","office"],"correctAnswers":["library"]}'::jsonb, true, 'school-library'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '652393f5-08f0-48f3-8997-e1496d49ce24', 'a1000001-0000-4000-8000-000000000003', 'harvest', 1,
  'Math, English and science are school ___.', '{"type":"multiple_choice","options":["subjects","breaks","rooms","games"],"correctAnswers":["subjects"]}'::jsonb, true, 'school-subject'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '3cf321fc-9056-4793-8437-c2e0489966fa', 'a1000001-0000-4000-8000-000000000003', 'harvest', 2,
  'When do students rest and talk between lessons?', '{"type":"multiple_choice","options":["break time","homework","assembly","class time"],"correctAnswers":["break time"]}'::jsonb, true, 'school-break'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '9c1a80e3-1b7a-49f1-89c5-2c678e79c117', 'a1000001-0000-4000-8000-000000000003', 'harvest', 3,
  'If you borrow a pencil, what should you do later?', '{"type":"multiple_choice","options":["give it back","throw it away","hide it","break it"],"correctAnswers":["give it back"]}'::jsonb, true, 'school-borrow'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '422d7033-48b0-4b0d-8228-a5a2e2a28eff', 'a1000001-0000-4000-8000-000000000003', 'harvest', 4,
  'Choose the best sentence.', '{"type":"multiple_choice","options":["We study English at school.","We school English study.","We studies English.","We study at English."],"correctAnswers":["We study English at school."]}'::jsonb, true, 'school-study'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '4ee0e186-2660-4248-8dd0-84df306fc21a', 'a1000001-0000-4000-8000-000000000003', 'harvest', 5,
  'The teacher gives work to complete at home. It is ___.', '{"type":"multiple_choice","options":["homework","break time","a subject","a library"],"correctAnswers":["homework"]}'::jsonb, true, 'school-homework'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'e77facef-6f08-484f-8198-3ddc1918eff3', 'a1000001-0000-4000-8000-000000000003', 'deposit', 0,
  'Spell the word: borrow a book here', '{"type":"deposit_spell","targetWord":"library","spellHint":"borrow a book here"}'::jsonb, true, 'deposit-school-library'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '17d94dba-78fd-42c0-8be1-9a7589455928', 'a1000001-0000-4000-8000-000000000003', 'deposit', 1,
  'Spell the word: math, English and science', '{"type":"deposit_spell","targetWord":"subjects","spellHint":"math, English and science"}'::jsonb, true, 'deposit-school-subject'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'd34d1ca1-9c8b-4847-877f-32ab00fafa23', 'a1000001-0000-4000-8000-000000000003', 'deposit', 2,
  'Spell the word: rest between lessons', '{"type":"deposit_spell","targetWord":"break","spellHint":"rest between lessons"}'::jsonb, true, 'deposit-school-break'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '311aa9da-f00c-48ab-8068-f276792a7bc0', 'a1000001-0000-4000-8000-000000000003', 'deposit', 3,
  'Spell the word: give it back later', '{"type":"deposit_spell","targetWord":"back","spellHint":"give it back later"}'::jsonb, true, 'deposit-school-borrow'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '5eb94813-6563-4507-85e4-b0e4e69396c8', 'a1000001-0000-4000-8000-000000000003', 'deposit', 4,
  'Spell the word: learn at school', '{"type":"deposit_spell","targetWord":"study","spellHint":"learn at school"}'::jsonb, true, 'deposit-school-study'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'f7ef74c3-c902-4263-86f0-e1bc438a013d', 'a1000001-0000-4000-8000-000000000003', 'deposit', 5,
  'Spell the word: work to complete at home', '{"type":"deposit_spell","targetWord":"homework","spellHint":"work to complete at home"}'::jsonb, true, 'deposit-school-homework'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'b42567d3-cd82-4a71-89fc-5a6ad05a1d25', 'a1000001-0000-4000-8000-000000000003', 'craft', 0,
  'Put the school message in order:', '{"type":"drag_sentence","wordBank":["We","study English","in the classroom","every day"],"correctOrder":["We","study English","in the classroom","every day"],"slotCount":4}'::jsonb, true, 'school-craft'
);

-- describing-places-a1
insert into public.live_game_question_sets (
  id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order
) values (
  'a1000001-0000-4000-8000-000000000004', 'describing-places-a1', 'Describing Places', 'A1',
  'Places', 'Describe where things are using there is/there are and prepositions.', 'There is, there are, next to, behind, between and in front of.',
  1, 'published', 'system', 4
)
on conflict (slug) do update set
  title = excluded.title,
  level = excluded.level,
  topic = excluded.topic,
  learning_objective = excluded.learning_objective,
  description = excluded.description,
  version = excluded.version,
  status = excluded.status,
  visibility = excluded.visibility,
  sort_order = excluded.sort_order,
  updated_at = now();

delete from public.live_game_questions where set_id = 'a1000001-0000-4000-8000-000000000004';

insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '40d8973f-e287-4a03-8bb9-2cc9c1cd2913', 'a1000001-0000-4000-8000-000000000004', 'harvest', 0,
  'Choose the correct sentence for one bridge.', '{"type":"multiple_choice","options":["There is a bridge.","There are a bridge.","There a bridge is.","There bridge."],"correctAnswers":["There is a bridge."]}'::jsonb, true, 'place-there-is'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '7bf1d7bd-1e1c-4ee7-8022-a23c572a8770', 'a1000001-0000-4000-8000-000000000004', 'harvest', 1,
  'Choose the correct sentence for three trees.', '{"type":"multiple_choice","options":["There are three trees.","There is three trees.","There three trees are.","There are tree."],"correctAnswers":["There are three trees."]}'::jsonb, true, 'place-there-are'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '53d1eb51-0620-402e-89e6-7d298a8489e4', 'a1000001-0000-4000-8000-000000000004', 'harvest', 2,
  'The tree is beside the workbench. It is ___ the workbench.', '{"type":"multiple_choice","options":["next to","behind","between","under"],"correctAnswers":["next to"]}'::jsonb, true, 'place-next'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'f5a50dc2-403a-4585-8b15-2f9e6d06a74d', 'a1000001-0000-4000-8000-000000000004', 'harvest', 3,
  'The flag is in the middle of two trees. It is ___ the trees.', '{"type":"multiple_choice","options":["between","behind","next to","on"],"correctAnswers":["between"]}'::jsonb, true, 'place-between'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'b8bcd5a1-274f-419c-83a7-70cd8f574aeb', 'a1000001-0000-4000-8000-000000000004', 'harvest', 4,
  'The stump is at the back of the tree. It is ___ the tree.', '{"type":"multiple_choice","options":["behind","in front of","between","on"],"correctAnswers":["behind"]}'::jsonb, true, 'place-behind'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '0538e742-03af-4c03-8f22-ec0f01a02df3', 'a1000001-0000-4000-8000-000000000004', 'harvest', 5,
  'The workbench is before the river. It is ___ the river.', '{"type":"multiple_choice","options":["in front of","behind","under","between"],"correctAnswers":["in front of"]}'::jsonb, true, 'place-front'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '875bb3eb-b256-447e-8d73-bab2127752b1', 'a1000001-0000-4000-8000-000000000004', 'deposit', 0,
  'Spell the word: one bridge', '{"type":"deposit_spell","targetWord":"bridge","spellHint":"one bridge"}'::jsonb, true, 'deposit-place-there-is'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '39902038-4a72-4d1a-8749-d9ce2e3424f9', 'a1000001-0000-4000-8000-000000000004', 'deposit', 1,
  'Spell the word: three trees', '{"type":"deposit_spell","targetWord":"trees","spellHint":"three trees"}'::jsonb, true, 'deposit-place-there-are'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '4e737976-dc7e-4119-8145-6fb143a93476', 'a1000001-0000-4000-8000-000000000004', 'deposit', 2,
  'Spell the word: beside the workbench', '{"type":"deposit_spell","targetWord":"next","spellHint":"beside the workbench"}'::jsonb, true, 'deposit-place-next'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'aa770155-bebb-40b3-82b9-1ba839845938', 'a1000001-0000-4000-8000-000000000004', 'deposit', 3,
  'Spell the word: in the middle of two trees', '{"type":"deposit_spell","targetWord":"between","spellHint":"in the middle of two trees"}'::jsonb, true, 'deposit-place-between'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  'e7882121-6013-4b13-8f29-192aa8e95b5b', 'a1000001-0000-4000-8000-000000000004', 'deposit', 4,
  'Spell the word: at the back of the tree', '{"type":"deposit_spell","targetWord":"behind","spellHint":"at the back of the tree"}'::jsonb, true, 'deposit-place-behind'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '2f4ca6d7-8c58-43d7-8144-844d879dcca5', 'a1000001-0000-4000-8000-000000000004', 'deposit', 5,
  'Spell the word: before the river', '{"type":"deposit_spell","targetWord":"front","spellHint":"before the river"}'::jsonb, true, 'deposit-place-front'
);
insert into public.live_game_questions (
  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id
) values (
  '2ae47dbd-6205-4fec-845e-1b45d85b9805', 'a1000001-0000-4000-8000-000000000004', 'craft', 0,
  'Put the map description in order:', '{"type":"drag_sentence","wordBank":["There is","a workbench","next to","the river"],"correctOrder":["There is","a workbench","next to","the river"],"slotCount":4}'::jsonb, true, 'places-craft'
);

