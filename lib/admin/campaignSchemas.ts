import { z } from "zod";
import { GAME_META } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";

const gameTypeValues = Object.keys(GAME_META) as [GameType, ...GameType[]];

export const createCampaignSchema = z.object({
  game_type: z.enum(gameTypeValues),
  name: z.string().trim().min(1).max(120).optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

const freeTextBlockSchema = z.object({
  x: z.number(),
  y: z.number(),
  fontSize: z.number(),
  align: z.enum(["left", "center"]).optional(),
});

const overlayElementSchema = z.object({
  id:        z.string().max(64),
  imageUrl:  z.string().url().max(1000),
  x:         z.number(),
  y:         z.number(),
  width:     z.number().min(1),
  height:    z.number().min(1),
  rotation:  z.number(),
  animation: z.enum(["none", "float", "spin", "pulse", "bounce", "shake", "wiggle", "swing", "rubber-band", "heartbeat", "jello", "tada"]),
  opacity:   z.number().min(0).max(1),
  flipH:     z.boolean().optional(),
  flipV:     z.boolean().optional(),
});

const themeSchema = z
  .object({
    brandColor:      z.string().max(32).optional(),
    brandFg:         z.string().max(32).optional(),
    bgColor:         z.string().max(32).optional(),
    bgImageUrl:      z.string().url().max(1000).nullable().optional(),
    logoUrl:         z.string().url().max(1000).nullable().optional(),
    headline:        z.string().max(200).optional(),
    fontFamily:      z.string().max(120).optional(),
    nameBlock:       freeTextBlockSchema.optional(),
    headlineBlock:   freeTextBlockSchema.optional(),
    overlayElements: z.array(overlayElementSchema).max(20).optional(),
  })
  .passthrough(); // allow future theme keys without breaking saves

// All fields optional — PATCH is partial. Empty object is a no-op.
export const updateCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    game_type: z.enum(gameTypeValues).optional(),
    theme: themeSchema.optional(),
    config: z.record(z.unknown()).optional(),
    starts_at: z.string().datetime().nullable().optional(),
    ends_at: z.string().datetime().nullable().optional(),
    max_plays_per_player: z.number().int().min(0).max(1000).optional(),
    require_capture: z.boolean().optional(),
    cooldown_hours: z.number().int().min(0).max(24 * 365).optional(),
  })
  .strict();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const prizeInputSchema = z.object({
  id: z.string().uuid().optional(), // present = update existing
  name: z.string().trim().min(1).max(160),
  description: z.string().max(1000).nullable().optional(),
  image_url: z.string().url().max(1000).nullable().optional(),
  tier: z.number().int().min(1).max(99),
  weight: z.number().int().min(0).max(100),
  stock_total: z.number().int().min(0).max(1_000_000).nullable().optional(),
  is_loss: z.boolean().optional(),
  min_score: z.number().int().min(0).max(1_000_000).nullable().optional(),
});
export type PrizeInput = z.infer<typeof prizeInputSchema>;

export const prizesPutSchema = z.object({
  prizes: z.array(prizeInputSchema).max(50),
});

export const voucherCodesSchema = z.object({
  prize_id: z.string().uuid(),
  codes: z.array(z.string().trim().min(1).max(200)).min(1).max(50_000),
});
export type VoucherCodesInput = z.infer<typeof voucherCodesSchema>;
