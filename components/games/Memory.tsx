"use client";
import { useMemo, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, Stage, Readout } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const DEFAULT_ICONS = ["🍒", "⭐", "💎", "🍀", "🔔", "🎁"];

interface Card { id: number; icon: string; }

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Match all pairs. Score rewards fewer moves; durationMs recorded.
export function Memory({ config, theme, onComplete }: GameProps) {
  const pairs = Math.min(6, Math.max(3, (config?.pairs as number | undefined) ?? 4));
  const icons = (config?.icons as string[] | undefined) ?? DEFAULT_ICONS;
  const pal = useArcade(theme);
  const timer = useTimer();

  const deck = useMemo<Card[]>(() => {
    const chosen = icons.slice(0, pairs);
    const doubled = [...chosen, ...chosen].map((icon, id) => ({ id, icon }));
    return shuffle(doubled);
  }, [pairs, icons]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  function flip(i: number) {
    if (lock || flipped.includes(i) || matched.has(i)) return;
    timer.begin();
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setLock(true);
      setMoves((m) => m + 1);
      const [a, b] = next;
      const isMatch = deck[a].icon === deck[b].icon;
      setTimeout(() => {
        if (isMatch) {
          const nm = new Set(matched);
          nm.add(a); nm.add(b);
          setMatched(nm);
          if (nm.size === deck.length) {
            const moveCount = moves + 1;
            const score = Math.max(0, pairs * 25 - (moveCount - pairs) * 5);
            onComplete({ score, outcome: `memory_${moveCount}moves`, durationMs: timer.elapsed() });
          }
        }
        setFlipped([]);
        setLock(false);
      }, 700);
    }
  }

  const cols = deck.length <= 6 ? 3 : 4;

  return (
    <Stage instruction="Find all the matching pairs">
      <Readout label="Moves" value={moves} color={pal.brand} />
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {deck.map((card, i) => {
          const isUp = flipped.includes(i) || matched.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => flip(i)}
              disabled={isUp || lock}
              aria-label={`Card ${i + 1}`}
              className="h-20 w-20 [perspective:600px]"
            >
              <div
                className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                style={{ transform: isUp ? "rotateY(180deg)" : "rotateY(0)" }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl text-2xl text-white/80 [backface-visibility:hidden]"
                  style={{ background: `linear-gradient(160deg, ${lighten(pal.brand, 0.15)}, ${darken(pal.brand, 0.2)})`, boxShadow: "inset 0 2px 0 rgba(255,255,255,0.25)" }}
                >
                  ?
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-white text-4xl [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{ boxShadow: matched.has(i) ? `0 0 16px 1px ${pal.accent}, inset 0 0 0 2px ${pal.accent}` : "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
                >
                  {card.icon}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Stage>
  );
}
