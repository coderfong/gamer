"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken, rotateHue } from "@/lib/games/colors";

// Plinko — aim the oscillating launcher, drop the ball, watch it bounce through
// the pegs into a slot. Server still decides the actual prize; the slot is
// cosmetic / fun feedback.

const BOARD_W = 312;

function parseLabels(raw: unknown): string[] {
  if (Array.isArray(raw)) return (raw as string[]).map((s) => String(s ?? ""));
  if (typeof raw === "string" && raw.trim()) return raw.split(",").map((s) => s.trim());
  return [];
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function Plinko({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const rows        = Math.max(4, Math.min(9, (config?.rows as number | undefined) ?? 7));
  const hopMs       = Math.max(120, Math.min(700, (config?.dropSpeed as number | undefined) ?? 320));
  const shooterSpd  = Math.max(40, Math.min(360, (config?.shooterSpeed as number | undefined) ?? 240));
  const pegColor    = (config?.pegColor   as string | undefined) ?? lighten(pal.brand, 0.3);
  const boardColor  = (config?.boardColor as string | undefined) ?? darken(pal.dark, 0.1);
  const boardImage  = (config?.boardImage as string | undefined) ?? null;
  // Board background image size, adjustable independently (percent of board).
  const boardImageW = Math.max(20, Math.min(300, (config?.boardImageW as number | undefined) ?? 100));
  const boardImageH = Math.max(20, Math.min(300, (config?.boardImageH as number | undefined) ?? 100));
  const ballColor   = (config?.ballColor  as string | undefined) ?? pal.accent;
  const ballImage   = (config?.ballImage  as string | undefined) ?? null;
  const ballSize    = Math.max(14, Math.min(34, (config?.ballSize as number | undefined) ?? 22));
  const slotColorMode = (config?.slotColorMode as string | undefined) ?? "rainbow";
  const slotBaseColor = (config?.slotColor as string | undefined) ?? pal.brand;
  const slotLabels  = parseLabels(config?.slotLabels);
  const shooterSymbol = (config?.shooterSymbol as string | undefined) ?? "";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const dropLabel   = (config?.dropLabel as string | undefined) ?? "DROP";
  const goalTpl     = (config?.goalText as string | undefined) ?? "Land on {goal} to win!";
  const winText     = (config?.winText  as string | undefined) ?? "🎉 You hit the goal!";
  const loseText    = (config?.loseText as string | undefined) ?? "So close — try again!";

  const slotCount = rows + 1;
  // Goal slot the ball must land in to win (1-based; defaults to the centre).
  const goalIndex = Math.max(0, Math.min(rows, ((config?.goalSlot as number | undefined) ?? Math.ceil((rows + 1) / 2)) - 1));
  const slotW = BOARD_W / slotCount;
  const topY = 32;
  const rowH = 32;
  const slotH = 48;
  const boardH = topY + rows * rowH + slotH + 12;
  const minX = ballSize / 2 + 4;
  const maxX = BOARD_W - ballSize / 2 - 4;

  const [phase, setPhase] = useState<"idle" | "drop" | "done">("idle");
  const [shooterX, setShooterX] = useState(BOARD_W / 2);
  const [ball, setBall] = useState({ x: BOARD_W / 2, y: -ballSize, sx: 1, sy: 1 });
  const [landed, setLanded] = useState<number | null>(null);

  const phaseRef = useRef(phase);
  const shooterXRef = useRef(BOARD_W / 2);
  const shooterDir = useRef(1);
  const pathRef = useRef<number[]>([]);
  const hopRef = useRef(0);
  const hopStart = useRef(0);
  const lastT = useRef(0);
  const raf = useRef<number | null>(null);
  const startTs = useRef(0);
  phaseRef.current = phase;

  useEffect(() => { setPhase("idle"); setLanded(null); setBall({ x: BOARD_W / 2, y: -ballSize, sx: 1, sy: 1 }); }, [rows, ballSize]);

  useEffect(() => {
    lastT.current = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastT.current) / 1000);
      lastT.current = t;

      if (phaseRef.current === "idle") {
        let nx = shooterXRef.current + shooterDir.current * shooterSpd * dt;
        if (nx <= minX) { nx = minX; shooterDir.current = 1; }
        if (nx >= maxX) { nx = maxX; shooterDir.current = -1; }
        shooterXRef.current = nx;
        setShooterX(nx);
        setBall((b) => ({ ...b, x: nx, y: -ballSize }));
      } else if (phaseRef.current === "drop") {
        animateDrop(t);
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shooterSpd, rows, ballSize, hopMs]);

  function rowYof(r: number) { return topY + r * rowH; }

  function drop() {
    if (phase !== "idle") return;
    startTs.current = performance.now();
    // Build the bounce path. Entry gets a small random jitter around the launcher
    // so a perfect aim alone can't lock in the goal slot (harder to win).
    const entry = Math.max(minX, Math.min(maxX, shooterXRef.current + (Math.random() - 0.5) * slotW * 1.2));
    const path: number[] = [entry];
    for (let r = 1; r <= rows; r++) {
      let x = path[r - 1] + (Math.random() < 0.5 ? -slotW / 2 : slotW / 2);
      x = Math.max(minX, Math.min(maxX, x));
      path.push(x);
    }
    pathRef.current = path;
    const slot = Math.max(0, Math.min(slotCount - 1, Math.floor(path[rows] / slotW)));
    setLanded(slot);
    hopRef.current = 0;
    hopStart.current = performance.now();
    setPhase("drop");
  }

  function animateDrop(t: number) {
    const path = pathRef.current;
    const totalHops = rows + 1; // last hop drops into the slot
    const f = Math.min(1, (t - hopStart.current) / hopMs);
    const r = hopRef.current;

    const fromX = path[Math.min(r, rows)];
    const toX = path[Math.min(r + 1, rows)];
    const fromY = rowYof(Math.min(r, rows));
    const toY = r >= rows ? boardH - slotH / 2 : rowYof(r + 1);

    const x = fromX + (toX - fromX) * easeInOut(f);
    const bounceH = r >= rows ? 0 : rowH * 0.55;
    const y = fromY + (toY - fromY) * f - bounceH * Math.sin(Math.PI * f);

    // squash on peg contact (start of each hop)
    const sq = Math.max(0, 1 - f * 3.5);
    setBall({ x, y, sx: 1 + 0.28 * sq, sy: 1 - 0.28 * sq });

    if (f >= 1) {
      hopRef.current += 1;
      hopStart.current = t;
      if (hopRef.current >= totalHops) {
        setBall({ x: toX, y: toY, sx: 1, sy: 1 });
        setPhase("done");
        const slot = landed ?? 0;
        const didWin = slot === goalIndex;
        setTimeout(() => {
          onComplete({
            outcome: didWin ? "plinko_win" : `plinko_miss_${slot}`,
            score: didWin ? 1 : 0,
            won: didWin,
            durationMs: Math.round(performance.now() - startTs.current),
          });
        }, 700);
      }
    }
  }

  const labelFor = (i: number) => (slotLabels.length ? slotLabels[i % slotLabels.length] || `${i + 1}` : `${i + 1}`);
  const won = phase === "done" && landed === goalIndex;
  const instructionText =
    phase === "done" && landed != null ? (won ? winText : loseText)
    // Keep the goal prompt visible while aiming AND while the ball is dropping.
    : goalTpl.replace(/\{goal\}/gi, labelFor(goalIndex));

  const slotColor = (i: number) => (slotColorMode === "solid" ? slotBaseColor : rotateHue(slotBaseColor, (i * 40) % 360));

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {instructionText && (
        <p
          className="arcade-muted font-semibold text-center"
          style={{ color: instructionColor ?? undefined, fontSize: instructionFontSize, fontFamily: instructionFontFamily ?? undefined }}
        >
          {instructionText}
        </p>
      )}

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          width: BOARD_W,
          height: boardH,
          // With a board image the default colour/vignette are dropped so only
          // the image shows (transparent areas reveal the screen background).
          // Use the backgroundColor longhand (not the `background` shorthand): the
          // shorthand resets background-position on re-render, which left-anchored
          // the image so the width slider only ever grew it rightward.
          backgroundColor: boardImage ? "transparent" : boardColor,
          backgroundImage: boardImage ? `url(${boardImage})` : undefined,
          // Background size is driven by the editor's width/height sliders so it
          // can be tuned independently (default 100% × 100% = fill the board).
          backgroundSize: boardImage ? `${boardImageW}% ${boardImageH}%` : undefined,
          // Centre horizontally so the width slider extends the image both ways
          // from the centre; anchor to the top so the height slider extends it
          // downward and never crops the top of the board art.
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          boxShadow: boardImage ? "none" : "inset 0 2px 12px rgba(0,0,0,0.45)",
        }}
      >
        {/* launcher */}
        <div
          className="absolute flex items-center justify-center"
          style={{ left: shooterX - 16, top: 2, width: 32, height: 24, transition: phase === "idle" ? "none" : "opacity 0.3s", opacity: phase === "done" ? 0.3 : 1 }}
        >
          {shooterSymbol ? (
            isImg(shooterSymbol)
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={shooterSymbol} alt="" style={{ width: 28, height: 24, objectFit: "contain" }} />
              : <span style={{ fontSize: 20, lineHeight: 1 }}>{shooterSymbol}</span>
          ) : (
            <div style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `13px solid ${ballColor}`, filter: `drop-shadow(0 0 4px ${ballColor}aa)` }} />
          )}
        </div>

        {/* pegs (staggered) */}
        {Array.from({ length: rows }).map((_, r) => {
          const offset = r % 2 === 0 ? slotW : slotW / 2;
          const pegY = rowYof(r) + rowH / 2;
          const pegs: React.ReactNode[] = [];
          for (let x = offset; x < BOARD_W - 4; x += slotW) {
            pegs.push(
              <div key={`${r}-${x}`} className="absolute rounded-full"
                style={{ left: x - 3, top: pegY - 3, width: 6, height: 6, background: pegColor, boxShadow: `0 0 4px ${pegColor}88` }} />,
            );
          }
          return pegs;
        })}

        {/* slots */}
        <div className="absolute left-0 right-0 flex" style={{ bottom: 0, height: slotH }}>
          {Array.from({ length: slotCount }).map((_, i) => {
            const c = slotColor(i);
            const isLanded = phase === "done" && landed === i;
            const isGoal = i === goalIndex;
            return (
              <div
                key={i}
                className="relative flex items-end justify-center pb-1 text-center"
                style={{
                  width: slotW, height: "100%",
                  background: `linear-gradient(180deg, ${lighten(c, 0.1)}, ${darken(c, 0.2)})`,
                  borderLeft: i === 0 ? undefined : "1px solid rgba(0,0,0,0.25)",
                  boxShadow: isLanded
                    ? `inset 0 0 0 2px #fff, 0 0 14px 2px ${c}`
                    : isGoal
                    ? "inset 0 0 0 2px #fde047, 0 0 12px 1px #fde04788"
                    : "inset 0 2px 4px rgba(0,0,0,0.3)",
                  transform: isLanded ? "translateY(-2px)" : undefined,
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                {/* goal marker so the player can see the target slot */}
                {isGoal && (
                  <span className="absolute left-1/2 -translate-x-1/2" style={{ top: -16, fontSize: 14, lineHeight: 1, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }}>
                    🎯
                  </span>
                )}
                <span style={{ fontSize: Math.min(18, slotW * 0.44), fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.5)", lineHeight: 1, whiteSpace: "nowrap" }}>
                  {labelFor(i)}
                </span>
              </div>
            );
          })}
        </div>

        {/* ball */}
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            left: ball.x - ballSize / 2,
            top: ball.y - ballSize / 2,
            width: ballSize,
            height: ballSize,
            transform: `scale(${ball.sx}, ${ball.sy})`,
            background: ballImage ? "transparent" : `radial-gradient(circle at 36% 30%, ${lighten(ballColor, 0.5)}, ${ballColor})`,
            boxShadow: ballImage ? "none" : `0 0 10px 1px ${ballColor}aa`,
            zIndex: 5,
          }}
        >
          {ballImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ballImage} alt="" className="w-full h-full object-contain" />
          )}
        </div>
      </div>

      {phase === "idle" ? (
        <button onClick={drop} className="btn-arcade" style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}>
          {dropLabel}
        </button>
      ) : (
        <div className="h-11" />
      )}
    </div>
  );
}

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}
