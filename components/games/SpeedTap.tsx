"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const TAP_ANIM: Record<string, string> = {
  bump:   "", // handled inline via scale
  pop:    "mem-pop 0.25s ease",
  pulse:  "mem-pulse 0.3s ease",
  wobble: "mem-wobble 0.3s ease",
  flash:  "mem-flash 0.3s ease",
};

export function SpeedTap({ config, theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();

  // ── Config ─────────────────────────────────────────────────────────────────
  const gameMs       = Math.max(2, Math.min(30, (config?.gameSeconds as number | undefined) ?? 5)) * 1000;
  const buttonSize   = Math.max(120, Math.min(260, (config?.buttonSize as number | undefined) ?? 192));
  // Win threshold: reach at least this many taps.
  const winScore     = Math.max(1, (config?.winScore as number | undefined) ?? 20);
  const buttonColor  = (config?.buttonColor as string | undefined) ?? pal.brand;
  const buttonImage  = (config?.buttonImage as string | undefined) ?? null;
  const buttonText   = (config?.buttonText  as string | undefined) ?? "TAP!";
  const isImgBtn = !!buttonImage;
  const buttonTextColor = (config?.buttonTextColor as string | undefined) ?? "#ffffff";
  const tapAnimation = (config?.tapAnimation as string | undefined) ?? "bump";
  const instructionTpl        = (config?.instructionText       as string | undefined) ?? "Tap the button as fast as you can for {seconds} seconds — the more taps, the bigger your prize!";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const tapsLabel    = (config?.tapsLabel as string | undefined) ?? "Taps";
  const timeLabel    = (config?.timeLabel as string | undefined) ?? "Time";
  const startLabel   = (config?.startLabel as string | undefined) ?? "START";

  const [phase, setPhase] = useState<"idle" | "play">("idle");
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState(gameMs);
  const [bump, setBump] = useState(false);
  const [tapKey, setTapKey] = useState(0);
  const [aspect, setAspect] = useState(1); // button image width/height
  useEffect(() => {
    if (buttonImage) {
      const im = new window.Image();
      im.onload = () => { if (im.naturalHeight) setAspect(im.naturalWidth / im.naturalHeight); };
      im.src = buttonImage;
    } else setAspect(1);
  }, [buttonImage]);
  const btnW = isImgBtn ? (aspect >= 1 ? buttonSize : Math.round(buttonSize * aspect)) : buttonSize;
  const btnH = isImgBtn ? (aspect >= 1 ? Math.round(buttonSize / aspect) : buttonSize) : buttonSize;
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setPhase("play");
    setTaps(0);
    setLeft(gameMs);
    timer.reset();
    tick.current = setInterval(() => setLeft((l) => Math.max(0, l - 100)), 100);
  }

  useEffect(() => {
    if (phase === "play" && left <= 0) {
      if (tick.current) clearInterval(tick.current);
      const finalScore = taps;
      setPhase("idle");
      onComplete({ score: finalScore, outcome: `tap_${finalScore}`, won: finalScore >= winScore, durationMs: timer.elapsed() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  useEffect(() => () => { if (tick.current) clearInterval(tick.current); }, []);

  function tap() {
    if (phase !== "play") return;
    setTaps((t) => t + 1);
    setBump(true);
    setTapKey((k) => k + 1);
    setTimeout(() => setBump(false), 70);
  }

  const instruction = instructionTpl.trim()
    ? instructionTpl.replace(/\{seconds\}/gi, String(Math.round(gameMs / 1000)))
    : "";
  const useBump = tapAnimation === "bump";

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
          <Readout label={tapsLabel} value={taps} />
          <Readout label={timeLabel} value={`${(left / 1000).toFixed(1)}s`} />
        </div>
      ) : null}
      {phase === "play" ? (
        <button
          key={useBump ? undefined : tapKey}
          type="button"
          onClick={tap}
          className={`relative flex items-center justify-center arcade-title select-none ${isImgBtn ? "" : "rounded-full overflow-hidden"}`}
          style={{
            height: btnH,
            width: btnW,
            fontSize: buttonSize * 0.13,
            color: buttonTextColor,
            background: isImgBtn
              ? "transparent"
              : `radial-gradient(circle at 40% 30%, ${lighten(buttonColor, 0.35)}, ${darken(buttonColor, 0.1)})`,
            boxShadow: isImgBtn ? "none" : `0 14px 30px -8px ${buttonColor}, inset 0 3px 0 rgba(255,255,255,0.4)`,
            transform: useBump ? (bump ? "scale(0.93)" : "scale(1)") : undefined,
            transition: useBump ? "transform 0.06s" : undefined,
            animation: !useBump && TAP_ANIM[tapAnimation] ? TAP_ANIM[tapAnimation] : undefined,
          }}
        >
          {isImgBtn && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={buttonImage!} alt="" className="w-full h-full object-contain pointer-events-none" draggable={false} />
          )}
        </button>
      ) : (
        <ArcadeButton onClick={start} pulse>{startLabel}</ArcadeButton>
      )}
      {/* Tap label sits BELOW the button/game, not on it. */}
      {phase === "play" && buttonText.trim() && (
        <div
          className="arcade-title select-none text-center"
          style={{ fontSize: buttonSize * 0.16, color: buttonTextColor === "#ffffff" ? pal.brand : buttonTextColor }}
        >
          {buttonText}
        </div>
      )}
    </Stage>
  );
}
