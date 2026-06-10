"use client";

import { useEffect, useRef, useState } from "react";
import type { StudioText } from "@/lib/types/studio";

// Draggable + resizable text blocks for the studio Text-step preview. Uses
// window-level pointer listeners (robust across the re-renders each drag tick
// triggers). Pointer deltas are divided by `scale` since the preview is scaled.
export function EditableTexts({
  texts,
  scale,
  onChange,
}: {
  texts: StudioText[];
  scale: number;
  onChange: (id: string, patch: Partial<StudioText>) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const drag = useRef<{ mode: "move" | "resize"; id: string; sx: number; sy: number; ox: number; oy: number; ow: number; os: number } | null>(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const dx = (e.clientX - d.sx) / scale;
      const dy = (e.clientY - d.sy) / scale;
      if (d.mode === "move") {
        onChange(d.id, { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) });
      } else {
        onChange(d.id, { width: Math.max(40, Math.round(d.ow + dx)), size: Math.max(8, Math.round(d.os + dy * 0.5)) });
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

  function start(e: React.PointerEvent, t: StudioText, mode: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    setSel(t.id);
    drag.current = { mode, id: t.id, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y, ow: t.width, os: t.size };
  }

  return (
    <>
      {texts.map((t) => {
        const selected = sel === t.id;
        return (
          <div
            key={t.id}
            onPointerDown={(e) => start(e, t, "move")}
            className={`absolute ${t.role === "display" ? "arcade-title" : ""}`}
            style={{
              left: t.x,
              top: t.y,
              width: t.width,
              fontSize: t.size,
              color: t.color || (t.role === "display" ? "var(--brand-color)" : "inherit"),
              textAlign: t.align,
              lineHeight: 1.1,
              cursor: "move",
              touchAction: "none",
              userSelect: "none",
              pointerEvents: "auto",
              zIndex: 8,
              outline: selected ? "1.5px dashed #6D4AFF" : "1px dashed rgba(109,74,255,0.4)",
              outlineOffset: 2,
            }}
          >
            {t.content || " "}
            {selected && (
              <div
                onPointerDown={(e) => start(e, t, "resize")}
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
