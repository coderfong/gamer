"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, ArcadeButton, Stage } from "./arcade/Kit";

type Phase = "idle" | "waiting" | "go" | "done" | "early";

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function Icon({ value, size }: { value: string; size: number }) {
  if (!value) return null;
  if (isImg(value)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}

// Wait for the "go" colour, then tap as fast as possible.
export function Reaction({ config, theme, onComplete }: GameProps) {
  const pal = useArcade(theme);

  // ── Config ─────────────────────────────────────────────────────────────────
  const minWait     = Math.max(0.3, Math.min(6, (config?.minWait as number | undefined) ?? 1.2)) * 1000;
  const maxWait     = Math.max(minWait / 1000, Math.min(10, (config?.maxWait as number | undefined) ?? 3.8)) * 1000;
  const waitColor   = (config?.waitColor as string | undefined) ?? "#b91c1c";
  const goColor     = (config?.goColor as string | undefined) ?? "#16a34a";
  const earlyColor  = (config?.earlyColor as string | undefined) ?? "#7f1d1d";
  const idleColor   = (config?.idleColor as string | undefined) ?? "rgba(0,0,0,0.25)";
  const goSymbol    = (config?.goSymbol as string | undefined) ?? "";
  const panelHeight = Math.max(140, Math.min(320, (config?.panelHeight as number | undefined) ?? 224));
  const instructionTpl        = (config?.instructionText       as string | undefined) ?? "Tap the instant the panel turns green";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const readyText   = (config?.readyText as string | undefined) ?? "Ready?";
  const waitText    = (config?.waitText  as string | undefined) ?? "Wait for it…";
  const goText      = (config?.goText    as string | undefined) ?? "TAP NOW!";
  const earlyText   = (config?.earlyText as string | undefined) ?? "Too early! Try again";
  const startLabel  = (config?.startLabel as string | undefined) ?? "START";
  const retryLabel  = (config?.retryLabel as string | undefined) ?? "RETRY";
  const resultTpl   = (config?.resultText as string | undefined) ?? "Nice reflexes!";

  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState(0);
  const goAt = useRef(0);
  const to = useRef<ReturnType<typeof setTimeout> | null>(null);

  function arm() {
    setPhase("waiting");
    const delay = minWait + Math.random() * Math.max(0, maxWait - minWait);
    to.current = setTimeout(() => {
      goAt.current = performance.now();
      setPhase("go");
    }, delay);
  }

  useEffect(() => () => { if (to.current) clearTimeout(to.current); }, []);

  function click() {
    if (phase === "waiting") {
      if (to.current) clearTimeout(to.current);
      setPhase("early");
      return;
    }
    if (phase === "go") {
      const rt = Math.round(performance.now() - goAt.current);
      setMs(rt);
      setPhase("done");
      const score = Math.max(0, 1000 - rt);
      onComplete({ score, outcome: `reaction_${rt}ms`, durationMs: rt });
    }
  }

  const bg =
    phase === "go" ? goColor : phase === "waiting" ? waitColor : phase === "early" ? earlyColor : idleColor;
  const label =
    phase === "idle" ? readyText :
    phase === "waiting" ? waitText :
    phase === "go" ? goText :
    phase === "early" ? earlyText :
    `${ms} ms`;

  const instruction = instructionTpl.trim() ? (
    <span style={{ color: instructionColor ?? undefined, fontSize: instructionFontSize, fontFamily: instructionFontFamily ?? undefined }}>
      {instructionTpl}
    </span>
  ) : undefined;

  return (
    <Stage instruction={instruction}>
      <button
        type="button"
        onClick={click}
        disabled={phase === "idle" || phase === "done"}
        className="flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl arcade-title text-3xl text-white select-none transition-colors"
        style={{ height: panelHeight, background: bg, boxShadow: phase === "go" ? `0 0 40px 4px ${goColor}` : "inset 0 2px 8px rgba(0,0,0,0.4)" }}
      >
        {phase === "go" && goSymbol ? <Icon value={goSymbol} size={panelHeight * 0.32} /> : null}
        <span>{label}</span>
      </button>
      {phase === "idle" ? <ArcadeButton onClick={arm} pulse>{startLabel}</ArcadeButton> : null}
      {phase === "early" ? <ArcadeButton onClick={arm}>{retryLabel}</ArcadeButton> : null}
      {phase === "done" ? <div className="arcade-display text-xl" style={{ color: pal.brand }}>{resultTpl.replace(/\{ms\}/gi, String(ms))}</div> : null}
    </Stage>
  );
}
