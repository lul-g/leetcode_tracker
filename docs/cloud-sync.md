# Cloud sync (Supabase, no login)

Pacer keeps your data in the browser. To have the same data on every computer, connect a free
Supabase project and give each computer one passphrase, the **sync key**. There are no accounts,
emails or passwords. Until you set this up the app works exactly as before, on one browser.

**What syncs:** goal and dates, dashboard card layout, notes and "needs review" flags, solves you
logged by hand, your completed problems (every submission downloaded from LeetCode), and your
LeetCode cookie. So a new computer needs only the sync key: the cookie arrives with it and the
LeetCode sync carries on by itself.

## How it is protected

Your database is reachable **only from Pacer's own server**, using Supabase's secret key, which
lives in Vercel's environment settings and never reaches a browser. The browser talks only to
Pacer's `/api/cloud`, and every request must carry your sync key. Without the key the server
hands over nothing. The database itself has no public access at all.

Because your LeetCode cookie is stored here, **pick a long, unguessable sync key** (a few random
words is fine) and don't share it.

## One-time setup (about 10 minutes)

1. **Create a project** at <https://supabase.com> (the free plan is enough). In the security
   options keep **Enable Data API** and **Enable automatic RLS** checked, and **uncheck
   "Automatically expose new tables"** (Supabase recommends it; Pacer doesn't need it).
2. **Create the table.** *SQL Editor*: paste [`supabase/schema.sql`](../supabase/schema.sql) and
   click *Run*.
3. **Copy two values** from *Project Settings, API*:
   - the **Project URL**
   - the **secret key** (called `service_role` or `secret`). This one is powerful: never paste it
     into a chat, a file in the repo, or anything that starts with `NEXT_PUBLIC_`.
4. **Choose a sync key**, any long passphrase you like.
5. **Give the server those three values.**
   - On Vercel: *Project, Settings, Environment Variables*, add the three below, then **redeploy**.
   - Locally: put them in `.env.local` (see `.env.example`) and restart `npm run dev`.
   ```
   SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-secret-key
   PACER_SYNC_KEY=your-long-passphrase
   ```
6. **On each computer:** *Settings, Sync*, enter the sync key, *Connect*. The first computer
   uploads what it has; the next ones receive it.

## How it behaves

- Edits are sent a few seconds after you make them. Other computers pick them up when you open or
  return to the app, or when you press *Sync now* in *Settings, Sync*.
- If two computers change things at the same time, solves, notes and downloaded submissions from
  both are kept (nothing is lost). For everything else (goal, dates, layout, cookie) the most
  recent edit wins.
- The first time a computer that already has data connects, the cloud's goal, layout and cookie win
  so a fresh computer can never wipe what you saved; solves, notes and submissions are merged.
- *Remove key* stops syncing on that computer and keeps its data.
- The whole synced document must stay under about 4 MB (a few thousand problems is far below it).

## Troubleshooting

- **"Cloud sync isn't set up on the server"**: one of the three variables is missing, or Vercel
  hasn't been redeployed since you added them.
- **"That sync key isn't right"**: the key typed in the app must match `PACER_SYNC_KEY` exactly.
- **"permission denied for table pacer_data"**: the SQL grant is missing (it is part of the current
  `supabase/schema.sql`). Run `grant select, insert, update on table public.pacer_data to
  service_role;` in the SQL Editor. This happens when "Automatically expose new tables" is off.
- **Other database errors**: check that the SQL in step 2 ran, and that `SUPABASE_URL` and the
  secret key are from the same project.
