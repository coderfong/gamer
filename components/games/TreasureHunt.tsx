"use client";
import { useMemo, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, Stage } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

// Dig one tile from the sand grid to uncover treasure. Server decides the prize.
export function TreasureHunt({ config, theme, onComplete }: GameProps) {
  const size = Math.min(16, Math.max(9, (config?.gridSize as number | undefined) ?? 9));
  const pal = useArcade(theme);
  const timer = useTimer();
  const [dug, setDug] = useState<number | null>(null);
  const cols = Math.round(Math.sqrt(size));

  const decoys = useMemo(
    () => Array.from({ length: size }).map(() => (Math.random() < 0.25 ? "🪨" : "")),
    [size],
  );

  function dig(i: number) {
    if (dug != null) return;
    timer.begin();
    setDug(i);
    setTimeout(() => onComplete({ outcome: `dig_${i}`, durationMs: timer.elapsed() }), 1100);
  }

  return (
    <Stage instruction={dug != null ? "💎 You found it!" : "Dig for buried treasure!"}>
      <div className="grid gap-2 rounded-2xl p-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, background: "rgba(0,0,0,0.25)" }}>
        {Array.from({ length: size }).map((_, i) => {
          const isDug = dug === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => dig(i)}
              disabled={dug != null}
              aria-label={`Tile ${i + 1}`}
              className="flex h-16 w-16 items-center justify-center rounded-lg text-3xl transition-transform hover:scale-105 disabled:hover:scale-100"
              style={{
                background: isDug
                  ? `radial-gradient(circle, ${lighten(pal.accent, 0.4)}, ${pal.light})`
                  : `linear-gradient(160deg, ${lighten("#d9b382", 0.1)}, ${darken("#c79a63", 0.05)})`,
                boxShadow: isDug ? `0 0 20px 2px ${pal.accent}` : "inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(0,0,0,0.2)",
              }}
            >
              {isDug ? <span className="animate-[pop-in_0.45s_ease-out]">💎</span> : decoys[i]}
            </button>
          );
        })}
      </div>
    </Stage>
  );
}
