"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const ARENA = 280;
const CLAW = 56;
const PRIZE = 48;
const GRAB_TOLERANCE = 34;

export function ClawMachine({ theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();
  const [phase, setPhase] = useState<"idle" | "move" | "drop" | "done">("idle");
  const [clawX, setClawX] = useState(0);
  const [dropY, setDropY] = useState(0);
  const [won, setWon] = useState(false);
  const dir = useRef(1);
  const raf = useRef<ReturnType<typeof setInterval> | null>(null);
  const prizeX = useRef(Math.random() * (ARENA - PRIZE));

  function start() {
    setPhase("move");
    timer.reset();
    prizeX.current = Math.random() * (ARENA - PRIZE);
    raf.current = setInterval(() => {
      setClawX((x) => {
        let nx = x + dir.current * 4;
        if (nx <= 0) { nx = 0; dir.current = 1; }
        if (nx >= ARENA - CLAW) { nx = ARENA - CLAW; dir.current = -1; }
        return nx;
      });
    }, 16);
  }

  function drop() {
    if (phase !== "move") return;
    if (raf.current) clearInterval(raf.current);
    setPhase("drop");
    setDropY(ARENA - CLAW - 20);
    const clawCenter = clawX + CLAW / 2;
    const prizeCenter = prizeX.current + PRIZE / 2;
    const success = Math.abs(clawCenter - prizeCenter) < GRAB_TOLERANCE;
    setTimeout(() => {
      setWon(success);
      setPhase("done");
      setTimeout(() => onComplete({ outcome: success ? "claw_grab" : "claw_miss", won: success, durationMs: timer.elapsed() }), 700);
    }, 700);
  }

  useEffect(() => () => { if (raf.current) clearInterval(raf.current); }, []);

  return (
    <Stage instruction={phase === "idle" ? "Line up the claw and drop to grab a prize!" : phase === "done" ? (won ? "🎉 Got it!" : "So close!") : "Tap DROP when lined up"}>
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ width: ARENA, height: ARENA, background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.35))", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)" }}
      >
        {/* rail */}
        <div className="absolute left-0 right-0 top-3 h-1 bg-white/20" />
        {/* claw */}
        <div
          className="absolute"
          style={{ left: clawX, top: 4 + dropY, width: CLAW, transition: phase === "drop" || phase === "done" ? "top 0.65s ease-in" : "none" }}
        >
          <div className="mx-auto h-6 w-1 bg-white/40" />
          <div className="text-center text-4xl leading-none">🦾</div>
        </div>
        {/* prize */}
        <div
          className="absolute flex items-center justify-center text-4xl"
          style={{
            left: prizeX.current,
            bottom: 12,
            width: PRIZE, height: PRIZE,
            transform: phase === "done" && won ? `translateY(-${ARENA - CLAW - 60}px)` : "none",
            transition: "transform 0.6s ease-in",
            opacity: phase === "done" && won ? 0 : 1,
          }}
        >
          🎁
        </div>
      </div>
      {phase === "idle" ? <ArcadeButton onClick={start} pulse>START</ArcadeButton> : null}
      {phase === "move" ? <ArcadeButton onClick={drop}>DROP</ArcadeButton> : null}
    </Stage>
  );
}
