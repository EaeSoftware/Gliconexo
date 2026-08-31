"use client";

import { useRef } from "react";
import type { CropRectPercent } from "@/features/ocr/canvas-utils";

const MIN_SIZE = 10;

type DragMode = "move" | "nw" | "ne" | "sw" | "se";

type CropRectOverlayProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  rect: CropRectPercent;
  onChange: (rect: CropRectPercent) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CropRectOverlay({ containerRef, rect, onChange }: CropRectOverlayProps) {
  const dragState = useRef<{ mode: DragMode; startX: number; startY: number; startRect: CropRectPercent } | null>(
    null,
  );

  function handlePointerDown(event: React.PointerEvent, mode: DragMode) {
    event.preventDefault();
    (event.target as Element).setPointerCapture(event.pointerId);
    dragState.current = { mode, startX: event.clientX, startY: event.clientY, startRect: rect };
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragState.current;
    const container = containerRef.current;
    if (!drag || !container) return;

    const bounds = container.getBoundingClientRect();
    const deltaXPct = ((event.clientX - drag.startX) / bounds.width) * 100;
    const deltaYPct = ((event.clientY - drag.startY) / bounds.height) * 100;
    const start = drag.startRect;

    let next: CropRectPercent = start;

    if (drag.mode === "move") {
      const x = clamp(start.x + deltaXPct, 0, 100 - start.width);
      const y = clamp(start.y + deltaYPct, 0, 100 - start.height);
      next = { ...start, x, y };
    } else {
      let { x, y, width, height } = start;
      if (drag.mode === "se") {
        width = clamp(start.width + deltaXPct, MIN_SIZE, 100 - start.x);
        height = clamp(start.height + deltaYPct, MIN_SIZE, 100 - start.y);
      } else if (drag.mode === "sw") {
        const newX = clamp(start.x + deltaXPct, 0, start.x + start.width - MIN_SIZE);
        width = start.width + (start.x - newX);
        x = newX;
        height = clamp(start.height + deltaYPct, MIN_SIZE, 100 - start.y);
      } else if (drag.mode === "ne") {
        width = clamp(start.width + deltaXPct, MIN_SIZE, 100 - start.x);
        const newY = clamp(start.y + deltaYPct, 0, start.y + start.height - MIN_SIZE);
        height = start.height + (start.y - newY);
        y = newY;
      } else if (drag.mode === "nw") {
        const newX = clamp(start.x + deltaXPct, 0, start.x + start.width - MIN_SIZE);
        width = start.width + (start.x - newX);
        x = newX;
        const newY = clamp(start.y + deltaYPct, 0, start.y + start.height - MIN_SIZE);
        height = start.height + (start.y - newY);
        y = newY;
      }
      next = { x, y, width, height };
    }

    onChange(next);
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  const handleStyle = "absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-brand-blue bg-white/90";

  return (
    <div
      className="absolute border-2 border-brand-blue bg-brand-blue/10"
      style={{
        left: `${rect.x}%`,
        top: `${rect.y}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
      }}
      onPointerDown={(event) => handlePointerDown(event, "move")}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {(["nw", "ne", "sw", "se"] as const).map((corner) => (
        <button
          key={corner}
          type="button"
          aria-label={`Ajustar o recorte pelo canto ${corner}`}
          className={handleStyle}
          style={{
            left: corner.includes("w") ? 0 : "100%",
            top: corner.includes("n") ? 0 : "100%",
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            handlePointerDown(event, corner);
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            handlePointerMove(event);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            handlePointerUp();
          }}
        />
      ))}
    </div>
  );
}
