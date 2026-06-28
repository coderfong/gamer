"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken } from "@/lib/games/colors";

// "Fill the Outline" — an object oscillates left↔right; the player taps STOP to
// lock it over a fixed outline. The horizontal overlap = fill %. Server still
// decides the actual prize; the fill score is cosmetic / skill feedback.

const ARENA_W = 300;

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function shapeCSS(shape: string): React.CSSProperties {
  switch (shape) {
    case "circle":  return { borderRadius: "50%" };
    case "square":  return { borderRadius: 6 };
    case "diamond": return { clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)" };
    case "hexagon": return { clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" };
    case "star":    return { clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" };
    default:        return { borderRadius: 16 }; // rounded
  }
}

export function SlotMachine({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const shape       = (config?.shape as string | undefined) ?? "rounded";
  const shapeW      = Math.max(60, Math.min(260, (config?.shapeWidth  as number | undefined) ?? 120));
  const shapeH      = Math.max(60, Math.min(220, (config?.shapeHeight as number | undefined) ?? 120));
  const oscSpeed    = Math.max(1, Math.min(12, (config?.oscillateSpeed as number | undefined) ?? 7));
  const outlineColor = (config?.outlineColor as string | undefined) ?? pal.brand;
  const outlineScale = Math.max(30, Math.min(200, (config?.outlineScale as number | undefined) ?? 100));
  const fillColor    = (config?.fillColor    as string | undefined) ?? pal.accent;
  const outlineImage = (config?.outlineImage as string | undefined) ?? null;
  const fillImage    = (config?.fillImage    as string | undefined) ?? null;
  const perfectThreshold = Math.max(50, Math.min(100, (config?.perfectThreshold as number | undefined) ?? 96));
  // Win threshold: fill the outline to at least this %.
  const winFillPercent   = Math.max(1, Math.min(100, (config?.winFillPercent as number | undefined) ?? 80));
  const lockAnimation = (config?.lockAnimation as string | undefined) ?? "pulse";
  const instructionTpl        = (config?.instructionText       as string | undefined) ?? "Stop the slider to fill the outline — the fuller it lands, the bigger your prize!";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const filledLabel  = (config?.filledLabel as string | undefined) ?? "Filled";
  const stopLabel    = (config?.stopLabel   as string | undefined) ?? "STOP";
  const perfectText  = (config?.perfectText as string | undefined) ?? "Perfect fit! 🎯";
  const tryAgainText = (config?.tryAgainText as string | undefined) ?? "So close!";

  const outlineX = (ARENA_W - shapeW) / 2; // fixed, centred
  const maxX = ARENA_W - shapeW;

  const [x, setX] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [fill, setFill] = useState(0);
  const dir = useRef(1);
  const raf = useRef<number | null>(null);
  const xRef = useRef(0);
  const startTs = useRef(performance.now());
  const fired = useRef(false);

  // Live fill % for the current object position.
  function fillFor(px: number): number {
    const left = Math.max(px, outlineX);
    const right = Math.min(px + shapeW, outlineX + shapeW);
    const overlap = Math.max(0, right - left);
    return Math.round((overlap / shapeW) * 100);
  }

  useEffect(() => {
    startTs.current = performance.now();
    function loop() {
      let nx = xRef.current + dir.current * oscSpeed;
      if (nx <= 0) { nx = 0; dir.current = 1; }
      if (nx >= maxX) { nx = maxX; dir.current = -1; }
      xRef.current = nx;
      setX(nx);
      setFill(fillFor(nx));
      raf.current = requestAnimationFrame(loop);
    }
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oscSpeed, maxX, shapeW]);

  function stop() {
    if (stopped || fired.current) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    const finalFill = fillFor(xRef.current);
    setFill(finalFill);
    setStopped(true);
    fired.current = true;
    setTimeout(() => {
      onComplete({
        score: finalFill,
        outcome: `fill_${finalFill}`,
        won: finalFill >= winFillPercent,
        durationMs: Math.round(performance.now() - startTs.current),
      });
    }, 1200);
  }

  const isPerfect = stopped && fill >= perfectThreshold;
  const lockAnim =
    !stopped ? undefined
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
      {instructionTpl}
    </span>
  ) : null;

  const shapeStyle = shapeCSS(shape);

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {instruction}

      {/* Fill percentage readout */}
      <div className="flex flex-col items-center gap-1">
        <div
          className="arcade-display text-4xl leading-none tabular-nums"
          style={{ color: isPerfect ? fillColor : "var(--ink)" }}
        >
          {fill}%
        </div>
        <div className="text-[10px] uppercase tracking-widest arcade-muted">{filledLabel}</div>
      </div>

      {/* Arena */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          width: ARENA_W,
          height: shapeH + 40,
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.25))",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.4)",
        }}
      >
        {/* Outline (fixed target) */}
        <div
          className="absolute"
          style={{
            left: outlineX,
            top: 20,
            width: shapeW,
            height: shapeH,
            ...shapeStyle,
            ...(outlineImage
              ? {}
              : { border: `3px dashed ${outlineColor}`, background: lighten(outlineColor, 0.55) + "55" }),
          }}
        >
          {outlineImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={outlineImage}
              alt=""
              style={{
                width: "100%", height: "100%", objectFit: "contain", opacity: 0.35,
                transform: `scale(${outlineScale / 100})`,
                ...shapeStyle,
              }}
            />
          )}
        </div>

        {/* Oscillating object */}
        <div
          className="absolute"
          style={{
            left: x,
            top: 20,
            width: shapeW,
            height: shapeH,
            ...shapeStyle,
            ...(fillImage
              ? {}
              : {
                  background: `linear-gradient(160deg, ${lighten(fillColor, 0.25)}, ${darken(fillColor, 0.15)})`,
                  boxShadow: `0 0 16px 2px ${fillColor}99`,
                  opacity: 0.92,
                }),
            animation: lockAnim,
          }}
        >
          {fillImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fillImage}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain", ...shapeStyle }}
            />
          )}
        </div>
      </div>

      {stopped ? (
        <div
          className="rounded-xl px-5 py-2.5 text-center text-sm font-bold"
          style={{ background: isPerfect ? fillColor : lighten(pal.dark, 0.55), color: isPerfect ? pal.fg : "#444" }}
        >
          {isPerfect ? perfectText : tryAgainText} · {fill}%
        </div>
      ) : (
        <button onClick={stop} className="btn-arcade" style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}>
          {stopLabel}
        </button>
      )}
    </div>
  );
}
