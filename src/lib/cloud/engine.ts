/**
 * The merge rules for cloud sync, as pure functions so they can be tested without a browser
 * or a database. Nothing in here touches storage or the network.
 *
 * Data is split into a few "sections" (settings, layout, manual solves, notes, your completed
 * problems' submissions, cookie). Each
 * section is stored as a raw JSON string and carries the time it last changed. A device keeps a
 * `Meta` of what it last agreed on with the cloud, which is how it tells "I changed this" from
 * "the cloud changed this".
 */

export type SectionId = "settings" | "layout" | "manual" | "notes" | "submissions" | "cookie";

export const SECTION_IDS: SectionId[] = [
  "settings",
  "layout",
  "manual",
  "notes",
  "submissions",
  "cookie",
];

/** Maps where two devices adding different entries should keep both. */
const MERGEABLE = new Set<SectionId>(["manual", "notes", "submissions"]);

export type RemoteSection = { v: string | null; at: number };
export type Remote = Partial<Record<SectionId, RemoteSection>>;
export type LocalRaw = Record<SectionId, string | null>;

export type Meta = {
  /** the cloud timestamp this device last agreed on, per section */
  at: Partial<Record<SectionId, number>>;
  /** the raw value both sides had at that moment */
  snap: Partial<Record<SectionId, string | null>>;
  /** when a local change to a section was first noticed */
  edited: Partial<Record<SectionId, number>>;
};

export const emptyMeta = (): Meta => ({ at: {}, snap: {}, edited: {} });

/** Note when each section changed locally, and forget it again once a section matches the last sync. */
export function noteLocalChanges(local: LocalRaw, meta: Meta, now: number): Meta {
  const edited = { ...meta.edited };
  for (const s of SECTION_IDS) {
    const changed = (local[s] ?? null) !== (meta.snap[s] ?? null);
    if (changed && edited[s] === undefined) edited[s] = now;
    if (!changed) delete edited[s];
  }
  return { ...meta, edited };
}

function parseMap(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Union of two maps. On the same key, `preferLocal` decides whose entry wins. */
export function mergeMaps(local: string | null, remote: string | null, preferLocal: boolean) {
  const l = parseMap(local);
  const r = parseMap(remote);
  const merged = preferLocal ? { ...r, ...l } : { ...l, ...r };
  return Object.keys(merged).length ? JSON.stringify(merged) : null;
}

/**
 * Submissions, keyed by problem slug: for each problem keep every submission either side knows
 * about (matched by submission id), oldest first. Nothing downloaded is ever dropped.
 */
export function mergeSubmissions(local: string | null, remote: string | null) {
  const l = parseMap(local) as Record<string, { id: string; t: number }[]>;
  const r = parseMap(remote) as Record<string, { id: string; t: number }[]>;
  const out: Record<string, { id: string; t: number }[]> = {};
  for (const slug of new Set([...Object.keys(l), ...Object.keys(r)])) {
    const byId = new Map<string, { id: string; t: number }>();
    for (const sub of [...(r[slug] ?? []), ...(l[slug] ?? [])]) byId.set(sub.id, sub);
    out[slug] = [...byId.values()].sort((a, b) => a.t - b.t);
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

export type Result = {
  /** values to write into this browser's storage */
  writeLocal: Partial<Record<SectionId, string | null>>;
  /** sections to store in the cloud */
  pushRemote: Remote;
  meta: Meta;
};

/**
 * Decide, section by section, what to take from the cloud and what to send to it.
 *
 *  - only the cloud changed  -> take it
 *  - only this device changed -> send it
 *  - both changed            -> maps (manual solves, notes) are merged so nothing is lost;
 *                               anything else goes to whichever edit is newer, except the very
 *                               first time a device meets the cloud, when the cloud wins so a
 *                               fresh computer can never wipe the data you already saved.
 */
export function reconcile(input: {
  local: LocalRaw;
  remote: Remote;
  meta: Meta;
  now: number;
}): Result {
  const { local, remote, now } = input;
  const meta = noteLocalChanges(local, input.meta, now);
  const out: Result = { writeLocal: {}, pushRemote: {}, meta: { at: { ...meta.at }, snap: { ...meta.snap }, edited: { ...meta.edited } } };

  for (const s of SECTION_IDS) {
    const l = local[s] ?? null;
    const snap = meta.snap[s] ?? null;
    const changed = l !== snap;
    const r = remote[s];
    const remoteAt = r?.at ?? 0;
    const known = meta.at[s] ?? 0;
    const remoteNewer = remoteAt > known;
    const editedAt = meta.edited[s] ?? now;

    const take = (v: string | null, at: number) => {
      if (v !== l) out.writeLocal[s] = v;
      out.meta.at[s] = at;
      out.meta.snap[s] = v;
      delete out.meta.edited[s];
    };
    const send = (v: string | null, at: number) => {
      out.pushRemote[s] = { v, at };
      out.meta.at[s] = at;
      out.meta.snap[s] = v;
      delete out.meta.edited[s];
    };

    if (!changed && !remoteNewer) continue;

    if (!changed && remoteNewer) {
      take(r!.v, remoteAt);
    } else if (changed && !remoteNewer) {
      send(l, Math.max(editedAt, remoteAt + 1));
    } else {
      // both sides changed
      const neverSynced = meta.at[s] === undefined;
      if (MERGEABLE.has(s)) {
        const merged =
          s === "submissions"
            ? mergeSubmissions(l, r!.v)
            : mergeMaps(l, r!.v, editedAt >= remoteAt);
        const at = Math.max(now, remoteAt + 1);
        if (merged !== l) out.writeLocal[s] = merged;
        send(merged, at);
      } else if (neverSynced || editedAt <= remoteAt) {
        take(r!.v, remoteAt);
      } else {
        send(l, Math.max(editedAt, remoteAt + 1));
      }
    }
  }
  return out;
}
