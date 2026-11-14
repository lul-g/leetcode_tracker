"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export type PanelSpec = {
  id: string;
  children: ReactNode;
  defaultSize: string | number;
  minSize?: string | number;
  maxSize?: string | number;
  className?: string;
};

const PREFIX = "lc-tracker-panels:";

const mountedStore = () => () => {};
function useMounted() {
  return useSyncExternalStore(mountedStore, () => true, () => false);
}

function load(id: string, panels: PanelSpec[]): Record<string, number> | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as Record<string, number>;
    // only restore a layout that matches these panels
    return panels.every((p) => typeof saved[p.id] === "number") ? saved : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A horizontal resizable group whose sizes are remembered in this browser.
 * Double-clicking a divider puts its panel back to the default size (built into the library).
 * Panels render after mount so the saved sizes apply on the first paint of the group.
 */
export function PersistedPanels({
  id,
  panels,
}: {
  id: string;
  panels: PanelSpec[];
}) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-full w-full" />;

  return (
    <ResizablePanelGroup
      id={id}
      orientation="horizontal"
      defaultLayout={load(id, panels)}
      onLayoutChanged={(layout, meta) => {
        if (!meta.isUserInteraction) return;
        try {
          localStorage.setItem(PREFIX + id, JSON.stringify(meta.requestedLayout ?? layout));
        } catch {}
      }}
    >
      {panels.flatMap((p, i) => [
        i > 0 ? (
          <ResizableHandle
            key={`h-${p.id}`}
            title="Drag to resize · double-click to reset"
            className="hover:bg-primary/50 data-[separator=active]:bg-primary"
          />
        ) : null,
        <ResizablePanel
          key={p.id}
          id={p.id}
          defaultSize={p.defaultSize}
          minSize={p.minSize}
          maxSize={p.maxSize}
          className={p.className}
        >
          {p.children}
        </ResizablePanel>,
      ])}
    </ResizablePanelGroup>
  );
}
