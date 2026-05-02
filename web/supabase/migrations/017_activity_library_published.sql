-- Activity library visibility for students (separate from course lesson publish).

alter table public.activity_library_items
  add column if not exists published boolean not null default false;

create index if not exists activity_library_items_published_updated_idx
  on public.activity_library_items (updated_at desc)
  where published = true;

-- Students (anon + logged-in learners) may read published activities only.
drop policy if exists activity_library_items_student_select_published on public.activity_library_items;
create policy activity_library_items_student_select_published
  on public.activity_library_items
  for select
  to anon, authenticated
  using (published = true);
