"use client";
import { useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function Die({ value, color, rolling }: { value: number; color: string; rolling: boolean }) {
  return (
    <div
      className="relative grid h-20 w-20 grid-cols-3 grid-rows-3 gap-1 rounded-2xl p-2"
      style={{
        background: `linear-gradient(160deg, ${lighten(color, 0.3)}, ${darken(color, 0.15)})`,
        boxShadow: "0 10px 22px -8px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.4)",
        animation: rolling ? "dice-tumble 0.5s linear infinite" : undefined,
      }}
    >
      {Array.from({ length: 9 }).map((_, idx) => {
        const r = Math.floor(idx / 3);
        const c = idx % 3;
        const on = PIPS[value].some(([pr, pc]) => pr === r && pc === c);
        return (
          <span
            key={idx}
            className="m-auto h-3 w-3 rounded-full"
            style={{ background: on ? "#1b1320" : "transparent", boxShadow: on ? "inset 0 1px 1px rgba(255,255,255,0.3)" : "none" }}
          />
        );
      })}
    </div>
  );
}

export function DiceRoll({ theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [done, setDone] = useState(false);

  function roll() {
    if (rolling || done) return;
    setRolling(true);
    timer.reset();
    let ticks = 0;
    const iv = setInterval(() => {
      setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] as [number, number]);
      if (++ticks > 12) {
        clearInterval(iv);
        const final: [number, number] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
        setDice(final);
        setRolling(false);
        setDone(true);
        onComplete({
          score: final[0] + final[1],
          outcome: `dice_${final[0]}_${final[1]}`,
          durationMs: timer.elapsed(),
        });
      }
    }, 90);
  }

  return (
    <Stage instruction="Roll the dice for your prize!">
      <div className="flex gap-4">
        <Die value={dice[0]} color={pal.brand} rolling={rolling} />
        <Die value={dice[1]} color={pal.accent} rolling={rolling} />
      </div>
      <div className="arcade-display text-2xl">{rolling ? "…" : `Total ${dice[0] + dice[1]}`}</div>
      <ArcadeButton onClick={roll} disabled={rolling || done} pulse={!done}>
        {rolling ? "Rolling…" : done ? "Done" : "ROLL"}
      </ArcadeButton>
    </Stage>
  );
}
