-- Review metadata for teacher access requests (admin console).

alter table public.teacher_access_requests
  add column if not exists reviewed_by uuid,
  add column if not exists review_note text,
  add column if not exists provisioned_user_id uuid;

comment on column public.teacher_access_requests.reviewed_by is
  'Auth user id of the admin who approved or declined the request.';
comment on column public.teacher_access_requests.review_note is
  'Optional decline reason or internal note.';
comment on column public.teacher_access_requests.provisioned_user_id is
  'Auth user id created or updated when the request was approved.';
