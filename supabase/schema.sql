-- Pacer cloud sync: one row per signed-in user holding that user's synced data
-- (goal and dates, card layout, notes, manual solves, LeetCode cookie).
-- Paste this whole file into the Supabase SQL Editor and click Run. Safe to run twice.

create table if not exists public.pacer_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: a signed-in user can only ever see and change their own row.
alter table public.pacer_state enable row level security;

drop policy if exists "read own state" on public.pacer_state;
create policy "read own state" on public.pacer_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own state" on public.pacer_state;
create policy "insert own state" on public.pacer_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own state" on public.pacer_state;
create policy "update own state" on public.pacer_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy on purpose: removing your account removes the row.
