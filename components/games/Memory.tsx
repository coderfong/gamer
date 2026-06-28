"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, Stage, Readout } from "./arcade/Kit";
import { lighten, darken } from "@/lib/games/colors";

const DEFAULT_ICONS = ["🍒", "⭐", "💎", "🍀", "🔔", "🎁"];

interface Card { id: number; icon: string; }

// A card face value is either emoji/text or an image URL.
function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function Face({ value, size, color }: { value: string; size: number; color?: string }) {
  if (isImg(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1, color }}>{value}</span>;
}

const MATCH_ANIM: Record<string, string> = {
  none:   "",
  pop:    "mem-pop 0.5s ease",
  pulse:  "mem-pulse 0.6s ease",
  flash:  "mem-flash 0.6s ease",
  tada:   "mem-tada 0.7s ease",
  wobble: "mem-wobble 0.5s ease",
};

const ENTRANCE: Record<string, (delayMs: number) => string> = {
  none: () => "",
  fade: (d) => `mem-fade-in 0.4s ease ${d}ms both`,
  pop:  (d) => `mem-pop-in 0.45s cubic-bezier(.34,1.56,.64,1) ${d}ms both`,
  zoom: (d) => `mem-zoom-in 0.4s ease ${d}ms both`,
  drop: (d) => `mem-drop-in 0.45s ease ${d}ms both`,
  flip: (d) => `mem-flip-in 0.5s ease ${d}ms both`,
};

function parseIcons(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const arr = (raw as string[]).filter((s) => typeof s === "string" && s.trim());
    if (arr.length) return arr;
  }
  if (typeof raw === "string" && raw.trim())
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return DEFAULT_ICONS;
}

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
  const icons = parseIcons(config?.icons);
  const pal = useArcade(theme);
  const timer = useTimer();

  // ── Styling config (all optional, fall back to brand palette) ──────────────
  const instructionTpl        = (config?.instructionText       as string | undefined) ?? "Match all the pairs to win!";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const cardSize       = Math.max(56, Math.min(110, (config?.cardSize as number | undefined) ?? 80));
  const cardBackColor  = (config?.cardBackColor   as string | undefined) ?? pal.brand;
  const cardBackSymbol = (config?.cardBackSymbol  as string | undefined) ?? "?";
  const cardBackSymCol = (config?.cardBackSymbolColor as string | undefined) ?? "rgba(255,255,255,0.85)";
  const cardFrontColor = (config?.cardFrontColor  as string | undefined) ?? "#ffffff";
  const matchGlowColor = (config?.matchGlowColor  as string | undefined) ?? pal.accent;
  const showMoves      = (config?.showMoves       as boolean | undefined) ?? true;
  const movesLabel     = (config?.movesLabel      as string | undefined) ?? "Moves";
  const flipSpeed      = Math.max(150, Math.min(1000, (config?.flipSpeed as number | undefined) ?? 500));
  const matchAnimation = (config?.matchAnimation  as string | undefined) ?? "pop";
  const cardEntrance   = (config?.cardEntrance    as string | undefined) ?? "none";

  // Countdown: player must match every pair before the clock hits 0, else they lose.
  const timeLimit      = Math.max(5, Math.min(300, (config?.timeLimit  as number | undefined) ?? 15));
  const timeLabel      = (config?.timeLabel   as string | undefined) ?? "Time";
  const timeUpText     = (config?.timeUpText  as string | undefined) ?? "⏰ Time's up!";

  // Cards are square unless the back image is portrait/landscape — then they
  // adopt its aspect ratio so the image fits without cropping.
  const [aspect, setAspect] = useState(1); // width / height
  useEffect(() => {
    if (cardBackSymbol && isImg(cardBackSymbol)) {
      const img = new window.Image();
      img.onload = () => { if (img.naturalHeight) setAspect(img.naturalWidth / img.naturalHeight); };
      img.src = cardBackSymbol;
    } else {
      setAspect(1);
    }
  }, [cardBackSymbol]);
  const cardW = cardSize;
  const cardH = Math.round(cardSize / (aspect || 1));
  const minDim = Math.min(cardW, cardH);

  // Deterministic order for first render (SSR == client), shuffled after mount
  // to avoid a hydration mismatch.
  const deckKey = `${pairs}-${icons.join(",")}`;
  const orderedDeck = useMemo<Card[]>(() => {
    const chosen = icons.slice(0, pairs);
    return [...chosen, ...chosen].map((icon, id) => ({ id, icon }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey]);
  const [deck, setDeck] = useState<Card[]>(orderedDeck);
  useEffect(() => {
    setDeck(shuffle(orderedDeck));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [outOfTime, setOutOfTime] = useState(false);
  const doneRef = useRef(false); // guards against win + timeout both firing

  // Reset the round whenever the deck config changes (e.g. editor preview).
  useEffect(() => {
    setStarted(false);
    setTimeLeft(timeLimit);
    setOutOfTime(false);
    doneRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey, timeLimit]);

  // Tick once per second while the round is running.
  useEffect(() => {
    if (!started || doneRef.current || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [started, timeLeft]);

  // Out of time → lock the board and report a loss.
  useEffect(() => {
    if (!started || timeLeft > 0 || doneRef.current) return;
    doneRef.current = true;
    setOutOfTime(true);
    setLock(true);
    onComplete({ score: 0, outcome: "memory_timeout", durationMs: timer.elapsed() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, timeLeft]);

  function flip(i: number) {
    if (lock || outOfTime || doneRef.current || flipped.includes(i) || matched.has(i)) return;
    timer.begin();
    setStarted(true);
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
          if (nm.size === deck.length && !doneRef.current) {
            doneRef.current = true;
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
  ) : undefined;

  return (
    <Stage instruction={instruction}>
      <div className="flex items-center gap-3">
        {showMoves && <Readout label={movesLabel} value={moves} color={pal.brand} />}
        <Readout
          label={timeLabel}
          value={`${timeLeft}s`}
          color={timeLeft <= 5 ? "#e11d48" : pal.brand}
        />
      </div>
      {outOfTime && (
        <div
          className="rounded-xl px-5 py-2.5 text-center text-sm font-bold"
          style={{ background: "#fee2e2", color: "#b91c1c" }}
        >
          {timeUpText}
        </div>
      )}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, ${cardW}px)` }}>
        {deck.map((card, i) => {
          const isUp = flipped.includes(i) || matched.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => flip(i)}
              disabled={isUp || lock}
              aria-label={`Card ${i + 1}`}
              className="[perspective:600px]"
              style={{
                height: cardH,
                width: cardW,
                animation: (ENTRANCE[cardEntrance] ?? ENTRANCE.none)(i * 55) || undefined,
              }}
            >
              <div
                className="relative h-full w-full [transform-style:preserve-3d]"
                style={{
                  transform: isUp ? "rotateY(180deg)" : "rotateY(0)",
                  transition: `transform ${flipSpeed}ms`,
                }}
              >
                {/* Card back */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl overflow-hidden [backface-visibility:hidden]"
                  style={
                    isImg(cardBackSymbol)
                      ? { boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }
                      : {
                          background: `linear-gradient(160deg, ${lighten(cardBackColor, 0.15)}, ${darken(cardBackColor, 0.2)})`,
                          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.25)",
                        }
                  }
                >
                  {isImg(cardBackSymbol) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cardBackSymbol} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Face value={cardBackSymbol} size={minDim * 0.34} color={cardBackSymCol} />
                  )}
                </div>
                {/* Card front */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{
                    background: isImg(card.icon) ? "transparent" : cardFrontColor,
                    boxShadow: matched.has(i)
                      ? `0 0 16px 1px ${matchGlowColor}, inset 0 0 0 2px ${matchGlowColor}`
                      : isImg(card.icon) ? "none" : "inset 0 0 0 1px rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    className={isImg(card.icon) ? "absolute inset-0" : undefined}
                    style={{
                      animation: matched.has(i) && MATCH_ANIM[matchAnimation]
                        ? MATCH_ANIM[matchAnimation]
                        : undefined,
                    }}
                  >
                    {isImg(card.icon) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.icon} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Face value={card.icon} size={minDim * 0.5} />
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Stage>
  );
}
