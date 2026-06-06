"use client";
import { useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken, mix } from "@/lib/games/colors";

// Custom reel implementation — server decides the actual prize via
// draw_prize_atomic; the visual reels stop on a random set of symbols (purely
// cosmetic) inside a styled arcade cabinet.

const DEFAULT_SYMBOLS = ["🍒", "🍋", "⭐", "🔔", "💎", "7️⃣", "🍀"];
const REEL_LEN = 40;
const SYMBOL_HEIGHT = 88;

interface ReelState {
  offsetPx: number;
  durationMs: number;
}

export function SlotMachine({ config, theme, onComplete }: GameProps) {
  const symbols = (config?.symbols as string[] | undefined) ?? DEFAULT_SYMBOLS;
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const [win, setWin] = useState(false);
  const startTs = useRef<number>(0);
  const pal = palette(theme.brandColor, theme.brandFg);

  const [reels, setReels] = useState<ReelState[]>([
    { offsetPx: 0, durationMs: 0 },
    { offsetPx: 0, durationMs: 0 },
    { offsetPx: 0, durationMs: 0 },
  ]);

  const strips = useRef<string[][]>([
    buildStrip(symbols),
    buildStrip(symbols),
    buildStrip(symbols),
  ]);

  function spin() {
    if (spinning || done) return;
    setSpinning(true);
    setWin(false);
    startTs.current = performance.now();

    const stopIdxs = strips.current.map(
      (strip) => Math.floor(Math.random() * (strip.length - 8)) + 6,
    );
    const next: ReelState[] = stopIdxs.map((idx, i) => ({
      offsetPx: -idx * SYMBOL_HEIGHT,
      durationMs: 2400 + i * 700,
    }));
    setReels(next);

    const finalSymbols = stopIdxs.map((idx, i) => strips.current[i][idx]);
    const matched = finalSymbols.every((s) => s === finalSymbols[0]);
    const total = Math.max(...next.map((r) => r.durationMs)) + 250;

    setTimeout(() => {
      setSpinning(false);
      setDone(true);
      setWin(matched);
      onComplete({
        outcome: matched ? `slot_match_${finalSymbols[0]}` : `slot_${finalSymbols.join("_")}`,
        durationMs: performance.now() - startTs.current,
      });
    }, total);
  }

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      {/* Cabinet */}
      <div
        className="relative rounded-3xl p-5 pt-6"
        style={{
          background: `linear-gradient(160deg, ${lighten(pal.brand, 0.18)}, ${darken(pal.brand, 0.28)})`,
          boxShadow: `0 22px 48px -16px ${mix(pal.dark, "#000", 0.4)}, inset 0 2px 4px rgba(255,255,255,0.3)`,
          border: `2px solid ${lighten(pal.brand, 0.45)}`,
        }}
      >
        {/* Marquee */}
        <div
          className="mb-4 text-center font-extrabold tracking-[0.2em] text-sm rounded-lg py-1.5"
          style={{
            color: pal.fg,
            background: `linear-gradient(90deg, ${darken(pal.brand, 0.15)}, ${pal.brand}, ${darken(pal.brand, 0.15)})`,
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          ✦ JACKPOT ✦
        </div>

        {/* Reel window */}
        <div
          className="relative flex gap-2.5 p-3 rounded-xl"
          style={{
            background: "linear-gradient(180deg, #0b0b12, #1b1b26)",
            boxShadow: "inset 0 4px 12px rgba(0,0,0,0.7)",
          }}
        >
          {strips.current.map((strip, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-lg"
              style={{
                width: SYMBOL_HEIGHT,
                height: SYMBOL_HEIGHT,
                background: "linear-gradient(180deg, #ffffff, #e9e9f0)",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)",
              }}
            >
              <div
                className="will-change-transform"
                style={{
                  transform: `translateY(${reels[i].offsetPx}px)`,
                  transition: reels[i].durationMs
                    ? `transform ${reels[i].durationMs}ms cubic-bezier(0.12, 0.7, 0.2, 1)`
                    : "none",
                  filter: spinning ? "blur(1px)" : "none",
                }}
              >
                {strip.map((sym, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-center text-4xl"
                    style={{ height: SYMBOL_HEIGHT }}
                  >
                    {sym}
                  </div>
                ))}
              </div>
              {/* glass gloss */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.55), transparent 30%, transparent 70%, rgba(0,0,0,0.15))",
                }}
              />
            </div>
          ))}

          {/* Payline */}
          <div
            className="pointer-events-none absolute left-1.5 right-1.5 top-1/2 -translate-y-1/2 h-[3px] rounded-full"
            style={{
              background: win ? lighten(pal.accent, 0.2) : "rgba(255,255,255,0.25)",
              boxShadow: win ? `0 0 12px 2px ${pal.accent}` : "none",
              transition: "all 0.3s",
            }}
          />
        </div>

        {win ? (
          <div
            className="mt-3 text-center font-bold text-sm animate-[pop-in_0.4s_ease-out]"
            style={{ color: lighten(pal.accent, 0.35) }}
          >
            🎉 MATCH! 🎉
          </div>
        ) : (
          <div className="mt-3 h-5" />
        )}
      </div>

      <button
        onClick={spin}
        disabled={spinning || done}
        className="btn-brand text-lg tracking-wide"
        style={!spinning && !done ? { animation: "pulse-glow 2.2s ease-in-out infinite" } : undefined}
      >
        {spinning ? "Spinning…" : done ? "Done" : "PULL THE LEVER"}
      </button>
    </div>
  );
}

function buildStrip(symbols: string[]): string[] {
  const strip: string[] = [];
  for (let i = 0; i < REEL_LEN; i++) {
    strip.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }
  return strip;
}
