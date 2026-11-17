import { KEYS } from "@/lib/local-store";
import { canonical, canonicalizeText } from "./canonical";
import { emptyMeta, emptyRows, type Meta, type RowMap } from "./engine";

/**
 * How this browser's saved data maps onto the cloud's rows. Most of what the app saves is a
 * single localStorage entry holding a map (slug → thing); each entry of that map is one row.
 * Settings and layout are one row each; the LeetCode cookie is one row in its own table.
 */
const EV = {
  store: "pacer-store-change",
  settings: "lc-tracker-settings-change",
  layout: "lc-tracker-layout-change",
  notes: "lc-tracker-notes-change",
};

const MAP_STORE = {
  problems: { key: KEYS.submissions, event: EV.store },
  manual: { key: KEYS.manual, event: EV.store },
  notes: { key: "lc-tracker-notes", event: EV.notes },
} as const;
type MapTable = keyof typeof MAP_STORE;

const SINGLE_STORE = {
  settings: { table: "settings", row: "settings", key: "lc-tracker-settings", event: EV.settings },
  layout: { table: "settings", row: "layout", key: "lc-tracker-layout-v3", event: EV.layout },
  cookie: { table: "secrets", row: "leetcode_credentials", key: KEYS.credentials, event: EV.store },
} as const;

/** Every event that means "something synced may have changed". */
export const CHANGE_EVENTS = Array.from(
  new Set([...Object.values(MAP_STORE), ...Object.values(SINGLE_STORE)].map((s) => s.event)),
);

const get = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

/** This computer's saved data as rows (canonical text per row). */
export function readLocalRows(): RowMap {
  const rows = emptyRows();
  for (const [table, { key }] of Object.entries(MAP_STORE) as [MapTable, { key: string }][]) {
    const map = get(key);
    if (map && typeof map === "object" && !Array.isArray(map)) {
      for (const [slug, v] of Object.entries(map as Record<string, unknown>)) {
        rows[table][slug] = canonical(v);
      }
    }
  }
  for (const s of Object.values(SINGLE_STORE)) {
    const v = get(s.key);
    if (v !== null) rows[s.table][s.row] = canonical(v);
  }
  return rows;
}

export type RowWrite = { table: keyof RowMap; key: string; value: string | null };

/** Apply rows from the cloud to this browser and tell the app, so open pages update without a reload. */
export function writeLocalRows(writes: RowWrite[]) {
  if (!writes.length) return;
  const events = new Set<string>();
  const maps: Partial<Record<MapTable, Record<string, unknown>>> = {};

  const save = (key: string, value: unknown | null, event: string) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
      events.add(event);
    } catch {}
  };

  for (const w of writes) {
    const parsed = w.value === null ? null : canonicalizeText(w.value) === null ? undefined : JSON.parse(w.value);
    if (parsed === undefined) continue;
    const single = Object.values(SINGLE_STORE).find((s) => s.table === w.table && s.row === w.key);
    if (single) {
      save(single.key, parsed, single.event);
      continue;
    }
    if (w.table in MAP_STORE) {
      const t = w.table as MapTable;
      const m = (maps[t] ??= { ...((get(MAP_STORE[t].key) as Record<string, unknown> | null) ?? {}) });
      if (parsed === null) delete m[w.key];
      else m[w.key] = parsed;
    }
  }
  for (const [t, m] of Object.entries(maps) as [MapTable, Record<string, unknown>][]) {
    save(MAP_STORE[t].key, Object.keys(m).length ? m : null, MAP_STORE[t].event);
  }
  events.forEach((e) => window.dispatchEvent(new Event(e)));
}

/** the sync key this computer uses to reach the cloud copy (never synced itself) */
export const SYNC_KEY_STORE = "pacer.syncKey";

const META_KEY = "pacer.cloudmeta2";

export function readMeta(): Meta {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) ?? "null") as Meta | null;
    if (raw && raw.snap && raw.edited && "cursor" in raw) return raw;
  } catch {}
  return emptyMeta();
}
export function writeMeta(m: Meta | null) {
  try {
    if (m) localStorage.setItem(META_KEY, JSON.stringify(m));
    else localStorage.removeItem(META_KEY);
  } catch {}
}
