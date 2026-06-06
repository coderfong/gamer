"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const HOLES = 9;
const GAME_MS = 15000;

export function WhackAMole({ theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();
  const [phase, setPhase] = useState<"idle" | "play">("idle");
  const [active, setActive] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(GAME_MS);
  const moleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setPhase("play");
    setScore(0);
    setLeft(GAME_MS);
    timer.reset();
    moleTimer.current = setInterval(() => setActive(Math.floor(Math.random() * HOLES)), 750);
    tick.current = setInterval(() => setLeft((l) => Math.max(0, l - 100)), 100);
  }

  useEffect(() => {
    if (phase === "play" && left <= 0) {
      if (moleTimer.current) clearInterval(moleTimer.current);
      if (tick.current) clearInterval(tick.current);
      setActive(null);
      const finalScore = score;
      setPhase("idle");
      onComplete({ score: finalScore, outcome: `whack_${finalScore}`, durationMs: timer.elapsed() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  useEffect(() => () => {
    if (moleTimer.current) clearInterval(moleTimer.current);
    if (tick.current) clearInterval(tick.current);
  }, []);

  function whack(i: number) {
    if (phase !== "play" || active !== i) return;
    setScore((s) => s + 1);
    setActive(null);
  }

  return (
    <Stage instruction={phase === "idle" ? "Whack as many moles as you can in 15s!" : undefined}>
      {phase === "play" ? (
        <div className="flex gap-3">
          <Readout label="Score" value={score} color={pal.brand} />
          <Readout label="Time" value={`${(left / 1000).toFixed(1)}s`} />
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: HOLES }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => whack(i)}
            disabled={phase !== "play"}
            aria-label={`Hole ${i + 1}`}
            className="relative h-20 w-20 overflow-hidden rounded-full"
            style={{
              background: `radial-gradient(circle at 50% 80%, ${darken(pal.dark, 0.2)}, #0e0a14)`,
              boxShadow: "inset 0 6px 12px rgba(0,0,0,0.6)",
            }}
          >
            {active === i ? (
              <span
                className="absolute bottom-0 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full text-3xl"
                style={{ background: `radial-gradient(circle at 40% 30%, ${lighten(pal.brand, 0.3)}, ${pal.brand})`, animation: "mole-up 0.15s ease-out" }}
              >
                🐹
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {phase === "idle" ? <ArcadeButton onClick={start} pulse>START</ArcadeButton> : null}
    </Stage>
  );
}
