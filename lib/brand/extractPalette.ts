// Client-side dominant-colour extraction — no dependencies. Downscales the
// image onto a canvas, buckets pixels into a coarse colour grid, and returns the
// most common, reasonably-saturated colours sorted by prominence.

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

export async function extractPalette(file: File, count = 6): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const size = 80; // downscale target
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, size / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Bucket into a coarse grid (4 bits/channel) and weight by saturation so
    // brand colours beat washed-out backgrounds.
    const buckets = new Map<string, { count: number; r: number; g: number; b: number; score: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = luminance(r, g, b);
      if (lum > 0.96 || lum < 0.04) continue; // skip near-white / near-black
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const sat = saturation(r, g, b);
      const weight = 1 + sat * 2.5;
      const cur = buckets.get(key);
      if (cur) { cur.count += 1; cur.r += r; cur.g += g; cur.b += b; cur.score += weight; }
      else buckets.set(key, { count: 1, r, g, b, score: weight });
    }

    const sorted = [...buckets.values()].sort((a, b) => b.score - a.score);
    const out: string[] = [];
    for (const bk of sorted) {
      const r = Math.round(bk.r / bk.count);
      const g = Math.round(bk.g / bk.count);
      const b = Math.round(bk.b / bk.count);
      const hex = rgbToHex(r, g, b);
      // De-dupe perceptually-similar colours
      if (out.some((h) => closeHex(h, hex, 28))) continue;
      out.push(hex);
      if (out.length >= count) break;
    }
    return out;
  } catch {
    return [];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function closeHex(a: string, b: string, tol: number): boolean {
  const pa = hexToRgb(a), pb = hexToRgb(b);
  return Math.abs(pa.r - pb.r) + Math.abs(pa.g - pb.g) + Math.abs(pa.b - pb.b) < tol;
}
function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
