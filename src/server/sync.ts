import "server-only";
import {
  AuthError,
  fetchCatalog,
  fetchUsername,
  fetchRecentAccepted,
  fetchSolvedSlugs,
  fetchSubmissions,
} from "./leetcode";
import {
  FILES,
  loadCatalog,
  loadCredentials,
  loadSubmissions,
  writeJson,
  type Sub,
} from "./store";

export type SyncMode = "incremental" | "full";

export type SyncState = {
  running: boolean;
  mode: SyncMode | null;
  phase: string;
  done: number;
  total: number;
  error: string | null;
  /** true when LeetCode rejected the cookie, so the UI asks for a new one */
  authError: boolean;
  finishedAt: number | null;
};

const IDLE: SyncState = {
  running: false,
  mode: null,
  phase: "",
  done: 0,
  total: 0,
  error: null,
  authError: false,
  finishedAt: null,
};

// kept on globalThis so dev hot-reloads don't forget a running sync
const g = globalThis as unknown as { __pacerSync?: SyncState };
const state = (g.__pacerSync ??= { ...IDLE });

export const getSyncState = (): SyncState => ({ ...state });

const WEEK = 7 * 24 * 3600 * 1000;
/** how many recent accepted submissions an incremental sync looks at */
const RECENT = 50;

/** Start a sync in the background. Returns false if one is already running. */
export function startSync(mode: SyncMode): boolean {
  if (state.running) return false;
  Object.assign(state, IDLE, { running: true, mode, phase: "Starting" });
  run(mode)
    .catch((e: unknown) => {
      state.error = e instanceof Error ? e.message : String(e);
      state.authError = e instanceof AuthError;
    })
    .finally(() => {
      state.running = false;
      state.phase = "";
      state.finishedAt = Date.now();
    });
  return true;
}

async function run(mode: SyncMode) {
  const creds = await loadCredentials();
  if (!creds) throw new Error("Not connected to LeetCode yet.");
  const cookie = { session: creds.session, csrf: creds.csrf };

  // an expired cookie doesn't error on LeetCode's side, it just looks like a signed-out user
  // with nothing solved, so check who we are before trusting any of the answers
  state.phase = "Checking your LeetCode session";
  const username = await fetchUsername(cookie);
  if (!username) throw new AuthError();
  if (username !== creds.username) {
    creds.username = username;
    await writeJson(FILES.credentials, creds);
  }

  // 1. the catalog of all problems (public); refreshed weekly or when it's missing
  state.phase = "Loading the problem catalog";
  let catalog = await loadCatalog();
  if (!catalog || Date.now() - catalog.fetchedAt > WEEK) {
    try {
      catalog = await fetchCatalog();
      await writeJson(FILES.catalog, catalog);
    } catch (e) {
      if (!catalog) throw e; // an old catalog is still usable
    }
  }

  // 2. which problems LeetCode says are solved
  state.phase = "Checking which problems you've solved";
  const solved = await fetchSolvedSlugs(cookie);
  const stored = await loadSubmissions();

  // 3. which of those need their submissions (re)fetched
  let todo: string[];
  if (mode === "full") {
    todo = solved;
  } else {
    const changed = new Set(solved.filter((s) => !stored[s]));
    if (creds.username) {
      const recent = await fetchRecentAccepted(creds.username, RECENT);
      for (const r of recent) {
        const known = stored[r.slug];
        const newest = known?.reduce((m, s) => Math.max(m, s.t), 0) ?? 0;
        if (r.t > newest) changed.add(r.slug);
      }
      // so many new solves that the recent window may have missed some: do it properly
      if (recent.length >= RECENT && recent.every((r) => changed.has(r.slug))) {
        todo = solved;
      } else todo = [...changed];
    } else todo = [...changed];
  }

  state.total = todo.length;
  state.done = 0;
  state.phase = todo.length ? "Fetching your submissions" : "Already up to date";

  const next: Record<string, Sub[]> = { ...stored };
  for (const slug of todo) {
    next[slug] = await fetchSubmissions(cookie, slug);
    state.done++;
    // save as we go so a long first sync survives being interrupted
    if (state.done % 25 === 0) await writeJson(FILES.submissions, next);
  }
  await writeJson(FILES.submissions, next);
  await writeJson(FILES.meta, { lastSyncedAt: Date.now(), solvedCount: solved.length });
}
