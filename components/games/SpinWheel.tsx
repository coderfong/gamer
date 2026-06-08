"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { ArcadeButton } from "./arcade/Kit";

// ARCADE POP spin wheel — chunky candy wheel with sticker outlines, sun pegs,
// a coral pointer and a paper hub. Server decides the prize; the wheel lands on
// a random slice for show. Ported from the reference design (games/spinwheel.jsx).

const INK = "#231B2E";
const SUN = "#FFC23C";
const CORAL = "#FF5A4D";
const PAPER = "#FFFCF4";

const SLICE_COLORS = ["#27C4D9", "#EAD9F2", "#FF74B0", "#FFC23C", "#8A6BFF", "#EAD9F2", "#FF5A4D", "#36CF8E"];
const DEFAULT_LABELS = ["FREE DRINK", "TRY AGAIN", "20% OFF", "BOGO", "GIFT", "TRY AGAIN", "TOPPING", "JACKPOT"];
const DEFAULT_ICONS = ["🥤", "🍀", "🏷️", "🍩", "🎁", "🍀", "🧋", "💎"];

const SIZE = 300;
const R = SIZE / 2;

export function SpinWheel({ config, onComplete }: GameProps) {
  const icons = (config?.segments as string[] | undefined) ?? DEFAULT_ICONS;
  const labels = (config?.labels as string[] | undefined) ?? DEFAULT_LABELS;
  const N = icons.length;
  const slice = 360 / N;

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [tick, setTick] = useState(false);
  const startTs = useRef(0);

  useEffect(() => {
    if (!spinning) return;
    const i = setInterval(() => setTick((t) => !t), 90);
    return () => clearInterval(i);
  }, [spinning]);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    startTs.current = performance.now();
    const idx = Math.floor(Math.random() * N);
    const turns = 5 + Math.floor(Math.random() * 3);
    const target = turns * 360 + (360 - (idx * slice + slice / 2));
    const final = rotation - (rotation % 360) + target;
    setRotation(final);
    setTimeout(() => {
      setSpinning(false);
      setTimeout(() => onComplete({ outcome: `segment_${idx}`, durationMs: performance.now() - startTs.current }), 600);
    }, 4400);
  }

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="pop-display titlepop text-center text-4xl leading-none">SPIN<br />TO WIN</div>

      <div className="relative grid place-items-center" style={{ width: SIZE + 36, height: SIZE + 36 }}>
        {/* outer ring with pegs */}
        <div
          className="sticker-lg absolute rounded-full"
          style={{ inset: 6, background: INK, padding: 12, boxShadow: `0 8px 0 ${INK}` }}
        >
          {Array.from({ length: N }).map((_, i) => {
            const a = (i * slice - 90) * (Math.PI / 180);
            const rr = R + 8;
            return (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 12, height: 12, background: SUN, border: `2px solid ${INK}`,
                  left: R + 6 + Math.cos(a) * rr - 6, top: R + 6 + Math.sin(a) * rr - 6,
                  boxShadow: tick && spinning ? `0 0 8px ${SUN}` : "none",
                }}
              />
            );
          })}

          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4.4s cubic-bezier(.15,.7,.12,1)" : "none", display: "block" }}
          >
            {Array.from({ length: N }).map((_, i) => {
              const a0 = (i * slice - 90) * (Math.PI / 180);
              const a1 = ((i + 1) * slice - 90) * (Math.PI / 180);
              const x0 = R + R * Math.cos(a0), y0 = R + R * Math.sin(a0);
              const x1 = R + R * Math.cos(a1), y1 = R + R * Math.sin(a1);
              const mid = (i * slice + slice / 2 - 90) * (Math.PI / 180);
              const ix = R + R * 0.66 * Math.cos(mid), iy = R + R * 0.66 * Math.sin(mid);
              const tx = R + R * 0.4 * Math.cos(mid), ty = R + R * 0.4 * Math.sin(mid);
              const rot = i * slice + slice / 2;
              return (
                <g key={i}>
                  <path d={`M${R},${R} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                  <text x={ix} y={iy} fontSize="30" textAnchor="middle" dominantBaseline="central" transform={`rotate(${rot},${ix},${iy})`}>{icons[i]}</text>
                  <text x={tx} y={ty} fontSize="11" textAnchor="middle" dominantBaseline="central" fontFamily="'Luckiest Guy', cursive" fill={INK} transform={`rotate(${rot},${tx},${ty})`}>
                    {labels[i % labels.length]}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* hub */}
          <div
            className="sticker absolute grid place-items-center rounded-full"
            style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 66, height: 66, background: PAPER, zIndex: 5 }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill={CORAL} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* pointer */}
        <div className="absolute z-10" style={{ top: -6, left: "50%", transform: "translateX(-50%) rotate(180deg)", filter: `drop-shadow(2px -2px 0 ${INK})` }}>
          <svg width="40" height="46" viewBox="0 0 40 46">
            <path d="M20 46 L4 8 Q20 -4 36 8 Z" fill={CORAL} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <circle cx="20" cy="14" r="5" fill={PAPER} stroke={INK} strokeWidth="2.5" />
          </svg>
        </div>
      </div>

      <ArcadeButton onClick={spin} disabled={spinning} pulse={!spinning}>
        {spinning ? "GOOD LUCK…" : "SPIN!"}
      </ArcadeButton>
    </div>
  );
}
