"use client";
import { useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken, rotateHue, readableText } from "@/lib/games/colors";

const ALLOWED_COUNTS = [3, 6, 9] as const;
type BoxCount = (typeof ALLOWED_COUNTS)[number];

// Custom build, no library. Server decides the prize via draw_prize_atomic;
// the box reveal is cosmetic — we flip the chosen gift box, then dim the rest
// showing decoy contents.

export function PickABox({ config, theme, onComplete }: GameProps) {
  const requested = (config?.boxCount as number | undefined) ?? 6;
  const boxCount: BoxCount = (ALLOWED_COUNTS as readonly number[]).includes(requested)
    ? (requested as BoxCount)
    : 6;
  const decoys = (config?.decoys as string[] | undefined) ?? ["🎁", "⭐", "💎", "🍫", "🎉", "🍩", "🎈", "🍀", "🧸"];

  const [picked, setPicked] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const startTs = useRef<number>(0);
  const pal = palette(theme.brandColor, theme.brandFg);

  // Per-box wrapping color, cycling brand → accent hues for variety.
  const wraps = useMemo(
    () =>
      Array.from({ length: boxCount }).map((_, i) => {
        const c = rotateHue(pal.brand, (i * 40) % 360);
        return { top: lighten(c, 0.18), bottom: darken(c, 0.18), ribbon: lighten(c, 0.5) };
      }),
    [boxCount, pal.brand],
  );

  const contents = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < boxCount; i++) arr.push(decoys[i % decoys.length]);
    return arr;
  }, [boxCount, decoys]);

  function pick(i: number) {
    if (picked != null) return;
    if (startTs.current === 0) startTs.current = performance.now();
    setPicked(i);
    setTimeout(() => setRevealAll(true), 900);
    setTimeout(() => {
      onComplete({
        outcome: `box_${i}`,
        durationMs: performance.now() - startTs.current,
      });
    }, 1700);
  }

  const cols = boxCount === 3 ? 3 : 3;

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <p className="arcade-muted text-base font-semibold">
        Pick a gift to reveal your prize
      </p>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: boxCount }).map((_, i) => {
          const isPicked = picked === i;
          const flipped = isPicked || revealAll;
          const dimmed = revealAll && !isPicked;
          const w = wraps[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              className="group h-28 w-28 [perspective:700px] disabled:cursor-default transition-transform"
              style={{
                animation: picked == null ? `float-bob 3s ease-in-out ${i * 0.2}s infinite` : undefined,
              }}
              disabled={picked != null}
              aria-label={`Gift ${i + 1}`}
            >
              <div
                className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]"
                style={{
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  filter: dimmed ? "grayscale(0.6)" : "none",
                  opacity: dimmed ? 0.5 : 1,
                }}
              >
                {/* Front: wrapped gift */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden [backface-visibility:hidden] transition-transform group-hover:scale-105"
                  style={{
                    background: `linear-gradient(160deg, ${w.top}, ${w.bottom})`,
                    boxShadow: `0 12px 24px -8px ${darken(w.bottom, 0.3)}, inset 0 2px 4px rgba(255,255,255,0.35)`,
                  }}
                >
                  {/* ribbon cross */}
                  <span
                    className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4"
                    style={{ background: w.ribbon, opacity: 0.85 }}
                  />
                  <span
                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-4"
                    style={{ background: w.ribbon, opacity: 0.85 }}
                  />
                  {/* bow */}
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl">
                    🎀
                  </span>
                  {/* gloss */}
                  <span
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.4), transparent 45%)",
                    }}
                  />
                </div>

                {/* Back: revealed content */}
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center text-5xl [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{
                    background: isPicked
                      ? `radial-gradient(circle at 50% 40%, ${lighten(pal.accent, 0.4)}, ${pal.light})`
                      : "#ffffff",
                    color: readableText(pal.light),
                    boxShadow: isPicked
                      ? `0 0 24px 2px ${pal.accent}, inset 0 0 0 2px ${pal.accent}`
                      : "inset 0 0 0 1px rgba(0,0,0,0.08)",
                  }}
                >
                  <span className={isPicked ? "animate-[pop-in_0.5s_ease-out]" : ""}>
                    {contents[i]}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
