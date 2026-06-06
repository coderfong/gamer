"use client";
import { useMemo, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, Stage } from "./arcade/Kit";
import { lighten, darken, rotateHue, readableText } from "@/lib/games/colors";

// Pick one playing card to flip. Server decides the prize; the reveal is
// cosmetic. Card faces show suit-style icons; the chosen card glows.
export function CardFlip({ config, theme, onComplete }: GameProps) {
  const count = Math.min(6, Math.max(3, (config?.cardCount as number | undefined) ?? 4));
  const faces = (config?.faces as string[] | undefined) ?? ["🂡", "★", "♣", "♥", "♦", "♠"];
  const pal = useArcade(theme);
  const timer = useTimer();
  const [picked, setPicked] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);

  const reveals = useMemo(
    () => Array.from({ length: count }).map((_, i) => faces[i % faces.length]),
    [count, faces],
  );

  function pick(i: number) {
    if (picked != null) return;
    timer.begin();
    setPicked(i);
    setTimeout(() => setRevealAll(true), 800);
    setTimeout(() => onComplete({ outcome: `card_${i}`, durationMs: timer.elapsed() }), 1600);
  }

  return (
    <Stage instruction="Pick a card to reveal your prize">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: count }).map((_, i) => {
          const isPicked = picked === i;
          const flipped = isPicked || revealAll;
          const dimmed = revealAll && !isPicked;
          const c = rotateHue(pal.brand, (i * 28) % 360);
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={picked != null}
              aria-label={`Card ${i + 1}`}
              className="h-32 w-24 [perspective:800px] disabled:cursor-default"
            >
              <div
                className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]"
                style={{
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
                  opacity: dimmed ? 0.45 : 1,
                  filter: dimmed ? "grayscale(0.6)" : "none",
                }}
              >
                {/* back */}
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center text-3xl [backface-visibility:hidden] hover:scale-105 transition-transform"
                  style={{
                    background: `repeating-linear-gradient(45deg, ${darken(c, 0.1)} 0 8px, ${darken(c, 0.22)} 8px 16px)`,
                    border: "3px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 8px 18px -6px rgba(0,0,0,0.6)",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.85)" }}>✦</span>
                </div>
                {/* face */}
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center text-5xl bg-white [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{
                    color: readableText("#ffffff"),
                    boxShadow: isPicked ? `0 0 22px 2px ${pal.accent}, inset 0 0 0 3px ${pal.accent}` : "inset 0 0 0 2px rgba(0,0,0,0.08)",
                  }}
                >
                  <span className={isPicked ? "animate-[pop-in_0.5s_ease-out]" : ""} style={{ color: lighten(pal.brand, -0.1) }}>
                    {reveals[i]}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Stage>
  );
}
