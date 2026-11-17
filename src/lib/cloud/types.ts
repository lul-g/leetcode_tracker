import type { Change, RemoteRow } from "./engine";

/** Where the cloud copy of your data lives, as far as the sync is concerned. */
export interface CloudBackend {
  /**
   * Send the rows that changed here, get back every row that changed in the cloud since `cursor`
   * (for the rows just sent, the cloud's final answer).
   */
  sync(
    key: string,
    body: { cursor: string | null; first: boolean; changes: Change[] },
  ): Promise<{ rows: RemoteRow[]; cursor: string | null }>;
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
