# Cloud sync (Supabase)

Pacer keeps your data in the browser. To have the same goal, layout, notes, manual solves and
LeetCode cookie on every computer, connect a free Supabase project and sign in. Until you do,
the app works exactly as before, on one browser.

**What syncs:** goal and dates, dashboard card layout, notes and "needs review" flags, solves you
logged by hand, and your LeetCode cookie. **What doesn't:** your LeetCode history. Each computer
pulls that fresh from LeetCode (and the cookie arriving by sync means it starts on its own).

## One-time setup (about 10 minutes)

1. **Create a project** at <https://supabase.com> (the free plan is enough). Pick any region.
2. **Create the table.** In the project, open *SQL Editor*, paste the contents of
   [`supabase/schema.sql`](../supabase/schema.sql), and click *Run*.
3. **Turn on email sign-in.** *Authentication, Providers, Email*: make sure it is enabled. For the
   simplest first run, switch **off** "Confirm email" so creating your account signs you straight
   in (otherwise you must click a link in an email first).
4. **Copy two values.** *Project Settings, API*: the **Project URL**, and the **public key**
   (labelled `anon` or `publishable`). Never use the `service_role` / secret key here.
5. **Give the app those values.**
   - Locally: create `.env.local` in the project root (see `.env.example`):
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
     ```
     then restart `npm run dev`.
   - On Vercel: *Project, Settings, Environment Variables*, add the same two, then **redeploy**.
     These values are baked in when the site is built, so a redeploy is required.
6. **Create your account** in the app: *Settings, Account, Create account*. Then sign in with the
   same email and password on your other computers.
7. **Lock the door.** Once your account exists, in Supabase go to *Authentication, Sign In / Providers*
   (or *Settings*) and turn **off** "Allow new users to sign up", so nobody else can make an account
   on your project.

## How it behaves

- Edits are sent to the cloud a moment after you make them, and other computers pick them up when
  you open or return to the app (or press *Sync now* in Settings, Account).
- If two computers change things at the same time, solves you logged and notes from both are kept.
  For everything else (goal, dates, layout, cookie) the most recent edit wins.
- The first time a computer that already has data signs in, the cloud's goal, layout and cookie win
  so a fresh computer can never wipe what you saved; solves and notes are merged.
- Signing out keeps the data on that computer and stops syncing.

## Privacy

Your cookie is stored in your own row of your own Supabase project, readable only by you
(row-level security). It is the same trust as keeping it in the browser, just on a server you
control. If you'd rather not store it in the cloud, don't sign in on a computer you don't trust and
rotate the cookie by signing out of LeetCode.

## Testing without Supabase

Set `NEXT_PUBLIC_SUPABASE_URL=mock` to use a fake cloud kept in the browser. It exists only to test
the sign-in and sync screens and is not secure.
