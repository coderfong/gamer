"use client";
import { useMemo, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { rotateHue, readableText } from "@/lib/games/colors";

const ROUNDS = 6;
const NAMES = ["RED", "ORANGE", "YELLOW", "GREEN", "BLUE", "PURPLE", "PINK", "TEAL"];
const HUES = [0, 30, 55, 130, 215, 275, 320, 175];

interface Round {
  targetIdx: number;
  options: number[]; // indices into HUES/NAMES
}

function makeRound(): Round {
  const pool = [...HUES.keys()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const options = pool.slice(0, 4);
  return { targetIdx: options[Math.floor(Math.random() * options.length)], options };
}

// Stroop-style: match the COLOR NAME shown to the correct swatch. N rounds.
export function ColorMatch({ onComplete }: GameProps) {
  const timer = useTimer();
  const [phase, setPhase] = useState<"idle" | "play">("idle");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const rounds = useMemo(() => Array.from({ length: ROUNDS }).map(makeRound), []);
  const current = rounds[Math.min(round, ROUNDS - 1)];

  function start() {
    setPhase("play");
    setRound(0);
    setScore(0);
    timer.reset();
  }

  function choose(idx: number) {
    if (phase !== "play" || flash) return;
    const correct = idx === current.targetIdx;
    setFlash(correct ? "ok" : "no");
    const newScore = score + (correct ? 1 : 0);
    setTimeout(() => {
      setFlash(null);
      if (round + 1 >= ROUNDS) {
        setPhase("idle");
        onComplete({ score: newScore, outcome: `colormatch_${newScore}/${ROUNDS}`, durationMs: timer.elapsed() });
      } else {
        setScore(newScore);
        setRound((r) => r + 1);
      }
    }, 450);
  }

  return (
    <Stage instruction={phase === "idle" ? "Tap the swatch that matches the word — quick!" : undefined}>
      {phase === "play" ? (
        <>
          <div className="flex gap-3">
            <Readout label="Round" value={`${round + 1}/${ROUNDS}`} />
            <Readout label="Correct" value={score} />
          </div>
          <div
            className="arcade-title text-4xl"
            style={{ animation: flash ? "flash-bg 0.4s" : undefined }}
          >
            {NAMES[current.targetIdx]}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {current.options.map((optIdx) => {
              const col = `hsl(${HUES[optIdx]} 75% 55%)`;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => choose(optIdx)}
                  aria-label={NAMES[optIdx]}
                  className="h-20 w-28 rounded-xl transition-transform hover:scale-105"
                  style={{ background: col, color: readableText(col), boxShadow: "0 8px 18px -6px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.3)" }}
                />
              );
            })}
          </div>
        </>
      ) : (
        <ArcadeButton onClick={start} pulse>START</ArcadeButton>
      )}
    </Stage>
  );
}
