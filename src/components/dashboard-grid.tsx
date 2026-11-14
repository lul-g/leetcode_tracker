"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesktop } from "@/lib/use-desktop";
import { cn } from "@/lib/utils";

type Item = { id: string; w: number; h: number };

const KEY = "lc-tracker-layout";
const EVENT = "lc-tracker-layout-change";
const COLS = 12;
const ROW = 64; // px per height unit
const GAP = 16;
const MIN_W = 3;
const MIN_H = 3;
const MAX_H = 14;

export const DEFAULT_LAYOUT: Item[] = [
  { id: "hero", w: 5, h: 6 },
  { id: "pace", w: 7, h: 11 },
  { id: "problems", w: 5, h: 5 },
];

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(n)));

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/** Merge a saved layout with the known card ids (drops removed cards, appends new ones). */
function normalize(saved: unknown, ids: string[]): Item[] {
  const defaults = DEFAULT_LAYOUT.filter((d) => ids.includes(d.id));
  if (!Array.isArray(saved)) return defaults;
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const s of saved) {
    const base = defaults.find((d) => d.id === s?.id);
    if (!base || seen.has(base.id)) continue;
    seen.add(base.id);
    out.push({
      id: base.id,
      w: clamp(Number(s.w) || base.w, MIN_W, COLS),
      h: clamp(Number(s.h) || base.h, MIN_H, MAX_H),
    });
  }
  for (const d of defaults) if (!seen.has(d.id)) out.push(d);
  return out;
}

function persist(items: Item[] | null) {
  try {
    if (items) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Cards on a 12-column grid. Desktop: drag a card to reorder it, drag its bottom-right corner
 * to resize (snaps to columns and rows); remembered in this browser. Phones: one column.
 */
export function DashboardGrid({
  cards,
  toolbar,
}: {
  cards: Record<string, ReactNode>;
  /** rendered on the left of the reset button, e.g. the logo */
  toolbar?: ReactNode;
}) {
  const desktop = useDesktop();
  const ids = Object.keys(cards).join("|");
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const stored = useMemo(() => {
    const list = ids.split("|");
    try {
      return normalize(raw ? JSON.parse(raw) : null, list);
    } catch {
      return normalize(null, list);
    }
  }, [raw, ids]);

  const [live, setLive] = useState<Item[] | null>(null); // while resizing
  const items = live ?? stored;
  const liveRef = useRef<Item[] | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((x) => x.id === active.id);
    const to = items.findIndex((x) => x.id === over.id);
    persist(arrayMove(items, from, to));
  };

  const onResize = useCallback(
    (id: string, w: number, h: number) => {
      const next = (liveRef.current ?? stored).map((y) =>
        y.id === id ? { ...y, w, h } : y,
      );
      liveRef.current = next;
      setLive(next);
    },
    [stored],
  );
  const onResizeEnd = useCallback(() => {
    if (liveRef.current) persist(liveRef.current);
    liveRef.current = null;
    setLive(null);
  }, []);

  if (!desktop)
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        {items.map((x) => (
          <div key={x.id} className="h-[34rem] min-h-0">
            {cards[x.id]}
          </div>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        {toolbar}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => persist(null)}
          className="text-muted-foreground"
        >
          <RotateCcw data-icon="inline-start" />
          Reset layout
        </Button>
      </div>
      {/* a fixed id keeps dnd-kit's generated aria ids the same on the server and in the browser */}
      <DndContext
        id="dashboard-cards"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={items.map((x) => x.id)} strategy={rectSortingStrategy}>
          <div
            ref={grid}
            className="grid grid-cols-12"
            style={{ gap: GAP, gridAutoRows: ROW }}
          >
            {items.map((x) => (
              <Cell
                key={x.id}
                item={x}
                grid={grid}
                onResize={(w, h) => onResize(x.id, w, h)}
                onResizeEnd={onResizeEnd}
              >
                {cards[x.id]}
              </Cell>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Cell({
  item,
  grid,
  onResize,
  onResizeEnd,
  children,
}: {
  item: Item;
  grid: React.RefObject<HTMLDivElement | null>;
  onResize: (w: number, h: number) => void;
  onResizeEnd: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const [resizing, setResizing] = useState(false);
  const style: CSSProperties = {
    gridColumn: `span ${item.w} / span ${item.w}`,
    gridRow: `span ${item.h} / span ${item.h}`,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  // the corner handle: pointer movement becomes whole columns and rows, live
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = grid.current;
    if (!el) return;
    const colStep = (el.clientWidth - GAP * (COLS - 1)) / COLS + GAP;
    const rowStep = ROW + GAP;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const { w: w0, h: h0 } = item;
    setResizing(true);
    const move = (ev: PointerEvent) =>
      onResize(
        clamp(w0 + (ev.clientX - x0) / colStep, MIN_W, COLS),
        clamp(h0 + (ev.clientY - y0) / rowStep, MIN_H, MAX_H),
      );
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setResizing(false);
      onResizeEnd();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/cell relative min-h-0 min-w-0 cursor-grab active:cursor-grabbing",
        isDragging && "z-20 opacity-90 shadow-xl",
        resizing && "select-none",
      )}
      {...attributes}
      {...listeners}
      aria-roledescription="movable card"
    >
      {children}
      <span
        onPointerDown={startResize}
        role="separator"
        aria-label="Resize card"
        className="absolute right-1.5 bottom-1.5 z-10 size-4 cursor-se-resize rounded-sm opacity-0 transition-opacity group-hover/cell:opacity-100"
        style={{
          background:
            "linear-gradient(135deg, transparent 50%, var(--muted-foreground) 50%)",
          opacity: resizing ? 1 : undefined,
        }}
      />
    </div>
  );
}
