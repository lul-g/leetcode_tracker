/**
 * One agreed way to write a value as text. Postgres' jsonb reorders object keys, so the same
 * data can come back looking different; comparing canonical text (keys sorted, no spaces) on both
 * sides makes "did this row change?" a plain string comparison.
 */
export function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortKeys((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

/** Parse then re-write canonically; returns null for text that isn't JSON. */
export function canonicalizeText(text: string): string | null {
  try {
    return canonical(JSON.parse(text));
  } catch {
    return null;
  }
}

/** A short fingerprint (cyrb53) for change detection, so we don't keep a second copy of big values. */
export function hashStr(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16) + ":" + s.length;
}

/** The fingerprint of "this row doesn't exist". */
export const ABSENT = "absent";
