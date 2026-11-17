"use client";

import { useState } from "react";
import { Cloud, CloudOff, KeyRound, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { timeAgo } from "@/lib/time-ago";

/** Settings tab: give this computer the sync key and your data follows you between computers. */
export function SyncConnection() {
  const { cloud } = useApp();
  const [key, setKey] = useState("");

  if (cloud.serverConfigured === false) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 text-sm ring-1 ring-foreground/5">
        <div className="flex items-center gap-2 font-medium">
          <CloudOff className="size-4 text-muted-foreground" />
          Cloud sync isn&apos;t set up on the server
        </div>
        {cloud.missing.length > 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">
              This server can&apos;t see these settings yet:
            </p>
            <ul className="space-y-1">
              {cloud.missing.map((name) => (
                <li key={name}>
                  <code className="rounded bg-background/60 px-1.5 py-0.5 text-xs text-foreground">
                    {name}
                  </code>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              On Vercel, add them under Settings, Environment Variables (for the environment this
              site is deployed to), then <span className="text-foreground">redeploy</span>: a
              change only reaches new deployments. Running locally, they go in{" "}
              <code className="text-foreground">.env.local</code>, then restart{" "}
              <code className="text-foreground">npm run dev</code>.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Right now everything is saved in this browser only, so a second computer starts empty.
            The steps to sync are in <code className="text-foreground">docs/cloud-sync.md</code>.
          </p>
        )}
      </div>
    );
  }

  if (cloud.serverConfigured === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking…
      </p>
    );
  }

  if (cloud.hasKey) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/5">
          <Cloud
            className={`mt-0.5 size-4 shrink-0 ${cloud.status === "synced" ? "text-solved" : "text-muted-foreground"}`}
          />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">
              {cloud.status === "badKey" ? "Sync key refused" : "Cloud sync is on"}
            </p>
            <p className="text-xs text-muted-foreground">
              {cloud.status === "syncing"
                ? "Syncing…"
                : cloud.lastSyncedAt
                  ? `Synced ${timeAgo(cloud.lastSyncedAt)}`
                  : "Not synced yet"}
            </p>
          </div>
        </div>

        {(cloud.status === "error" || cloud.status === "badKey") && cloud.error && (
          <div className="flex items-start gap-2 rounded-lg bg-hard/10 p-3 text-sm text-hard ring-1 ring-hard/20">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">
              {cloud.error}
              {cloud.status === "badKey" && " Remove it and enter the right one."}
            </span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Your goal and dates, card layout, notes, solves you logged by hand, your completed
          problems and your LeetCode cookie are kept in your database and follow you to every
          computer that has the sync key.
        </p>

        <div className="flex items-center gap-2">
          <Button onClick={() => void cloud.syncNow()} disabled={cloud.status === "syncing"}>
            {cloud.status === "syncing" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            Sync now
          </Button>
          <Button
            variant="ghost"
            className="ml-auto text-muted-foreground"
            onClick={cloud.clearKey}
          >
            Remove key
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (key.trim()) {
          cloud.setKey(key);
          setKey("");
        }
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-muted-foreground">
        Enter your sync key once on this computer and your data comes with it. There are no
        accounts: the key is the passphrase you set as <code>PACER_SYNC_KEY</code> on the server.
      </p>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sync-key">Sync key</FieldLabel>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="sync-key"
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="pl-9"
            />
          </div>
          <FieldDescription>Kept only in this browser.</FieldDescription>
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={!key.trim()}>
        Connect
      </Button>
    </form>
  );
}
