-- Welcome email tracking for approved teacher access requests.

alter table public.teacher_access_requests
  add column if not exists welcome_email_status text
    check (welcome_email_status is null or welcome_email_status in ('pending', 'sent', 'failed')),
  add column if not exists welcome_emailed_at timestamptz;

comment on column public.teacher_access_requests.welcome_email_status is
  'Result of the teacher welcome email after approval (sent/failed).';
comment on column public.teacher_access_requests.welcome_emailed_at is
  'When the welcome email last succeeded.';
