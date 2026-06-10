"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { readSpinWheelConfig, resolveSliceFill } from "@/lib/types/spinwheel";

const INK   = "#231B2E";
const RING  = 22; // outer decorative ring thickness (px)
const PTR_H = 50; // pointer SVG height

export function SpinWheel({ config, onComplete, editorMode, onConfigChange }: GameProps) {
  const cfg = readSpinWheelConfig(config);
  const {
    numSlices: N, segments, segmentImages, labels,
    wheelSize, pegColor, pointerColor, pointerImage, hubColor,
    hubLogoUrl, hubLogoScale,
    spinButtonText, spinningText, spinButtonFontSize,
    spinDuration, pointerAnim,
    wheelOffsetX, wheelOffsetY, spinBtnOffsetX, spinBtnOffsetY,
  } = cfg;

  const SIZE  = wheelSize;            // rotating wheel SVG diameter
  const R     = SIZE / 2;            // wheel radius
  const TOTAL = SIZE + RING * 2;     // full canvas width/height (ring included)
  const CX    = TOTAL / 2;           // center of full canvas
  const HUB_R = Math.round(R * 0.2); // hub circle radius

  const slice = 360 / N;

  const [rotation, setRotation] = useState(0);
  const [spinning,  setSpinning]  = useState(false);
  const [tick,      setTick]      = useState(false);
  const startTs = useRef(0);

  // Editor drag state
  const wheelDrag  = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const btnDrag    = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const btnMoved   = useRef(false); // true when pointer moved >5px during btn drag

  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => setTick((t) => !t), 90);
    return () => clearInterval(id);
  }, [spinning]);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    startTs.current = performance.now();
    const idx   = Math.floor(Math.random() * N);
    const turns  = 5 + Math.floor(Math.random() * 3);
    const target = turns * 360 + (360 - (idx * slice + slice / 2));
    const final  = rotation - (rotation % 360) + target;
    setRotation(final);
    setTimeout(() => {
      setSpinning(false);
      setTimeout(() => onComplete({
        outcome: `segment_${idx}`,
        durationMs: performance.now() - startTs.current,
      }), 600);
    }, spinDuration);
  }

  // Slice geometry — all in the ROTATING SVG's coord space (0,0)→(SIZE,SIZE), center = R,R
  const slices = Array.from({ length: N }).map((_, i) => {
    const a0  = (i * slice - 90) * (Math.PI / 180);
    const a1  = ((i + 1) * slice - 90) * (Math.PI / 180);
    const x0  = R + R * Math.cos(a0),      y0 = R + R * Math.sin(a0);
    const x1  = R + R * Math.cos(a1),      y1 = R + R * Math.sin(a1);
    const mid = (i * slice + slice / 2 - 90) * (Math.PI / 180);
    const ix  = R + R * 0.64 * Math.cos(mid), iy = R + R * 0.64 * Math.sin(mid);
    const tx  = R + R * 0.38 * Math.cos(mid), ty = R + R * 0.38 * Math.sin(mid);
    const rot = i * slice + slice / 2;
    const path = `M${R},${R} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`;
    const fill = resolveSliceFill(i, cfg);
    return { x0, y0, x1, y1, ix, iy, tx, ty, rot, path, fill };
  });

  // Pointer state
  const pointerDeg = pointerAnim === "tick" && spinning ? (tick ? -7 : 7) : 0;
  const pointerTransition = pointerAnim === "tick" ? "transform 0.09s ease" : undefined;
  const pointerBounce =
    pointerAnim === "bounce" && !spinning
      ? { animation: "float-bob 1.4s ease-in-out infinite" }
      : {};

  const editorDragHandle = {
    outline: "2px dashed rgba(109,74,255,0.55)",
    outlineOffset: "6px",
    borderRadius: "4px",
    cursor: "move",
    touchAction: "none" as const,
  };

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      {/* ── Wheel assembly ──────────────────────────────────────── */}
      {/* Drag wrapper — only active in editor mode */}
      <div
        style={{
          transform: `translate(${wheelOffsetX}px, ${wheelOffsetY}px)`,
          ...(editorMode ? editorDragHandle : {}),
        }}
        onPointerDown={editorMode ? (e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          wheelDrag.current = { sx: e.clientX, sy: e.clientY, ox: wheelOffsetX, oy: wheelOffsetY };
        } : undefined}
        onPointerMove={editorMode ? (e) => {
          const d = wheelDrag.current;
          if (!d || !onConfigChange) return;
          onConfigChange({
            wheelOffsetX: Math.round(d.ox + e.clientX - d.sx),
            wheelOffsetY: Math.round(d.oy + e.clientY - d.sy),
          });
        } : undefined}
        onPointerUp={editorMode ? () => { wheelDrag.current = null; } : undefined}
      >
      <div
        className="relative"
        style={{
          width: TOTAL,
          height: TOTAL,
          filter: `drop-shadow(0 10px 0 ${INK}) drop-shadow(0 12px 18px rgba(0,0,0,0.4))`,
        }}
      >
        {/* ── LAYER 1: Static ring + pegs (full TOTAL canvas) ─── */}
        <svg
          viewBox={`0 0 ${TOTAL} ${TOTAL}`}
          width={TOTAL}
          height={TOTAL}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
          overflow="visible"
        >
          <defs>
            {/* Glossy sheen for the ring */}
            <radialGradient id="ring-gloss" cx="38%" cy="30%" r="65%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>

          {/* Outer dark ring */}
          <circle cx={CX} cy={CX} r={R + RING}      fill={INK} />
          {/* Accent band just inside the ring edge */}
          <circle cx={CX} cy={CX} r={R + RING - 4}  fill="none" stroke={pegColor} strokeWidth="2.5" opacity="0.85" />
          {/* Accent band just outside the wheel */}
          <circle cx={CX} cy={CX} r={R + 5}          fill="none" stroke={pegColor} strokeWidth="1.5" opacity="0.55" />
          {/* Subtle tick lines at slice boundaries */}
          {Array.from({ length: N }).map((_, i) => {
            const a  = (i * slice - 90) * (Math.PI / 180);
            const r1 = R + 5, r2 = R + RING - 5;
            return (
              <line
                key={i}
                x1={CX + r1 * Math.cos(a)} y1={CX + r1 * Math.sin(a)}
                x2={CX + r2 * Math.cos(a)} y2={CX + r2 * Math.sin(a)}
                stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"
              />
            );
          })}
          {/* Glossy ring sheen */}
          <circle cx={CX} cy={CX} r={R + RING}      fill="url(#ring-gloss)" />

          {/* ── Pegs at slice boundaries ─────────────────── */}
          {Array.from({ length: N }).map((_, i) => {
            const a  = (i * slice - 90) * (Math.PI / 180);
            const pr = R + RING * 0.5;
            return (
              <circle
                key={i}
                cx={CX + pr * Math.cos(a)}
                cy={CX + pr * Math.sin(a)}
                r={6}
                fill={pegColor}
                stroke={INK}
                strokeWidth="2"
                style={{
                  filter: tick && spinning ? `drop-shadow(0 0 6px ${pegColor})` : "none",
                  transition: "filter 0.09s",
                }}
              />
            );
          })}
        </svg>

        {/* ── LAYER 2: Rotating wheel SVG ───────────────────────── */}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          style={{
            position: "absolute",
            top: RING,
            left: RING,
            zIndex: 2,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: spinning
              ? `transform ${spinDuration / 1000}s cubic-bezier(.12,.75,.1,1)`
              : "none",
          }}
        >
          <defs>
            {slices.map(({ path, fill }, i) => {
              if (fill.type === "gradient") {
                const mid = (i * slice + slice / 2 - 90) * (Math.PI / 180);
                return (
                  <linearGradient
                    key={`g${i}`} id={`grad-${i}`}
                    gradientUnits="userSpaceOnUse"
                    x1={R} y1={R}
                    x2={R + R * 0.92 * Math.cos(mid)}
                    y2={R + R * 0.92 * Math.sin(mid)}
                  >
                    <stop offset="0%"   stopColor={fill.color} />
                    <stop offset="100%" stopColor={fill.color2 ?? fill.color} />
                  </linearGradient>
                );
              }
              if (fill.type === "image") {
                return (
                  <clipPath key={`cp${i}`} id={`clip-${i}`}>
                    <path d={path} />
                  </clipPath>
                );
              }
              return null;
            })}
            {/* Full-slice clip for segment images that fill the whole wedge */}
            {slices.map(({ path }, i) =>
              segmentImages[i] ? (
                <clipPath key={`seg${i}`} id={`seg-${i}`}>
                  <path d={path} />
                </clipPath>
              ) : null
            )}
            {/* Subtle radial shine that rotates with wheel */}
            <radialGradient id="wheel-shine" cx="35%" cy="30%" r="65%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.14)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>

          {/* Wheel base circle */}
          <circle cx={R} cy={R} r={R} fill="white" />

          {slices.map(({ path, fill, ix, iy, tx, ty, rot }, i) => {
            const fillAttr =
              fill.type === "gradient" ? `url(#grad-${i})`
              : fill.type === "image"   ? "white"
              : fill.color;

            // A segment image is already wedge-shaped → it fills the whole slice
            // and replaces the colour fill, emoji and label.
            if (segmentImages[i]) {
              return (
                <g key={i}>
                  {/* The cropped PNG is already an exact wedge centred on the
                      vertical, so we just rotate it into the slice — no clip
                      (clipping + rotating double-transforms the mask). */}
                  <image
                    href={segmentImages[i]!}
                    x={0} y={0} width={SIZE} height={SIZE}
                    transform={`rotate(${i * slice + slice / 2}, ${R}, ${R})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <path d={path} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
                </g>
              );
            }

            return (
              <g key={i}>
                {/* Slice fill */}
                <path d={path} fill={fillAttr} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

                {/* Image fill with pan/zoom */}
                {fill.type === "image" && fill.imageUrl && (() => {
                  const sc   = fill.imageScale ?? 1;
                  const iw   = SIZE * sc;
                  const ih   = SIZE * sc;
                  const ix_  = (fill.imagePanX ?? 0) * SIZE - SIZE * (sc - 1) / 2;
                  const iy_  = (fill.imagePanY ?? 0) * SIZE - SIZE * (sc - 1) / 2;
                  return (
                    <image
                      href={fill.imageUrl} x={ix_} y={iy_}
                      width={iw} height={ih}
                      clipPath={`url(#clip-${i})`}
                      preserveAspectRatio="xMidYMid slice" opacity={0.88}
                    />
                  );
                })()}

                {/* Segment icon: custom image or emoji */}
                {segmentImages[i] ? (
                  <image
                    href={segmentImages[i]!}
                    x={ix - 16} y={iy - 16} width={32} height={32}
                    clipPath={`url(#iclip-${i})`}
                    preserveAspectRatio="xMidYMid slice"
                    transform={`rotate(${rot},${ix},${iy})`}
                  />
                ) : (
                  <text
                    x={ix} y={iy}
                    fontSize={Math.max(16, Math.round(SIZE * 0.1))}
                    textAnchor="middle" dominantBaseline="central"
                    transform={`rotate(${rot},${ix},${iy})`}
                  >
                    {segments[i]}
                  </text>
                )}

                {/* Label */}
                <text
                  x={tx} y={ty}
                  fontSize={Math.max(7, Math.round(SIZE * 0.037))}
                  textAnchor="middle" dominantBaseline="central"
                  fontFamily="'Luckiest Guy', cursive"
                  fill={INK}
                  transform={`rotate(${rot},${tx},${ty})`}
                >
                  {labels[i % labels.length]}
                </text>
              </g>
            );
          })}

          {/* Outer wheel border */}
          <circle cx={R} cy={R} r={R - 1} fill="none" stroke={INK} strokeWidth="3" />
          {/* Rotating shine overlay */}
          <circle cx={R} cy={R} r={R - 2} fill="url(#wheel-shine)" />
        </svg>

        {/* ── LAYER 3: Static hub — stays centered, never rotates ─── */}
        <div
          style={{
            position: "absolute",
            zIndex: 3,
            left: CX - HUB_R,
            top:  CX - HUB_R,
            width:  HUB_R * 2,
            height: HUB_R * 2,
            borderRadius: "50%",
            background: hubColor,
            border: `3px solid ${INK}`,
            boxShadow: `0 3px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {hubLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hubLogoUrl}
              alt=""
              style={{
                width:  `${hubLogoScale * 100}%`,
                height: `${hubLogoScale * 100}%`,
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          ) : (
            /* Default: 4-pointed star in pointer color */
            <svg width={HUB_R * 1.2} height={HUB_R * 1.2} viewBox="0 0 24 24">
              <path
                d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z"
                fill={pointerColor} stroke={INK} strokeWidth="1.4" strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* ── Pointer ───────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            zIndex: 10,
            top: RING - PTR_H + 6,
            left: "50%",
            transform: `translateX(-50%) rotate(${pointerDeg}deg)`,
            transition: pointerTransition,
            filter: `drop-shadow(2px -2px 0 ${INK})`,
            ...pointerBounce,
          }}
        >
          {pointerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pointerImage} alt="" style={{ width: 44, height: PTR_H + 6, objectFit: "contain", display: "block" }} />
          ) : (
            <svg width="40" height={PTR_H} viewBox={`0 0 40 ${PTR_H}`}>
              <path
                d={`M20 ${PTR_H} L4 10 Q20 -2 36 10 Z`}
                fill={pointerColor} stroke={INK} strokeWidth="3" strokeLinejoin="round"
              />
              <circle cx="20" cy="16" r="5.5" fill={hubColor} stroke={INK} strokeWidth="2.5" />
            </svg>
          )}
        </div>
      </div>
      </div>{/* end wheel drag wrapper */}

      {/* Spin button — drag in editor mode, click to spin always */}
      <button
        type="button"
        disabled={spinning}
        className="btn-arcade"
        style={{
          fontSize: spinButtonFontSize,
          transform: `translate(${spinBtnOffsetX}px, ${spinBtnOffsetY}px)`,
          animation: !spinning ? "pulse-glow 2s ease-in-out infinite" : undefined,
          ...(editorMode ? { ...editorDragHandle, cursor: "move" } : {}),
        }}
        onClick={() => {
          // In editor mode only spin if the pointer didn't drag
          if (!btnMoved.current) spin();
        }}
        onPointerDown={editorMode ? (e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          btnMoved.current = false;
          btnDrag.current = { sx: e.clientX, sy: e.clientY, ox: spinBtnOffsetX, oy: spinBtnOffsetY };
        } : undefined}
        onPointerMove={editorMode ? (e) => {
          const d = btnDrag.current;
          if (!d || !onConfigChange) return;
          const dx = e.clientX - d.sx;
          const dy = e.clientY - d.sy;
          if (!btnMoved.current && Math.hypot(dx, dy) < 5) return;
          btnMoved.current = true;
          onConfigChange({
            spinBtnOffsetX: Math.round(d.ox + dx),
            spinBtnOffsetY: Math.round(d.oy + dy),
          });
        } : undefined}
        onPointerUp={editorMode ? () => { btnDrag.current = null; } : undefined}
      >
        {spinning ? spinningText : spinButtonText}
      </button>
    </div>
  );
}
