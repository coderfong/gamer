"use client";

import { useEffect, useRef } from "react";
import type { OverlayElement } from "@/lib/types/campaign";
import { OverlayInner } from "./StudioOverlays";

// Draggable + resizable overlay images for the studio Extra-assets preview.
// Mirrors EditableTexts: window-level pointer listeners (robust across the
// re-renders each drag tick triggers); pointer deltas are divided by `scale`
// since the preview is scaled to fit the phone mockup. The static rotation is
// applied on an inner wrapper so the hit box / handle stay put while any
// animation plays.
export function EditableOverlays({
  overlays,
  scale,
  onChange,
  selectedId,
  onSelect,
}: {
  overlays: OverlayElement[];
  scale: number;
  onChange: (id: string, patch: Partial<OverlayElement>) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const drag = useRef<
    { mode: "move" | "resize"; id: string; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null
  >(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const dx = (e.clientX - d.sx) / scale;
      const dy = (e.clientY - d.sy) / scale;
      if (d.mode === "move") {
        onChange(d.id, { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) });
      } else {
        onChange(d.id, { width: Math.max(8, Math.round(d.ow + dx)), height: Math.max(8, Math.round(d.oh + dy)) });
      }
    }
    function onUp() { drag.current = null; }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scale, onChange]);

  function start(e: React.PointerEvent, el: OverlayElement, mode: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(el.id);
    drag.current = { mode, id: el.id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.width, oh: el.height };
  }

  return (
    <>
      {overlays.map((el) => {
        const selected = selectedId === el.id;
        return (
          <div
            key={el.id}
            onPointerDown={(e) => start(e, el, "move")}
            style={{
              position: "absolute",
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              cursor: "move",
              touchAction: "none",
              pointerEvents: "auto",
              outline: selected ? "1.5px dashed #6D4AFF" : "1px dashed rgba(109,74,255,0.4)",
              outlineOffset: 2,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: el.opacity,
                transform: `rotate(${el.rotation}deg)`,
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            >
              <OverlayInner el={el} />
            </div>
            {selected && (
              <div
                onPointerDown={(e) => start(e, el, "resize")}
                style={{
                  position: "absolute", right: -7, bottom: -7, width: 14, height: 14,
                  background: "#fff", border: "2px solid #6D4AFF", borderRadius: 3,
                  cursor: "nwse-resize", touchAction: "none", pointerEvents: "auto",
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
