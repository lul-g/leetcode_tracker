import { canonical } from "./canonical";

/** The five kinds of data, each stored as its own table of rows. */
export const TABLES = ["problems", "manual", "notes", "settings", "secrets"] as const;
export type Table = (typeof TABLES)[number];

/** One row's content as text (canonical JSON, null = deleted) plus when it was last edited (ms). */
export type Row = { value: string | null; editedAt: number };

type Sub = { id: string; t: number };

/**
 * A problem's submissions from two sources, combined: every submission either side knows about,
 * matched by id, oldest first. Downloaded history is never dropped.
 */
export function unionSubs(a: string | null | undefined, b: string | null | undefined): string {
  const parse = (s: string | null | undefined): Sub[] => {
    try {
      const v = s ? JSON.parse(s) : [];
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const byId = new Map<string, Sub>();
  for (const sub of [...parse(a), ...parse(b)]) byId.set(String(sub.id), sub);
  const merged = [...byId.values()].sort((x, y) => x.t - y.t || String(x.id).localeCompare(String(y.id)));
  return canonical(merged);
}

export type Decision = {
  /** should the stored row change? */
  write: boolean;
  /** what the row is (or stays) after this decision */
  result: Row;
};

/**
 * The server's call when a computer sends a row. One rule per table, applied to each row on its own:
 *  - problems: union the submissions, so nothing downloaded is lost.
 *  - everything else: the newer edit wins; but the first time a computer meets the cloud
 *    (`first`), rows already in the cloud win, so a fresh computer can't wipe what you saved.
 */
export function decide(
  table: Table,
  existing: Row | undefined,
  incoming: Row,
  first: boolean,
): Decision {
  if (table === "problems") {
    if (incoming.value === null) {
      return { write: false, result: existing ?? incoming };
    }
    const value = unionSubs(existing?.value, incoming.value);
    const editedAt = Math.max(existing?.editedAt ?? 0, incoming.editedAt);
    return { write: !existing || value !== existing.value, result: { value, editedAt } };
  }

  // nothing stored: store it (a delete of nothing is nothing)
  if (!existing || (existing.value === null && existing.editedAt === 0)) {
    return incoming.value === null
      ? { write: false, result: incoming }
      : { write: true, result: incoming };
  }
  // a fresh computer never overrides what the cloud already holds
  if (first && existing.value !== null) return { write: false, result: existing };

  if (incoming.editedAt >= existing.editedAt) {
    const same = incoming.value === existing.value;
    return { write: !same, result: same ? existing : incoming };
  }
  return { write: false, result: existing };
}
