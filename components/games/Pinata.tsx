"use client";
import { useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, Stage } from "./arcade/Kit";
import { lighten } from "@/lib/games/colors";

const HITS_TO_BURST = 5;

// Tap the piñata repeatedly to fill the smash meter; on burst the prize drops.
export function Pinata({ theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();
  const [hits, setHits] = useState(0);
  const [burst, setBurst] = useState(false);
  const [shake, setShake] = useState(false);

  function hit() {
    if (burst) return;
    timer.begin();
    const n = hits + 1;
    setHits(n);
    setShake(true);
    setTimeout(() => setShake(false), 180);
    if (n >= HITS_TO_BURST) {
      setBurst(true);
      setTimeout(() => onComplete({ outcome: "pinata_burst", durationMs: timer.elapsed() }), 900);
    }
  }

  const pct = Math.min(100, (hits / HITS_TO_BURST) * 100);

  return (
    <Stage instruction={burst ? "🎉 It burst!" : "Tap the piñata to smash it!"}>
      <button
        type="button"
        onClick={hit}
        disabled={burst}
        aria-label="Hit the piñata"
        className="relative h-48 w-48 select-none"
        style={{ animation: shake ? "wiggle 0.18s ease-in-out" : "float-bob 3s ease-in-out infinite" }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full text-7xl transition-transform"
          style={{
            background: `radial-gradient(circle at 40% 35%, ${lighten(pal.accent, 0.3)}, ${pal.brand} 75%)`,
            boxShadow: `0 16px 36px -10px rgba(0,0,0,0.6), inset 0 0 30px ${lighten(pal.brand, 0.2)}`,
            transform: burst ? "scale(1.25)" : "scale(1)",
            opacity: burst ? 0 : 1,
          }}
        >
          🪅
        </div>
        {burst ? (
          <div className="absolute inset-0 flex items-center justify-center text-7xl animate-[pop-in_0.5s_ease-out]">🎁</div>
        ) : null}
      </button>

      <div className="h-4 w-56 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${pal.brand}, ${lighten(pal.accent, 0.2)})` }}
        />
      </div>
    </Stage>
  );
}
