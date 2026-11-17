import type { Remote } from "./engine";

export type CloudUser = { id: string; email: string };

/** `error` is a problem to show; `info` is a neutral message (e.g. "check your email"). */
export type AuthResult = { error?: string; info?: string };

export type SaveResult =
  | { ok: true; version: string }
  | { ok: false; conflict: true }
  | { ok: false; conflict?: false; error: string };

/**
 * Where the cloud copy of your data lives. The app only talks to this interface, so the
 * Supabase implementation and the in-browser fake used for testing are interchangeable.
 */
export interface CloudBackend {
  kind: "supabase" | "mock";
  getUser(): Promise<CloudUser | null>;
  onAuthChange(cb: (user: CloudUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** the stored data plus a version token used to detect another device writing meanwhile */
  load(): Promise<{ data: Remote; version: string | null }>;
  /** write only if nobody else has since `version` (null = the row doesn't exist yet) */
  save(data: Remote, version: string | null): Promise<SaveResult>;
}
