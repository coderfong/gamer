"use client";
import { useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";

const ALLOWED_COUNTS = [3, 6, 9] as const;
type BoxCount = (typeof ALLOWED_COUNTS)[number];

// Custom build, no library. Server decides the prize via draw_prize_atomic;
// the box reveal is cosmetic — we just animate a CSS 3D flip on the chosen box,
// then grey out the others showing decoy contents.

export function PickABox({ config, theme, onComplete }: GameProps) {
  const requested = (config?.boxCount as number | undefined) ?? 6;
  const boxCount: BoxCount = (ALLOWED_COUNTS as readonly number[]).includes(requested)
    ? (requested as BoxCount)
    : 6;
  const decoys = (config?.decoys as string[] | undefined) ?? ["🎁", "⭐", "💎", "🍫", "🎉", "🍩", "🎈", "🍀", "🧸"];

  const [picked, setPicked] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const startTs = useRef<number>(0);

  // Pre-assign decoy contents to each box (visible only after pick + reveal).
  const contents = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < boxCount; i++) arr.push(decoys[i % decoys.length]);
    return arr;
  }, [boxCount, decoys]);

  function pick(i: number) {
    if (picked != null) return;
    if (startTs.current === 0) startTs.current = performance.now();
    setPicked(i);
    setTimeout(() => setRevealAll(true), 800);
    setTimeout(() => {
      onComplete({
        outcome: `box_${i}`,
        durationMs: performance.now() - startTs.current,
      });
    }, 1600);
  }

  const cols = boxCount === 3 ? 3 : boxCount === 6 ? 3 : 3;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-600">Pick a box!</p>
      <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: boxCount }).map((_, i) => {
          const isPicked = picked === i;
          const flipped = isPicked || revealAll;
          const dimmed = revealAll && !isPicked;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              className="w-24 h-24 [perspective:600px] disabled:cursor-default"
              disabled={picked != null}
              aria-label={`Box ${i + 1}`}
            >
              <div
                className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <div
                  className="absolute inset-0 rounded-xl border flex items-center justify-center font-bold text-white [backface-visibility:hidden]"
                  style={{ background: theme.brandColor ?? "#6d28d9" }}
                >
                  {i + 1}
                </div>
                <div
                  className={`absolute inset-0 rounded-xl border flex items-center justify-center text-4xl bg-white [backface-visibility:hidden] [transform:rotateY(180deg)] ${dimmed ? "opacity-40" : ""}`}
                >
                  {contents[i]}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
