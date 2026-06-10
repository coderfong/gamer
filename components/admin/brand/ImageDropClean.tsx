"use client";

import { useEffect, useRef, useState } from "react";

// A drop-zone + click upload that opens a "remove white background" modal before
// handing back a transparent PNG File. Reusable across studio steps.
export function ImageDropClean({
  label,
  busy,
  onFile,
}: {
  label: string;
  busy?: boolean;
  onFile: (file: File) => void;
}) {
  const [over, setOver] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  function pick(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setPending(URL.createObjectURL(file));
  }

  return (
    <>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
        className="cursor-pointer text-[11px] rounded border px-2 py-1 inline-flex items-center gap-1 transition-colors"
        style={{
          color: "var(--ad-body)",
          borderColor: over ? "var(--ad-accent, #6D4AFF)" : "var(--ad-border)",
          background: over ? "var(--ad-accent-soft, #f0ebff)" : "transparent",
          borderStyle: "dashed",
        }}
      >
        {busy ? "Uploading…" : over ? "Drop image" : `🖼 ${label}`}
        <input type="file" accept="image/*" className="hidden" disabled={busy}
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {pending && (
        <CleanModal
          src={pending}
          onCancel={() => { URL.revokeObjectURL(pending); setPending(null); }}
          onConfirm={(file) => { URL.revokeObjectURL(pending); setPending(null); onFile(file); }}
        />
      )}
    </>
  );
}

const MAX_DIM = 1000;
const PREVIEW = 320;

function CleanModal({ src, onCancel, onConfirm }: { src: string; onCancel: () => void; onConfirm: (f: File) => void }) {
  const [tolerance, setTolerance] = useState(40); // how far from pure white still counts as background
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; setReady(true); };
    img.src = src;
  }, [src]);

  // Re-render the processed result whenever the controls change.
  useEffect(() => {
    const img = imgRef.current, canvas = canvasRef.current;
    if (!ready || !img || !canvas) return;
    const scale = Math.min(MAX_DIM / img.naturalWidth, MAX_DIM / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    if (!enabled) return;

    const cut = 255 - tolerance;            // pixels brighter than this → fully transparent
    const feather = 24;                     // soft edge band below the cut
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const min = Math.min(px[i], px[i + 1], px[i + 2]); // "whiteness" — high when all channels bright
      if (min >= cut) {
        px[i + 3] = 0;
      } else if (min >= cut - feather) {
        // fade out near the threshold for cleaner edges
        const t = (min - (cut - feather)) / feather; // 0..1
        px[i + 3] = Math.round(px[i + 3] * (1 - t));
      }
    }
    ctx.putImageData(data, 0, 0);
  }, [ready, tolerance, enabled]);

  function confirm() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onConfirm(new File([blob], "image.png", { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCancel}>
      <div className="rounded-2xl bg-white p-4 max-w-[400px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm">Remove white background</h4>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Remove white
          </label>
        </div>

        {/* checkered backdrop shows the transparency */}
        <div
          className="mx-auto rounded-lg overflow-hidden grid place-items-center"
          style={{
            width: PREVIEW, height: PREVIEW,
            backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)",
            backgroundSize: "16px 16px",
          }}
        >
          <canvas ref={canvasRef} style={{ maxWidth: PREVIEW, maxHeight: PREVIEW, objectFit: "contain" }} />
        </div>

        {enabled && (
          <label className="block mt-3">
            <span className="text-xs font-semibold" style={{ color: "var(--ad-muted)" }}>Strength · {tolerance}</span>
            <input type="range" min={0} max={120} step={2} value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))} className="w-full" />
            <span className="text-[10px]" style={{ color: "var(--ad-faint)" }}>Higher removes off-white/greys too. Lower keeps more.</span>
          </label>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
          <button onClick={confirm} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ background: "#6D4AFF" }}>Use image</button>
        </div>
      </div>
    </div>
  );
}
