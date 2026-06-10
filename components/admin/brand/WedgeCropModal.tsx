"use client";

import { useEffect, useRef, useState } from "react";

// Crops an image into a single pie-wedge (1/segments of a circle, apex at centre,
// starting straight up — matching the spin wheel's slice 0) and returns a
// transparent PNG sized OUT×OUT. The wheel then just rotates each wedge into place.
const OUT = 360;

export function WedgeCropModal({
  src,
  segments,
  onCancel,
  onConfirm,
}: {
  src: string;
  segments: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Fit image to cover the wedge area initially, centred.
      const base = OUT / Math.max(img.width, img.height);
      setScale(base * 1.1);
      setPan({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const img = imgRef.current, canvas = canvasRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, OUT, OUT);
    // wedge clip — apex at centre, centred on the vertical (up) axis so the
    // shaded wedge is symmetric/vertical; the wheel rotates it into each slice.
    const sliceRad = (2 * Math.PI) / segments;
    const start = -Math.PI / 2 - sliceRad / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(OUT / 2, OUT / 2);
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, start, start + sliceRad);
    ctx.closePath();
    ctx.clip();
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, OUT / 2 - w / 2 + pan.x, OUT / 2 - h / 2 + pan.y, w, h);
    ctx.restore();
  }, [scale, pan, segments]);

  function confirm() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => { if (blob) onConfirm(new File([blob], "segment.png", { type: "image/png" })); }, "image/png");
  }

  const DISP = 300;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCancel}>
      <div className="rounded-2xl bg-white p-4 max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <h4 className="font-bold text-sm mb-1">Fit image to the segment</h4>
        <p className="text-xs mb-3" style={{ color: "var(--ad-muted)" }}>Drag to position, slider to zoom. The shaded wedge is what shows in the wheel.</p>
        <div
          className="relative mx-auto rounded-lg overflow-hidden"
          style={{ width: DISP, height: DISP, background: "repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 0 0 / 16px 16px", touchAction: "none" }}
          onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y }; }}
          onPointerMove={(e) => { const d = drag.current; if (!d) return; const k = OUT / DISP; setPan({ x: d.ox + (e.clientX - d.x) * k, y: d.oy + (e.clientY - d.y) * k }); }}
          onPointerUp={() => { drag.current = null; }}
        >
          <canvas ref={canvasRef} width={OUT} height={OUT} style={{ width: DISP, height: DISP }} />
        </div>
        <label className="block mt-3">
          <span className="text-xs font-semibold" style={{ color: "var(--ad-muted)" }}>Zoom</span>
          <input type="range" min={0.05} max={4} step={0.01} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" />
        </label>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
          <button onClick={confirm} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ background: "#6D4AFF" }}>Use segment</button>
        </div>
      </div>
    </div>
  );
}
