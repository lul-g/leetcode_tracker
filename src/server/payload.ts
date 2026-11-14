import "server-only";
import type { Counts, Difficulty } from "@/lib/data";
import { slugsOfList, topicOf, listsOf, NC150_SLUGS } from "@/lib/lists-data";
import type { ProblemRecord, DataPayload } from "@/lib/sync-types";
import { loadCatalog, loadCredentials, loadMeta, loadSubmissions, type Catalog } from "./store";

const LEVEL: Record<number, Difficulty> = { 1: "easy", 2: "medium", 3: "hard" };

const titleFromSlug = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function countBy(catalog: Catalog, slugs: string[] | null): Counts {
  const c: Counts = { easy: 0, medium: 0, hard: 0 };
  const entries = slugs
    ? slugs.map((s) => catalog.problems[s]).filter(Boolean)
    : Object.values(catalog.problems);
  for (const e of entries) c[LEVEL[e.d]]++;
  return c;
}

/** Everything the app needs, read from the local store. Never includes the cookie. */
export async function buildPayload(): Promise<DataPayload> {
  const [creds, meta, subs, catalog] = await Promise.all([
    loadCredentials(),
    loadMeta(),
    loadSubmissions(),
    loadCatalog(),
  ]);

  const problems: ProblemRecord[] = [];
  for (const [slug, list] of Object.entries(subs)) {
    if (!list.some((s) => s.ok)) continue;
    const entry = catalog?.problems[slug];
    problems.push({
      slug,
      number: entry?.n ?? 0,
      title: entry?.title ?? titleFromSlug(slug),
      difficulty: LEVEL[entry?.d ?? 2],
      topic: topicOf(slug),
      lists: listsOf(slug),
      subs: list.map((s) => ({ t: s.t, ok: s.ok, lang: s.lang, rt: s.rt })),
    });
  }

  return {
    connected: !!creds,
    username: creds?.username ?? null,
    lastSyncedAt: meta.lastSyncedAt,
    hasData: meta.lastSyncedAt !== null,
    problems,
    listTotals: catalog
      ? {
          goal: countBy(catalog, null),
          blind75: countBy(catalog, slugsOfList("blind75")),
          nc150: countBy(catalog, NC150_SLUGS),
        }
      : null,
  };
}
