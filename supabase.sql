create extension if not exists "pgcrypto";

create table if not exists public.daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  english_chapters_completed integer not null default 0,
  urdu_items_completed integer not null default 0,
  pakstudies_pages_completed integer not null default 0,
  quran_surahs_completed integer not null default 0,
  essay_completed boolean not null default false,
  notes text,
  created_at timestamp with time zone not null default now()
);

alter table public.daily_progress enable row level security;

create policy "Users can insert own progress"
on public.daily_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read own progress"
on public.daily_progress
for select
to authenticated
using (auth.uid() = user_id);
