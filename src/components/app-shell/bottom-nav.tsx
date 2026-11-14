"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { NAV, useActive } from "./nav";

/** Phone-only tab bar (the sidebar takes over from md up). Respects the iOS home indicator. */
export function BottomNav() {
  const isActive = useActive();
  const { openSettings } = useApp();
  const tab =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10.5px] font-semibold text-muted-foreground transition-colors active:scale-95";

  return (
    <nav
      aria-label="Pages"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-xl">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn(tab, active && "text-primary")}
            >
              <n.icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="max-w-full truncate">{n.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => openSettings()} className={tab}>
          <Settings className="size-[22px]" strokeWidth={1.8} />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
}
