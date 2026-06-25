// Minimal hand-rolled DB types. Replace with `supabase gen types` once linked.

export type CampaignStatus = "draft" | "active" | "paused" | "ended";
export type PlayStatus = "started" | "completed" | "flagged" | "voided";

export interface CampaignRow {
  id: string;
  slug: string;
  name: string;
  game_type: string;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  theme: Record<string, unknown>;
  config: Record<string, unknown>;
  max_plays_per_player: number;
  require_capture: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrizeRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  tier: number;
  weight: number;
  stock_total: number | null;
  stock_remaining: number | null;
  is_loss: boolean;
  min_score: number | null;
  max_score: number | null;
  created_at: string;
}

export interface VoucherCodeRow {
  id: string;
  prize_id: string;
  code: string;
  claimed_at: string | null;
  claimed_by_play_id: string | null;
  redeemed_at: string | null;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  campaign_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  fingerprint: string | null;
  ip_hash: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  created_at: string;
}

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  created_at: string;
}

export interface PlayRow {
  id: string;
  campaign_id: string;
  player_id: string | null;
  prize_id: string | null;
  voucher_code_id: string | null;
  score: number | null;
  client_meta: Record<string, unknown>;
  ip_hash: string | null;
  status: PlayStatus;
  started_at: string;
  completed_at: string | null;
}

export interface DrawPrizeResult {
  prize_id: string | null;
  voucher_code_id: string | null;
  code: string | null;
}
