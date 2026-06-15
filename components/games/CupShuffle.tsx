"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken } from "@/lib/games/colors";

// Cup Shuffle (shell game), top-down view — an object is shown under one cup,
// the cups shuffle around, then the player picks. Server still decides the
// actual prize; the pick is cosmetic skill feedback.

const MAX_ARENA_W = 340;

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function Face({ value, size }: { value: string; size: number }) {
  if (isImg(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}

export function CupShuffle({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const cupCount     = Math.max(3, Math.min(8, (config?.cupCount as number | undefined) ?? 5));
  const shuffleCount = Math.max(3, Math.min(30, (config?.shuffleCount as number | undefined) ?? 20));
  const shuffleSpeed = Math.max(120, Math.min(800, (config?.shuffleSpeed as number | undefined) ?? 200));
  const cupSizeCfg   = Math.max(50, Math.min(140, (config?.cupSize as number | undefined) ?? 96));
  const cupColor     = (config?.cupColor as string | undefined) ?? pal.brand;
  const cupImage     = (config?.cupImage as string | undefined) ?? null;
  const object       = (config?.objectSymbol as string | undefined) ?? "⭐";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const startLabel   = (config?.startLabel as string | undefined) ?? "START";
  const watchText    = (config?.watchText  as string | undefined) ?? "Watch carefully…";
  const shuffleText  = (config?.shuffleText as string | undefined) ?? "Keep your eye on it!";
  const pickText     = (config?.pickText   as string | undefined) ?? "Which cup is it under?";
  const winText      = (config?.winText    as string | undefined) ?? "You found it! 🎉";
  const loseText     = (config?.loseText   as string | undefined) ?? "Not there — so close!";

  // Lay the cups out around a circle so they shuffle in a ring, not a line.
  // Cups shrink as the count grows so they never overlap on the ring.
  const arenaSize  = MAX_ARENA_W;
  const center     = arenaSize / 2;
  const ringRadius = arenaSize * 0.33;
  const chord      = 2 * ringRadius * Math.sin(Math.PI / cupCount); // gap between neighbours
  const cupW = Math.round(Math.min(cupSizeCfg, chord * 0.92, arenaSize - 2 * ringRadius));
  const cupH = Math.round(cupW * 0.82);          // ellipse — top-down rim

  // Top-left position of the cup occupying a given ring slot (slot 0 at top).
  function slotPos(slot: number) {
    const angle = (slot / cupCount) * Math.PI * 2 - Math.PI / 2;
    return {
      left: center + ringRadius * Math.cos(angle) - cupW / 2,
      top:  center + ringRadius * Math.sin(angle) - cupH / 2,
    };
  }

  const ids = useRef<number[]>(Array.from({ length: cupCount }, (_, i) => i));
  const [order, setOrder] = useState<number[]>(ids.current);    // slot → cupId
  const orderRef = useRef(order);
  const [phase, setPhase] = useState<"idle" | "reveal" | "shuffle" | "pick" | "done">("idle");
  const [ballId, setBallId] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [moving, setMoving] = useState<{ ids: number[]; tick: number }>({ ids: [], tick: 0 });
  const startTs = useRef(0);
  const tickRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    ids.current = Array.from({ length: cupCount }, (_, i) => i);
    orderRef.current = ids.current;
    setOrder(ids.current);
    setPhase("idle");
    setPicked(null);
    setMoving({ ids: [], tick: 0 });
  }, [cupCount]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  function setOrderBoth(next: number[]) {
    orderRef.current = next;
    setOrder(next);
  }

  function start() {
    if (phase !== "idle") return;
    startTs.current = performance.now();
    const ball = Math.floor(Math.random() * cupCount);
    setBallId(ball);
    setOrderBoth(Array.from({ length: cupCount }, (_, i) => i));
    setPhase("reveal");
    timers.current.push(setTimeout(() => { setPhase("shuffle"); runShuffle(shuffleCount); }, 1300));
  }

  function runShuffle(remaining: number) {
    if (remaining <= 0) { setPhase("pick"); setMoving({ ids: [], tick: tickRef.current }); return; }
    const a = Math.floor(Math.random() * cupCount);
    let b = Math.floor(Math.random() * cupCount);
    if (b === a) b = (b + 1) % cupCount;
    const cur = orderRef.current;
    const idA = cur[a], idB = cur[b];
    const next = [...cur];
    [next[a], next[b]] = [next[b], next[a]];
    setOrderBoth(next);
    tickRef.current += 1;
    setMoving({ ids: [idA, idB], tick: tickRef.current });
    timers.current.push(setTimeout(() => runShuffle(remaining - 1), shuffleSpeed));
  }

  function pick(id: number) {
    if (phase !== "pick") return;
    setPicked(id);
    setPhase("done");
    const won = id === ballId;
    timers.current.push(setTimeout(() => {
      onComplete({
        outcome: won ? "cup_correct" : "cup_wrong",
        score: won ? 1 : 0,
        durationMs: Math.round(performance.now() - startTs.current),
      });
    }, 1600));
  }

  const won = phase === "done" && picked === ballId;
  const instructionText =
    phase === "idle" ? "Find the object hidden under a cup!"
    : phase === "reveal" ? watchText
    : phase === "shuffle" ? shuffleText
    : phase === "pick" ? pickText
    : won ? winText : loseText;

  function isLifted(id: number) {
    if (phase === "reveal") return id === ballId;
    if (phase === "done") return id === picked || id === ballId;
    return false;
  }

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <p
        className="arcade-muted font-semibold text-center"
        style={{
          color: instructionColor ?? undefined,
          fontSize: instructionFontSize,
          fontFamily: instructionFontFamily ?? undefined,
        }}
      >
        {instructionText}
      </p>

      <div className="relative" style={{ width: arenaSize, height: arenaSize }}>
        {/* ground shadows mark the fixed ring slots */}
        {Array.from({ length: cupCount }).map((_, slot) => {
          const p = slotPos(slot);
          return (
            <div
              key={`sh-${slot}`}
              className="absolute rounded-[50%]"
              style={{
                left: p.left + (cupW - cupW * 0.82) / 2,
                top: p.top + cupH * 0.62,
                width: cupW * 0.82,
                height: cupH * 0.3,
                background: "rgba(0,0,0,0.18)",
                filter: "blur(2px)",
              }}
            />
          );
        })}

        {ids.current.map((id) => {
          const slot = order.indexOf(id);
          const p = slotPos(slot);
          const lifted = isLifted(id);
          const clickable = phase === "pick";
          const isBall = id === ballId;
          const isMoving = moving.ids.includes(id);
          const arcName = moving.tick % 2 === 0 ? "cup-arc" : "cup-arc-b";
          return (
            <div
              key={id}
              className="absolute"
              style={{
                left: p.left,
                top: p.top,
                width: cupW,
                height: cupH,
                transition: `left ${shuffleSpeed}ms ease-in-out, top ${shuffleSpeed}ms ease-in-out`,
                animation: isMoving ? `${arcName} ${shuffleSpeed}ms ease` : undefined,
              }}
            >
              {/* Object beneath the cup */}
              {isBall && (
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                  style={{ width: cupW * 0.72, height: cupW * 0.72, opacity: lifted ? 1 : 0, transition: "opacity 0.2s" }}
                >
                  <Face value={object} size={cupW * 0.64} />
                </div>
              )}

              {/* Cup (top-down) */}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => pick(id)}
                className="absolute inset-0"
                style={{
                  transform: lifted ? "scale(1.25)" : "scale(1)",
                  opacity: lifted ? 0 : 1,
                  transition: "transform 0.3s ease, opacity 0.3s ease",
                  cursor: clickable ? "pointer" : "default",
                }}
              >
                {cupImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cupImage} alt="" className="w-full h-full object-contain pointer-events-none" />
                ) : (
                  <div
                    className="w-full h-full rounded-[50%] pointer-events-none relative"
                    style={{
                      background: `radial-gradient(ellipse at 38% 30%, ${lighten(cupColor, 0.4)}, ${cupColor} 55%, ${darken(cupColor, 0.25)})`,
                      boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.3), 0 4px 8px -2px rgba(0,0,0,0.35)`,
                    }}
                  >
                    {/* rim ring (top-down opening) */}
                    <div
                      className="absolute rounded-[50%]"
                      style={{
                        inset: "14%",
                        background: `radial-gradient(ellipse at 42% 35%, ${lighten(cupColor, 0.15)}, ${darken(cupColor, 0.35)})`,
                        boxShadow: `inset 0 2px 5px rgba(0,0,0,0.5)`,
                      }}
                    />
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {phase === "idle" ? (
        <button onClick={start} className="btn-arcade" style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}>
          {startLabel}
        </button>
      ) : (
        <div className="h-11" />
      )}
    </div>
  );
}
