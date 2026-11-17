-- Pacer cloud sync: ONE row holding everything that syncs between your computers
-- (goal and dates, card layout, notes, manual solves, completed problems, LeetCode cookie).
-- Paste this whole file into the Supabase SQL Editor and click Run. Safe to run twice.

-- The first version of Pacer used a per-user table. It was never used for real data; drop it.
drop table if exists public.pacer_state;

create table if not exists public.pacer_data (
  id         text        primary key default 'me',
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Lock it down. There is no login, so the public roles get NOTHING: no policies, no privileges.
-- Only Pacer's own server, using the project's secret (service-role) key, can read or write it.
alter table public.pacer_data enable row level security;
revoke all on table public.pacer_data from anon, authenticated;

-- Pacer's server uses the secret key, which runs as the service_role. It bypasses row-level
-- security but still needs the table privilege, and Supabase only hands that out automatically
-- when "Automatically expose new tables" is on. Grant it explicitly so it works either way.
grant select, insert, update on table public.pacer_data to service_role;
