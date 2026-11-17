/**
 * The sync key, made forgiving. Both the server (reading PACER_SYNC_KEY) and the browser (what you
 * typed) run it through the same steps, so harmless differences can't lock you out:
 *  - spaces or a newline at the ends (easy to paste by accident)
 *  - the whole value wrapped in quotes (Vercel keeps quotes as part of the value)
 *  - the same accented character built two different ways by different keyboards (Unicode form)
 */
export function normalizeKey(raw: string): string {
  let s = raw.normalize("NFC").trim();
  const quoted = /^(["'`])([\s\S]*)\1$/.exec(s);
  if (quoted) s = quoted[2].trim();
  return s;
}

/** What actually travels to the server: a fingerprint, so the passphrase itself is never sent
 *  and no character set or header encoding can garble it. Falls back to the plain key only on a
 *  page that can't compute hashes (an insecure, non-localhost address). */
export async function keyToken(key: string): Promise<string> {
  const norm = normalizeKey(key);
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (!subtle) return norm;
  const bytes = await subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
