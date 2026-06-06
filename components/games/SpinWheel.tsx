"use client";
import { useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, mix, lighten, darken, readableText } from "@/lib/games/colors";

const DEFAULT_SEGMENTS = ["🎁", "⭐", "💎", "🍀", "🎉", "🍩", "🍫", "🎈"];
const SIZE = 300;
const R = SIZE / 2;

/**
 * Visual-only wheel. The actual prize is decided server-side by draw_prize();
 * the wheel just lands on a random segment for show. Rendered as SVG so labels,
 * gradients and dividers stay crisp at any size.
 */
export function SpinWheel({ config, theme, onComplete }: GameProps) {
  const segments = (config?.segments as string[] | undefined) ?? DEFAULT_SEGMENTS;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const startTs = useRef<number>(0);
  const pal = palette(theme.brandColor, theme.brandFg);

  const slice = 360 / segments.length;

  // Alternating segment fills derived from the brand color.
  const fills = useMemo(
    () =>
      segments.map((_, i) =>
        i % 2 === 0
          ? { from: lighten(pal.brand, 0.12), to: darken(pal.brand, 0.08) }
          : { from: lighten(pal.accent, 0.1), to: darken(pal.accent, 0.12) },
      ),
    [segments, pal.brand, pal.accent],
  );

  function spin() {
    if (spinning) return;
    setSpinning(true);
    startTs.current = performance.now();
    const turns = 6 + Math.random() * 3;
    const landing = Math.random() * 360;
    const target = rotation + turns * 360 + landing;
    setRotation(target);
    setTimeout(() => {
      setSpinning(false);
      const segIdx = Math.floor(((360 - (target % 360)) % 360) / slice);
      onComplete({
        outcome: `segment_${segIdx}`,
        durationMs: performance.now() - startTs.current,
      });
    }, 4600);
  }

  return (
    <div className="flex flex-col items-center gap-7 py-2">
      <div
        className="relative"
        style={{ width: SIZE + 24, height: SIZE + 24 }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-40"
          style={{ background: `radial-gradient(circle, ${pal.brand}, transparent 70%)` }}
        />

        {/* Outer bezel ring with pegs */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${lighten(pal.dark, 0.3)}, ${pal.dark}, ${lighten(
              pal.dark,
              0.3,
            )}, ${pal.dark})`,
            boxShadow: `0 18px 40px -12px ${mix(pal.dark, "#000", 0.3)}, inset 0 2px 6px rgba(255,255,255,0.25)`,
            padding: 12,
          }}
        >
          {/* Pegs around the rim */}
          {Array.from({ length: segments.length }).map((_, i) => {
            const a = (i * slice - 90) * (Math.PI / 180);
            const rr = R + 6;
            return (
              <span
                key={i}
                className="absolute h-2 w-2 rounded-full"
                style={{
                  left: R + 12 + Math.cos(a) * rr - 4,
                  top: R + 12 + Math.sin(a) * rr - 4,
                  background: lighten(pal.brand, 0.5),
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                }}
              />
            );
          })}

          {/* The rotating wheel face */}
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            className="relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 4.6s cubic-bezier(0.17, 0.67, 0.16, 1)",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
            }}
          >
            <defs>
              {fills.map((f, i) => (
                <radialGradient id={`seg-${i}`} key={i} cx="50%" cy="50%" r="75%">
                  <stop offset="0%" stopColor={f.from} />
                  <stop offset="100%" stopColor={f.to} />
                </radialGradient>
              ))}
              <radialGradient id="gloss" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
              </radialGradient>
            </defs>

            {segments.map((label, i) => {
              const a0 = (i * slice - 90) * (Math.PI / 180);
              const a1 = ((i + 1) * slice - 90) * (Math.PI / 180);
              const x0 = R + R * Math.cos(a0);
              const y0 = R + R * Math.sin(a0);
              const x1 = R + R * Math.cos(a1);
              const y1 = R + R * Math.sin(a1);
              const large = slice > 180 ? 1 : 0;
              const mid = (i * slice + slice / 2 - 90) * (Math.PI / 180);
              const lr = R * 0.62;
              const lx = R + lr * Math.cos(mid);
              const ly = R + lr * Math.sin(mid);
              const segFg = readableText(fills[i].to);
              return (
                <g key={i}>
                  <path
                    d={`M${R},${R} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`}
                    fill={`url(#seg-${i})`}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={lx}
                    y={ly}
                    fill={segFg}
                    fontSize={segments.length > 8 ? 18 : 24}
                    fontWeight={700}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${i * slice + slice / 2}, ${lx}, ${ly})`}
                    style={{ paintOrder: "stroke" }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Glossy highlight overlay */}
            <circle cx={R} cy={R} r={R} fill="url(#gloss)" pointerEvents="none" />
          </svg>

          {/* Center hub */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center z-10"
            style={{
              height: 64,
              width: 64,
              background: `radial-gradient(circle at 35% 30%, ${lighten(pal.brand, 0.4)}, ${pal.brand} 70%)`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.4)`,
              border: `3px solid ${lighten(pal.brand, 0.55)}`,
            }}
          >
            <span className="text-2xl" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}>
              ✦
            </span>
          </div>
        </div>

        {/* Pointer */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20"
          style={{ top: -4 }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "14px solid transparent",
              borderRight: "14px solid transparent",
              borderTop: `28px solid ${darken(pal.brand, 0.1)}`,
              filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.35))",
            }}
          />
        </div>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="btn-arcade"
        style={!spinning ? { animation: "pulse-glow 2.2s ease-in-out infinite" } : undefined}
      >
        {spinning ? "Spinning…" : "SPIN TO WIN"}
      </button>
    </div>
  );
}
