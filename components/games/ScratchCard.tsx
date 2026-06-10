"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken } from "@/lib/games/colors";

const DEFAULT_WIN_SYM = "⭐";
const DEFAULT_OTHERS  = ["🍋", "🔔", "🍒", "💎"];

// ── Helpers ──────────────────────────────────────────────────────────────────

// A "symbol" is either emoji/text or an image URL. Detect the latter.
function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function SymbolView({ symbol, size }: { symbol: string; size: number }) {
  if (isImg(symbol)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={symbol}
        alt=""
        style={{ width: size, height: size, objectFit: "contain", display: "inline-block", verticalAlign: "middle" }}
      />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{symbol}</span>;
}

function parseSymbols(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw))
    return (raw as string[]).filter((s) => typeof s === "string" && s.trim());
  if (typeof raw === "string" && raw.trim())
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return fallback;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSymbols(total: number, winCount: number, winSym: string, others: string[]): string[] {
  const pool = others.length ? others : ["💎"];
  // 45 % chance of a cosmetic visual win; real prize always comes from backend
  const visualWin = Math.random() < 0.45;
  const wins = visualWin ? winCount : Math.max(0, winCount - 1);
  const arr: string[] = [
    ...Array(Math.min(wins, total)).fill(winSym),
    ...Array(Math.max(0, total - wins))
      .fill(null)
      .map(() => pool[Math.floor(Math.random() * pool.length)]),
  ];
  return shuffle(arr);
}

// ── Canvas cover drawing ─────────────────────────────────────────────────────

function drawCover(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  fg: string,
  text: string,
) {
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, lighten(color, 0.22));
  g.addColorStop(1, darken(color, 0.22));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // diagonal sheen band
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-0.4);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(-size, -size * 0.12, size * 2, size * 0.24);
  ctx.restore();

  // dot grid
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let y = 8; y < size; y += 16)
    for (let x = 8; x < size; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

  // cover text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  ctx.font = `900 ${Math.round(size * 0.38)}px system-ui,sans-serif`;
  ctx.fillText(text.slice(0, 4), size / 2, size / 2);
}

// ── Container CSS shape ──────────────────────────────────────────────────────

function shapeCSS(shape: string): React.CSSProperties {
  switch (shape) {
    case "circle":  return { borderRadius: "50%", overflow: "hidden" };
    case "square":  return { borderRadius: 5,     overflow: "hidden" };
    case "diamond": return { clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)" };
    case "hexagon": return { clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" };
    default:        return { borderRadius: 18,    overflow: "hidden" }; // "rounded"
  }
}

// ── Main component ───────────────────────────────────────────────────────────

export function ScratchCard({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  const cols         = Math.max(1, Math.min(3, (config.gridCols       as number | undefined) ?? 3));
  const rows         = Math.max(1, Math.min(3, (config.gridRows       as number | undefined) ?? 1));
  const total        = cols * rows;
  const shape        = (config.scratchShape   as string | undefined) ?? "rounded";
  const boxSize      = Math.max(60, Math.min(150, (config.boxSize     as number | undefined) ?? 100));
  const brushRadius  = Math.max(10, Math.min(60,  (config.brushRadius as number | undefined) ?? 28));
  const pctThreshold = Math.max(20, Math.min(90,  (config.percentToReveal as number | undefined) ?? 55));
  const winSymbol    = (config.winSymbol      as string | undefined) ?? DEFAULT_WIN_SYM;
  const otherSymbols = parseSymbols(config.otherSymbols, DEFAULT_OTHERS);
  const winCount     = Math.max(1, Math.min(total, (config.winCount   as number | undefined) ?? Math.ceil(total / 2)));
  const coverImage   = (config.coverImage     as string | undefined) ?? null;
  const coverText    = (config.coverText      as string | undefined) ?? "?";
  const instructionTpl = (config.instructionText as string | undefined) ?? "Match {count}× {symbol} to win!";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 14;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? null;

  // Build instruction nodes so {symbol} can render an image inline.
  const instructionNodes = (() => {
    const withCount = instructionTpl.replace(/\{count\}/gi, String(winCount));
    const parts = withCount.split(/\{symbol\}/i);
    const sz = instructionFontSize * 1.2;
    return parts.flatMap((part, i) =>
      i === 0
        ? [<span key={`t${i}`}>{part}</span>]
        : [<SymbolView key={`s${i}`} symbol={winSymbol} size={sz} />, <span key={`t${i}`}>{part}</span>],
    );
  })();
  const hasInstruction = instructionTpl.replace(/\{count\}|\{symbol\}/gi, "").trim().length > 0 || isImg(winSymbol);

  // Regenerate symbols when grid/win config changes; stable during a live session.
  // First render is DETERMINISTIC (ordered) so SSR and client match; we shuffle
  // after mount to avoid a hydration mismatch.
  const symbolKey = `${total}-${winCount}-${winSymbol}`;
  const orderedSymbols = useMemo(() => {
    const pool = otherSymbols.length ? otherSymbols : ["💎"];
    return Array.from({ length: total }, (_, i) => (i < winCount ? winSymbol : pool[i % pool.length]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey]);
  const [symbols, setSymbols] = useState<string[]>(orderedSymbols);
  useEffect(() => {
    setSymbols(generateSymbols(total, winCount, winSymbol, otherSymbols));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey]);

  const [revealedBoxes, setRevealedBoxes] = useState<boolean[]>(() => Array(total).fill(false));
  const startTs  = useRef(performance.now());
  const firedRef = useRef(false);

  // Reset when grid or symbols change (editor preview updates)
  useEffect(() => {
    setRevealedBoxes(Array(total).fill(false));
    firedRef.current = false;
    startTs.current  = performance.now();
  }, [total, symbolKey]);

  const revealedCount = revealedBoxes.filter(Boolean).length;
  const allRevealed   = revealedCount === total;
  const matchCount    = revealedBoxes.reduce((n, v, i) => n + (v && symbols[i] === winSymbol ? 1 : 0), 0);
  const visuallyWon   = allRevealed && matchCount >= winCount;

  const handleBoxRevealed = useCallback(
    (idx: number) => {
      setRevealedBoxes((prev) => {
        const next = [...prev];
        next[idx] = true;
        if (next.every(Boolean) && !firedRef.current) {
          firedRef.current = true;
          setTimeout(
            () =>
              onComplete({
                outcome: "scratched",
                durationMs: Math.round(performance.now() - startTs.current),
              }),
            800,
          );
        }
        return next;
      });
    },
    [onComplete],
  );

  const gap = Math.max(6, Math.round(boxSize * 0.1));

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {hasInstruction && (
        <p
          className="arcade-muted font-semibold text-center flex items-center justify-center gap-1 flex-wrap"
          style={{
            color: instructionColor ?? undefined,
            fontSize: instructionFontSize,
            fontFamily: instructionFontFamily ?? undefined,
          }}
        >
          {instructionNodes}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${boxSize}px)`,
          gap,
        }}
      >
        {symbols.map((symbol, i) => (
          <ScratchBox
            key={`${symbolKey}-${i}`}
            symbol={symbol}
            isWinSymbol={symbol === winSymbol}
            shape={shape}
            size={boxSize}
            brushRadius={brushRadius}
            pctThreshold={pctThreshold}
            coverImage={coverImage}
            coverText={coverText}
            coverColor={pal.brand}
            coverFg={pal.fg}
            accentLight={pal.light}
            onRevealed={() => handleBoxRevealed(i)}
          />
        ))}
      </div>

      {allRevealed ? (
        <div
          className="rounded-xl px-5 py-2.5 text-center text-sm font-bold"
          style={{
            background: visuallyWon ? pal.brand : lighten(pal.dark, 0.55),
            color: visuallyWon ? pal.fg : "#444",
          }}
        >
          <span className="inline-flex items-center justify-center gap-1 flex-wrap">
            {visuallyWon ? "🎉 " : ""}
            {matchCount}× <SymbolView symbol={winSymbol} size={instructionFontSize * 1.2} />
            {visuallyWon ? " — revealing your prize…" : " — better luck next time!"}
          </span>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 text-center">
          {revealedCount === 0
            ? "Scratch each panel to reveal"
            : `${revealedCount} of ${total} revealed — keep going!`}
        </p>
      )}
    </div>
  );
}

// ── Per-panel scratch box ────────────────────────────────────────────────────

interface BoxProps {
  symbol: string;
  isWinSymbol: boolean;
  shape: string;
  size: number;
  brushRadius: number;
  pctThreshold: number;
  coverImage: string | null;
  coverText: string;
  coverColor: string;
  coverFg: string;
  accentLight: string;
  onRevealed: () => void;
}

function ScratchBox({
  symbol, isWinSymbol, shape, size, brushRadius, pctThreshold,
  coverImage, coverText, coverColor, coverFg, accentLight, onRevealed,
}: BoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const drawing  = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    if (coverImage) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload  = () => { ctx.drawImage(img, 0, 0, size, size); };
      img.onerror = () => drawCover(ctx, size, coverColor, coverFg, coverText);
      img.src = coverImage;
    } else {
      drawCover(ctx, size, coverColor, coverFg, coverText);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, coverColor, coverFg, coverText, coverImage]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (size / rect.width),
      y: (e.clientY - rect.top)  * (size / rect.height),
    };
  }

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (revealed || !drawing.current || firedRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // Sample every 5th pixel's alpha (step 20 = 5 RGBA × 4 bytes)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0, sampled = 0;
    for (let i = 3; i < data.length; i += 20) {
      sampled++;
      if (data[i] < 128) transparent++;
    }
    if (sampled > 0 && transparent / sampled >= pctThreshold / 100) {
      firedRef.current = true;
      setRevealed(true);
      onRevealed();
    }
  }

  return (
    <div style={{ position: "relative", width: size, height: size, ...shapeCSS(shape) }}>
      {/* Symbol shown beneath canvas */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 2,
          background:
            isWinSymbol && revealed
              ? `linear-gradient(135deg, ${lighten(accentLight, 0.1)}, ${accentLight})`
              : `linear-gradient(135deg, #fff8, ${lighten(accentLight, 0.55)})`,
        }}
      >
        <SymbolView symbol={symbol} size={size * (isImg(symbol) ? 0.6 : 0.42)} />
        {revealed && isWinSymbol && (
          <span
            style={{
              fontSize: Math.max(9, size * 0.14),
              fontWeight: 900,
              letterSpacing: 1,
              color: darken(accentLight, 0.5),
              textTransform: "uppercase",
            }}
          >
            WIN
          </span>
        )}
      </div>

      {/* Scratch canvas — unmounts when revealed so no dangling refs */}
      {!revealed && (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute", inset: 0,
            width: size, height: size,
            touchAction: "none", cursor: "crosshair", display: "block",
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            scratch(e);
          }}
          onPointerMove={scratch}
          onPointerUp={() => { drawing.current = false; }}
          onPointerCancel={() => { drawing.current = false; }}
        />
      )}
    </div>
  );
}
