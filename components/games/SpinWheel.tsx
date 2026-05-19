"use client";
import { useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";

const DEFAULT_SEGMENTS = ["🎁", "⭐", "💎", "🍀", "🎉", "🍩", "🍫", "🎈"];

/**
 * Visual-only wheel. The actual prize is decided server-side by draw_prize();
 * the wheel just lands on a random segment for show.
 */
export function SpinWheel({ config, theme, onComplete }: GameProps) {
  const segments = (config?.segments as string[] | undefined) ?? DEFAULT_SEGMENTS;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const startTs = useRef<number>(0);

  const slice = 360 / segments.length;

  const colors = useMemo(() => {
    const base = theme.brandColor ?? "#6d28d9";
    return segments.map((_, i) => (i % 2 === 0 ? base : shade(base, -20)));
  }, [segments, theme.brandColor]);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    startTs.current = performance.now();
    const turns = 5 + Math.random() * 3;
    const landing = Math.random() * 360;
    const target = rotation + turns * 360 + landing;
    setRotation(target);
    setTimeout(() => {
      setSpinning(false);
      const segIdx = Math.floor(((360 - (target % 360)) % 360) / slice);
      onComplete({
        outcome: `segment_${segIdx}`,
        durationMs: performance.now() - startTs.current,
      });
    }, 4200);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-72 w-72">
        <div
          className="absolute inset-0 rounded-full transition-transform duration-[4000ms] ease-out shadow-inner"
          style={{
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(${segments
              .map((_, i) => `${colors[i]} ${i * slice}deg ${(i + 1) * slice}deg`)
              .join(", ")})`,
          }}
        >
          {segments.map((label, i) => {
            const angle = i * slice + slice / 2;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-[0_0] text-white font-semibold text-lg"
                style={{
                  transform: `rotate(${angle}deg) translate(70px) rotate(-90deg)`,
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-black" />
        <div className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-white border-4 border-black/20 z-10" />
      </div>
      <button onClick={spin} disabled={spinning} className="btn-brand">
        {spinning ? "Spinning..." : "Spin!"}
      </button>
    </div>
  );
}

function shade(hex: string, percent: number) {
  const c = hex.replace("#", "");
  const num = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
