"use client";
import { useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken, rotateHue, readableText } from "@/lib/games/colors";

const ALLOWED_COUNTS = [3, 6, 9] as const;
type BoxCount = (typeof ALLOWED_COUNTS)[number];

const DEFAULT_DECOYS = ["🎁", "⭐", "💎", "🍫", "🎉", "🍩", "🎈", "🍀", "🧸"];

// A value is either emoji/text or an image URL.
function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function Face({ value, size, color, className }: { value: string; size: number; color?: string; className?: string }) {
  if (isImg(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" className={className} style={{ width: size, height: size, objectFit: "contain" }} />
    );
  }
  return <span className={className} style={{ fontSize: size, lineHeight: 1, color }}>{value}</span>;
}

function parseDecoys(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const arr = (raw as string[]).filter((s) => typeof s === "string" && s.trim());
    if (arr.length) return arr;
  }
  if (typeof raw === "string" && raw.trim())
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return DEFAULT_DECOYS;
}

const IDLE: Record<string, (i: number) => string | undefined> = {
  none:   () => undefined,
  float:  (i) => `float-bob 3s ease-in-out ${i * 0.2}s infinite`,
  pulse:  (i) => `el-pulse 1.8s ease-in-out ${i * 0.15}s infinite`,
  bounce: (i) => `el-bounce 1.4s ease ${i * 0.15}s infinite`,
  swing:  (i) => `el-swing 2.4s ease-in-out ${i * 0.15}s infinite`,
  wiggle: (i) => `el-wiggle 1.6s ease-in-out ${i * 0.15}s infinite`,
};

const REVEAL: Record<string, string> = {
  none:   "",
  pop:    "pop-in 0.5s ease-out",
  tada:   "mem-tada 0.7s ease",
  wobble: "mem-wobble 0.5s ease",
  flash:  "mem-flash 0.6s ease",
  bounce: "el-bounce 0.8s ease",
};

const ENTRANCE: Record<string, (delayMs: number) => string> = {
  none: () => "",
  fade: (d) => `mem-fade-in 0.4s ease ${d}ms both`,
  pop:  (d) => `mem-pop-in 0.45s cubic-bezier(.34,1.56,.64,1) ${d}ms both`,
  zoom: (d) => `mem-zoom-in 0.4s ease ${d}ms both`,
  drop: (d) => `mem-drop-in 0.45s ease ${d}ms both`,
};

// Custom build, no library. Server decides the prize via draw_prize_atomic;
// the box reveal is cosmetic — we flip the chosen gift box, then dim the rest
// showing decoy contents.

export function PickABox({ config, theme, onComplete }: GameProps) {
  const requested = (config?.boxCount as number | undefined) ?? 6;
  const boxCount: BoxCount = (ALLOWED_COUNTS as readonly number[]).includes(requested)
    ? (requested as BoxCount)
    : 6;
  const decoys = parseDecoys(config?.decoys);
  const winSymbol = (config?.winSymbol as string | undefined) ?? null; // shown on the picked box

  // ── Styling / content config ───────────────────────────────────────────────
  const boxSize        = Math.max(80, Math.min(150, (config?.boxSize as number | undefined) ?? 112));
  const instructionTpl        = (config?.instructionText       as string | undefined) ?? "Pick a gift to reveal your prize";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const wrapColorMode  = (config?.wrapColorMode as string | undefined) ?? "rainbow"; // rainbow | solid
  const boxColor       = (config?.boxColor      as string | undefined) ?? null;       // base hue
  const ribbonColorCfg = (config?.ribbonColor   as string | undefined) ?? null;
  const showRibbon     = (config?.showRibbon    as boolean | undefined) ?? true;
  const bowSymbol      = (config?.bowSymbol     as string | undefined) ?? "🎀";
  const showBow        = (config?.showBow       as boolean | undefined) ?? true;
  const boxImage       = (config?.boxImage      as string | undefined) ?? null;
  const revealGlowCfg  = (config?.revealGlowColor as string | undefined) ?? null;

  // ── Animation config ───────────────────────────────────────────────────────
  const idleAnimation     = (config?.idleAnimation     as string | undefined) ?? "float";
  const flipSpeed         = Math.max(200, Math.min(1500, (config?.flipSpeed as number | undefined) ?? 700));
  const revealAnimation   = (config?.revealAnimation   as string | undefined) ?? "pop";
  const entranceAnimation = (config?.entranceAnimation as string | undefined) ?? "none";

  const [picked, setPicked] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const startTs = useRef<number>(0);
  const pal = palette(theme.brandColor, theme.brandFg);
  const baseHue = boxColor ?? pal.brand;
  const glow = revealGlowCfg ?? pal.accent;

  // Per-box wrapping color: rainbow cycles hues, solid keeps one colour.
  const wraps = useMemo(
    () =>
      Array.from({ length: boxCount }).map((_, i) => {
        const c = wrapColorMode === "solid" ? baseHue : rotateHue(baseHue, (i * 40) % 360);
        return {
          top: lighten(c, 0.18),
          bottom: darken(c, 0.18),
          ribbon: ribbonColorCfg ?? lighten(c, 0.5),
        };
      }),
    [boxCount, baseHue, wrapColorMode, ribbonColorCfg],
  );

  // Pre-place the winning symbol inside ONE random box (a real game of chance —
  // you win only if you pick that box). Because it's part of the box contents
  // from the first render, its image is already in the DOM/cache, so the reveal
  // shows the correct image instantly instead of loading it late on flip.
  const { contents, winIndex } = useMemo(() => {
    const pool = decoys.length ? decoys : DEFAULT_DECOYS;
    const arr = Array.from(
      { length: boxCount },
      (_, i) => pool[i % pool.length] || DEFAULT_DECOYS[i % DEFAULT_DECOYS.length],
    );
    let winIdx = -1;
    if (winSymbol) {
      winIdx = Math.floor(Math.random() * boxCount);
      arr[winIdx] = winSymbol;
    }
    return { contents: arr, winIndex: winIdx };
  }, [boxCount, decoys, winSymbol]);

  function pick(i: number) {
    if (picked != null) return;
    if (startTs.current === 0) startTs.current = performance.now();
    setPicked(i);
    setTimeout(() => setRevealAll(true), 900);
    // Win only when the picked box is the one holding the winning symbol.
    const won = winIndex >= 0 ? i === winIndex : undefined;
    const pickedContent = contents[i];
    setTimeout(() => {
      onComplete({
        outcome: `box_${i}`,
        won,
        prizeImage: isImg(pickedContent) ? pickedContent : null,
        durationMs: performance.now() - startTs.current,
      });
    }, 2800);
  }

  const cols = 3;
  const idleFn = IDLE[idleAnimation] ?? IDLE.none;
  const entranceFn = ENTRANCE[entranceAnimation] ?? ENTRANCE.none;

  const instruction = instructionTpl.trim() ? (
    <p
      className="arcade-muted font-semibold text-center"
      style={{
        color: instructionColor ?? undefined,
        fontSize: instructionFontSize,
        fontFamily: instructionFontFamily ?? undefined,
      }}
    >
      {instructionTpl}
    </p>
  ) : null;

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      {instruction}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, ${boxSize}px)`, justifyContent: "center" }}
      >
        {Array.from({ length: boxCount }).map((_, i) => {
          const isPicked = picked === i;
          const flipped = isPicked || revealAll;
          const dimmed = revealAll && !isPicked;
          const w = wraps[i];
          return (
            <div key={i} style={{ animation: entranceFn(i * 55) || undefined }}>
              <button
                type="button"
                onClick={() => pick(i)}
                className="group [perspective:700px] disabled:cursor-default transition-transform"
                style={{
                  height: boxSize,
                  width: boxSize,
                  animation: picked == null ? idleFn(i) : undefined,
                  // Dim unpicked boxes here, NOT on the preserve-3d element below —
                  // a `filter` on that element flattens its 3D context and breaks the flip.
                  filter: dimmed ? "grayscale(0.25)" : "none",
                  opacity: dimmed ? 0.9 : 1,
                  transition: "filter 0.4s ease, opacity 0.4s ease",
                }}
                disabled={picked != null}
                aria-label={`Gift ${i + 1}`}
              >
                <div
                  className="relative h-full w-full [transform-style:preserve-3d]"
                  style={{
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transition: `transform ${flipSpeed}ms`,
                  }}
                >
                  {/* Front: wrapped gift (or custom image) */}
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden [backface-visibility:hidden] transition-transform group-hover:scale-105"
                    style={
                      boxImage
                        ? { background: "transparent" }
                        : {
                            background: `linear-gradient(160deg, ${w.top}, ${w.bottom})`,
                            boxShadow: `0 12px 24px -8px ${darken(w.bottom, 0.3)}, inset 0 2px 4px rgba(255,255,255,0.35)`,
                          }
                    }
                  >
                    {boxImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={boxImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        {showRibbon && (
                          <>
                            <span
                              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4"
                              style={{ background: w.ribbon, opacity: 0.85 }}
                            />
                            <span
                              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-4"
                              style={{ background: w.ribbon, opacity: 0.85 }}
                            />
                          </>
                        )}
                        {showBow && (
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            <Face value={bowSymbol} size={boxSize * 0.21} />
                          </span>
                        )}
                        <span
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(255,255,255,0.4), transparent 45%)",
                          }}
                        />
                      </>
                    )}
                  </div>

                  {/* Back: revealed content */}
                  <div
                    className="absolute inset-0 rounded-2xl flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]"
                    style={{
                      background: isPicked
                        ? `radial-gradient(circle at 50% 40%, ${lighten(glow, 0.4)}, ${pal.light})`
                        : "#ffffff",
                      color: readableText(pal.light),
                      boxShadow: isPicked
                        ? `0 0 24px 2px ${glow}, inset 0 0 0 2px ${glow}`
                        : "inset 0 0 0 1px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ animation: isPicked && REVEAL[revealAnimation] ? REVEAL[revealAnimation] : undefined }}>
                      <Face value={contents[i]} size={boxSize * 0.92} />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
