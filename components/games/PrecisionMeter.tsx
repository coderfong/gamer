"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken } from "@/lib/games/colors";

// Perfect Fit — a moving icon oscillates along a track and must be stopped so it
// lands inside a fixed target icon. Optional rounds get faster / tighter.
// Server still decides the actual prize; the result is skill feedback.

const TRACK = 290;

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function Icon({ value, size }: { value: string; size: number }) {
  if (isImg(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}

// linear ping-pong 0..1
function triangle(phase: number) {
  const m = ((phase % 2) + 2) % 2;
  return m <= 1 ? m : 2 - m;
}

const LOCK_ANIM: Record<string, string> = {
  none: "", pop: "mem-pop 0.4s ease", flash: "mem-flash 0.5s ease", tada: "mem-tada 0.6s ease", pulse: "mem-pulse 0.5s ease",
};

export function PrecisionMeter({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const orientation = (config?.orientation as string | undefined) ?? "horizontal"; // horizontal | vertical
  const rounds      = Math.max(1, Math.min(5, (config?.rounds as number | undefined) ?? 3));
  const speed0      = Math.max(0.3, Math.min(3, (config?.markerSpeed as number | undefined) ?? 0.9)); // sweeps/sec
  const speedUp     = Math.max(1, Math.min(2, (config?.speedUp as number | undefined) ?? 1.25));
  const zoneW       = Math.max(0.06, Math.min(0.6, (config?.zoneWidth as number | undefined) ?? 0.22)); // hit tolerance
  const bullW       = Math.max(0, Math.min(zoneW, (config?.bullseyeWidth as number | undefined) ?? 0.08)); // perfect tolerance
  const randomZone  = (config?.randomZone as boolean | undefined) ?? true;
  const iconSize    = Math.max(28, Math.min(96, (config?.iconSize as number | undefined) ?? 56));
  const movingSymbol = (config?.movingSymbol as string | undefined) ?? "⭐";
  const targetSymbol = (config?.targetSymbol as string | undefined) ?? "⭕";
  const targetAreaColor = (config?.zoneColor  as string | undefined) ?? pal.brand;
  const trackColor  = (config?.trackColor as string | undefined) ?? lighten(pal.dark, 0.5);
  const lockAnimation = (config?.lockAnimation as string | undefined) ?? "pop";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const actionLabel = (config?.actionLabel as string | undefined) ?? "DROP";
  const startLabel  = (config?.startLabel  as string | undefined) ?? "START";
  const hitText     = (config?.hitText     as string | undefined) ?? "Nice fit!";
  const perfectText = (config?.perfectText as string | undefined) ?? "Perfect fit! 🎯";
  const missText    = (config?.missText    as string | undefined) ?? "Missed!";
  const roundLabel  = (config?.roundLabel  as string | undefined) ?? "Round";

  const vertical = orientation === "vertical";
  const half = iconSize / 2 + 6;
  const usable = TRACK - 2 * half;
  const centerPx = (frac: number) => half + frac * usable;

  const [phase, setPhase] = useState<"idle" | "play" | "between" | "done">("idle");
  const [round, setRound] = useState(0);
  const [pos, setPos] = useState(0.5);            // moving icon 0..1
  const [zoneCenter, setZoneCenter] = useState(0.5);
  const [hits, setHits] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lock, setLock] = useState<{ pos: number; snap: boolean } | null>(null);
  const [lockTick, setLockTick] = useState(0);

  const phaseRef = useRef(phase);
  const phaseAcc = useRef(0);
  const speedRef = useRef(speed0);
  const lastT = useRef(0);
  const raf = useRef<number | null>(null);
  const startTs = useRef(0);
  const hitsRef = useRef(0);
  const perfectsRef = useRef(0);
  phaseRef.current = phase;

  useEffect(() => { setPhase("idle"); setRound(0); setHits(0); setPerfects(0); setFeedback(null); setLock(null); }, [rounds, orientation]);

  function newZone() {
    if (!randomZone) { setZoneCenter(0.5); return; }
    const m = zoneW / 2;
    setZoneCenter(m + Math.random() * (1 - 2 * m));
  }

  function beginRound(idx: number) {
    speedRef.current = speed0 * Math.pow(speedUp, idx);
    phaseAcc.current = Math.random() * 2;
    newZone();
    setRound(idx);
    setFeedback(null);
    setLock(null);
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
        phaseAcc.current += speedRef.current * 2 * dt;
        setPos(triangle(phaseAcc.current));
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  function lockIn() {
    if (phase !== "play") return;
    const dist = Math.abs(pos - zoneCenter);
    const isPerfect = bullW > 0 && dist <= bullW / 2;
    const isHit = dist <= zoneW / 2;
    setLockTick((n) => n + 1);
    setLock({ pos, snap: isHit });             // snap into the target on a hit
    if (isPerfect) { perfectsRef.current += 1; hitsRef.current += 1; setPerfects(perfectsRef.current); setHits(hitsRef.current); setFeedback(perfectText); }
    else if (isHit) { hitsRef.current += 1; setHits(hitsRef.current); setFeedback(hitText); }
    else { setFeedback(missText); }

    setPhase("between");
    setTimeout(() => {
      if (round + 1 >= rounds) {
        setPhase("done");
        const total = hitsRef.current;
        setTimeout(() => {
          onComplete({
            score: total + perfectsRef.current,
            outcome: `precision_${total}/${rounds}${perfectsRef.current ? `_p${perfectsRef.current}` : ""}`,
            durationMs: Math.round(performance.now() - startTs.current),
          });
        }, 900);
      } else {
        beginRound(round + 1);
      }
    }, 1000);
  }

  const instructionText =
    phase === "idle" ? "Stop the icon right inside the target!"
    : phase === "done" ? `${hits}/${rounds} on target${perfects ? ` · ${perfects} perfect` : ""}`
    : feedback ?? `${roundLabel} ${round + 1} / ${rounds}`;

  const movingFrac = phase === "play" ? pos : lock ? (lock.snap ? zoneCenter : lock.pos) : pos;
  const lockAnim = lockTick && (phase === "between" || phase === "done") ? (LOCK_ANIM[lockAnimation] || undefined) : undefined;

  const boxW = vertical ? iconSize + 24 : TRACK;
  const boxH = vertical ? TRACK : iconSize + 24;

  // target tolerance band size (px) along the track
  const bandLen = zoneW * usable + iconSize;
  const targetC = centerPx(zoneCenter);
  const movingC = centerPx(movingFrac);

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p
        className="arcade-muted font-semibold text-center"
        style={{ color: instructionColor ?? undefined, fontSize: instructionFontSize, fontFamily: instructionFontFamily ?? undefined }}
      >
        {instructionText}
      </p>

      {phase !== "idle" && (
        <div className="flex gap-3">
          <div className="arcade-chip px-4 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-widest arcade-muted">Hits</div>
            <div className="arcade-display text-xl leading-none" style={{ color: "var(--ink)" }}>{hits}/{rounds}</div>
          </div>
          <div className="arcade-chip px-4 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-widest arcade-muted">{roundLabel}</div>
            <div className="arcade-display text-xl leading-none">{Math.min(round + 1, rounds)}/{rounds}</div>
          </div>
        </div>
      )}

      {/* Arena */}
      <div className="relative" style={{ width: boxW, height: boxH }}>
        {/* track guide line */}
        <div
          className="absolute rounded-full"
          style={vertical
            ? { left: "50%", top: half, bottom: half, width: 3, transform: "translateX(-50%)", background: `${trackColor}66` }
            : { top: "50%", left: half, right: half, height: 3, transform: "translateY(-50%)", background: `${trackColor}66` }}
        />

        {/* target tolerance band */}
        <div
          className="absolute rounded-full"
          style={vertical
            ? { left: "50%", top: targetC - bandLen / 2, width: iconSize + 14, height: bandLen, transform: "translateX(-50%)", background: `${targetAreaColor}22`, border: `2px dashed ${targetAreaColor}88` }
            : { top: "50%", left: targetC - bandLen / 2, width: bandLen, height: iconSize + 14, transform: "translateY(-50%)", background: `${targetAreaColor}22`, border: `2px dashed ${targetAreaColor}88` }}
        />

        {/* target icon (fixed) */}
        <div
          className="absolute flex items-center justify-center"
          style={vertical
            ? { left: "50%", top: targetC - iconSize / 2, width: iconSize, height: iconSize, transform: "translateX(-50%)" }
            : { top: "50%", left: targetC - iconSize / 2, width: iconSize, height: iconSize, transform: "translateY(-50%)" }}
        >
          <Icon value={targetSymbol} size={iconSize} />
        </div>

        {/* moving icon */}
        <div
          key={`mv-${lockTick}`}
          className="absolute flex items-center justify-center"
          style={vertical
            ? {
                left: "50%", top: movingC - iconSize / 2, width: iconSize, height: iconSize,
                transform: "translateX(-50%)",
                transition: phase === "play" ? "none" : "top 0.3s ease",
                animation: lockAnim, zIndex: 4,
              }
            : {
                top: "50%", left: movingC - iconSize / 2, width: iconSize, height: iconSize,
                transform: "translateY(-50%)",
                transition: phase === "play" ? "none" : "left 0.3s ease",
                animation: lockAnim, zIndex: 4,
              }}
        >
          <Icon value={movingSymbol} size={iconSize * (lock?.snap ? 0.82 : 1)} />
        </div>
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
