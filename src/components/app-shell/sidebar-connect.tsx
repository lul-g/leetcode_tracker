"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";

/**
 * Paste your LEETCODE_SESSION straight into the sidebar: pasting connects and starts a sync,
 * Enter does the same for typed text. Always there, so a fresh cookie is one paste away.
 */
export function SidebarConnect() {
  const { connection, syncStatus, connect } = useApp();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = connection.connected && syncStatus.authError;
  const label = !connection.connected
    ? "Connect LeetCode"
    : expired
      ? "Cookie expired: paste a new one"
      : "LeetCode cookie";
  const placeholder = connection.connected && !expired
    ? "Paste to replace"
    : "Paste LEETCODE_SESSION";

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
    <div className="flex flex-col gap-1.5 px-0.5 pb-2">
      <label
        htmlFor="sidebar-cookie"
        className={
          expired
            ? "px-2 text-xs font-medium text-medium"
            : "px-2 text-xs font-medium text-muted-foreground"
        }
      >
        {label}
      </label>
      <div className="relative">
        {busy ? (
          <Loader2 className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <KeyRound className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          id="sidebar-cookie"
          value={value}
          disabled={busy}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-label="LEETCODE_SESSION cookie"
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
          className="h-8 [-webkit-text-security:disc] pl-8 font-mono text-xs"
        />
      </div>
      {error && <p className="px-2 text-xs text-hard">{error}</p>}
    </div>
  );
}
