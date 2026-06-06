// Color utilities shared by the game components so every game derives a
// cohesive palette from the campaign's single brand color.

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "").trim();
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const num = parseInt(full || "6d28d9", 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

export function toHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1)}`;
}

/** Lighten (amount > 0) or darken (amount < 0) toward white/black. amount in [-1,1]. */
export function adjust(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  if (amount >= 0) {
    return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  }
  const k = 1 + amount;
  return toHex(r * k, g * k, b * k);
}

export function lighten(hex: string, amt: number): string {
  return adjust(hex, Math.abs(amt));
}
export function darken(hex: string, amt: number): string {
  return adjust(hex, -Math.abs(amt));
}

/** Mix two hex colors. ratio 0 = a, 1 = b. */
export function mix(a: string, b: string, ratio: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex(
    ca.r + (cb.r - ca.r) * ratio,
    ca.g + (cb.g - ca.g) * ratio,
    ca.b + (cb.b - ca.b) * ratio,
  );
}

/** Relative luminance per WCAG, used to pick readable foreground text. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const lin = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Black or white, whichever reads best on the given background. */
export function readableText(hex: string): string {
  return luminance(hex) > 0.45 ? "#0b0b0f" : "#ffffff";
}

/** Shift hue by degrees — handy for a complementary accent. */
export function rotateHue(hex: string, deg: number): string {
  let { r, g, b } = parseHex(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  h = (h + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  return toHex((rr + m) * 255, (gg + m) * 255, (bb + m) * 255);
}

export interface Palette {
  brand: string;
  fg: string;
  light: string;
  dark: string;
  accent: string;
  softBg: string;
  ring: string;
}

/** Derive a full palette from one brand color (and optional brand fg). */
export function palette(brandColor?: string, brandFg?: string): Palette {
  const brand = brandColor || "#6d28d9";
  return {
    brand,
    fg: brandFg || readableText(brand),
    light: lighten(brand, 0.28),
    dark: darken(brand, 0.32),
    accent: rotateHue(brand, 32),
    softBg: lighten(brand, 0.9),
    ring: mix(brand, "#ffffff", 0.4),
  };
}
