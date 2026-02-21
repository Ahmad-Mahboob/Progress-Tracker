# Ramadan Study Progress Tracker

A static web app using HTML, TailwindCSS CDN, Vanilla JavaScript, and Supabase.

## 1) Supabase project setup

1. Go to https://supabase.com and create a new project.
2. Open your project dashboard.
3. In `Project Settings -> API`, copy:
   - `Project URL`
   - `anon public` key
4. Open `js/supabaseClient.js` and paste both values into:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 2) Enable authentication

1. In Supabase, go to `Authentication -> Providers -> Email`.
2. Enable Email provider.
3. Turn off `Confirm email` if you want instant signup for testing (optional).

## 3) Run SQL (table + RLS)

In Supabase SQL Editor, run:

```sql
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
```

## 4) Local run

Because this uses ES modules, run with a static server (not file://):

```bash
# Option A
npx serve .

# Option B
python -m http.server 5500
```

Then open `http://localhost:5500/login.html`.

## 5) GitHub Pages deployment

1. Push this repository to GitHub.
2. In GitHub repo settings, open `Pages`.
3. Set Source to `Deploy from a branch`.
4. Choose branch `main` and folder `/ (root)`.
5. Save and wait for deployment.
6. Open: `https://<your-username>.github.io/<repo-name>/login.html`

## Notes

- Keep Supabase anon key in frontend (this is expected for Supabase client apps).
- Data safety is enforced by Row Level Security policies.
- Dashboard shows current week only (Monday to Sunday).
