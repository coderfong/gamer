"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken } from "@/lib/games/colors";

// Pin Drop (AA-style) — shoot pins into a spinning core. Each pin sticks at the
// bottom-facing angle; if it lands too close to an existing pin you lose a life.
// Place the target number of pins to win. Server still decides the prize.

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function Icon({ value, size }: { value: string; size: number }) {
  if (isImg(value)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}

function angDist(a: number, b: number) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

export function PinDrop({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);

  // ── Config ─────────────────────────────────────────────────────────────────
  const spinSpeed0  = Math.max(20, Math.min(360, (config?.spinSpeed as number | undefined) ?? 90)); // deg/s
  const speedUp     = Math.max(1, Math.min(1.4, (config?.speedUp as number | undefined) ?? 1.06));
  const dirCw       = (config?.spinClockwise as boolean | undefined) ?? true;
  const targetPins  = Math.max(3, Math.min(30, (config?.targetPins as number | undefined) ?? 10));
  const startPins   = Math.max(0, Math.min(8, (config?.startingPins as number | undefined) ?? 1));
  const tolerance   = Math.max(6, Math.min(40, (config?.tolerance as number | undefined) ?? 15)); // degrees
  const lives0      = Math.max(1, Math.min(9, (config?.lives as number | undefined) ?? 3));
  const coreSize    = Math.max(36, Math.min(100, (config?.coreSize as number | undefined) ?? 72)); // radius
  const coreColor   = (config?.coreColor as string | undefined) ?? pal.brand;
  const coreSymbol  = (config?.coreSymbol as string | undefined) ?? "";
  const pinColor    = (config?.pinColor as string | undefined) ?? lighten(pal.dark, 0.4);
  const pinThick    = Math.max(2, Math.min(8, (config?.pinThickness as number | undefined) ?? 4));
  const pinHead     = (config?.pinHead as string | undefined) ?? "";
  const pinHeadSize = Math.max(8, Math.min(80, (config?.pinHeadSize as number | undefined) ?? 28)); // head diameter px
  const pinHeadIsImg = isImg(pinHead);
  const bgColor     = (config?.bgColor as string | undefined) ?? null;
  const lifeIcon    = (config?.lifeIcon as string | undefined) ?? "❤️";
  const instructionColor      = (config?.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (config?.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config?.instructionFontFamily as string | undefined) ?? null;
  const shootLabel  = (config?.shootLabel as string | undefined) ?? "SHOOT";
  const startLabel  = (config?.startLabel as string | undefined) ?? "START";
  const winText     = (config?.winText  as string | undefined) ?? "All pinned! 🎯";
  const loseText    = (config?.loseText as string | undefined) ?? "Crash! Out of lives.";

  // Keep a constant length of stem visible between the core edge and the head,
  // whatever the head size, so the head always reads as fixed to the pin body.
  const STEM_GAP = 34;
  const needleLen = coreSize + STEM_GAP + Math.round(pinHeadSize / 2);
  // Extra room below the core so the waiting pin launches from a distance.
  const LAUNCH_GAP = 130;
  // Size the arena to the full reach (needle tip + the half-head beyond it) so a
  // large head never clips the edge, plus the launch gap for the shooting room.
  const arenaW = Math.round((needleLen + pinHeadSize / 2) * 2 + 24 + LAUNCH_GAP);
  const cx = arenaW / 2;
  const cy = arenaW / 2;

  // A pin head subtends this many degrees at the ring where heads sit. Folding
  // it into the collision threshold means two heads can never visually overlap,
  // and the game gets harder as the head grows (wider forbidden gap per pin).
  const headAngle = (pinHeadSize / needleLen) * (180 / Math.PI);
  const effTol = Math.max(tolerance, headAngle);

  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [rot, setRot] = useState(0);
  const [pins, setPins] = useState<number[]>([]);   // local angles on the core
  const [placed, setPlaced] = useState(0);
  const [lives, setLives] = useState(lives0);
  const [flying, setFlying] = useState(false);
  const [shake, setShake] = useState(0);
  const [wonState, setWonState] = useState(false);
  const [popping, setPopping] = useState(false);

  const phaseRef = useRef(phase);
  const rotRef = useRef(0);
  const speedRef = useRef(spinSpeed0);
  const pinsRef = useRef<number[]>([]);
  const placedRef = useRef(0);
  const livesRef = useRef(lives0);
  const busy = useRef(false);
  const lastT = useRef(0);
  const raf = useRef<number | null>(null);
  const startTs = useRef(0);
  phaseRef.current = phase;

  useEffect(() => { setPhase("idle"); setLives(lives0); }, [lives0, targetPins, startPins]);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  function makeStartPins(): number[] {
    const arr: number[] = [];
    let guard = 0;
    while (arr.length < startPins && guard < 200) {
      guard++;
      const a = Math.random() * 360;
      if (arr.every((p) => angDist(p, a) > effTol * 1.5)) arr.push(a);
    }
    return arr;
  }

  function finish(won: boolean) {
    if (raf.current) cancelAnimationFrame(raf.current);
    setWonState(won);
    setPhase("done");
    setTimeout(() => {
      onComplete({
        score: placedRef.current,
        outcome: won ? `pindrop_win_${placedRef.current}` : `pindrop_fail_${placedRef.current}`,
        durationMs: Math.round(performance.now() - startTs.current),
      });
    }, 1300);
  }

  function start() {
    if (phase !== "idle") return;
    startTs.current = performance.now();
    rotRef.current = 0; speedRef.current = spinSpeed0;
    pinsRef.current = makeStartPins(); placedRef.current = 0; livesRef.current = lives0;
    busy.current = false;
    setRot(0); setPins([...pinsRef.current]); setPlaced(0); setLives(lives0);
    setPhase("play");
    lastT.current = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastT.current) / 1000);
      lastT.current = t;
      rotRef.current += (dirCw ? 1 : -1) * speedRef.current * dt;
      setRot(rotRef.current);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }

  function shoot() {
    if (phase !== "play" || busy.current) return;
    busy.current = true;
    setFlying(true);

    // Resolve the hit at the moment of IMPACT, not button-press: the pin enters
    // from the bottom of the arena (6 o'clock) and sticks to the core wherever
    // its bottom edge has rotated to when the pin arrives — a true projectile.
    setTimeout(() => {
      setFlying(false);
      const local = (((90 - rotRef.current) % 360) + 360) % 360;
      const collide = pinsRef.current.some((p) => angDist(p, local) <= effTol);

      if (collide) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        setShake((s) => s + 1);
        if (livesRef.current <= 0) { finish(false); return; }
      } else {
        pinsRef.current = [...pinsRef.current, local];
        placedRef.current += 1;
        speedRef.current *= speedUp;
        setPins([...pinsRef.current]);
        setPlaced(placedRef.current);
        // brief impact "thunk" on the core
        setPopping(true);
        setTimeout(() => setPopping(false), 150);
        if (placedRef.current >= targetPins) { finish(true); return; }
      }
      busy.current = false;
    }, 100);
  }

  const instructionText =
    phase === "idle" ? "Shoot pins into the core — don't hit another pin!"
    : phase === "done" ? (wonState ? winText : loseText)
    : undefined;

  function Needle({ angle, faded }: { angle: number; faded?: boolean }) {
    return (
      <div className="absolute" style={{ left: cx, top: cy, width: 0, height: 0 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -pinThick / 2,
            width: needleLen,
            height: pinThick,
            background: pinColor,
            borderRadius: pinThick,
            transformOrigin: "0 50%",
            transform: `rotate(${angle}deg)`,
            opacity: faded ? 0.5 : 1,
          }}
        >
          <div className="absolute flex items-center justify-center rounded-full"
            style={{ right: -pinHeadSize / 2, top: "50%", transform: "translateY(-50%)", width: pinHeadSize, height: pinHeadSize, background: pinHeadIsImg ? "transparent" : pinColor }}>
            {pinHead && <Icon value={pinHead} size={pinHeadIsImg ? pinHeadSize : pinHeadSize * 0.92} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {instructionText && (
        <p className="arcade-muted font-semibold text-center"
          style={{ color: instructionColor ?? undefined, fontSize: instructionFontSize, fontFamily: instructionFontFamily ?? undefined }}>
          {instructionText}
        </p>
      )}

      {phase !== "idle" && (
        <div className="flex gap-3 items-stretch">
          <div className="arcade-chip px-4 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-widest arcade-muted">Pins</div>
            <div className="arcade-display text-xl leading-none" style={{ color: pal.brand }}>{placed}/{targetPins}</div>
          </div>
          <div className="arcade-chip px-3 py-1.5 text-center flex flex-col justify-center">
            <div className="text-sm leading-none whitespace-nowrap">
              {Array.from({ length: lives }).map((_, i) => <span key={i}>{lifeIcon}</span>)}
            </div>
          </div>
        </div>
      )}

      <div
        key={`shake-${shake % 2}`}
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: arenaW, height: arenaW,
          background: bgColor ?? "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.05), rgba(0,0,0,0.25))",
          animation: shake ? "el-shake 0.3s ease" : undefined,
        }}
      >
        {/* rotating group: needles + core */}
        <div className="absolute inset-0" style={{ transform: `rotate(${rot}deg)` }}>
          {pins.map((a, i) => <Needle key={i} angle={a} />)}
          {/* core on top to cover needle inner ends — an image core fully
              replaces the disc (no circle/shadow) but keeps the same radius */}
          <div
            className="absolute rounded-full flex items-center justify-center overflow-hidden"
            style={{
              left: cx - coreSize, top: cy - coreSize, width: coreSize * 2, height: coreSize * 2,
              background: isImg(coreSymbol) ? "transparent" : `radial-gradient(circle at 38% 32%, ${lighten(coreColor, 0.4)}, ${coreColor} 60%, ${darken(coreColor, 0.2)})`,
              boxShadow: isImg(coreSymbol) ? "none" : `0 4px 14px -4px ${darken(coreColor, 0.3)}, inset 0 2px 4px rgba(255,255,255,0.3)`,
              zIndex: 3,
              transform: popping ? "scale(1.07)" : "scale(1)",
              transition: "transform 0.16s ease-out",
            }}
          >
            {coreSymbol && <Icon value={coreSymbol} size={isImg(coreSymbol) ? coreSize * 2 : coreSize * 1.1} />}
          </div>
        </div>

        {/* launcher / flying pin at the bottom — stem points UP toward the core,
            head sits at the BOTTOM (away from the core), so on impact the needle
            enters the core and the head ends up on the outside, like placed pins. */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ bottom: 8, transition: "transform 0.1s cubic-bezier(.2,.85,.25,1)", transform: flying ? `translate(-50%, -${arenaW / 2 - coreSize - pinHeadSize - 34}px)` : "translate(-50%, 0)" }}
        >
          <div style={{ width: pinThick, height: 34, background: pinColor, borderRadius: pinThick }} />
          <div className="rounded-full flex items-center justify-center" style={{ width: pinHeadSize, height: pinHeadSize, background: pinHeadIsImg ? "transparent" : pinColor }}>
            {pinHead && <span className="flex items-center justify-center w-full h-full"><Icon value={pinHead} size={pinHeadIsImg ? pinHeadSize : pinHeadSize * 0.92} /></span>}
          </div>
        </div>
      </div>

      {phase === "idle" ? (
        <button onClick={start} className="btn-arcade" style={{ animation: "pulse-glow 2.2s ease-in-out infinite" }}>{startLabel}</button>
      ) : phase === "play" ? (
        <button onClick={shoot} className="btn-arcade">{shootLabel}</button>
      ) : (
        <div className="h-11" />
      )}
    </div>
  );
}
