"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CatalogEntry, Credentials, ListTotals, Sub, SyncSummary } from "@/lib/sync-types";

/**
 * Everything the sync keeps lives in this browser's localStorage: the cookie, your submissions,
 * and a small slice of LeetCode's catalog. The server stores nothing.
 */
export const KEYS = {
  credentials: "pacer.credentials",
  submissions: "pacer.submissions",
  catalog: "pacer.catalog",
  meta: "pacer.meta",
  manual: "pacer.manual",
} as const;

/** bump when the stored catalog gains fields, so it is refreshed on the next sync */
export const CATALOG_VERSION = 3;

export type StoredCatalog = {
  /** CATALOG_VERSION when it was fetched */
  v?: number;
  fetchedAt: number;
  entries: Record<string, CatalogEntry>;
  totals: ListTotals;
};
export type StoredMeta = { lastSyncedAt: number | null; summary?: SyncSummary };

const EVENT = "pacer-store-change";

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false if the browser refused the write (private mode, quota). */
export function writeStore(key: string, value: unknown | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

export const loadCredentials = () => readStore<Credentials | null>(KEYS.credentials, null);
export const loadSubmissions = () => readStore<Record<string, Sub[]>>(KEYS.submissions, {});
export const loadCatalog = () => readStore<StoredCatalog | null>(KEYS.catalog, null);
export const loadMeta = () => readStore<StoredMeta>(KEYS.meta, { lastSyncedAt: null });

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};

/** A localStorage value as React state: null on the server and first paint, live afterwards. */
export function useStored<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
    // fallback is a constant at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
}

/** True once running in the browser (false while rendering on the server). */
export function useStoreReady() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
