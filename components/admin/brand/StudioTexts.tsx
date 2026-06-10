"use client";

import type { StudioText } from "@/lib/types/studio";

// Static render of custom text blocks placed over a game. Positioned in game
// space; "display" blocks use the headline style (.arcade-title) and "body"
// blocks inherit the small-text style. Shared by previews and the hub.
export function StudioTexts({ texts }: { texts: StudioText[] }) {
  return (
    <>
      {texts.map((t) => (
        <div
          key={t.id}
          className={`absolute pointer-events-none ${t.role === "display" ? "arcade-title" : ""}`}
          style={{
            left: t.x,
            top: t.y,
            width: t.width,
            fontSize: t.size,
            color: t.color || (t.role === "display" ? "var(--brand-color)" : "inherit"),
            textAlign: t.align,
            lineHeight: 1.1,
            zIndex: 6,
          }}
        >
          {t.content}
        </div>
      ))}
    </>
  );
}
