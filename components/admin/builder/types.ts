import type { GameType } from "@/lib/types/game";

export interface BuilderTheme {
  brandColor?: string;
  brandFg?: string;
  bgColor?: string;
  logoUrl?: string | null;
  headline?: string;
  fontFamily?: string;
}

// Extra settings that don't have dedicated campaign columns live in config.
export interface BuilderSettings {
  maxPlaysTotal?: number | null;
  requirePhone?: boolean;
  requireEmail?: boolean;
  redemptionInstructions?: string;
  prizeValidity?: string;
}

export interface PrizeDraft {
  id?: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number; // win probability as a 0..100 integer (relative draw weight)
  stock_total: number | null;
  is_loss: boolean;
  min_score: number | null; // skill games only
  // local-only: codes the user pasted but hasn't uploaded yet
  pendingCodes?: string[];
  // local-only: how many codes already exist in the DB for this prize
  existingCodeCount?: number;
}

export interface BuilderCampaign {
  id: string | null;
  brandId: string;
  name: string;
  slug: string | null;
  game_type: GameType | null;
  status: string;
  theme: BuilderTheme;
  config: Record<string, unknown> & { win_thresholds?: unknown };
  starts_at: string | null;
  ends_at: string | null;
  max_plays_per_player: number;
  require_capture: boolean;
  cooldown_hours: number;
}

export const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Playfair Display",
  "Roboto Mono",
] as const;
