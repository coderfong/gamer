"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { useArcade, useTimer, ArcadeButton, Stage, Readout } from "./arcade/Kit";
import { rotateHue, lighten } from "@/lib/games/colors";

const ARENA_W = 260;
const BH = 26;

interface Block { x: number; w: number; }
interface FallPiece { id: number; x: number; w: number; bottom: number; index: number; rot: number; }

export function StackBlocks({ config, theme, onComplete }: GameProps) {
  const pal = useArcade(theme);
  const timer = useTimer();

  // ── Config ─────────────────────────────────────────────────────────────────
  const baseW       = Math.max(60, Math.min(200, (config?.baseWidth as number | undefined) ?? 120));
  const maxStack    = Math.max(3, Math.min(20, (config?.maxStack as number | undefined) ?? 10));
  // Win threshold: successfully stack at least this many blocks.
  const winStack    = Math.max(2, Math.min(maxStack, (config?.winStack as number | undefined) ?? 8));
  const startSpeed  = Math.max(1, Math.min(16, (config?.startSpeed as number | undefined) ?? 7));
  const speedStep   = Math.max(0, Math.min(3, (config?.speedStep as number | undefined) ?? 1));
  const blockColorMode = (config?.blockColorMode as string | undefined) ?? "rainbow"; // rainbow | solid
  const blockColor  = (config?.blockColor   as string | undefined) ?? pal.brand;
  const movingColor = (config?.movingColor  as string | undefined) ?? pal.accent;
  const arenaColor  = (config?.arenaColor   as string | undefined) ?? null;
  const arenaImage  = (config?.arenaImage   as string | undefined) ?? null;
  const pictureImage = (config?.pictureImage as string | undefined) ?? null;
  const dropAnimation = (config?.dropAnimation as string | undefined) ?? "settle"; // settle | flash | none
  const instructionIdle  = (config?.instructionIdle  as string | undefined) ?? "Tap DROP to stack the blocks, keep them aligned — the higher you stack, the bigger your prize!";
  const instructionPlay  = (config?.instructionPlay  as string | undefined) ?? "Tap DROP to land the block";
  const instructionDone  = (config?.instructionDone  as string | undefined) ?? "Stacked {count}!";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const stackedLabel = (config?.stackedLabel as string | undefined) ?? "Stacked";
  const startLabel   = (config?.startLabel   as string | undefined) ?? "START";
  const dropLabel    = (config?.dropLabel    as string | undefined) ?? "DROP";

  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [placed, setPlaced] = useState<Block[]>([]);
  const [moving, setMoving] = useState<Block>({ x: 0, w: baseW });
  const [justDropped, setJustDropped] = useState(-1);
  const [falling, setFalling] = useState<FallPiece[]>([]);
  const dir = useRef(1);
  const speed = useRef(startSpeed);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallId = useRef(0);

  // The picture (if set) is shown as the arena backdrop; the blocks sit in front
  // of it as plain solid-coloured blocks. Falls back to the separate arena image.
  const bgImg = pictureImage ?? arenaImage;

  function spawnFalling(pieces: Omit<FallPiece, "id">[]) {
    if (!pieces.length) return;
    const withIds = pieces.map((p) => ({ ...p, id: fallId.current++ }));
    setFalling((f) => [...f, ...withIds]);
    const ids = withIds.map((p) => p.id);
    setTimeout(() => setFalling((f) => f.filter((p) => !ids.includes(p.id))), 800);
  }

  function startMoving(w: number) {
    setMoving({ x: 0, w });
    dir.current = 1;
    if (iv.current) clearInterval(iv.current);
    iv.current = setInterval(() => {
      setMoving((m) => {
        let nx = m.x + dir.current * speed.current;
        if (nx <= 0) { nx = 0; dir.current = 1; }
        if (nx >= ARENA_W - m.w) { nx = ARENA_W - m.w; dir.current = -1; }
        return { ...m, x: nx };
      });
    }, 16);
  }

  function start() {
    setPhase("play");
    timer.reset();
    speed.current = startSpeed;
    setFalling([]);
    setPlaced([{ x: (ARENA_W - baseW) / 2, w: baseW }]);
    startMoving(baseW);
  }

  function finish(stack: number) {
    if (iv.current) clearInterval(iv.current);
    setPhase("done");
    onComplete({ score: stack, outcome: `stack_${stack}`, won: stack >= winStack, durationMs: timer.elapsed() });
  }

  function drop() {
    if (phase !== "play") return;
    const idx = placed.length;       // index this block lands at
    const bottomPx = idx * BH;       // its vertical level
    const top = placed[placed.length - 1];
    const left = Math.max(moving.x, top.x);
    const right = Math.min(moving.x + moving.w, top.x + top.w);
    const overlap = right - left;

    if (overlap <= 0) {
      // Total miss — the whole block tumbles off.
      spawnFalling([{ x: moving.x, w: moving.w, bottom: bottomPx, index: idx, rot: moving.x < ARENA_W / 2 ? -30 : 30 }]);
      finish(placed.length - 1);
      return;
    }

    // Trimmed overhang on either side breaks off and falls.
    const slivers: Omit<FallPiece, "id">[] = [];
    if (moving.x < left) {
      slivers.push({ x: moving.x, w: left - moving.x, bottom: bottomPx, index: idx, rot: -28 });
    }
    if (moving.x + moving.w > right) {
      slivers.push({ x: right, w: moving.x + moving.w - right, bottom: bottomPx, index: idx, rot: 28 });
    }
    spawnFalling(slivers);

    const next = [...placed, { x: left, w: overlap }];
    setPlaced(next);
    setJustDropped(next.length - 1);
    if (next.length - 1 >= maxStack) {
      finish(next.length - 1);
      return;
    }
    speed.current += speedStep;
    startMoving(overlap);
  }

  useEffect(() => () => { if (iv.current) clearInterval(iv.current); }, []);

  const stackCount = placed.length - 1;

  function blockBg(i: number) {
    const base = blockColorMode === "solid" ? blockColor : rotateHue(blockColor, i * 18);
    return `linear-gradient(180deg, ${lighten(base, 0.2)}, ${base})`;
  }

  const dropAnim =
    dropAnimation === "flash" ? "mem-flash 0.3s ease"
    : dropAnimation === "settle" ? "mem-pop 0.25s ease"
    : undefined;

  const instructionText =
    phase === "idle" ? instructionIdle
    : phase === "done" ? instructionDone.replace(/\{count\}/gi, String(stackCount))
    : instructionPlay;

  return (
    <Stage
      instruction={
        instructionText.trim() ? (
          <span
            style={{
              color: instructionColor ?? undefined,
              fontSize: instructionFontSize,
              fontFamily: instructionFontFamily ?? undefined,
            }}
          >
            {instructionText}
          </span>
        ) : undefined
      }
    >
      {phase !== "idle" ? <Readout label={stackedLabel} value={stackCount} /> : null}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          width: ARENA_W,
          height: (maxStack + 2) * BH,
          background: arenaColor ?? "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.35))",
          backgroundImage: bgImg ? `url(${bgImg})` : undefined,
          backgroundSize: bgImg ? "cover" : undefined,
          backgroundPosition: bgImg ? "center" : undefined,
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
        }}
      >
        {placed.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: b.x,
              bottom: i * BH,
              width: b.w,
              height: BH - 2,
              background: blockBg(i),
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 1px rgba(0,0,0,0.12)",
              animation: i === justDropped ? dropAnim : undefined,
            }}
          />
        ))}
        {phase === "play" ? (
          <div
            className="absolute rounded-sm"
            style={{
              left: moving.x,
              bottom: placed.length * BH,
              width: moving.w,
              height: BH - 2,
              background: `linear-gradient(180deg, ${lighten(movingColor, 0.25)}, ${movingColor})`,
              boxShadow: `0 0 12px 1px ${movingColor}`,
            }}
          />
        ) : null}
        {/* Trimmed overhang tumbling off */}
        {falling.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm"
            style={{
              left: p.x,
              bottom: p.bottom,
              width: p.w,
              height: BH - 2,
              background: blockBg(p.index),
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
              animation: "block-fall 0.8s ease-in forwards",
              ["--fall-rot" as string]: `${p.rot}deg`,
            }}
          />
        ))}
      </div>
      {phase === "idle" ? <ArcadeButton onClick={start} pulse>{startLabel}</ArcadeButton> : null}
      {phase === "play" ? <ArcadeButton onClick={drop}>{dropLabel}</ArcadeButton> : null}
    </Stage>
  );
}
