import type { Remote } from "./engine";

export type SaveResult =
  | { ok: true; version: string }
  | { ok: false; conflict: true }
  | { ok: false; conflict?: false; error: string };

/** Where the cloud copy of your data lives, as far as the sync is concerned. */
export interface CloudBackend {
  /** the stored data plus a version token used to detect another computer writing meanwhile */
  load(key: string): Promise<{ data: Remote; version: string | null }>;
  /** write only if nobody else has since `version` (null = nothing stored yet) */
  save(key: string, data: Remote, version: string | null): Promise<SaveResult>;
}

/** The server has no database or sync key configured. */
export class NotConfiguredError extends Error {
  constructor() {
    super("Cloud sync isn't set up on the server yet.");
    this.name = "NotConfiguredError";
  }
}

/** The sync key this computer sent was refused. */
export class BadKeyError extends Error {
  constructor() {
    super("That sync key isn't right.");
    this.name = "BadKeyError";
  }
}
