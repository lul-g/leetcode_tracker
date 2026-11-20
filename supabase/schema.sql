-- Pacer cloud sync: your data as real tables you can browse in Supabase.
-- Paste this whole file into the Supabase SQL Editor and click Run. Safe to run twice.
--
--   pacer_problems       one row per problem you've solved on LeetCode, with every submission
--   pacer_manual_solves  problems you logged by hand (e.g. premium ones solved on NeetCode)
--   pacer_notes          your notes, "needs review" flags (and why), categories, one row per problem
--   pacer_settings       goal and dates, dashboard layout
--   pacer_secrets        your LeetCode cookie, kept apart from everything else
--
-- (If you ran an earlier version of this file, the old single table `pacer_data` is no longer used
--  and can be dropped once you're happy: drop table public.pacer_data;)

create table if not exists public.pacer_problems (
  slug              text        primary key,
  number            integer,
  title             text,
  difficulty        text,
  first_accepted_at timestamptz,
  accepted_count    integer     not null default 0,
  attempt_count     integer     not null default 0,
  submissions       jsonb       not null default '[]'::jsonb,
  edited_at         bigint      not null default 0,
  updated_at        timestamptz not null default now()
);

create table if not exists public.pacer_manual_solves (
  slug       text        primary key,
  title      text        not null,
  number     integer     not null default 0,
  difficulty text        not null,
  solved_on  date        not null,
  deleted    boolean     not null default false,
  edited_at  bigint      not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.pacer_notes (
  slug         text        primary key,
  note         text        not null default '',
  needs_review boolean     not null default false,
  review_reason text,
  category      text,
  redone        jsonb,
  deleted      boolean     not null default false,
  edited_at    bigint      not null default 0,
  updated_at   timestamptz not null default now()
);

-- Added after the first version: why a problem was flagged ('hint' or 'solution'), your own category
-- for it, and the days you redid it. Safe to run on a table that already has them.
alter table public.pacer_notes add column if not exists review_reason text;
alter table public.pacer_notes add column if not exists category      text;
alter table public.pacer_notes add column if not exists redone        jsonb;

create table if not exists public.pacer_settings (
  key        text        primary key,
  value      jsonb,
  deleted    boolean     not null default false,
  edited_at  bigint      not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.pacer_secrets (
  name       text        primary key,
  value      jsonb,
  deleted    boolean     not null default false,
  edited_at  bigint      not null default 0,
  updated_at timestamptz not null default now()
);

-- Sync reads "what changed since last time", so index the change time.
create index if not exists pacer_problems_updated      on public.pacer_problems      (updated_at);
create index if not exists pacer_manual_solves_updated on public.pacer_manual_solves (updated_at);
create index if not exists pacer_notes_updated         on public.pacer_notes         (updated_at);
create index if not exists pacer_settings_updated      on public.pacer_settings      (updated_at);
create index if not exists pacer_secrets_updated       on public.pacer_secrets       (updated_at);

-- Lock everything down. There is no login, so the public roles get NOTHING: no policies, no
-- privileges. Only Pacer's own server, using the project's secret (service-role) key, can read or
-- write these tables. The service_role bypasses row-level security but still needs the table
-- privilege, which Supabase only hands out automatically when "Automatically expose new tables"
-- is on, so it is granted explicitly here. No delete: removals are recorded as `deleted = true`.
alter table public.pacer_problems      enable row level security;
alter table public.pacer_manual_solves enable row level security;
alter table public.pacer_notes         enable row level security;
alter table public.pacer_settings      enable row level security;
alter table public.pacer_secrets       enable row level security;

revoke all on table public.pacer_problems, public.pacer_manual_solves, public.pacer_notes,
  public.pacer_settings, public.pacer_secrets from anon, authenticated;

grant select, insert, update on table public.pacer_problems, public.pacer_manual_solves,
  public.pacer_notes, public.pacer_settings, public.pacer_secrets to service_role;
