"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

/**
 * Paste your LEETCODE_SESSION straight into the sidebar: pasting connects and starts a sync,
 * Enter does the same for typed text. Always there, so a fresh cookie is one paste away.
 * Looks like the field in Settings, so the two read as the same thing.
 */
export function SidebarConnect() {
  const { connection, syncStatus, connect } = useApp();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = connection.connected && syncStatus.authError;
  const hint = error
    ? error
    : expired
      ? "Expired: paste a new one."
      : connection.connected
        ? "Paste a new one to replace it."
        : "Paste it to connect. Kept only in this browser.";

  const submit = async (raw: string) => {
    if (!raw.trim() || busy) return;
    setBusy(true);
    setError(null);
    const err = await connect(raw);
    setBusy(false);
    if (err) setError(err);
    else setValue("");
  };

  return (
    <Field data-invalid={!!error} className="gap-2 pb-3">
      <FieldLabel htmlFor="sidebar-cookie">LEETCODE_SESSION</FieldLabel>
      <div className="relative">
        <Input
          id="sidebar-cookie"
          value={value}
          disabled={busy}
          placeholder="eyJ0eXAiOiJKV1QiLCJhbGci…"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onPaste={(e) => {
            // pasting is the whole interaction: connect immediately
            const text = e.clipboardData.getData("text");
            if (text.trim()) {
              e.preventDefault();
              setValue(text);
              void submit(text);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit(value);
            }
          }}
          // hide the value on screen without asking the browser to save it as a password
          className={cn("font-mono text-xs [-webkit-text-security:disc]", busy && "pr-9")}
        />
        {busy && (
          <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <FieldDescription className={cn("text-xs", expired && !error && "text-medium")}>
        {hint}
      </FieldDescription>
    </Field>
  );
}
