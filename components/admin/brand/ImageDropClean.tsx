"use client";

import { useState } from "react";

// A drop-zone + click upload. When an image is picked it auto-removes a white
// (or near-white) background and hands back a transparent PNG. Reusable across
// studio steps.
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
  const [working, setWorking] = useState(false);

  async function pick(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setWorking(true);
    try {
      const cleaned = await removeWhiteBackground(file);
      onFile(cleaned);
    } catch {
      // If processing fails for any reason, fall back to the original file.
      onFile(file);
    } finally {
      setWorking(false);
    }
  }

  const isBusy = busy || working;

  return (
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
      {isBusy ? "Removing background…" : over ? "Drop image" : `🖼 ${label}`}
      <input type="file" accept="image/*" className="hidden" disabled={isBusy}
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );
}

// Loads the image onto a canvas and removes only the white BACKGROUND — the
// near-white region connected to the image edges — via a flood fill. White that
// is part of the subject (not connected to the border) is kept. Returns a PNG.
async function removeWhiteBackground(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    const w = canvas.width = img.naturalWidth;
    const h = canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // A pixel counts as background-white if all channels are near white.
    const threshold = 235;
    const isWhite = (i: number) =>
      data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold;

    // Flood fill inward from every border pixel, clearing connected white.
    const visited = new Uint8Array(w * h);
    const stack: number[] = [];
    const pushIfWhite = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const p = y * w + x;
      if (visited[p]) return;
      visited[p] = 1;
      if (isWhite(p * 4)) stack.push(p);
    };
    for (let x = 0; x < w; x++) { pushIfWhite(x, 0); pushIfWhite(x, h - 1); }
    for (let y = 0; y < h; y++) { pushIfWhite(0, y); pushIfWhite(w - 1, y); }

    while (stack.length) {
      const p = stack.pop()!;
      data[p * 4 + 3] = 0; // make transparent
      const x = p % w, y = (p / w) | 0;
      pushIfWhite(x - 1, y);
      pushIfWhite(x + 1, y);
      pushIfWhite(x, y - 1);
      pushIfWhite(x, y + 1);
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".png";
    return new File([blob], name, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
