"use client";
import { useMemo, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, Stage } from "./arcade/Kit";
import { rotateHue, lighten, darken } from "@/lib/games/colors";

// Pop one balloon to reveal your prize. Server decides the actual prize.
export function PopBalloon({ config, theme, onComplete }: GameProps) {
  const count = Math.min(8, Math.max(4, (config?.balloonCount as number | undefined) ?? 6));
  const pal = useArcade(theme);
  const timer = useTimer();
  const [popped, setPopped] = useState<number | null>(null);

  const colors = useMemo(
    () => Array.from({ length: count }).map((_, i) => rotateHue(pal.brand, (i * 47) % 360)),
    [count, pal.brand],
  );

  function pop(i: number) {
    if (popped != null) return;
    timer.begin();
    setPopped(i);
    setTimeout(() => onComplete({ outcome: `balloon_${i}`, durationMs: timer.elapsed() }), 1100);
  }

  return (
    <Stage instruction={popped != null ? "💥 Pop!" : "Pop a balloon!"}>
      <div className="grid grid-cols-4 gap-3 px-2">
        {Array.from({ length: count }).map((_, i) => {
          const isPopped = popped === i;
          const dim = popped != null && !isPopped;
          const c = colors[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => pop(i)}
              disabled={popped != null}
              aria-label={`Balloon ${i + 1}`}
              className="relative h-24 w-16"
              style={{ animation: popped == null ? `balloon-float 2.8s ease-in-out ${i * 0.15}s infinite` : undefined }}
            >
              {isPopped ? (
                <span className="absolute inset-0 flex items-center justify-center text-4xl animate-[pop-in_0.4s_ease-out]">🎁</span>
              ) : (
                <>
                  <span
                    className="absolute left-1/2 top-0 h-20 w-14 -translate-x-1/2 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, ${lighten(c, 0.4)}, ${darken(c, 0.1)})`,
                      opacity: dim ? 0.35 : 1,
                      boxShadow: "inset -4px -6px 10px rgba(0,0,0,0.25)",
                    }}
                  />
                  <span
                    className="absolute left-1/2 top-[78px] h-6 w-px -translate-x-1/2"
                    style={{ background: "rgba(255,255,255,0.4)", opacity: dim ? 0.35 : 1 }}
                  />
                </>
              )}
            </button>
          );
        })}
      </div>
    </Stage>
  );
}
