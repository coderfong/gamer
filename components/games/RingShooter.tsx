"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken } from "@/lib/games/colors";

// Ring Shooter — targets rotate around a circle past a fixed crosshair at the
// top. The player taps SHOOT when a target is lined up; each hit speeds up the
// survivors. Clear them all to win. Server still decides the actual prize.

const DEFAULT_TARGETS = ["🎯", "🎈", "⭐", "🍎", "👾", "🔵"];
const CROSS_DEG = -90; // crosshair sits at the top of the ring

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

function parseTargets(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const arr = (raw as string[]).filter((s) => typeof s === "string" && s.trim());
    if (arr.length) return arr;
  }
  if (typeof raw === "string" && raw.trim())
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return DEFAULT_TARGETS;
}

const HIT_ANIM: Record<string, string> = {
  pop:   "mem-pop 0.3s ease",
  flash: "mem-flash 0.3s ease",
  spin:  "el-spin 0.4s linear",
  tada:  "mem-tada 0.5s ease",
};

export function RingShooter({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const count       = Math.max(3, Math.min(12, (config?.targetCount as number | undefined) ?? 6));
  const baseSpeed   = Math.max(20, Math.min(300, (config?.baseSpeed as number | undefined) ?? 110)); // deg/sec
  const speedUp     = Math.max(1, Math.min(2.5, (config?.speedUp as number | undefined) ?? 1.45));
  const dirCw       = (config?.spinClockwise as boolean | undefined) ?? true;
  const hitTolerance = Math.max(4, Math.min(45, (config?.hitTolerance as number | undefined) ?? 11)); // degrees
  const bullets     = Math.max(1, Math.min(40, (config?.bullets as number | undefined) ?? count + 2));
  const targets     = parseTargets(config?.targetSymbols);
  const targetSize  = Math.max(28, Math.min(96, (config?.targetSize as number | undefined) ?? 72));
  const ringRadius  = Math.max(70, Math.min(130, (config?.ringRadius as number | undefined) ?? 90));
  const timeLimit   = Math.max(0, Math.min(60, (config?.timeLimit as number | undefined) ?? 0)); // 0 = unlimited
  const hitAnimation = (config?.hitAnimation as string | undefined) ?? "pop";
  const ringColor   = (config?.ringColor as string | undefined) ?? pal.brand;
  const crosshairColor  = (config?.crosshairColor  as string | undefined) ?? "#ef4444";
  const crosshairSymbol = (config?.crosshairSymbol as string | undefined) ?? "";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const startLabel  = (config?.startLabel as string | undefined) ?? "START";
  const shootLabel  = (config?.shootLabel as string | undefined) ?? "SHOOT";
  const scoreLabel  = (config?.scoreLabel as string | undefined) ?? "Hits";
  const bulletsLabel = (config?.bulletsLabel as string | undefined) ?? "Ammo";
  const winText     = (config?.winText  as string | undefined) ?? "Cleared! 🎯";
  const loseText    = (config?.loseText as string | undefined) ?? "Out of shots!";

  const arena = (ringRadius + targetSize) * 2 + 8;
  const cx = arena / 2;
  const cy = arena / 2;
  const crossSize = targetSize * 1.7;

  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [alive, setAlive] = useState<boolean[]>(() => Array(count).fill(true));
  const [, setRotation] = useState(0); // re-render tick; angle read from rotRef
  const [left, setLeft] = useState(timeLimit);
  const [shotTick, setShotTick] = useState(0);
  const [bulletsLeft, setBulletsLeft] = useState(bullets);
  const aliveRef = useRef(alive);
  const bulletsRef = useRef(bullets);
  const rotRef = useRef(0);
  const multRef = useRef(1);
  const raf = useRef<number | null>(null);
  const lastT = useRef(0);
  const startTs = useRef(0);
  const wonRef = useRef(false);

  useEffect(() => {
    setAlive(Array(count).fill(true));
    aliveRef.current = Array(count).fill(true);
    setPhase("idle");
    rotRef.current = 0;
    multRef.current = 1;
    setRotation(0);
    setLeft(timeLimit);
    bulletsRef.current = bullets;
    setBulletsLeft(bullets);
  }, [count, timeLimit, bullets]);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  function finish(won: boolean) {
    if (raf.current) cancelAnimationFrame(raf.current);
    wonRef.current = won;
    setPhase("done");
    const hits = aliveRef.current.filter((a) => !a).length;
    setTimeout(() => {
      onComplete({
        outcome: won ? "shoot_cleared" : `shoot_failed_${count - hits}`,
        score: hits,
        won,
        durationMs: Math.round(performance.now() - startTs.current),
      });
    }, 1400);
  }

  function start() {
    if (phase !== "idle") return;
    startTs.current = performance.now();
    lastT.current = performance.now();
    bulletsRef.current = bullets;
    setBulletsLeft(bullets);
    setPhase("play");
    const loop = (t: number) => {
      const dt = (t - lastT.current) / 1000;
      lastT.current = t;
      rotRef.current += (dirCw ? 1 : -1) * baseSpeed * multRef.current * dt;
      setRotation(rotRef.current);
      if (timeLimit > 0) {
        const rem = Math.max(0, timeLimit - (performance.now() - startTs.current) / 1000);
        setLeft(rem);
        if (rem <= 0) { finish(false); return; }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }

  function shoot() {
    if (phase !== "play" || bulletsRef.current <= 0) return;
    setShotTick((t) => t + 1);
    bulletsRef.current -= 1;
    setBulletsLeft(bulletsRef.current);

    // Find the closest live target to the crosshair angle.
    let best = -1, bestDiff = 999;
    aliveRef.current.forEach((a, i) => {
      if (!a) return;
      const ang = (i / count) * 360 + rotRef.current;
      let d = (((ang - CROSS_DEG) % 360) + 540) % 360 - 180;
      d = Math.abs(d);
      if (d < bestDiff) { bestDiff = d; best = i; }
    });
    if (best >= 0 && bestDiff <= hitTolerance) {
      const next = [...aliveRef.current];
      next[best] = false;
      aliveRef.current = next;
      setAlive(next);
      multRef.current *= speedUp;
      if (next.every((a) => !a)) { finish(true); return; }
    }
    // Out of bullets before clearing the ring → game over.
    if (bulletsRef.current <= 0) finish(false);
  }

  const hits = alive.filter((a) => !a).length;
  const instructionText =
    phase === "idle" ? "Tap SHOOT when a target lines up with the crosshair!"
    : phase === "done" ? (wonRef.current ? winText : loseText)
    : undefined;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {instructionText && (
        <p
          className="arcade-muted font-semibold text-center"
          style={{
            color: instructionColor ?? undefined,
            fontSize: instructionFontSize,
            fontFamily: instructionFontFamily ?? undefined,
          }}
        >
          {instructionText}
        </p>
      )}

      {phase !== "idle" && (
        <div className="flex gap-3">
          <div className="arcade-chip px-4 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-widest arcade-muted">{scoreLabel}</div>
            <div className="arcade-display text-xl leading-none" style={{ color: pal.brand }}>{hits}/{count}</div>
          </div>
          <div className="arcade-chip px-4 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-widest arcade-muted">{bulletsLabel}</div>
            <div className="arcade-display text-xl leading-none" style={{ color: bulletsLeft <= 2 ? "#dc2626" : undefined }}>{bulletsLeft}</div>
          </div>
          {timeLimit > 0 && (
            <div className="arcade-chip px-4 py-1.5 text-center">
              <div className="text-[10px] uppercase tracking-widest arcade-muted">Time</div>
              <div className="arcade-display text-xl leading-none">{left.toFixed(1)}s</div>
            </div>
          )}
        </div>
      )}

      <div className="relative" style={{ width: arena, height: arena }}>
        {/* ring guide */}
        <div
          className="absolute rounded-full"
          style={{
            left: cx - ringRadius, top: cy - ringRadius,
            width: ringRadius * 2, height: ringRadius * 2,
            border: `2px dashed ${lighten(ringColor, 0.35)}66`,
          }}
        />

        {/* targets */}
        {Array.from({ length: count }).map((_, i) => {
          const theta = ((i / count) * 360 + rotRef.current) * Math.PI / 180;
          const x = cx + ringRadius * Math.cos(theta);
          const y = cy + ringRadius * Math.sin(theta);
          const dead = !alive[i];
          const sym = targets[i % targets.length];
          const isImage = isImg(sym);
          return (
            <div
              key={i}
              className="absolute flex items-center justify-center rounded-full pointer-events-none"
              style={{
                left: x - targetSize / 2,
                top: y - targetSize / 2,
                width: targetSize,
                height: targetSize,
                // An image target replaces the circle entirely — no disc or glow.
                background: dead || isImage ? "transparent" : `radial-gradient(circle at 38% 32%, ${lighten(ringColor, 0.45)}, ${ringColor})`,
                boxShadow: dead || isImage ? "none" : `0 0 10px 1px ${ringColor}88`,
                transform: dead ? "scale(1.7)" : "scale(1)",
                opacity: dead ? 0 : 1,
                transition: "transform 0.3s ease, opacity 0.3s ease",
                animation: dead ? (HIT_ANIM[hitAnimation] || undefined) : undefined,
                zIndex: 2, // targets pass in front of the crosshair
              }}
            >
              {!dead && <Face value={sym} size={isImage ? targetSize : targetSize * 0.62} />}
            </div>
          );
        })}

        {/* crosshair (fixed, at top of ring) — positioned by left/top, never moves */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: cx - crossSize / 2,
            top: cy - ringRadius - crossSize / 2,
            width: crossSize,
            height: crossSize,
          }}
        >
          {/* inner wrapper animates the shot pulse so the outer position stays fixed */}
          <div key={`cross-${shotTick}`} className="w-full h-full" style={{ animation: shotTick ? "mem-pop 0.18s ease" : undefined }}>
            {crosshairSymbol ? (
              <Face value={crosshairSymbol} size={crossSize} />
            ) : (
              <div className="relative w-full h-full">
                <div className="absolute inset-0 rounded-full" style={{ border: `3px solid ${crosshairColor}` }} />
                <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2" style={{ width: 2, background: crosshairColor }} />
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2" style={{ height: 2, background: crosshairColor }} />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 4, height: 4, background: crosshairColor }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {phase === "idle" ? (
        <button onClick={start} className="btn-arcade" style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}>
          {startLabel}
        </button>
      ) : phase === "play" ? (
        <button onClick={shoot} className="btn-arcade">{shootLabel}</button>
      ) : (
        <div className="h-11" />
      )}
    </div>
  );
}
