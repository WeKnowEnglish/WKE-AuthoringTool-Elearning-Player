-- Add curriculum metadata fields for planning and reporting.

alter table public.courses
  add column if not exists standards text not null default '',
  add column if not exists outcomes text not null default '';

alter table public.modules
  add column if not exists standards text not null default '',
  add column if not exists outcomes text not null default '';
