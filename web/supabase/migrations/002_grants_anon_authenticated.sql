-- If catalog queries fail with "permission denied for table", run this in Supabase SQL Editor.
-- (Tables created only via raw SQL sometimes miss default API role grants.)

grant usage on schema public to anon, authenticated;

grant select on public.modules to anon, authenticated;
grant select on public.lessons to anon, authenticated;
grant select on public.lesson_screens to anon, authenticated;
grant select on public.lesson_skills to anon, authenticated;

grant select, insert, update, delete on public.modules to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.lesson_screens to authenticated;
grant select, insert, update, delete on public.lesson_skills to authenticated;
grant select, insert, update, delete on public.student_lesson_progress to authenticated;
