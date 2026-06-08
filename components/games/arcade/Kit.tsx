"use client";
import { useRef, type ReactNode } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, type Palette } from "@/lib/games/colors";

/** Per-game brand palette derived from theme. */
export function useArcade(theme: GameProps["theme"]): Palette {
  return palette(theme.brandColor, theme.brandFg);
}

/** Tracks game start time; call elapsed() to get durationMs. */
export function useTimer() {
  const start = useRef<number>(0);
  return {
    begin() {
      if (start.current === 0) start.current = performance.now();
    },
    reset() {
      start.current = performance.now();
    },
    elapsed() {
      return start.current ? performance.now() - start.current : 0;
    },
  };
}

export function ArcadeButton({
  children,
  onClick,
  disabled,
  pulse,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn-arcade ${className}`}
      style={pulse && !disabled ? { animation: "pulse-glow 2s ease-in-out infinite" } : undefined}
    >
      {children}
    </button>
  );
}

/** Standard game stage: centered column with an optional instruction line. */
export function Stage({
  instruction,
  children,
}: {
  instruction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      {instruction ? (
        <p className="arcade-muted text-center text-base font-semibold">{instruction}</p>
      ) : null}
      {children}
    </div>
  );
}

/** A bold count/score readout. */
export function Readout({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div className="arcade-chip px-4 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-widest arcade-muted">{label}</div>
      <div className="arcade-display text-xl leading-none" style={{ color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}
