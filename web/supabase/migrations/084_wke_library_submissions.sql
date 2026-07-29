-- =============================================================================
-- WKE Library Phase 2 — teacher submissions + review queue
-- =============================================================================
-- Teachers submit a snapshot from My Activity Bank → status pending.
-- Admins approve (published) or reject. Private bank is never auto-shared.
-- Writes still go through service role; teachers may SELECT their own submissions.
-- =============================================================================

alter table public.wke_library_items
  drop constraint if exists wke_library_items_status_check;

alter table public.wke_library_items
  add constraint wke_library_items_status_check
  check (status in ('draft', 'pending', 'published', 'rejected', 'retired'));

alter table public.wke_library_items
  add column if not exists credit_name text,
  add column if not exists submitter_note text,
  add column if not exists review_note text,
  add column if not exists submitted_from_studio_activity_id uuid
    references public.studio_activities (id) on delete set null,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.wke_library_items
  drop constraint if exists wke_library_items_credit_name_len;
alter table public.wke_library_items
  add constraint wke_library_items_credit_name_len
  check (credit_name is null or char_length(trim(credit_name)) between 1 and 80);

alter table public.wke_library_items
  drop constraint if exists wke_library_items_submitter_note_len;
alter table public.wke_library_items
  add constraint wke_library_items_submitter_note_len
  check (submitter_note is null or char_length(submitter_note) <= 500);

alter table public.wke_library_items
  drop constraint if exists wke_library_items_review_note_len;
alter table public.wke_library_items
  add constraint wke_library_items_review_note_len
  check (review_note is null or char_length(review_note) <= 500);

create index if not exists wke_library_items_pending_updated_idx
  on public.wke_library_items (updated_at desc)
  where status = 'pending';

create index if not exists wke_library_items_created_by_status_idx
  on public.wke_library_items (created_by, status, updated_at desc);

-- Teachers may also see their own non-published submissions (pending / rejected).
drop policy if exists wke_library_items_teacher_select_published on public.wke_library_items;
create policy wke_library_items_teacher_select_published
  on public.wke_library_items
  for select
  to authenticated
  using (
    public.is_teacher()
    and (
      status = 'published'
      or created_by = auth.uid()
    )
  );

comment on column public.wke_library_items.credit_name is
  'Optional public credit line shown after approval (e.g. teacher display name).';

comment on column public.wke_library_items.submitter_note is
  'Optional note from the teacher when submitting for review.';

comment on column public.wke_library_items.review_note is
  'Optional admin note on approve / reject.';

comment on column public.wke_library_items.submitted_from_studio_activity_id is
  'Private bank row the snapshot was taken from (informational; fork still copies).';
