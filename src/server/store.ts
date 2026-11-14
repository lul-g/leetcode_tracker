import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/** Everything the sync stores lives in ./data (git-ignored): the cookie, submissions, the problem catalog. */
const DIR = path.join(process.cwd(), "data");

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Write via a temp file so a crash mid-write can't leave half a JSON file behind. */
export async function writeJson(name: string, value: unknown) {
  await mkdir(DIR, { recursive: true });
  const file = path.join(DIR, name);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value), "utf8");
  await rename(tmp, file);
}

export async function removeJson(name: string) {
  const { rm } = await import("node:fs/promises");
  await rm(path.join(DIR, name), { force: true });
}

export type Credentials = { session: string; csrf: string; username: string | null };

export type Sub = {
  id: string;
  /** epoch seconds */
  t: number;
  ok: boolean;
  lang: string;
  /** runtime in ms, null when unknown */
  rt: number | null;
};

export type SyncMeta = {
  lastSyncedAt: number | null;
  /** slugs LeetCode reports as solved at the last sync */
  solvedCount: number;
};

export type CatalogEntry = {
  /** frontend id shown on LeetCode */
  n: number;
  title: string;
  /** 1 easy, 2 medium, 3 hard */
  d: 1 | 2 | 3;
  paid: boolean;
};

export type Catalog = { fetchedAt: number; problems: Record<string, CatalogEntry> };

export const FILES = {
  credentials: "credentials.json",
  submissions: "submissions.json",
  catalog: "catalog.json",
  meta: "sync-meta.json",
} as const;

export const loadCredentials = () => readJson<Credentials | null>(FILES.credentials, null);
export const loadSubmissions = () => readJson<Record<string, Sub[]>>(FILES.submissions, {});
export const loadCatalog = () => readJson<Catalog | null>(FILES.catalog, null);
export const loadMeta = () =>
  readJson<SyncMeta>(FILES.meta, { lastSyncedAt: null, solvedCount: 0 });
