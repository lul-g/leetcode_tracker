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
import { LayoutGrid, RotateCcw } from "lucide-react";
import type { CardDef } from "@/components/cards/registry";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  COLS,
  MAX_H,
  MIN_H,
  MIN_W,
  clamp,
  layoutRead,
  layoutSubscribe,
  normalize,
  persistLayout as persist,
  sizeOf,
  type LayoutItem as Item,
} from "@/lib/dashboard-layout";
import { useDesktop } from "@/lib/use-desktop";
import { cn } from "@/lib/utils";

const ROW = 64; // px per height unit
const GAP = 16;


/**
 * Cards on a 12-column grid. Desktop: drag a card to reorder it, drag its bottom-right corner
 * to resize (snaps to columns and rows); remembered in this browser. Phones: one column.
 */
export function DashboardGrid({
  cards,
  title,
}: {
  cards: Record<string, CardDef>;
  /** heading shown on the left of the controls */
  title?: ReactNode;
}) {
  const desktop = useDesktop();
  const ids = Object.keys(cards).join("|");
  const idList = useMemo(() => ids.split("|"), [ids]);
  const raw = useSyncExternalStore(layoutSubscribe, layoutRead, () => null);
  const stored = useMemo(() => {
    try {
      return normalize(raw ? JSON.parse(raw) : null, idList);
    } catch {
      return normalize(null, idList);
    }
  }, [raw, idList]);

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

  const toggle = (id: string) =>
    persist(
      items.some((x) => x.id === id)
        ? items.filter((x) => x.id !== id)
        : [...items, { id, ...sizeOf(id) }],
    );

  const controls = (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="sm" />}>
          <LayoutGrid data-icon="inline-start" />
          Customize
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 gap-1 p-2">
          <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">
            Choose what your dashboard shows
          </p>
          {idList.map((id) => (
            <label
              key={id}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted"
            >
              <Checkbox
                checked={items.some((x) => x.id === id)}
                onCheckedChange={() => toggle(id)}
                className="mt-0.5"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{cards[id].label}</span>
                <span className="text-xs text-muted-foreground">{cards[id].description}</span>
              </span>
            </label>
          ))}
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => persist(null)}
        className="text-muted-foreground"
      >
        <RotateCcw data-icon="inline-start" />
        Reset
      </Button>
    </div>
  );

  const header = (
    <div className="flex items-center justify-between gap-3">
      {title}
      {controls}
    </div>
  );

  const empty = items.length === 0 && (
    <div className="rounded-xl border border-dashed px-6 py-16 text-center">
      <p className="font-medium">Your dashboard is empty</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Use Customize to add the cards you want to see.
      </p>
    </div>
  );

  if (!desktop)
    return (
      <div className="flex flex-col gap-4">
        {header}
        {empty}
        {items.map((x) => (
          <div key={x.id} className={cn("min-h-0", x.id === "p-bar" ? "h-44" : "h-[34rem]")}>
            {cards[x.id].node}
          </div>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {header}
      {empty}
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
                {cards[x.id].node}
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
