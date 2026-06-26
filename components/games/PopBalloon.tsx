"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken } from "@/lib/games/colors";

// "Stop the Timer" — a fill animates toward a target time; the player taps STOP
// to land as close to the target as possible. Server still decides the prize;
// the accuracy score is skill feedback.

export function PopBalloon({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const target       = Math.max(2, Math.min(30, (config?.targetSeconds   as number | undefined) ?? 10));
  const perfectWindowMs = Math.max(30, Math.min(2000, (config?.perfectWindowMs as number | undefined) ?? 120));
  // How long before the target the fill + timer start blinking so players can't
  // simply watch the line reach the marker. Larger = harder.
  const blinkLeadMs  = Math.max(300, Math.min(8000, (config?.blinkLeadMs as number | undefined) ?? 2500));
  const fillStyle    = (config?.fillStyle    as string | undefined) ?? "vertical"; // vertical | bar | circle
  const fillColor    = (config?.fillColor    as string | undefined) ?? pal.brand;
  const trackColor   = (config?.trackColor   as string | undefined) ?? lighten(pal.dark, 0.6);
  const fillImage    = (config?.fillImage    as string | undefined) ?? null;
  const showTimer    = (config?.showTimer    as boolean | undefined) ?? true;
  const showMarker   = (config?.showTargetMarker as boolean | undefined) ?? true;
  const lockAnimation = (config?.lockAnimation as string | undefined) ?? "pulse";
  const instructionTpl        = (config?.instructionText       as string | undefined) ?? "Stop the timer exactly at {target}s!";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const accuracyLabel = (config?.accuracyLabel as string | undefined) ?? "Accuracy";
  const startLabel    = (config?.startLabel    as string | undefined) ?? "START";
  const stopLabel     = (config?.stopLabel     as string | undefined) ?? "STOP";
  const perfectText   = (config?.perfectText   as string | undefined) ?? "Bullseye! ⏱️";
  const resultTpl     = (config?.resultText    as string | undefined) ?? "You stopped at {time}s — {accuracy}% accurate";

  // The bar runs to ~1.4× the target so the marker sits ~72% along, leaving
  // visible room to overshoot.
  const markerFrac = 0.72;
  const maxTime = target / markerFrac;

  const [phase, setPhase] = useState<"idle" | "run" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const raf = useRef<number | null>(null);
  const startTs = useRef(0);
  const finalRef = useRef(0);

  function stop() {
    if (raf.current) cancelAnimationFrame(raf.current);
    const e = Math.min((performance.now() - startTs.current) / 1000, maxTime);
    finalRef.current = e;
    setElapsed(e);
    setPhase("done");
    const diff = Math.abs(e - target);
    const accuracy = Math.max(0, Math.round(100 - (diff * 1000) / 12)); // ~1200ms off = 0%
    // Win = stopped on the dot (within the perfect window of the target time).
    const won = diff * 1000 <= perfectWindowMs;
    setTimeout(() => {
      onComplete({
        score: accuracy,
        outcome: `timer_${e.toFixed(2)}s_${accuracy}pct`,
        won,
        durationMs: Math.round(e * 1000),
      });
    }, 1300);
  }

  function start() {
    setPhase("run");
    startTs.current = performance.now();
    const loop = () => {
      const e = (performance.now() - startTs.current) / 1000;
      setElapsed(e);
      if (e >= maxTime) { setElapsed(maxTime); stop(); return; }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const fillFrac = Math.min(elapsed / maxTime, 1);
  const diff = Math.abs(elapsed - target);
  const accuracy = Math.max(0, Math.round(100 - (diff * 1000) / 12));
  const isPerfect = phase === "done" && diff * 1000 <= perfectWindowMs;

  // Once the running timer gets within blinkLeadMs of the target, the fill and
  // the live readout blink rapidly so the line/marker can't be used to cheat.
  const nearTarget = phase === "run" && (target - elapsed) * 1000 <= blinkLeadMs;
  const blinkAnim = nearTarget ? "timer-blink 0.4s ease-in-out infinite" : undefined;

  const lockAnim =
    phase !== "done" ? undefined
    : lockAnimation === "pulse" ? "mem-pulse 0.5s ease"
    : lockAnimation === "pop"   ? "mem-pop 0.4s ease"
    : lockAnimation === "flash" ? "mem-flash 0.5s ease"
    : lockAnimation === "tada"  ? "mem-tada 0.6s ease"
    : undefined;

  const instruction = instructionTpl.trim() ? (
    <span
      style={{
        color: instructionColor ?? undefined,
        fontSize: instructionFontSize,
        fontFamily: instructionFontFamily ?? undefined,
      }}
    >
      {instructionTpl.replace(/\{target\}/gi, String(target))}
    </span>
  ) : null;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {instruction}

      {/* Readout: live timer (optional) or accuracy after stop */}
      <div className="flex flex-col items-center gap-1">
        <div
          className="arcade-display text-4xl leading-none tabular-nums"
          style={{ color: isPerfect ? fillColor : "var(--ink)" }}
        >
          {phase === "done"
            ? `${accuracy}%`
            : phase === "run" && showTimer
            ? `${elapsed.toFixed(2)} s`
            : `${target.toFixed(2)} s`}
        </div>
        <div className="text-[10px] uppercase tracking-widest arcade-muted">
          {phase === "done" ? accuracyLabel : `Target ${target.toFixed(2)}s`}
        </div>
      </div>

      {/* Fill visual */}
      <FillVisual
        style={fillStyle}
        frac={fillFrac}
        markerFrac={showMarker ? markerFrac : null}
        fillColor={fillColor}
        trackColor={trackColor}
        fillImage={fillImage}
        lockAnim={lockAnim}
        blinkAnim={blinkAnim}
        accentDark={darken(fillColor, 0.2)}
      />

      {phase === "done" ? (
        <div
          className="rounded-xl px-5 py-2.5 text-center text-sm font-bold"
          style={{ background: isPerfect ? fillColor : lighten(pal.dark, 0.55), color: isPerfect ? pal.fg : "#444" }}
        >
          {isPerfect
            ? perfectText
            : resultTpl
                .replace(/\{time\}/gi, finalRef.current.toFixed(2))
                .replace(/\{accuracy\}/gi, String(accuracy))
                .replace(/\{target\}/gi, String(target))}
        </div>
      ) : phase === "idle" ? (
        <button onClick={start} className="btn-arcade" style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}>
          {startLabel}
        </button>
      ) : (
        <button onClick={stop} className="btn-arcade">
          {stopLabel}
        </button>
      )}
    </div>
  );
}

function FillVisual({
  style, frac, markerFrac, fillColor, trackColor, fillImage, lockAnim, blinkAnim, accentDark,
}: {
  style: string;
  frac: number;
  markerFrac: number | null;
  fillColor: string;
  trackColor: string;
  fillImage: string | null;
  lockAnim: string | undefined;
  blinkAnim: string | undefined;
  accentDark: string;
}) {
  const [aspect, setAspect] = useState<number | null>(null); // width / height
  useEffect(() => {
    if (fillImage) {
      const im = new window.Image();
      im.onload = () => { if (im.naturalHeight) setAspect(im.naturalWidth / im.naturalHeight); };
      im.src = fillImage;
    } else setAspect(null);
  }, [fillImage]);

  if (style === "circle") {
    const deg = frac * 360;
    return (
      <div
        className="relative rounded-full"
        style={{
          width: 180, height: 180,
          background: `conic-gradient(${fillColor} ${deg}deg, ${trackColor} ${deg}deg)`,
          animation: lockAnim ?? blinkAnim,
        }}
      >
        <div className="absolute inset-[18px] rounded-full" style={{ background: "var(--cream, #fff)" }} />
      </div>
    );
  }

  const horizontal = style === "bar";
  // Track follows the fill image's aspect ratio so it isn't cropped.
  let W = horizontal ? 280 : 120;
  let H = horizontal ? 64 : 220;
  if (fillImage && aspect) {
    if (horizontal) { W = 280; H = Math.max(48, Math.min(320, Math.round(W / aspect))); }
    else { H = 240; W = Math.max(80, Math.min(300, Math.round(H * aspect))); }
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: W,
        height: H,
        // With a fill image we keep the container transparent so the object's
        // own silhouette (transparent PNG) reads as the outline — no square box.
        background: fillImage ? "transparent" : trackColor,
        borderRadius: fillImage ? 0 : 16,
        boxShadow: fillImage ? "none" : "inset 0 2px 8px rgba(0,0,0,0.25)",
        animation: lockAnim ?? blinkAnim,
      }}
    >
      {/* faint ghost of the fill image so the empty outline is visible */}
      {fillImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fillImage} alt="" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0.2 }} />
      )}
      {/* fill */}
      <div
        className="absolute overflow-hidden"
        style={
          horizontal
            ? { left: 0, top: 0, bottom: 0, width: `${frac * 100}%` }
            : { left: 0, right: 0, bottom: 0, height: `${frac * 100}%` }
        }
      >
        {fillImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fillImage}
            alt=""
            className="absolute object-contain"
            style={horizontal
              ? { left: 0, top: 0, width: W, height: H }
              : { left: 0, bottom: 0, width: W, height: H }}
          />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(${horizontal ? "90deg" : "0deg"}, ${accentDark}, ${fillColor})` }} />
        )}
      </div>

      {/* target marker */}
      {markerFrac != null && (
        <div
          className="absolute bg-white/80"
          style={
            horizontal
              ? { top: 0, bottom: 0, left: `${markerFrac * 100}%`, width: 3, boxShadow: "0 0 6px rgba(0,0,0,0.4)" }
              : { left: 0, right: 0, bottom: `${markerFrac * 100}%`, height: 3, boxShadow: "0 0 6px rgba(0,0,0,0.4)" }
          }
        />
      )}
    </div>
  );
}
