"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

// A value is either emoji/text or an image URL.
function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

const HIT_ANIM: Record<string, string> = {
  none:   "",
  pop:    "mem-pop 0.3s ease",
  tada:   "mem-tada 0.5s ease",
  wobble: "mem-wobble 0.4s ease",
  flash:  "mem-flash 0.4s ease",
  spin:   "el-spin 0.5s linear",
};

export function TapTarget({ config, theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();

  // ── Config ─────────────────────────────────────────────────────────────────
  const gameMs      = Math.max(5, Math.min(60, (config?.gameSeconds as number | undefined) ?? 12)) * 1000;
  const arena       = Math.max(220, Math.min(340, (config?.arenaSize as number | undefined) ?? 280));
  const targetSize  = Math.max(36, Math.min(96, (config?.targetSize as number | undefined) ?? 56));
  // Win threshold: hit the target at least this many times.
  const winScore    = Math.max(1, (config?.winScore as number | undefined) ?? 10);
  const targetImage = (config?.targetImage as string | undefined) ?? null;
  const targetColor = (config?.targetColor as string | undefined) ?? pal.brand;
  const arenaColor  = (config?.arenaColor  as string | undefined) ?? null;
  const moveSpeed   = Math.max(0, Math.min(300, (config?.moveSpeed as number | undefined) ?? 80)); // transition ms
  const shrinkOnHit = (config?.shrinkOnHit as boolean | undefined) ?? false;
  const idleEmoji   = (config?.idleEmoji   as string | undefined) ?? "🎯";
  const hitAnimation = (config?.hitAnimation as string | undefined) ?? "pop";
  const instructionTpl        = (config?.instructionText       as string | undefined) ?? "Tap the bullseye as many times as you can in {seconds}s!";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const hitsLabel   = (config?.hitsLabel  as string | undefined) ?? "Hits";
  const timeLabel   = (config?.timeLabel  as string | undefined) ?? "Time";
  const startLabel  = (config?.startLabel as string | undefined) ?? "START";

  const [phase, setPhase] = useState<"idle" | "play">("idle");
  const [pos, setPos] = useState({ x: arena / 2 - targetSize / 2, y: arena / 2 - targetSize / 2 });
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(gameMs);
  const [hitKey, setHitKey] = useState(0); // re-trigger hit animation
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shrink ramps the target down as the score climbs (harder over time).
  const curSize = shrinkOnHit ? Math.max(targetSize * 0.5, targetSize - score * 1.5) : targetSize;

  function relocate() {
    setPos({
      x: Math.random() * (arena - curSize),
      y: Math.random() * (arena - curSize),
    });
  }

  function start() {
    setPhase("play");
    setScore(0);
    setLeft(gameMs);
    timer.reset();
    relocate();
    tick.current = setInterval(() => setLeft((l) => Math.max(0, l - 100)), 100);
  }

  useEffect(() => {
    if (phase === "play" && left <= 0) {
      if (tick.current) clearInterval(tick.current);
      const finalScore = score;
      setPhase("idle");
      onComplete({ score: finalScore, outcome: `target_${finalScore}`, won: finalScore >= winScore, durationMs: timer.elapsed() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  useEffect(() => () => { if (tick.current) clearInterval(tick.current); }, []);

  function hit() {
    if (phase !== "play") return;
    setScore((s) => s + 1);
    setHitKey((k) => k + 1);
    relocate();
  }

  const instruction = instructionTpl.trim()
    ? instructionTpl.replace(/\{seconds\}/gi, String(Math.round(gameMs / 1000)))
    : "";

  return (
    <Stage
      instruction={
        phase === "idle" && instruction ? (
          <span
            style={{
              color: instructionColor ?? undefined,
              fontSize: instructionFontSize,
              fontFamily: instructionFontFamily ?? undefined,
            }}
          >
            {instruction}
          </span>
        ) : undefined
      }
    >
      {phase === "play" ? (
        <div className="flex gap-3">
          <Readout label={hitsLabel} value={score} color={pal.brand} />
          <Readout label={timeLabel} value={`${(left / 1000).toFixed(1)}s`} />
        </div>
      ) : null}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          width: arena,
          height: arena,
          background: arenaColor ?? "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05), rgba(0,0,0,0.3))",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
        }}
      >
        {phase === "play" ? (
          <button
            key={hitKey}
            type="button"
            onClick={hit}
            aria-label="Target"
            className="absolute rounded-full flex items-center justify-center overflow-hidden"
            style={{
              left: pos.x, top: pos.y, width: curSize, height: curSize,
              background: targetImage
                ? "transparent"
                : `radial-gradient(circle, #fff 0 18%, ${targetColor} 18% 40%, #fff 40% 60%, ${darken(targetColor, 0.1)} 60% 100%)`,
              boxShadow: targetImage ? "none" : `0 0 16px 2px ${lighten(targetColor, 0.2)}`,
              transition: `left ${moveSpeed}ms, top ${moveSpeed}ms`,
              animation: HIT_ANIM[hitAnimation] || undefined,
            }}
          >
            {targetImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={targetImage} alt="" className="w-full h-full object-contain pointer-events-none" />
            ) : null}
          </button>
        ) : (
          <div className="flex h-full items-center justify-center opacity-50">
            {isImg(idleEmoji) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={idleEmoji} alt="" style={{ width: arena * 0.2, height: arena * 0.2, objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: arena * 0.18 }}>{idleEmoji}</span>
            )}
          </div>
        )}
      </div>
      {phase === "idle" ? <ArcadeButton onClick={start} pulse>{startLabel}</ArcadeButton> : null}
    </Stage>
  );
}
