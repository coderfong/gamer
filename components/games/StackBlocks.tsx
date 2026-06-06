"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { rotateHue, lighten } from "@/lib/games/colors";

const ARENA_W = 260;
const BH = 26;
const BASE_W = 120;
const MAX_STACK = 8;

interface Block { x: number; w: number; }

export function StackBlocks({ theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();
  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [placed, setPlaced] = useState<Block[]>([]);
  const [moving, setMoving] = useState<Block>({ x: 0, w: BASE_W });
  const dir = useRef(1);
  const speed = useRef(3);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);

  function startMoving(w: number) {
    setMoving({ x: 0, w });
    dir.current = 1;
    if (iv.current) clearInterval(iv.current);
    iv.current = setInterval(() => {
      setMoving((m) => {
        let nx = m.x + dir.current * speed.current;
        if (nx <= 0) { nx = 0; dir.current = 1; }
        if (nx >= ARENA_W - m.w) { nx = ARENA_W - m.w; dir.current = -1; }
        return { ...m, x: nx };
      });
    }, 16);
  }

  function start() {
    setPhase("play");
    timer.reset();
    speed.current = 3;
    setPlaced([{ x: (ARENA_W - BASE_W) / 2, w: BASE_W }]);
    startMoving(BASE_W);
  }

  function finish(stack: number) {
    if (iv.current) clearInterval(iv.current);
    setPhase("done");
    onComplete({ score: stack, outcome: `stack_${stack}`, durationMs: timer.elapsed() });
  }

  function drop() {
    if (phase !== "play") return;
    const top = placed[placed.length - 1];
    const left = Math.max(moving.x, top.x);
    const right = Math.min(moving.x + moving.w, top.x + top.w);
    const overlap = right - left;
    if (overlap <= 0) {
      finish(placed.length - 1);
      return;
    }
    const next = [...placed, { x: left, w: overlap }];
    setPlaced(next);
    if (next.length - 1 >= MAX_STACK) {
      finish(next.length - 1);
      return;
    }
    speed.current += 0.4;
    startMoving(overlap);
  }

  useEffect(() => () => { if (iv.current) clearInterval(iv.current); }, []);

  const stackCount = placed.length - 1;

  return (
    <Stage instruction={phase === "idle" ? "Tap DROP to stack the blocks — keep them aligned!" : phase === "done" ? `Stacked ${stackCount}!` : "Tap DROP to land the block"}>
      {phase !== "idle" ? <Readout label="Stacked" value={stackCount} color={pal.brand} /> : null}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ width: ARENA_W, height: (MAX_STACK + 2) * BH, background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.35))", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)" }}
      >
        {placed.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: b.x,
              bottom: i * BH,
              width: b.w,
              height: BH - 2,
              background: `linear-gradient(180deg, ${lighten(rotateHue(pal.brand, i * 18), 0.2)}, ${rotateHue(pal.brand, i * 18)})`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          />
        ))}
        {phase === "play" ? (
          <div
            className="absolute rounded-sm"
            style={{
              left: moving.x,
              bottom: placed.length * BH,
              width: moving.w,
              height: BH - 2,
              background: `linear-gradient(180deg, ${lighten(pal.accent, 0.25)}, ${pal.accent})`,
              boxShadow: `0 0 12px 1px ${pal.accent}`,
            }}
          />
        ) : null}
      </div>
      {phase === "idle" ? <ArcadeButton onClick={start} pulse>START</ArcadeButton> : null}
      {phase === "play" ? <ArcadeButton onClick={drop}>DROP</ArcadeButton> : null}
    </Stage>
  );
}
