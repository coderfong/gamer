"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette } from "@/lib/games/colors";

// Catch the Drops — move the catcher to grab the good items and dodge the bad
// ones before time runs out. Server still decides the actual prize; the score
// is skill feedback.

const ARENA_W = 300;
const ARENA_H = 380;

const DEFAULT_GOOD = ["🍎", "⭐", "🍒", "💎", "🎁"];
const DEFAULT_BAD = ["💣", "☠️", "🦴"];

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function Icon({ value, size }: { value: string; size: number }) {
  if (isImg(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}

function parseList(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) {
    const a = (raw as string[]).filter((s) => typeof s === "string" && s.trim());
    if (a.length) return a;
  }
  if (typeof raw === "string" && raw.trim()) return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return fallback;
}

interface Drop {
  id: number; x: number; y: number; vy: number; bad: boolean; sym: string;
  baseX: number;   // anchor for the horizontal sway
  rot: number;     // current rotation (deg)
  vr: number;      // rotation speed (deg/s)
  sway: number;    // sway amplitude (px)
  phase: number;   // sway phase offset
}
interface Effect { id: number; x: number; y: number; text: string; color: string; }

export function CatchDrops({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const gameMs      = Math.max(10, Math.min(90, (config?.gameSeconds as number | undefined) ?? 30)) * 1000;
  const spawnEvery  = Math.max(300, Math.min(2000, (config?.spawnEvery as number | undefined) ?? 850));
  const fallSpeed   = Math.max(60, Math.min(420, (config?.fallSpeed as number | undefined) ?? 150)); // px/s
  const badChance   = Math.max(0, Math.min(0.8, (config?.badChance as number | undefined) ?? 0.3));
  const lives0      = Math.max(1, Math.min(9, (config?.lives as number | undefined) ?? 3));
  // Win threshold: catch at least this many good items.
  const winScore    = Math.max(1, (config?.winScore as number | undefined) ?? 8);
  const goodSyms    = parseList(config?.goodSymbols, DEFAULT_GOOD);
  const badSyms     = parseList(config?.badSymbols, DEFAULT_BAD);
  const objSize     = Math.max(24, Math.min(80, (config?.objectSize as number | undefined) ?? 52));
  const catcherSym  = (config?.catcherSymbol as string | undefined) ?? "🧺";
  const catcherW    = Math.max(48, Math.min(180, (config?.catcherSize as number | undefined) ?? 104));
  const lifeIcon    = (config?.lifeIcon as string | undefined) ?? "❤️";
  const bgColor     = (config?.bgColor as string | undefined) ?? null;
  const bgImage     = (config?.bgImage as string | undefined) ?? null;
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const scoreLabel  = (config?.scoreLabel as string | undefined) ?? "Caught";
  const startLabel  = (config?.startLabel as string | undefined) ?? "START";
  const winText     = (config?.winText  as string | undefined) ?? "Time's up!";
  const loseText    = (config?.loseText as string | undefined) ?? "Game over!";

  const catcherH = catcherW * 0.62;
  const catcherY = ARENA_H - catcherH - 6;

  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [drops, setDrops] = useState<Drop[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(lives0);
  const [left, setLeft] = useState(gameMs);
  const [catcherX, setCatcherX] = useState(ARENA_W / 2);
  const [catchTick, setCatchTick] = useState(0);

  const phaseRef = useRef(phase);
  const dropsRef = useRef<Drop[]>([]);
  const catcherXRef = useRef(ARENA_W / 2);
  const scoreRef = useRef(0);
  const livesRef = useRef(lives0);
  const idRef = useRef(0);
  const spawnAcc = useRef(0);
  const lastT = useRef(0);
  const startTs = useRef(0);
  const raf = useRef<number | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const wonRef = useRef(false);
  phaseRef.current = phase;

  useEffect(() => { setPhase("idle"); setLives(lives0); }, [lives0, gameMs]);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  function finish(won: boolean) {
    if (raf.current) cancelAnimationFrame(raf.current);
    wonRef.current = won;
    setPhase("done");
    setTimeout(() => {
      onComplete({
        score: scoreRef.current,
        outcome: `catch_${scoreRef.current}`,
        won: scoreRef.current >= winScore,
        durationMs: Math.round(performance.now() - startTs.current),
      });
    }, 1200);
  }

  function addEffect(x: number, y: number, text: string, color: string) {
    const id = idRef.current++;
    setEffects((e) => [...e, { id, x, y, text, color }]);
    setTimeout(() => setEffects((e) => e.filter((f) => f.id !== id)), 650);
  }

  function start() {
    if (phase !== "idle") return;
    scoreRef.current = 0; livesRef.current = lives0; dropsRef.current = [];
    setScore(0); setLives(lives0); setDrops([]); setEffects([]);
    setLeft(gameMs);
    startTs.current = performance.now();
    lastT.current = performance.now();
    spawnAcc.current = 0;
    setPhase("play");

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastT.current) / 1000);
      lastT.current = t;

      // spawn
      spawnAcc.current += dt * 1000;
      if (spawnAcc.current >= spawnEvery) {
        spawnAcc.current = 0;
        const bad = Math.random() < badChance;
        const pool = bad ? badSyms : goodSyms;
        const spawnX = objSize / 2 + Math.random() * (ARENA_W - objSize);
        dropsRef.current.push({
          id: idRef.current++,
          x: spawnX,
          baseX: spawnX,
          y: -objSize,
          vy: fallSpeed * (0.85 + Math.random() * 0.4),
          rot: Math.random() * 360,
          vr: (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 200), // deg/s spin
          sway: 6 + Math.random() * 14,
          phase: Math.random() * Math.PI * 2,
          bad,
          sym: pool[Math.floor(Math.random() * pool.length)] ?? (bad ? "💣" : "⭐"),
        });
      }

      // move + catch
      const cx = catcherXRef.current;
      const elapsed = (performance.now() - startTs.current) / 1000;
      const next: Drop[] = [];
      for (const d of dropsRef.current) {
        const y = d.y + d.vy * dt;
        const rot = d.rot + d.vr * dt;
        // gentle horizontal sway around the spawn column as it tumbles down
        const x = Math.max(objSize / 2, Math.min(ARENA_W - objSize / 2, d.baseX + Math.sin(elapsed * 2 + d.phase) * d.sway));
        const inBandY = y + objSize / 2 >= catcherY && y <= catcherY + catcherH;
        const inBandX = Math.abs(x - cx) <= (catcherW + objSize) / 2 - 6;
        if (inBandY && inBandX) {
          if (d.bad) {
            livesRef.current -= 1;
            setLives(livesRef.current);
            addEffect(x, catcherY, "✗", "#ef4444");
          } else {
            scoreRef.current += 1;
            setScore(scoreRef.current);
            addEffect(x, catcherY, "+1", "#22c55e");
          }
          setCatchTick((n) => n + 1);
          continue; // consumed
        }
        if (y > ARENA_H + objSize) continue; // off-screen, drop it
        next.push({ ...d, x, y, rot });
      }
      dropsRef.current = next;
      setDrops([...next]);

      // timer / lives
      const rem = Math.max(0, gameMs - (performance.now() - startTs.current));
      setLeft(rem);
      if (livesRef.current <= 0) { finish(false); return; }
      if (rem <= 0) { finish(true); return; }

      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }

  function moveTo(clientX: number) {
    if (phaseRef.current !== "play" || !arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * ARENA_W;
    const clamped = Math.max(catcherW / 2, Math.min(ARENA_W - catcherW / 2, x));
    catcherXRef.current = clamped;
    setCatcherX(clamped);
  }

  const instructionText =
    phase === "idle" ? "Catch the good ones — dodge the bad!"
    : phase === "done" ? (wonRef.current ? winText : loseText)
    : undefined;

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {instructionText && (
        <p
          className="arcade-muted font-semibold text-center"
          style={{ color: instructionColor ?? undefined, fontSize: instructionFontSize, fontFamily: instructionFontFamily ?? undefined }}
        >
          {instructionText}
        </p>
      )}

      {phase !== "idle" && (
        <div className="flex gap-3 items-stretch">
          <div className="arcade-chip px-4 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-widest arcade-muted">{scoreLabel}</div>
            <div className="arcade-display text-xl leading-none" style={{ color: pal.brand }}>{score}</div>
          </div>
          <div className="arcade-chip px-4 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-widest arcade-muted">Time</div>
            <div className="arcade-display text-xl leading-none">{(left / 1000).toFixed(1)}s</div>
          </div>
          <div className="arcade-chip px-3 py-1.5 text-center flex flex-col justify-center">
            <div className="text-sm leading-none whitespace-nowrap">
              {Array.from({ length: lives }).map((_, i) => <span key={i}>{lifeIcon}</span>)}
            </div>
          </div>
        </div>
      )}

      <div
        ref={arenaRef}
        className="relative overflow-hidden rounded-2xl touch-none select-none"
        style={{
          width: ARENA_W,
          height: ARENA_H,
          background: bgColor ?? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))",
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: bgImage ? "cover" : undefined,
          backgroundPosition: "center",
          boxShadow: "inset 0 2px 12px rgba(0,0,0,0.4)",
          cursor: phase === "play" ? "ew-resize" : "default",
        }}
        onPointerMove={(e) => moveTo(e.clientX)}
        onPointerDown={(e) => moveTo(e.clientX)}
      >
        {/* drops */}
        {drops.map((d) => (
          <div key={d.id} className="absolute flex items-center justify-center"
            style={{ left: d.x - objSize / 2, top: d.y - objSize / 2, width: objSize, height: objSize, transform: `rotate(${d.rot}deg)`, willChange: "transform" }}>
            <Icon value={d.sym} size={objSize} />
          </div>
        ))}

        {/* effects */}
        {effects.map((f) => (
          <div key={f.id} className="absolute font-extrabold pointer-events-none"
            style={{ left: f.x - 10, top: f.y - 28, color: f.color, animation: "mem-drop-in 0.2s ease, mem-fade-in 0.6s ease reverse", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            {f.text}
          </div>
        ))}

        {/* catcher */}
        {phase !== "idle" && (
          <div
            key={`c-${catchTick}`}
            className="absolute flex items-end justify-center"
            style={{ left: catcherX - catcherW / 2, top: catcherY, width: catcherW, height: catcherH, animation: catchTick ? "mem-pop 0.18s ease" : undefined }}
          >
            <Icon value={catcherSym} size={Math.min(catcherW, catcherH * 1.4)} />
          </div>
        )}
      </div>

      {phase === "idle" ? (
        <button onClick={start} className="btn-arcade" style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}>{startLabel}</button>
      ) : (
        <div className="h-11" />
      )}
    </div>
  );
}
