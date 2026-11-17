"use client";

import { useState } from "react";
import { Cloud, CloudOff, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { timeAgo } from "@/lib/time-ago";

/** Settings tab: sign in so your goal, layout, notes, manual solves and cookie follow you between computers. */
export function AccountConnection() {
  const { cloud } = useApp();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!cloud.configured) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 text-sm ring-1 ring-foreground/5">
        <div className="flex items-center gap-2 font-medium">
          <CloudOff className="size-4 text-muted-foreground" />
          Cloud sync isn&apos;t set up on this copy
        </div>
        <p className="text-muted-foreground">
          Right now everything is saved in this browser only, so a second computer starts empty.
          To sync between computers, connect a free Supabase project. The steps are in{" "}
          <code className="text-foreground">docs/cloud-sync.md</code>.
        </p>
      </div>
    );
  }

  if (cloud.user) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/5">
          <Cloud className="mt-0.5 size-4 shrink-0 text-solved" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium break-all">Signed in as {cloud.user.email}</p>
            <p className="text-xs text-muted-foreground">
              {cloud.status === "syncing"
                ? "Syncing…"
                : cloud.lastSyncedAt
                  ? `Synced ${timeAgo(cloud.lastSyncedAt)}`
                  : "Not synced yet"}
            </p>
          </div>
        </div>

        {cloud.status === "error" && cloud.error && (
          <div className="flex items-start gap-2 rounded-lg bg-hard/10 p-3 text-sm text-hard ring-1 ring-hard/20">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{cloud.error}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Your goal and dates, card layout, notes, solves you logged by hand, and your LeetCode
          cookie follow you to every computer you sign in on. Your LeetCode history itself is
          pulled fresh from LeetCode on each one.
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
            onClick={() => void cloud.signOut()}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await (mode === "in" ? cloud.signIn : cloud.signUp)(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (res.info) setInfo(res.info);
    else setPassword("");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Sign in to keep your data in step across computers. Without an account everything stays
        in this browser only.
      </p>
      <FieldGroup>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="acct-email">Email</FieldLabel>
          <Input
            id="acct-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
          />
        </Field>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="acct-password">Password</FieldLabel>
          <Input
            id="acct-password"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
          />
          {mode === "up" && <FieldDescription>At least 6 characters.</FieldDescription>}
        </Field>
      </FieldGroup>
      {error && <p className="text-sm text-hard">{error}</p>}
      {info && <p className="text-sm text-muted-foreground">{info}</p>}
      <Button type="submit" disabled={busy || !email.trim() || password.length < 6}>
        {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {mode === "in" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setError(null);
          setInfo(null);
        }}
        className="self-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {mode === "in" ? "No account yet? Create one" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
