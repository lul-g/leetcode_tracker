import { ABSENT, hashStr } from "./canonical";
import { TABLES, type Table } from "./merge";

/**
 * The client half of delta sync, as pure functions (no storage, no network).
 *
 * This computer's data is seen as rows: `local[table][key]` is a row's canonical text, or missing
 * if the row doesn't exist. `Meta` remembers, per row, a fingerprint of what this computer and the
 * cloud last agreed on, which is how a local edit is told from a change that came from the cloud.
 * Only rows that changed are sent, and only rows that changed in the cloud come back.
 */
export type RowMap = Record<Table, Record<string, string>>;

export type Meta = {
  /** the cloud position this computer has read up to (null = never synced) */
  cursor: string | null;
  /** per row: fingerprint of the value last agreed with the cloud */
  snap: Record<Table, Record<string, string>>;
  /** per row: when a local change to it was first noticed (ms) */
  edited: Record<Table, Record<string, number>>;
};

const blank = <T>(): Record<Table, Record<string, T>> =>
  Object.fromEntries(TABLES.map((t) => [t, {}])) as Record<Table, Record<string, T>>;

export const emptyRows = (): RowMap => blank<string>();
export const emptyMeta = (): Meta => ({ cursor: null, snap: blank<string>(), edited: blank<number>() });

/** Is this the first time this computer is meeting the cloud? */
export const isFirstSync = (meta: Meta) => meta.cursor === null;

const fp = (v: string | null | undefined) => (v == null ? ABSENT : hashStr(v));

export type Change = {
  table: Table;
  key: string;
  /** canonical text, or null to delete */
  value: string | null;
  /** when the edit happened, ms */
  editedAt: number;
};

/** Rows that changed here since the last agreement. Also notes when each change was first seen. */
export function planChanges(
  local: RowMap,
  metaIn: Meta,
  now: number,
): { changes: Change[]; meta: Meta } {
  const meta: Meta = {
    cursor: metaIn.cursor,
    snap: structuredClone(metaIn.snap),
    edited: structuredClone(metaIn.edited),
  };
  const changes: Change[] = [];

  for (const table of TABLES) {
    const keys = new Set([...Object.keys(local[table]), ...Object.keys(meta.snap[table])]);
    for (const key of keys) {
      const value = local[table][key] ?? null;
      if (fp(value) === (meta.snap[table][key] ?? ABSENT)) {
        delete meta.edited[table][key];
        continue;
      }
      // downloaded problems are never deleted from the cloud
      if (table === "problems" && value === null) continue;
      const editedAt = meta.edited[table][key] ?? now;
      meta.edited[table][key] = editedAt;
      changes.push({ table, key, value, editedAt });
    }
  }
  return { changes, meta };
}

export type RemoteRow = { table: Table; key: string; value: string | null };
export type Write = { table: Table; key: string; value: string | null };

/**
 * Fold rows from the cloud into this computer. `pushed` are the rows this computer just sent: the
 * cloud's answer for them is final (it may have merged or declined the edit), so it wins. For
 * every other row the cloud's version is taken unless it was edited here in the meantime.
 */
export function applyRows(input: {
  local: RowMap;
  meta: Meta;
  rows: RemoteRow[];
  pushed: Set<string>;
  cursor: string | null;
}): { writes: Write[]; meta: Meta } {
  const { local, rows, pushed } = input;
  const meta: Meta = {
    cursor: input.cursor ?? input.meta.cursor,
    snap: structuredClone(input.meta.snap),
    edited: structuredClone(input.meta.edited),
  };
  const writes: Write[] = [];

  for (const r of rows) {
    const id = `${r.table}|${r.key}`;
    const here = local[r.table][r.key] ?? null;
    const agreed = fp(r.value);

    if (pushed.has(id)) {
      if (here !== r.value) writes.push({ table: r.table, key: r.key, value: r.value });
      meta.snap[r.table][r.key] = agreed;
      delete meta.edited[r.table][r.key];
      continue;
    }
    // edited here since we last agreed: leave it, it will be sent next time
    if (fp(here) !== (meta.snap[r.table][r.key] ?? ABSENT)) continue;
    if (here !== r.value) writes.push({ table: r.table, key: r.key, value: r.value });
    meta.snap[r.table][r.key] = agreed;
  }
  // forget rows that are gone on both sides
  for (const table of TABLES) {
    for (const key of Object.keys(meta.snap[table])) {
      if (meta.snap[table][key] === ABSENT) delete meta.snap[table][key];
    }
  }
  return { writes, meta };
}
