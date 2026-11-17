"use client";

import { useState } from "react";
import { Cloud, CloudOff, KeyRound, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { timeAgo } from "@/lib/time-ago";

const GRANT_SQL =
  "grant select, insert, update on table public.pacer_problems, public.pacer_manual_solves, public.pacer_notes, public.pacer_settings, public.pacer_secrets to service_role;";

const DB_PROBLEMS: Record<string, { title: string; fix: React.ReactNode }> = {
  missing_table: {
    title: "The database tables aren't there yet",
    fix: (
      <>
        In Supabase open the <b>SQL Editor</b> and run the contents of{" "}
        <code>supabase/schema.sql</code>.
      </>
    ),
  },
  wrong_role: {
    title: "That's the wrong kind of key",
    fix: (
      <>
        Supabase accepts it, but it&apos;s the <b>publishable / anon</b> key, which can&apos;t
        touch this table. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to the <b>Secret</b> key (
        <code>sb_secret_…</code>) or the legacy <code>service_role</code> key.
      </>
    ),
  },
  no_grants: {
    title: "The table hasn't given the server access yet",
    fix: (
      <>
        Your key is fine. Supabase just doesn&apos;t give new tables to the server&apos;s role
        automatically when &quot;Automatically expose new tables&quot; is off. In the Supabase{" "}
        <b>SQL Editor</b>, run:
        <code className="mt-1.5 block rounded bg-background/60 p-2 text-[11px] break-all whitespace-pre-wrap">
          {GRANT_SQL}
        </code>
        Then press Sync now.
      </>
    ),
  },
  bad_secret: {
    title: "Supabase doesn't recognise the secret key",
    fix: (
      <>
        Copy the <b>Secret</b> key again from <b>Project Settings, API Keys</b>, from the same
        project as <code>SUPABASE_URL</code>, and paste it into{" "}
        <code>SUPABASE_SERVICE_ROLE_KEY</code> with no spaces or extra characters. Then redeploy.
      </>
    ),
  },
  unreachable: {
    title: "The server can't reach your database",
    fix: (
      <>
        Check that <code>SUPABASE_URL</code> is exactly the Project URL (
        <code>https://….supabase.co</code>) of the project you set up.
      </>
    ),
  },
  error: {
    title: "The database returned an error",
    fix: <>Check the function logs for this deployment on Vercel.</>,
  },
};

/** Shown when the server is set up but can't actually use its database. Says what to fix. */
function DbNotice({ db }: { db: string | null }) {
  if (!db || db === "ok") return null;
  const p = DB_PROBLEMS[db] ?? DB_PROBLEMS.error;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-hard/10 p-3 text-sm ring-1 ring-hard/20">
      <div className="flex items-start gap-2 font-medium text-hard">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        {p.title}
      </div>
      <p className="pl-6 text-xs text-muted-foreground [&_b]:text-foreground [&_code]:text-foreground">
        {p.fix}
      </p>
    </div>
  );
}

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
        <DbNotice db={cloud.db} />
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
        {cloud.status === "badKey" && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>
              The key must match <code className="text-foreground">PACER_SYNC_KEY</code> on{" "}
              <span className="text-foreground">this</span> server. Your hosted site and your own
              computer are separate servers, each with its own value.
            </li>
            <li>After changing it, redeploy (Vercel) or restart <code>npm run dev</code>.</li>
            <li>
              In <code>.env.local</code> a <code>#</code> starts a comment, so wrap a key that
              contains one in quotes.
            </li>
          </ul>
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
      <DbNotice db={cloud.db} />
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
