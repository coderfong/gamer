export type SliceFillType = "solid" | "gradient" | "image";

export interface SliceFill {
  type: SliceFillType;
  color: string;   // solid color OR gradient start
  color2?: string; // gradient end
  imageUrl?: string;
  // Normalized pan (fraction of wheel SIZE, 0 = default position)
  imagePanX?: number;
  imagePanY?: number;
  imageScale?: number; // 1 = fill wheel canvas, >1 = zoomed in
}

export interface SpinWheelConfig {
  numSlices: number;                    // 2–12, default 8
  segments: string[];                   // emoji icons
  segmentImages: (string | null)[];     // custom image URL per slot (overrides emoji)
  labels: string[];
  sliceFills: SliceFill[];              // per-slice fill overrides
  colorPreset: string;                  // "candy"|"neon"|etc|"custom"
  wheelSize: number;                    // 200–420, default 300
  pegColor: string;
  pointerColor: string;
  pointerImage?: string;                // custom pointer image (overrides the drawn one)
  hubColor: string;
  hubLogoUrl?: string;                  // brand logo shown in center hub
  hubLogoScale: number;                 // 0.3–1.0 fraction of hub radius, default 0.75
  spinButtonText: string;
  spinningText: string;
  spinButtonFontSize: number;           // px, default 18
  spinDuration: number;                 // ms, 1000–10000, default 4400
  pointerAnim: "none" | "tick" | "bounce";
  wheelOffsetX: number;   // px delta from default centered position
  wheelOffsetY: number;
  spinBtnOffsetX: number;
  spinBtnOffsetY: number;
}

export const WHEEL_COLOR_PRESETS: Record<string, string[]> = {
  candy:    ["#27C4D9", "#EAD9F2", "#FF74B0", "#FFC23C", "#8A6BFF", "#EAD9F2", "#FF5A4D", "#36CF8E"],
  neon:     ["#FF0080", "#00FFCC", "#FFFF00", "#FF4400", "#7B00FF", "#00CCFF", "#FF6600", "#00FF44"],
  pastel:   ["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#D4B8FF", "#FFB3F7", "#FFC8A2"],
  sunset:   ["#FF5E7E", "#FF8C42", "#FFC85E", "#C77DFF", "#9B5DE5", "#F15BB5", "#FEE440", "#00BBF9"],
  ocean:    ["#0077B6", "#00B4D8", "#90E0EF", "#48CAE4", "#0096C7", "#ADE8F4", "#CAF0F8", "#03045E"],
  midnight: ["#2C1654", "#6B35C2", "#9B5DE5", "#4C0A6A", "#7B2FBE", "#A855F7", "#6D28D9", "#C084FC"],
  mono:     ["#1A1A1A", "#3D3D3D", "#5C5C5C", "#7A7A7A", "#9A9A9A", "#B8B8B8", "#D6D6D6", "#F0F0F0"],
};

const DEF_ICONS  = ["🥤", "🍀", "🏷️", "🍩", "🎁", "🍀", "🧋", "💎"];
const DEF_LABELS = ["FREE DRINK", "TRY AGAIN", "20% OFF", "BOGO", "GIFT", "TRY AGAIN", "TOPPING", "JACKPOT"];

function pad<T>(arr: T[], len: number, fill: (i: number) => T): T[] {
  const out = [...arr];
  while (out.length < len) out.push(fill(out.length));
  return out.slice(0, len);
}

export function readSpinWheelConfig(raw: Record<string, unknown>): SpinWheelConfig {
  const n = Math.max(2, Math.min(12, Number(raw.numSlices) || 8));
  return {
    numSlices:         n,
    segments:          pad((raw.segments as string[]) ?? [], n, (i) => DEF_ICONS[i % DEF_ICONS.length]),
    segmentImages:     pad((raw.segmentImages as (string|null)[]) ?? [], n, () => null),
    labels:            pad((raw.labels as string[]) ?? [], n, (i) => DEF_LABELS[i % DEF_LABELS.length]),
    sliceFills:        pad((raw.sliceFills as SliceFill[]) ?? [], n, () => ({ type: "solid", color: "#FFFCF4" })),
    colorPreset:       (raw.colorPreset as string) ?? "candy",
    wheelSize:         Math.max(200, Math.min(420, Number(raw.wheelSize) || 300)),
    pegColor:          (raw.pegColor as string) ?? "#FFC23C",
    pointerColor:      (raw.pointerColor as string) ?? "#FF5A4D",
    pointerImage:      (raw.pointerImage as string) || undefined,
    hubColor:          (raw.hubColor as string) ?? "#FFFCF4",
    hubLogoUrl:        (raw.hubLogoUrl as string) || undefined,
    hubLogoScale:      Math.max(0.3, Math.min(1.0, Number(raw.hubLogoScale) || 0.75)),
    spinButtonText:    (raw.spinButtonText as string) ?? "SPIN!",
    spinningText:      (raw.spinningText as string) ?? "GOOD LUCK…",
    spinButtonFontSize: Number(raw.spinButtonFontSize) || 18,
    spinDuration:      Math.max(1000, Math.min(10000, Number(raw.spinDuration) || 4400)),
    pointerAnim:       (raw.pointerAnim as SpinWheelConfig["pointerAnim"]) ?? "tick",
    wheelOffsetX:      Number(raw.wheelOffsetX)   || 0,
    wheelOffsetY:      Number(raw.wheelOffsetY)   || 0,
    spinBtnOffsetX:    Number(raw.spinBtnOffsetX) || 0,
    spinBtnOffsetY:    Number(raw.spinBtnOffsetY) || 0,
  };
}

export function resolveSliceFill(i: number, cfg: SpinWheelConfig): SliceFill {
  const custom = cfg.sliceFills[i];
  // Gradient/image always wins
  if (custom?.type === "gradient" || custom?.type === "image") return custom;
  // Non-custom preset overrides solid fills
  if (cfg.colorPreset !== "custom") {
    const cols = WHEEL_COLOR_PRESETS[cfg.colorPreset];
    if (cols) return { type: "solid", color: cols[i % cols.length] };
  }
  // Custom solid
  if (custom?.type === "solid") return custom;
  // Fallback
  return { type: "solid", color: WHEEL_COLOR_PRESETS.candy[i % 8] };
}
