import { createMockBackend } from "./mock-backend";
import { createSupabaseBackend } from "./supabase-backend";
import type { CloudBackend } from "./types";

// NEXT_PUBLIC_ values are baked in when the site is built, and only if written out literally.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Is cloud sync set up on this copy of the app? */
export const cloudConfigured = Boolean(URL && (URL === "mock" || KEY));

let backend: CloudBackend | null | undefined;

/** The backend, created on first use in the browser. Null when cloud sync isn't set up. */
export function getBackend(): CloudBackend | null {
  if (backend !== undefined) return backend;
  if (!URL) backend = null;
  else if (URL === "mock") backend = createMockBackend();
  else if (KEY) backend = createSupabaseBackend(URL, KEY);
  else backend = null;
  return backend;
}
