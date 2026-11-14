import {
  ClientAuthError,
  catalogFor,
  recentAccepted,
  solvedPage,
  submissionsFor,
  whoami,
} from "@/lib/lc-client";
import {
  KEYS,
  loadCatalog,
  loadCredentials,
  loadSubmissions,
  writeStore,
  type StoredCatalog,
} from "@/lib/local-store";
import { NC150_SLUGS, BLIND75_SLUGS } from "@/lib/lists-data";
import type { SyncMode, SyncStatus, Sub } from "@/lib/sync-types";

type Report = (patch: Partial<SyncStatus>) => void;

/** how many recent accepted submissions an incremental sync looks at */
const RECENT = 50;
/** how many problems' submissions to download at once */
const CONCURRENCY = 3;
const WEEK = 7 * 24 * 3600 * 1000;

/**
 * Sync your LeetCode history into this browser. Runs in the page, talking to the stateless
 * /api/lc routes, so it works the same on a hosted site as locally. Progress is saved as it
 * goes; if the tab closes mid-way, the next sync picks up what's missing.
 */
export async function runSync(mode: SyncMode, report: Report): Promise<void> {
  const creds = loadCredentials();
  if (!creds) throw new Error("Not connected to LeetCode yet.");
  const cookie = { session: creds.session, csrf: creds.csrf };

  // An expired cookie doesn't error on LeetCode's side: it just looks like a signed-out user
  // with nothing solved. So check who we are before trusting any of the answers.
  report({ phase: "Checking your LeetCode session" });
  const { username } = await whoami(cookie);
  if (!username) throw new ClientAuthError();
  if (username !== creds.username) writeStore(KEYS.credentials, { ...creds, username });

  // which problems LeetCode says are solved
  report({ phase: "Checking which problems you've solved" });
  const solved: string[] = [];
  for (let skip = 0; ; skip += 100) {
    const page = await solvedPage(cookie, skip);
    solved.push(...page.slugs);
    if (skip + 100 >= page.total || page.slugs.length === 0) break;
  }

  // which of those need their submissions (re)fetched
  const stored = loadSubmissions();
  let todo: string[];
  if (mode === "full") {
    todo = solved;
  } else {
    const changed = new Set(solved.filter((s) => !stored[s]));
    const { recent } = await recentAccepted(username, RECENT);
    for (const r of recent) {
      const newest = stored[r.slug]?.reduce((m, s) => Math.max(m, s.t), 0) ?? 0;
      if (r.t > newest) changed.add(r.slug);
    }
    // so many new solves that the recent window may have missed some: do it properly
    todo =
      recent.length >= RECENT && recent.every((r) => changed.has(r.slug))
        ? solved
        : [...changed];
  }

  report({
    phase: todo.length ? "Fetching your submissions" : "Already up to date",
    total: todo.length,
    done: 0,
  });

  const next: Record<string, Sub[]> = { ...stored };
  let done = 0;
  let sinceSave = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let slug = queue.shift(); slug; slug = queue.shift()) {
      next[slug] = (await submissionsFor(cookie, slug)).subs;
      done++;
      report({ done });
      // save as we go so a long first sync survives the tab closing
      if (++sinceSave >= 25) {
        sinceSave = 0;
        writeStore(KEYS.submissions, next);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  if (!writeStore(KEYS.submissions, next)) {
    throw new Error("Your browser wouldn't save the data (storage full or blocked).");
  }

  // details (number, title, difficulty) for everything solved, and list totals
  await refreshCatalog(Object.keys(next), report);
  writeStore(KEYS.meta, { lastSyncedAt: Date.now() });
}

/** Fill in catalog details for any solved problem we don't have yet, and refresh list totals weekly. */
async function refreshCatalog(solvedSlugs: string[], report: Report) {
  const cat = loadCatalog();
  const missing = solvedSlugs.filter((s) => !cat?.entries[s]);
  const stale = !cat || Date.now() - cat.fetchedAt > WEEK;
  if (!missing.length && !stale) return;

  report({ phase: "Loading problem details" });
  // also ask for the list slugs so list views can show titles for unsolved ones later
  const want = Array.from(new Set([...solvedSlugs, ...NC150_SLUGS, ...BLIND75_SLUGS]));
  const res = await catalogFor(want);
  const merged: StoredCatalog = {
    fetchedAt: res.fetchedAt,
    entries: { ...(cat?.entries ?? {}), ...res.entries },
    totals: res.totals,
  };
  writeStore(KEYS.catalog, merged);
}
