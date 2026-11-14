# LeetCode Goal Tracker — SPEC

One-page dashboard that answers: **am I on track to hit my LeetCode goal by my target date?**

## 1. Goal & counting rules

- User sets in-app (editable any time): **goal count** (default 1200), **target date**, **start date**.
- Only **distinct problems** (by slug) count, and only if they have an **Accepted submission on/after the start date**.
  - Pre-start solves (the original 26) are ignored. Re-solving one of them after the start date counts it, with that new submission's date.
  - A problem's solve date = its **first Accepted submission on/after start date**, in the user's local timezone.
- Workflow context: user solves on NeetCode, copies to LeetCode. LeetCode is the single source of truth; NeetCode is not integrated (no API).
- NeetCode 150 / Blind 75 lists are bundled as static data (list of LeetCode slugs) and used only for list filtering and "next up".

## 2. Stack & hosting

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**, deployed on **Vercel**.
- **Supabase (Postgres)** for storage. Single user.
- **No background cron.** Data refreshes only when the user clicks **Refresh** (plus one optional auto-refresh on page open if last sync > N minutes).
- Access protection: single shared password (or Supabase Auth, one user) so the public URL isn't open.
- Sync runs in a server route handler (`POST /api/sync`), never in the browser (CORS + cookie secrecy).
- **Known risk:** LeetCode may block or rate-limit requests from datacenter IPs (Vercel). If sync fails in production, fallback is running the same app locally against the same Supabase DB. Verify this first, before building UI.

## 3. LeetCode integration

- Endpoint: `https://leetcode.com/graphql` (unofficial; may change).
- Auth: user pastes `LEETCODE_SESSION` + `csrftoken` in Settings. Stored server-side only (Supabase table behind RLS / env), never sent to the client after saving.
- Pull on Refresh:
  - Full submission history (paginated) with timestamps, status, language, runtime.
  - Problem metadata for any new slug: number, title, difficulty, topic tags.
- Incremental: fetch pages until reaching the last-seen submission id.
- Failure handling: 401/403 → banner "Cookie expired, re-paste it"; other errors → toast with retry. Never wipe existing data on failure.

## 4. Data model

- `settings` — goal, target_date, start_date, username, cookie (encrypted), last_synced_at
- `problems` — slug (pk), number, title, difficulty, tags[]
- `submissions` — id (pk), slug, status, lang, runtime_ms, submitted_at
- `solves` — view/table derived from submissions: slug, solved_at (first AC ≥ start_date)
- `lists`, `list_items` — static NeetCode 150, Blind 75, etc.
- `sync_log` — started_at, finished_at, new_submissions, error

## 5. Dashboard (single page)

### 5.1 Hero card
- Ring: `solved / goal`, Easy / Medium / Hard segments.
- **Easy / Med / Hard chips are clickable filters.** Selecting one filters *every* stat, chart and the calendar on the page. Click again to clear.
- List switcher: All · NeetCode 150 · Blind 75 (shows progress within that list).

### 5.2 Pace panel (the core)
- **Remaining** = goal − solved
- **Days left** = target_date − today
- **Required pace** = remaining / days_left (per day and per week)
- **Current pace** = trailing 7-day and 30-day average (per day)
- **Projected finish date** = today + remaining / trailing rate (show for both 7d and 30d rate)
- **Ahead / behind** = solved − ideal(today), where ideal is a straight line from 0 at start_date to goal at target_date. Shown as "+12 ahead" / "−8 behind" plus the days equivalent.
- Status pill: On track / Behind / Ahead / Goal reached / Target date passed.
- **Burn-up chart:** actual cumulative solves vs. ideal line, with a dashed projection to the end.

### 5.3 Time-range views
Toggle: **Week · Month · 3M · 6M · 12M · All-time**.
For the selected range show:
- Solved in range, avg per day, best day, active days, and delta vs. the previous equal-length range.
- Bar chart: solves per day (week/month) or per week (3M/6M/12M).
- Difficulty split within the range.

### 5.4 Calendar & streaks
- Monthly calendar (like the reference design): solved days green with count, missed days dashed red, today highlighted, prev/next month.
- Current streak, best streak.
- Toggle to a year heatmap.

### 5.5 Insights
- Topic breakdown (solved per tag) with weakest topics highlighted.
- Difficulty mix over time.
- Acceptance rate and attempts per problem (from submissions).
- Recent solves list (title, difficulty, date) and a "next up" from the selected list.

### 5.6 Header / settings
- Refresh button (shows spinner, last-synced time, new-solves count after sync).
- Settings drawer: goal, target date, start date, LeetCode username, cookie.

## 6. Non-functional

- Timezone: all day bucketing in the user's local timezone (not UTC) from submission timestamps. The public submission calendar is not used because it buckets by UTC.
- Dark theme default; layout works on mobile (single column).
- Everything derived from raw `submissions`, so changing goal / dates / start date recomputes instantly without re-syncing.

## 7. Build order

1. Spike: prove the sync works from a Vercel route handler with the real cookie (go/no-go on hosting).
2. Schema + sync + Settings.
3. Hero ring + difficulty filter + pace panel.
4. Time-range views + burn-up chart.
5. Calendar, streaks, insights.
6. Lists (NeetCode 150 / Blind 75) and polish.

## 8. Open items

- Exact target date and goal (set in-app, not hard-coded).
- Auth choice for the hosted page: shared password vs. Supabase Auth.
