import type { GameType } from "@/lib/types/game";
import type { FreeTextBlock, OverlayElement } from "@/lib/types/campaign";

export interface BuilderTheme {
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

// Extra settings that don't have dedicated campaign columns live in config.
export interface BuilderSettings {
  maxPlaysTotal?: number | null;
  requirePhone?: boolean;
  requireEmail?: boolean;
  redemptionInstructions?: string;
  prizeValidity?: string;
  // Return-visit reward (collect-and-win): award a reserved prize tier on every
  // Nth completed play by the same contact. Needs max plays per contact >= target.
  returnReward?: { enabled?: boolean; target?: number; tier?: number };
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

export const FONT_OPTIONS: { label: string; value: string }[] = [
  // Display / arcade
  { label: "Luckiest Guy", value: "Luckiest Guy" },
  { label: "Bungee", value: "Bungee" },
  { label: "Titan One", value: "Titan One" },
  { label: "Bangers", value: "Bangers" },
  { label: "Righteous", value: "Righteous" },
  { label: "Russo One", value: "Russo One" },
  { label: "Oswald", value: "Oswald" },
  // Friendly / rounded
  { label: "Fredoka", value: "Fredoka" },
  { label: "Nunito", value: "Nunito" },
  { label: "Poppins", value: "Poppins" },
  { label: "Outfit", value: "Outfit" },
  { label: "Pacifico", value: "Pacifico" },
  // Clean / modern
  { label: "Inter", value: "Inter" },
  { label: "Plus Jakarta Sans", value: "Plus Jakarta Sans" },
  { label: "Space Grotesk", value: "Space Grotesk" },
  { label: "Raleway", value: "Raleway" },
  { label: "Montserrat", value: "Montserrat" },
  // Serif
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Lora", value: "Lora" },
  // Script / handwriting
  { label: "Lobster", value: "Lobster" },
  { label: "Satisfy", value: "Satisfy" },
  // Monospace
  { label: "JetBrains Mono", value: "JetBrains Mono" },
  { label: "Roboto Mono", value: "Roboto Mono" },
];
