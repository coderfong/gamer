"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, ArcadeButton, Stage } from "./arcade/Kit";

type Phase = "idle" | "waiting" | "go" | "done" | "early";

// Wait for green, then tap as fast as possible. Score = 1000 - reactionMs
// (clamped), so faster = higher score.
export function Reaction({ theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState(0);
  const goAt = useRef(0);
  const to = useRef<ReturnType<typeof setTimeout> | null>(null);

  function arm() {
    setPhase("waiting");
    const delay = 1200 + Math.random() * 2600;
    to.current = setTimeout(() => {
      goAt.current = performance.now();
      setPhase("go");
    }, delay);
  }

  useEffect(() => () => { if (to.current) clearTimeout(to.current); }, []);

  function click() {
    if (phase === "waiting") {
      if (to.current) clearTimeout(to.current);
      setPhase("early");
      return;
    }
    if (phase === "go") {
      const rt = Math.round(performance.now() - goAt.current);
      setMs(rt);
      setPhase("done");
      const score = Math.max(0, 1000 - rt);
      onComplete({ score, outcome: `reaction_${rt}ms`, durationMs: rt });
    }
  }

  const bg =
    phase === "go" ? "#16a34a" : phase === "waiting" ? "#b91c1c" : phase === "early" ? "#7f1d1d" : "rgba(0,0,0,0.25)";
  const label =
    phase === "idle" ? "Ready?" :
    phase === "waiting" ? "Wait for GREEN…" :
    phase === "go" ? "TAP NOW!" :
    phase === "early" ? "Too early! Try again" :
    `${ms} ms`;

  return (
    <Stage instruction="Tap the instant the panel turns green">
      <button
        type="button"
        onClick={click}
        disabled={phase === "idle" || phase === "done"}
        className="flex h-56 w-full max-w-xs items-center justify-center rounded-2xl arcade-title text-3xl text-white select-none transition-colors"
        style={{ background: bg, boxShadow: phase === "go" ? "0 0 40px 4px #16a34a" : "inset 0 2px 8px rgba(0,0,0,0.4)" }}
      >
        {label}
      </button>
      {phase === "idle" ? <ArcadeButton onClick={arm} pulse>START</ArcadeButton> : null}
      {phase === "early" ? <ArcadeButton onClick={arm}>RETRY</ArcadeButton> : null}
      {phase === "done" ? <div className="arcade-display text-xl" style={{ color: pal.brand }}>Nice reflexes!</div> : null}
    </Stage>
  );
}
