"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const DEFAULT_MOLES = ["🐹"];

// A value is either emoji/text or an image URL.
function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function Face({ value, size }: { value: string; size: number }) {
  if (isImg(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}

function parseSymbols(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) {
    const arr = (raw as string[]).filter((s) => typeof s === "string" && s.trim());
    if (arr.length) return arr;
  }
  if (typeof raw === "string" && raw.trim())
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return fallback;
}

const MOLE_ANIM: Record<string, string> = {
  popup:  "mole-up 0.28s ease-out",
  pop:    "mem-pop 0.4s ease",
  bounce: "el-bounce 0.6s ease",
  tada:   "mem-tada 0.6s ease",
};

const ENTRANCE: Record<string, (delayMs: number) => string> = {
  none: () => "",
  fade: (d) => `mem-fade-in 0.4s ease ${d}ms both`,
  pop:  (d) => `mem-pop-in 0.45s cubic-bezier(.34,1.56,.64,1) ${d}ms both`,
  zoom: (d) => `mem-zoom-in 0.4s ease ${d}ms both`,
  drop: (d) => `mem-drop-in 0.45s ease ${d}ms both`,
};

export function WhackAMole({ config, theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();

  // ── Config ─────────────────────────────────────────────────────────────────
  const holeCount   = ([6, 9].includes(config?.holeCount as number) ? (config?.holeCount as number) : 9);
  const gameMs      = Math.max(5, Math.min(60, (config?.gameSeconds as number | undefined) ?? 15)) * 1000;
  const moleInterval = Math.max(300, Math.min(1500, (config?.moleInterval as number | undefined) ?? 750));
  const moles       = parseSymbols(config?.moleSymbols, DEFAULT_MOLES);
  const moleSize    = Math.max(60, Math.min(110, (config?.holeSize as number | undefined) ?? 80));
  const moleColor   = (config?.moleColor as string | undefined) ?? pal.brand;
  const holeColor   = (config?.holeColor as string | undefined) ?? darken(pal.dark, 0.2);
  const instructionTpl        = (config?.instructionText       as string | undefined) ?? "Whack as many moles as you can in {seconds}s!";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const scoreLabel  = (config?.scoreLabel as string | undefined) ?? "Score";
  const timeLabel   = (config?.timeLabel  as string | undefined) ?? "Time";
  const startLabel  = (config?.startLabel as string | undefined) ?? "START";
  const moleAnimation     = (config?.moleAnimation     as string | undefined) ?? "popup";
  const holeEntrance      = (config?.holeEntrance      as string | undefined) ?? "none";

  const [phase, setPhase] = useState<"idle" | "play">("idle");
  const [active, setActive] = useState<number | null>(null);
  const [activeMole, setActiveMole] = useState<string>(moles[0] ?? "🐹");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(gameMs);
  const moleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setPhase("play");
    setScore(0);
    setLeft(gameMs);
    timer.reset();
    moleTimer.current = setInterval(() => {
      setActive(Math.floor(Math.random() * holeCount));
      setActiveMole(moles[Math.floor(Math.random() * moles.length)] ?? "🐹");
    }, moleInterval);
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

  const idleInstruction = instructionTpl.trim()
    ? instructionTpl.replace(/\{seconds\}/gi, String(Math.round(gameMs / 1000)))
    : "";
  const entranceFn = ENTRANCE[holeEntrance] ?? ENTRANCE.none;

  return (
    <Stage
      instruction={
        phase === "idle" && idleInstruction ? (
          <span
            style={{
              color: instructionColor ?? undefined,
              fontSize: instructionFontSize,
              fontFamily: instructionFontFamily ?? undefined,
            }}
          >
            {idleInstruction}
          </span>
        ) : undefined
      }
    >
      {phase === "play" ? (
        <div className="flex gap-3">
          <Readout label={scoreLabel} value={score} color={pal.brand} />
          <Readout label={timeLabel} value={`${(left / 1000).toFixed(1)}s`} />
        </div>
      ) : null}
      <div
        className="grid mx-auto"
        style={{
          gridTemplateColumns: `repeat(3, ${moleSize}px)`,
          gap: Math.round(moleSize * 0.32),
          justifyContent: "center",
          justifyItems: "center",
          width: "fit-content",
        }}
      >
        {Array.from({ length: holeCount }).map((_, i) => (
          <div key={i} style={{ animation: entranceFn(i * 45) || undefined }}>
            <button
              type="button"
              onClick={() => whack(i)}
              disabled={phase !== "play"}
              aria-label={`Hole ${i + 1}`}
              className="relative overflow-hidden rounded-full"
              style={{
                height: moleSize,
                width: moleSize,
                background: `radial-gradient(circle at 50% 80%, ${holeColor}, #0e0a14)`,
                boxShadow: "inset 0 6px 12px rgba(0,0,0,0.6)",
              }}
            >
              {active === i ? (
                <span
                  className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center justify-center"
                  style={{
                    height: moleSize * 0.84,
                    width: moleSize * 0.84,
                    // An image mole shows as-is (no disc); emoji/text get the coloured mound.
                    background: isImg(activeMole) ? "transparent" : `radial-gradient(circle at 40% 30%, ${lighten(moleColor, 0.3)}, ${moleColor})`,
                    borderRadius: isImg(activeMole) ? 0 : "9999px",
                    animation: MOLE_ANIM[moleAnimation] ?? MOLE_ANIM.popup,
                  }}
                >
                  <Face value={activeMole} size={isImg(activeMole) ? moleSize * 0.8 : moleSize * 0.4} />
                </span>
              ) : null}
            </button>
          </div>
        ))}
      </div>
      {phase === "idle" ? <ArcadeButton onClick={start} pulse>{startLabel}</ArcadeButton> : null}
    </Stage>
  );
}
