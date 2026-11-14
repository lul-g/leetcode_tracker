"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/app-context";
import { timeAgo } from "@/lib/time-ago";

/** Settings tab: paste your LeetCode cookie once, then sync from the sidebar. */
export function LeetCodeConnection() {
  const { connection, syncStatus, sync, connect, disconnect, isDemo } = useApp();
  const [session, setSession] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = connection.connected && syncStatus.authError;
  const showForm = !connection.connected || expired;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await connect(session);
    setBusy(false);
    if (err) setError(err);
    else {
      setSession("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {connection.connected && !expired && (
        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-solved" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">
              Connected{connection.username ? ` as ${connection.username}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {syncStatus.running
                ? `${syncStatus.phase}${syncStatus.total ? ` (${syncStatus.done}/${syncStatus.total})` : ""}`
                : connection.lastSyncedAt
                  ? `Last synced ${timeAgo(connection.lastSyncedAt)}`
                  : "Not synced yet"}
            </p>
            {syncStatus.running && syncStatus.total > 0 && (
              <Progress
                value={(syncStatus.done / syncStatus.total) * 100}
                className="mt-2 [&_[data-slot=progress-indicator]]:bg-primary"
              />
            )}
          </div>
        </div>
      )}

      {connection.connected && syncStatus.error && !syncStatus.running && (
        <div className="flex items-start gap-2 rounded-lg bg-hard/10 p-3 text-sm text-hard ring-1 ring-hard/20">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{syncStatus.error}</span>
        </div>
      )}

      {connection.connected && !expired && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => sync("incremental")} disabled={syncStatus.running}>
            {syncStatus.running ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            Sync now
          </Button>
          <Button
            variant="outline"
            onClick={() => sync("full")}
            disabled={syncStatus.running}
            title="Re-download every submission, not just what's new"
          >
            Full resync
          </Button>
          <Button variant="ghost" className="ml-auto text-muted-foreground" onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {isDemo && !expired && (
            <p className="text-sm text-muted-foreground">
              Connect once and Pacer pulls your real submission history. Until then you&apos;re
              looking at demo data.
            </p>
          )}
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Open leetcode.com while signed in, then press F12.</li>
            <li>
              Go to <span className="text-foreground">Application</span> (Chrome/Edge) or{" "}
              <span className="text-foreground">Storage</span> (Firefox), then Cookies, then
              leetcode.com.
            </li>
            <li>
              Copy the value of <code className="text-foreground">LEETCODE_SESSION</code>.
            </li>
          </ol>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="lc-session">LEETCODE_SESSION</FieldLabel>
              <Input
                id="lc-session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                placeholder="eyJ0eXAiOiJKV1QiLCJhbGci…"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!error}
                className="font-mono text-xs"
              />
              <FieldDescription>
                Kept only in this browser. It passes through this app&apos;s server for each
                sync, but the server never stores it.
              </FieldDescription>
            </Field>
          </FieldGroup>
          {error && <p className="text-sm text-hard">{error}</p>}
          <Button type="submit" disabled={busy || !session.trim()}>
            {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {expired ? "Reconnect" : "Connect"}
          </Button>
        </form>
      )}
    </div>
  );
}
