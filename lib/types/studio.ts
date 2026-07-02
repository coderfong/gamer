import type { OverlayElement } from "@/lib/types/campaign";

// A free custom text block placed over a game (studio Text step). It inherits
// the headline ("display") or small ("body") style; only position/size/colour
// are per-block.
export interface StudioText {
  id: string;
  content: string;
  role: "display" | "body";              // which global text style to use
  x: number;                             // px (game-space, ~0..340)
  y: number;                             // px from the top of the game area
  width: number;                         // px box width (text wraps/aligns within)
  size: number;                          // px font size
  color: string;                         // "" = inherit role colour
  align: "left" | "center" | "right";
}

// Per-game asset configuration set in the Brand Studio. All optional — a game
// with no entry just uses the global theme.
export interface StudioGameAssets {
  // Step 2 — hero images keyed by the game's own config slot
  // (e.g. { coverImage: url } for scratch, { ballImage: url } for plinko).
  hero?: Record<string, string>;
  // Multi-image hero slots — several images for one key (e.g. memory card faces,
  // one per pair). Keyed the same as `hero`.
  heroList?: Record<string, string[]>;
  // Step 3 — background image with adjustable framing.
  bg?: {
    url: string;
    x: number;        // % offset -100..100
    y: number;        // % offset -100..100
    scale: number;    // 1 = cover
    opacity: number;  // 0..1
  };
  // Step 4 — decorative overlay elements (reuses the campaign overlay shape).
  overlays?: OverlayElement[];
  // Text step — custom text blocks placed over the game.
  texts?: StudioText[];
  // Vertical padding (px) that pushes the game's content down — e.g. to make
  // room for a headline above it.
  padTop?: number;
  // Fill Outline (slot_machine): scale (%) of the uploaded outline image.
  outlineScale?: number;
  // Scratch card: size (%) of the cover image within each panel (100 = fill).
  coverScale?: number;
  // Plinko (dice_roll): board background image size (% of board), tuned independently.
  boardImageW?: number;
  boardImageH?: number;
  // Plinko (dice_roll): the winning slot the ball must land in (1-based).
  goalSlot?: number;
  // Spin Wheel: flip the uploaded pointer image vertically (for art that points up).
  pointerFlipY?: boolean;
}

// Per-brand rewards / stamp-card assets set in the Brand Studio — the loyalty
// equivalent of StudioGameAssets. All image slots are optional; anything unset
// falls back to a themed default in the <StampCard> component.
export interface StampCardAssets {
  // Background image with the same adjustable framing as game backgrounds.
  bg?: {
    url: string;
    x: number;        // % offset -100..100
    y: number;        // % offset -100..100
    scale: number;    // 1 = cover
    opacity: number;  // 0..1
  };
  logoUrl?: string;         // header logo on the card (falls back to the brand logo)
  stampEmptyUrl?: string;   // icon for an uncollected stamp slot
  stampFilledUrl?: string;  // icon for a collected stamp
  rewardImageUrl?: string;  // image shown when the card is full / reward unlocked
  overlays?: OverlayElement[]; // decorative overlays (reserved; passed through)
  goal: number;             // stamps needed to unlock the reward (2..12)
  rewardLabel: string;      // e.g. "Free drink"
  // Emoji fallbacks used when no icon image is uploaded — a quick way to brand a
  // stamp/reward without an asset. Empty = use the built-in default (✓ / 🎁).
  stampEmoji?: string;
  rewardEmoji?: string;
}

export const DEFAULT_STAMP_CARD: StampCardAssets = { goal: 5, rewardLabel: "Free reward" };

export interface BrandStudioTheme {
  brandColor: string;
  brandFg: string;
  accentColor: string;
  bgColor: string;
  fontFamily: string;
}

export interface BrandTextStyle {
  font: string;        // "" = inherit theme font
  weight: number;      // 100..900
  spacing: number;     // em
  transform: "none" | "uppercase" | "lowercase" | "capitalize";
  color: string;       // "" = inherit
  size: number;        // base px (headline = titles, body = instructions)
}

export interface BrandStudioText {
  display: BrandTextStyle; // big / headline text (e.g. "CLASSIC")
  body: BrandTextStyle;    // small / supporting text (e.g. "smashburger")
}

export interface BrandStudioConfig {
  theme: BrandStudioTheme;
  palette: string[];          // colours extracted from the uploaded image
  logoUrl: string | null;
  text: BrandStudioText;
  games: Record<string, StudioGameAssets>;
  stampCard: StampCardAssets;
}

export const DEFAULT_STUDIO_TEXT: BrandStudioText = {
  display: { font: "", weight: 800, spacing: -0.02, transform: "uppercase", color: "", size: 30 },
  body:    { font: "", weight: 500, spacing: 0.04, transform: "none", color: "", size: 16 },
};

// CSS for the display/body text styling, scoped to `.studio-skin`.
export function studioTextCss(text: BrandStudioText, scope = ".studio-skin"): string {
  const d = text.display, b = text.body;
  const tt = (t: string) => (t !== "none" ? `text-transform:${t};` : "");
  return [
    `${scope}{font-weight:${b.weight};letter-spacing:${b.spacing}em;${tt(b.transform)}${b.color ? `color:${b.color};` : ""}}`,
    `${scope} .arcade-title,${scope} .arcade-display{font-weight:${d.weight} !important;letter-spacing:${d.spacing}em;${tt(d.transform)}${d.color ? `color:${d.color} !important;` : ""}}`,
  ].join("");
}

export const DEFAULT_STUDIO_THEME: BrandStudioTheme = {
  brandColor: "#6d28d9",
  brandFg: "#ffffff",
  accentColor: "#f59e0b",
  bgColor: "#faf7ff",
  fontFamily: "Fredoka",
};

export function defaultStudioConfig(): BrandStudioConfig {
  return {
    theme: { ...DEFAULT_STUDIO_THEME },
    palette: [],
    logoUrl: null,
    text: { display: { ...DEFAULT_STUDIO_TEXT.display }, body: { ...DEFAULT_STUDIO_TEXT.body } },
    games: {},
    stampCard: { ...DEFAULT_STAMP_CARD },
  };
}

const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Normalise a stored stampCard blob into a complete StampCardAssets.
function readStampCard(raw: unknown): StampCardAssets {
  const base = { ...DEFAULT_STAMP_CARD };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  const rb = o.bg && typeof o.bg === "object" ? (o.bg as Record<string, unknown>) : null;
  const bg =
    rb && typeof rb.url === "string" && rb.url
      ? {
          url: rb.url as string,
          x: Number(rb.x) || 0,
          y: Number(rb.y) || 0,
          scale: Number(rb.scale) || 1,
          opacity: rb.opacity == null ? 1 : Number(rb.opacity),
        }
      : undefined;
  return {
    goal: clampNum(Math.round(Number(o.goal) || base.goal), 2, 12),
    rewardLabel: typeof o.rewardLabel === "string" ? o.rewardLabel : base.rewardLabel,
    logoUrl: str(o.logoUrl),
    stampEmptyUrl: str(o.stampEmptyUrl),
    stampFilledUrl: str(o.stampFilledUrl),
    rewardImageUrl: str(o.rewardImageUrl),
    stampEmoji: str(o.stampEmoji),
    rewardEmoji: str(o.rewardEmoji),
    bg,
    overlays: Array.isArray(o.overlays) ? (o.overlays as OverlayElement[]) : undefined,
  };
}

// Normalise whatever JSON came back from the DB into a complete config.
export function readStudioConfig(raw: unknown): BrandStudioConfig {
  const base = defaultStudioConfig();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const theme = (o.theme ?? {}) as Partial<BrandStudioTheme>;
  const rawText = (o.text ?? {}) as Partial<BrandStudioText>;
  return {
    theme: { ...base.theme, ...theme },
    palette: Array.isArray(o.palette) ? (o.palette as string[]).filter((s) => typeof s === "string") : [],
    logoUrl: typeof o.logoUrl === "string" ? o.logoUrl : null,
    text: {
      display: { ...base.text.display, ...(rawText.display ?? {}) },
      body: { ...base.text.body, ...(rawText.body ?? {}) },
    },
    games: (o.games && typeof o.games === "object" ? (o.games as Record<string, StudioGameAssets>) : {}),
    stampCard: readStampCard(o.stampCard),
  };
}
