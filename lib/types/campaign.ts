import type { CampaignRow, PrizeRow } from "./database";

export interface FreeTextBlock {
  x: number; // px from container left
  y: number; // px from container top
  fontSize: number; // px
  align?: "left" | "center";
}

export type OverlayAnimation =
  | "none" | "float" | "spin" | "pulse" | "bounce" | "shake"
  | "wiggle" | "swing" | "rubber-band" | "heartbeat" | "jello" | "tada";

export interface OverlayElement {
  id: string;
  imageUrl: string;
  x: number;        // px from container left
  y: number;        // px from container top
  width: number;    // px
  height: number;   // px
  rotation: number; // degrees
  /** Legacy single animation — kept for back-compat. Prefer `animations`. */
  animation: OverlayAnimation;
  /** Multiple animations applied simultaneously (composed via nested layers). */
  animations?: OverlayAnimation[];
  opacity: number;  // 0–1
  flipH?: boolean;
  flipV?: boolean;
}

export interface Theme {
  brandColor?: string;
  brandFg?: string;
  bgColor?: string;
  bgImageUrl?: string;
  logoUrl?: string | null;
  headline?: string;
  fontFamily?: string;
  nameBlock?: FreeTextBlock;
  headlineBlock?: FreeTextBlock;
  overlayElements?: OverlayElement[];
}

export interface CampaignWithPrizes extends CampaignRow {
  prizes: PrizeRow[];
}

export function readTheme(c: Pick<CampaignRow, "theme">): Theme {
  return (c.theme || {}) as Theme;
}
