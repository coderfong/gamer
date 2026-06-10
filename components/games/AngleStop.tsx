"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette } from "@/lib/games/colors";

// Angle Stop — an icon/image is revealed as a pie sweeping 0→360° (at 180° half
// the image shows, at 90° a quarter). The player must stop the reveal exactly on
// the given target angle. Server still decides the prize; this is skill feedback.

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function triangle(phase: number) {
  const m = ((phase % 2) + 2) % 2;
  return m <= 1 ? m : 2 - m;
}

const LOCK_ANIM: Record<string, string> = {
  none: "", pop: "mem-pop 0.4s ease", flash: "mem-flash 0.5s ease", tada: "mem-tada 0.6s ease", pulse: "mem-pulse 0.5s ease",
};

export function AngleStop({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const rounds      = Math.max(1, Math.min(5, (config?.rounds as number | undefined) ?? 3));
  const speed0      = Math.max(0.2, Math.min(2.5, (config?.sweepSpeed as number | undefined) ?? 0.55)); // sweeps/sec (constant every round)
  const tolerance   = Math.max(3, Math.min(45, (config?.tolerance as number | undefined) ?? 12)); // degrees of fill — success threshold
  const perfectTol  = Math.max(0, Math.min(tolerance, (config?.perfectTolerance as number | undefined) ?? 4));
  const randomTarget = (config?.randomTarget as boolean | undefined) ?? true;
  const fixedAngle  = Math.max(1, Math.min(359, (config?.targetAngle as number | undefined) ?? 180));
  const showNumber  = (config?.showAngleNumber as boolean | undefined) ?? true;
  const showGhost   = (config?.showGhost as boolean | undefined) ?? true;
  const showTick    = (config?.showTargetTick as boolean | undefined) ?? true;
  const iconSizeCfg = Math.max(90, Math.min(160, (config?.iconSize as number | undefined) ?? 130));
  const mainSymbol  = (config?.mainSymbol as string | undefined) ?? "🧩";
  const ringColor   = (config?.ringColor as string | undefined) ?? pal.brand;
  const tickColor   = (config?.tickColor as string | undefined) ?? pal.accent;
  const lockAnimation = (config?.lockAnimation as string | undefined) ?? "pop";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const actionLabel = (config?.actionLabel as string | undefined) ?? "STOP";
  const startLabel  = (config?.startLabel  as string | undefined) ?? "START";
  const targetLabel = (config?.targetLabel as string | undefined) ?? "Target";
  const hitText     = (config?.hitText     as string | undefined) ?? "On target!";
  const perfectText = (config?.perfectText as string | undefined) ?? "Bullseye! 🎯";
  const missText    = (config?.missText    as string | undefined) ?? "Missed!";

  const S = iconSizeCfg;
  const R = S / 2;
  const box = S + 36;
  const cx = box / 2;
  const cy = box / 2;

  const [phase, setPhase] = useState<"idle" | "play" | "between" | "done">("idle");
  const [round, setRound] = useState(0);
  const [angle, setAngle] = useState(0);
  const [target, setTarget] = useState(fixedAngle);
  const [hits, setHits] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lockTick, setLockTick] = useState(0);

  const phaseRef = useRef(phase);
  const acc = useRef(0);
  const speedRef = useRef(speed0);
  const lastT = useRef(0);
  const raf = useRef<number | null>(null);
  const startTs = useRef(0);
  const hitsRef = useRef(0);
  const perfectsRef = useRef(0);
  phaseRef.current = phase;

  useEffect(() => { setPhase("idle"); setRound(0); setHits(0); setPerfects(0); setFeedback(null); }, [rounds]);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  function beginRound(idx: number) {
    speedRef.current = speed0; // same oscillation speed every round
    acc.current = 0;
    setTarget(randomTarget ? 20 + Math.floor(Math.random() * 320) : fixedAngle);
    setRound(idx);
    setFeedback(null);
    setPhase("play");
  }

  function start() {
    if (phase !== "idle") return;
    startTs.current = performance.now();
    hitsRef.current = 0; perfectsRef.current = 0;
    setHits(0); setPerfects(0);
    lastT.current = performance.now();
    beginRound(0);
  }

  useEffect(() => {
    lastT.current = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastT.current) / 1000);
      lastT.current = t;
      if (phaseRef.current === "play") {
        acc.current += speedRef.current * 2 * dt;
        setAngle(triangle(acc.current) * 360);
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  function lockIn() {
    if (phase !== "play") return;
    const dist = Math.abs(angle - target); // linear: fill amount, 0=empty 360=full
    const isPerfect = perfectTol > 0 && dist <= perfectTol;
    const isHit = dist <= tolerance;
    setLockTick((n) => n + 1);
    if (isPerfect) { perfectsRef.current += 1; hitsRef.current += 1; setPerfects(perfectsRef.current); setHits(hitsRef.current); setFeedback(perfectText); }
    else if (isHit) { hitsRef.current += 1; setHits(hitsRef.current); setFeedback(hitText); }
    else { setFeedback(missText); }
    setPhase("between");
    setTimeout(() => {
      if (round + 1 >= rounds) {
        setPhase("done");
        setTimeout(() => {
          onComplete({
            score: hitsRef.current + perfectsRef.current,
            outcome: `angle_${hitsRef.current}/${rounds}${perfectsRef.current ? `_p${perfectsRef.current}` : ""}`,
            durationMs: Math.round(performance.now() - startTs.current),
          });
        }, 900);
      } else beginRound(round + 1);
    }, 1000);
  }

  const instructionText =
    phase === "idle" ? "Stop the reveal exactly on the target angle!"
    : phase === "done" ? `${hits}/${rounds} on target${perfects ? ` · ${perfects} bullseye` : ""}`
    : feedback ?? `Round ${round + 1} / ${rounds}`;

  const lockAnim = lockTick && (phase === "between" || phase === "done") ? (LOCK_ANIM[lockAnimation] || undefined) : undefined;

  // conic mask reveals the sector 0..angle (0deg = top, clockwise)
  const mask = `conic-gradient(#000 0deg ${angle}deg, transparent ${angle}deg 360deg)`;
  const maskStyle: React.CSSProperties = { WebkitMaskImage: mask, maskImage: mask };

  const renderIcon = (size: number) => (
    isImg(mainSymbol)
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mainSymbol} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
      : <span style={{ fontSize: size * 0.92, lineHeight: 1 }}>{mainSymbol}</span>
  );

  // target tick position on the perimeter
  const trad = (target - 90) * Math.PI / 180;
  const tx = cx + (R + 8) * Math.cos(trad);
  const ty = cy + (R + 8) * Math.sin(trad);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="arcade-muted font-semibold text-center"
        style={{ color: instructionColor ?? undefined, fontSize: instructionFontSize, fontFamily: instructionFontFamily ?? undefined }}>
        {instructionText}
      </p>

      {phase !== "idle" && (
        <div className="flex gap-3">
          {showNumber && (
            <div className="arcade-chip px-4 py-1.5 text-center">
              <div className="text-[10px] uppercase tracking-widest arcade-muted">{targetLabel}</div>
              <div className="arcade-display text-xl leading-none" style={{ color: ringColor }}>{target}°</div>
            </div>
          )}
          <div className="arcade-chip px-4 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-widest arcade-muted">Hits</div>
            <div className="arcade-display text-xl leading-none" style={{ color: pal.brand }}>{hits}/{rounds}</div>
          </div>
        </div>
      )}

      <div className="relative" style={{ width: box, height: box, animation: lockAnim }}>
        {/* boundary ring */}
        <div className="absolute rounded-full" style={{ left: cx - R - 2, top: cy - R - 2, width: (R + 2) * 2, height: (R + 2) * 2, border: `2px dashed ${ringColor}55` }} />

        {/* ghost (faint full icon) */}
        {showGhost && (
          <div className="absolute flex items-center justify-center" style={{ left: cx - R, top: cy - R, width: S, height: S, opacity: 0.16 }}>
            {renderIcon(S)}
          </div>
        )}

        {/* revealed sector of the icon */}
        <div className="absolute flex items-center justify-center" style={{ left: cx - R, top: cy - R, width: S, height: S, ...maskStyle }}>
          {renderIcon(S)}
        </div>

        {/* target tick on the perimeter */}
        {showTick && phase !== "idle" && (
          <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: tx, top: ty, width: 10, height: 10, background: tickColor, boxShadow: `0 0 6px ${tickColor}` }} />
        )}
      </div>

      {phase === "idle" ? (
        <button onClick={start} className="btn-arcade" style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}>{startLabel}</button>
      ) : phase === "play" ? (
        <button onClick={lockIn} className="btn-arcade">{actionLabel}</button>
      ) : (
        <div className="h-11" />
      )}
    </div>
  );
}
