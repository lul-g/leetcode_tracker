import { createClient, type User } from "@supabase/supabase-js";
import type { Remote } from "./engine";
import type { AuthResult, CloudBackend, CloudUser, SaveResult } from "./types";

const toUser = (u: User | null | undefined): CloudUser | null =>
  u ? { id: u.id, email: u.email ?? "" } : null;

/**
 * Your data lives in one row of `pacer_state` (see supabase/schema.sql), protected by
 * row-level security so only you can read or write it. The browser talks to Supabase directly
 * with its public key; no server of ours is involved.
 */
export function createSupabaseBackend(url: string, anonKey: string): CloudBackend {
  const sb = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  const currentUser = async () => (await sb.auth.getSession()).data.session?.user ?? null;

  return {
    kind: "supabase",

    async getUser() {
      return toUser(await currentUser());
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password): Promise<AuthResult> {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },

    async signUp(email, password): Promise<AuthResult> {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) return { error: error.message };
      // with "confirm email" switched on there is no session until the link is clicked
      if (!data.session) return { info: "Check your email to confirm your account, then sign in." };
      return {};
    },

    async signOut() {
      await sb.auth.signOut();
    },

    async load() {
      const user = await currentUser();
      if (!user) throw new Error("Not signed in.");
      const { data, error } = await sb
        .from("pacer_state")
        .select("data, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { data: (data?.data ?? {}) as Remote, version: data?.updated_at ?? null };
    },

    async save(data, version): Promise<SaveResult> {
      const user = await currentUser();
      if (!user) return { ok: false, error: "Not signed in." };
      const now = new Date().toISOString();

      if (version === null) {
        const { data: row, error } = await sb
          .from("pacer_state")
          .insert({ user_id: user.id, data, updated_at: now })
          .select("updated_at")
          .single();
        // 23505: another device created the row first
        if (error) {
          return error.code === "23505"
            ? { ok: false, conflict: true }
            : { ok: false, error: error.message };
        }
        return { ok: true, version: row.updated_at };
      }

      const { data: rows, error } = await sb
        .from("pacer_state")
        .update({ data, updated_at: now })
        .eq("user_id", user.id)
        .eq("updated_at", version)
        .select("updated_at");
      if (error) return { ok: false, error: error.message };
      // nothing matched: another device wrote since we read
      if (!rows || rows.length === 0) return { ok: false, conflict: true };
      return { ok: true, version: rows[0].updated_at };
    },
  };
}
