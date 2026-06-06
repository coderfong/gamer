"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const GAME_MS = 12000;
const ARENA = 280;
const TARGET = 56;

export function TapTarget({ theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();
  const [phase, setPhase] = useState<"idle" | "play">("idle");
  const [pos, setPos] = useState({ x: ARENA / 2 - TARGET / 2, y: ARENA / 2 - TARGET / 2 });
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(GAME_MS);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  function relocate() {
    setPos({
      x: Math.random() * (ARENA - TARGET),
      y: Math.random() * (ARENA - TARGET),
    });
  }

  function start() {
    setPhase("play");
    setScore(0);
    setLeft(GAME_MS);
    timer.reset();
    relocate();
    tick.current = setInterval(() => setLeft((l) => Math.max(0, l - 100)), 100);
  }

  useEffect(() => {
    if (phase === "play" && left <= 0) {
      if (tick.current) clearInterval(tick.current);
      const finalScore = score;
      setPhase("idle");
      onComplete({ score: finalScore, outcome: `target_${finalScore}`, durationMs: timer.elapsed() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  useEffect(() => () => { if (tick.current) clearInterval(tick.current); }, []);

  function hit() {
    if (phase !== "play") return;
    setScore((s) => s + 1);
    relocate();
  }

  return (
    <Stage instruction={phase === "idle" ? "Tap the bullseye as many times as you can in 12s!" : undefined}>
      {phase === "play" ? (
        <div className="flex gap-3">
          <Readout label="Hits" value={score} color={pal.brand} />
          <Readout label="Time" value={`${(left / 1000).toFixed(1)}s`} />
        </div>
      ) : null}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ width: ARENA, height: ARENA, background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05), rgba(0,0,0,0.3))", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)" }}
      >
        {phase === "play" ? (
          <button
            type="button"
            onClick={hit}
            aria-label="Target"
            className="absolute rounded-full"
            style={{
              left: pos.x, top: pos.y, width: TARGET, height: TARGET,
              background: `radial-gradient(circle, #fff 0 18%, ${pal.brand} 18% 40%, #fff 40% 60%, ${darken(pal.brand, 0.1)} 60% 100%)`,
              boxShadow: `0 0 16px 2px ${lighten(pal.brand, 0.2)}`,
              transition: "left 0.08s, top 0.08s",
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-50">🎯</div>
        )}
      </div>
      {phase === "idle" ? <ArcadeButton onClick={start} pulse>START</ArcadeButton> : null}
    </Stage>
  );
}
