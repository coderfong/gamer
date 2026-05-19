"use client";
import { useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";

// Custom reel implementation — react-reel doesn't support React 18, so we
// scroll a vertical strip of symbols with CSS transforms. Server still
// decides the actual prize via draw_prize_atomic; the visual reels stop on
// a random set of symbols (purely cosmetic).

const DEFAULT_SYMBOLS = ["🍒", "🍋", "⭐", "🔔", "💎", "7️⃣", "🍀"];
const REEL_LEN = 30; // strip length per reel (renders this many vertically)
const SYMBOL_HEIGHT = 80;

interface ReelState {
  offsetPx: number;
  durationMs: number;
}

export function SlotMachine({ config, onComplete }: GameProps) {
  const symbols = (config?.symbols as string[] | undefined) ?? DEFAULT_SYMBOLS;
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<ReelState[]>([
    { offsetPx: 0, durationMs: 0 },
    { offsetPx: 0, durationMs: 0 },
    { offsetPx: 0, durationMs: 0 },
  ]);
  const startTs = useRef<number>(0);

  // Pre-render a fixed strip per reel (offset into this strip is the animation).
  const strips = useRef<string[][]>([buildStrip(symbols), buildStrip(symbols), buildStrip(symbols)]);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    startTs.current = performance.now();

    // pick a random final symbol per reel (display only)
    const stopIdxs = strips.current.map(
      (strip) => Math.floor(Math.random() * (strip.length - 6)) + 5,
    );

    const next: ReelState[] = stopIdxs.map((idx, i) => ({
      offsetPx: -idx * SYMBOL_HEIGHT,
      durationMs: 2200 + i * 600,
    }));
    setReels(next);

    const finalSymbols = stopIdxs.map((idx, i) => strips.current[i][idx]);
    const matched = finalSymbols.every((s) => s === finalSymbols[0]);

    setTimeout(() => {
      setSpinning(false);
      onComplete({
        outcome: matched ? `slot_match_${finalSymbols[0]}` : `slot_${finalSymbols.join("_")}`,
        durationMs: performance.now() - startTs.current,
      });
    }, Math.max(...next.map((r) => r.durationMs)) + 200);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-2 bg-black/90 p-3 rounded-xl">
        {strips.current.map((strip, i) => (
          <div
            key={i}
            className="overflow-hidden bg-white rounded-md"
            style={{ width: SYMBOL_HEIGHT, height: SYMBOL_HEIGHT }}
          >
            <div
              className="transition-transform ease-out"
              style={{
                transform: `translateY(${reels[i].offsetPx}px)`,
                transitionDuration: `${reels[i].durationMs}ms`,
              }}
            >
              {strip.map((sym, j) => (
                <div
                  key={j}
                  className="flex items-center justify-center text-3xl"
                  style={{ height: SYMBOL_HEIGHT }}
                >
                  {sym}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={spin} disabled={spinning} className="btn-brand">
        {spinning ? "Spinning..." : "Pull!"}
      </button>
    </div>
  );
}

function buildStrip(symbols: string[]): string[] {
  const strip: string[] = [];
  for (let i = 0; i < REEL_LEN; i++) {
    strip.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }
  return strip;
}
