"use client";
import { useRef, useState, useEffect } from "react";
import type { SliceFill } from "@/lib/types/spinwheel";

const PREVIEW = 280; // fixed SVG canvas size — client coords = SVG coords, no conversion needed

interface Props {
  sliceIndex: number;
  numSlices: number;
  fill: SliceFill;
  onApply: (patch: Pick<SliceFill, "imagePanX" | "imagePanY" | "imageScale">) => void;
  onClose: () => void;
}

export function ImagePositionModal({ sliceIndex, numSlices, fill, onApply, onClose }: Props) {
  const [panX, setPanX]   = useState(fill.imagePanX ?? 0);
  const [panY, setPanY]   = useState(fill.imagePanY ?? 0);
  const [scale, setScale] = useState(fill.imageScale ?? 1);

  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const svgRef  = useRef<SVGSVGElement>(null);

  // Slice geometry for the preview
  const sliceDeg = 360 / numSlices;
  const slicePaths = Array.from({ length: numSlices }).map((_, i) => {
    const a0 = (i * sliceDeg - 90) * (Math.PI / 180);
    const a1 = ((i + 1) * sliceDeg - 90) * (Math.PI / 180);
    const R  = PREVIEW / 2;
    const x0 = R + R * Math.cos(a0), y0 = R + R * Math.sin(a0);
    const x1 = R + R * Math.cos(a1), y1 = R + R * Math.sin(a1);
    return `M${R},${R} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`;
  });

  const activePath = slicePaths[sliceIndex];

  // Image position in SVG coords
  const imgW = PREVIEW * scale;
  const imgH = PREVIEW * scale;
  const imgX = panX * PREVIEW - PREVIEW * (scale - 1) / 2;
  const imgY = panY * PREVIEW - PREVIEW * (scale - 1) / 2;

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const rect   = svgRef.current!.getBoundingClientRect();
    const svgX   = e.clientX - rect.left;
    const svgY   = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newScale = Math.max(0.25, Math.min(6, scale * factor));

    // Keep the point under the cursor fixed during zoom
    const relX = (svgX - imgX) / imgW;
    const relY = (svgY - imgY) / imgH;
    const newImgW = PREVIEW * newScale;
    const newImgH = PREVIEW * newScale;
    const newImgX = svgX - relX * newImgW;
    const newImgY = svgY - relY * newImgH;

    setScale(newScale);
    setPanX((newImgX + PREVIEW * (newScale - 1) / 2) / PREVIEW);
    setPanY((newImgY + PREVIEW * (newScale - 1) / 2) / PREVIEW);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-5 w-[340px] space-y-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Adjust image position</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none">✕</button>
        </div>

        {/* SVG preview */}
        <svg
          ref={svgRef}
          width={PREVIEW}
          height={PREVIEW}
          viewBox={`0 0 ${PREVIEW} ${PREVIEW}`}
          className="rounded-xl border block mx-auto"
          style={{ cursor: "grab", userSelect: "none", touchAction: "none" }}
          onWheel={handleWheel}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY };
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            const dx = (e.clientX - dragRef.current.startX) / PREVIEW;
            const dy = (e.clientY - dragRef.current.startY) / PREVIEW;
            setPanX(dragRef.current.startPanX + dx);
            setPanY(dragRef.current.startPanY + dy);
          }}
          onPointerUp={() => { dragRef.current = null; }}
        >
          {/* Checkerboard background to signal transparency */}
          <defs>
            <pattern id="checker" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="5"  height="5"  fill="#e0e0e0" />
              <rect x="5" y="5" width="5" height="5" fill="#e0e0e0" />
              <rect x="5" y="0" width="5" height="5" fill="#f4f4f4" />
              <rect x="0" y="5" width="5" height="5" fill="#f4f4f4" />
            </pattern>
            <clipPath id="modal-active-clip">
              <path d={activePath} />
            </clipPath>
          </defs>

          {/* Background */}
          <rect width={PREVIEW} height={PREVIEW} fill="url(#checker)" />

          {/* Other slices (muted) */}
          {slicePaths.map((p, i) =>
            i !== sliceIndex ? (
              <path key={i} d={p} fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
            ) : null
          )}

          {/* Active slice: white base */}
          <path d={activePath} fill="white" stroke="none" />

          {/* Image clipped to active slice */}
          <image
            href={fill.imageUrl}
            x={imgX} y={imgY}
            width={imgW} height={imgH}
            clipPath="url(#modal-active-clip)"
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Active slice border */}
          <path d={activePath} fill="none" stroke="#6D4AFF" strokeWidth="2.5" strokeDasharray="4 2" />
        </svg>

        <p className="text-xs text-zinc-400 text-center">Drag to pan · Scroll / pinch to zoom</p>

        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-10 shrink-0">Zoom</span>
          <input
            type="range" min={0.25} max={6} step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs font-mono w-10 text-right shrink-0">{scale.toFixed(2)}×</span>
        </div>

        {/* Reset */}
        <button
          type="button"
          className="text-xs text-zinc-400 hover:text-zinc-600 underline"
          onClick={() => { setPanX(0); setPanY(0); setScale(1); }}
        >
          Reset to default
        </button>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onApply({ imagePanX: panX, imagePanY: panY, imageScale: scale }); onClose(); }}
            className="btn-brand"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImagePositionModal;
