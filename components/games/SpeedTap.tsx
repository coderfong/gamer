"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const GAME_MS = 5000;

export function SpeedTap({ theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();
  const [phase, setPhase] = useState<"idle" | "play">("idle");
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState(GAME_MS);
  const [bump, setBump] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setPhase("play");
    setTaps(0);
    setLeft(GAME_MS);
    timer.reset();
    tick.current = setInterval(() => setLeft((l) => Math.max(0, l - 100)), 100);
  }

  useEffect(() => {
    if (phase === "play" && left <= 0) {
      if (tick.current) clearInterval(tick.current);
      const finalScore = taps;
      setPhase("idle");
      onComplete({ score: finalScore, outcome: `tap_${finalScore}`, durationMs: timer.elapsed() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  useEffect(() => () => { if (tick.current) clearInterval(tick.current); }, []);

  function tap() {
    if (phase !== "play") return;
    setTaps((t) => t + 1);
    setBump(true);
    setTimeout(() => setBump(false), 70);
  }

  return (
    <Stage instruction={phase === "idle" ? "Tap the button as fast as you can for 5 seconds!" : undefined}>
      {phase === "play" ? (
        <div className="flex gap-3">
          <Readout label="Taps" value={taps} color={pal.brand} />
          <Readout label="Time" value={`${(left / 1000).toFixed(1)}s`} />
        </div>
      ) : null}
      {phase === "play" ? (
        <button
          type="button"
          onClick={tap}
          className="flex h-48 w-48 items-center justify-center rounded-full arcade-title text-2xl text-white select-none"
          style={{
            background: `radial-gradient(circle at 40% 30%, ${lighten(pal.brand, 0.35)}, ${darken(pal.brand, 0.1)})`,
            boxShadow: `0 14px 30px -8px ${pal.brand}, inset 0 3px 0 rgba(255,255,255,0.4)`,
            transform: bump ? "scale(0.93)" : "scale(1)",
            transition: "transform 0.06s",
          }}
        >
          TAP!
        </button>
      ) : (
        <ArcadeButton onClick={start} pulse>START</ArcadeButton>
      )}
    </Stage>
  );
}
