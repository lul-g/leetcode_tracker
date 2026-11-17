import { KEYS } from "@/lib/local-store";
import { SECTION_IDS, emptyMeta, type LocalRaw, type Meta, type SectionId } from "./engine";

/** Which localStorage key holds each synced section, and the event the app listens for when it changes. */
export const SECTION_STORE: Record<SectionId, { key: string; event: string }> = {
  settings: { key: "lc-tracker-settings", event: "lc-tracker-settings-change" },
  layout: { key: "lc-tracker-layout-v3", event: "lc-tracker-layout-change" },
  manual: { key: KEYS.manual, event: "pacer-store-change" },
  notes: { key: "lc-tracker-notes", event: "lc-tracker-notes-change" },
  cookie: { key: KEYS.credentials, event: "pacer-store-change" },
};

/** Every event that means "something synced may have changed". */
export const CHANGE_EVENTS = Array.from(new Set(Object.values(SECTION_STORE).map((s) => s.event)));

export function readLocalRaw(): LocalRaw {
  const out = {} as LocalRaw;
  for (const s of SECTION_IDS) {
    try {
      out[s] = localStorage.getItem(SECTION_STORE[s].key);
    } catch {
      out[s] = null;
    }
  }
  return out;
}

/** Write sections into this browser and tell the app, so open pages update without a reload. */
export function writeLocalRaw(patch: Partial<Record<SectionId, string | null>>) {
  const events = new Set<string>();
  for (const [s, v] of Object.entries(patch) as [SectionId, string | null][]) {
    const { key, event } = SECTION_STORE[s];
    try {
      if (v === null) localStorage.removeItem(key);
      else localStorage.setItem(key, v);
      events.add(event);
    } catch {}
  }
  events.forEach((e) => window.dispatchEvent(new Event(e)));
}

const META_KEY = "pacer.cloudmeta";
export type StoredMeta = { uid: string | null; meta: Meta };

export function readMeta(): StoredMeta {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) ?? "null") as StoredMeta | null;
    if (raw?.meta) return raw;
  } catch {}
  return { uid: null, meta: emptyMeta() };
}
export function writeMeta(m: StoredMeta | null) {
  try {
    if (m) localStorage.setItem(META_KEY, JSON.stringify(m));
    else localStorage.removeItem(META_KEY);
  } catch {}
}
