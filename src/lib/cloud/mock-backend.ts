import type { Remote } from "./engine";
import type { AuthResult, CloudBackend, CloudUser, SaveResult } from "./types";

/**
 * A fake cloud that lives in this browser's localStorage, used to test the sign-in and sync
 * flows without a database (set NEXT_PUBLIC_SUPABASE_URL=mock). It is not secure and never
 * used in a real setup.
 */
const DB = "pacer.mock-cloud";
const SESSION = "pacer.mock-cloud-session";
const EVENT = "pacer-mock-auth";

type Db = {
  users: Record<string, { id: string; password: string }>;
  rows: Record<string, { data: Remote; version: number }>;
};

const readDb = (): Db => {
  try {
    const db = JSON.parse(localStorage.getItem(DB) ?? "null") as Db | null;
    if (db) return db;
  } catch {}
  return { users: {}, rows: {} };
};
const writeDb = (db: Db) => localStorage.setItem(DB, JSON.stringify(db));
const session = (): CloudUser | null => {
  try {
    return JSON.parse(localStorage.getItem(SESSION) ?? "null") as CloudUser | null;
  } catch {
    return null;
  }
};
const setSession = (u: CloudUser | null) => {
  if (u) localStorage.setItem(SESSION, JSON.stringify(u));
  else localStorage.removeItem(SESSION);
  window.dispatchEvent(new Event(EVENT));
};

export function createMockBackend(): CloudBackend {
  return {
    kind: "mock",
    async getUser() {
      return session();
    },
    onAuthChange(cb) {
      const handler = () => cb(session());
      window.addEventListener(EVENT, handler);
      return () => window.removeEventListener(EVENT, handler);
    },
    async signIn(email, password): Promise<AuthResult> {
      const u = readDb().users[email];
      if (!u || u.password !== password) return { error: "Invalid login credentials" };
      setSession({ id: u.id, email });
      return {};
    },
    async signUp(email, password): Promise<AuthResult> {
      const db = readDb();
      if (db.users[email]) return { error: "User already registered" };
      const id = `user-${Object.keys(db.users).length + 1}`;
      db.users[email] = { id, password };
      writeDb(db);
      setSession({ id, email });
      return {};
    },
    async signOut() {
      setSession(null);
    },
    async load() {
      const u = session();
      if (!u) throw new Error("Not signed in.");
      const row = readDb().rows[u.id];
      return { data: row?.data ?? {}, version: row ? String(row.version) : null };
    },
    async save(data, version): Promise<SaveResult> {
      const u = session();
      if (!u) return { ok: false, error: "Not signed in." };
      const db = readDb();
      const row = db.rows[u.id];
      if ((row ? String(row.version) : null) !== version) return { ok: false, conflict: true };
      const next = (row?.version ?? 0) + 1;
      db.rows[u.id] = { data, version: next };
      writeDb(db);
      return { ok: true, version: String(next) };
    },
  };
}
