"use client";

/**
 * GALLERY-ONLY, SHARED. A minimal floating control for flipping a block preview
 * between states (live / loading / empty / error / …). Drag the handle to move
 * it; it snaps to whichever corner you drop it near, so it never permanently
 * obstructs the view. Like the other `_shared/*` files it is gallery scaffolding
 * — not in any block's `item.ts` `files` list, so it never ships to production.
 *
 * Any block preview can reuse it: pass the current value, the option list, and a
 * setter. The block owns its own state machine; this owns only where it floats.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";
import { cn } from "@workspace/ui/lib/utils";
import { GripVertical } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNER_CLASS: Record<Corner, string> = {
  "top-left": "top-3 left-3",
  "top-right": "top-3 right-3",
  "bottom-left": "bottom-3 left-3",
  "bottom-right": "bottom-3 right-3",
};

export interface PreviewStateOption {
  value: string;
  label: string;
}

interface DragState {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

export function PreviewStateDock({
  value,
  onValueChange,
  options,
  label = "State",
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly PreviewStateOption[];
  label?: string;
}) {
  const [corner, setCorner] = useState<Corner>("top-right");
  const [drag, setDrag] = useState<DragState | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function startDrag(event: ReactPointerEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setDrag({
      x: rect.left,
      y: rect.top,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  }

  useEffect(() => {
    if (!drag) {
      return;
    }

    function onMove(event: PointerEvent) {
      setDrag((current) =>
        current
          ? {
              ...current,
              x: event.clientX - current.offsetX,
              y: event.clientY - current.offsetY,
            }
          : current
      );
    }

    function onUp() {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const vertical = centerY < window.innerHeight / 2 ? "top" : "bottom";
        const horizontal = centerX < window.innerWidth / 2 ? "left" : "right";
        setCorner(`${vertical}-${horizontal}` as Corner);
      }
      setDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  // z-[100] keeps the dock above dialog/overlay portals (shadcn dialogs sit at
  // z-50); `pointer-events-auto` keeps it clickable even when a modal marks the
  // rest of the page inert, so a dock click lands on the dock, not the overlay.
  return (
    <div
      className={cn(
        "pointer-events-auto fixed z-[100]",
        !drag && CORNER_CLASS[corner]
      )}
      data-slot="preview-state-dock"
      ref={ref}
      style={drag ? { left: drag.x, top: drag.y } : undefined}
    >
      <div className="flex items-center gap-0.5 rounded-md border bg-background/90 p-1 shadow-md backdrop-blur">
        <button
          aria-label="Move preview controls"
          className="flex h-8 w-5 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-muted active:cursor-grabbing"
          onPointerDown={startDrag}
          type="button"
        >
          <GripVertical className="size-4" />
        </button>
        <Select onValueChange={onValueChange} value={value}>
          <SelectTrigger
            aria-label={label}
            className="w-[6.5rem] border-0 bg-transparent shadow-none focus-visible:ring-0"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" className="z-[110]">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
