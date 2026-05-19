-- Student accounts (username + PIN) — profile row created on registration via service role.

create table public.student_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_normalized text not null,
  display_name text not null,
  learning_band text check (learning_band in ('a1', 'a2', 'b1')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_profiles_username_normalized_unique unique (username_normalized)
);

create index student_profiles_username_normalized_idx
  on public.student_profiles (username_normalized);

alter table public.student_profiles enable row level security;

create policy "student_profiles_select_own"
  on public.student_profiles for select
  using (auth.uid() = user_id);

create policy "student_profiles_update_own"
  on public.student_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, update on public.student_profiles to authenticated;
