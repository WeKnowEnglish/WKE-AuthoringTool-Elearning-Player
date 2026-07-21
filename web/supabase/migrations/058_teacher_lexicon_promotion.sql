-- D5 light: curriculum promotion queue fields on teacher lexicon entries.
-- No platform publish / alias yet — status tracking + review notes only.

alter table public.teacher_lexicon_entries
  add column if not exists promotion_status text not null default 'none'
    check (promotion_status in ('none', 'pending', 'returned', 'approved', 'rejected')),
  add column if not exists promotion_submitted_at timestamptz,
  add column if not exists promotion_reviewed_at timestamptz,
  add column if not exists promotion_review_note text,
  add column if not exists promotion_reviewed_by uuid references auth.users (id) on delete set null;

alter table public.teacher_lexicon_entries
  drop constraint if exists teacher_lexicon_promotion_note_len;

alter table public.teacher_lexicon_entries
  add constraint teacher_lexicon_promotion_note_len
  check (
    promotion_review_note is null
    or char_length(promotion_review_note) <= 500
  );

create index if not exists teacher_lexicon_promotion_pending_idx
  on public.teacher_lexicon_entries (promotion_submitted_at desc)
  where promotion_status = 'pending' and archived_at is null;
