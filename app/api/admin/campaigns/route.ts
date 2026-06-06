import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { createCampaignSchema } from "@/lib/admin/campaignSchemas";
import { GAME_META } from "@/lib/games/gameMeta";
import { slugify } from "@/lib/utils/slug";
import type { GameType } from "@/lib/types/game";

export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /api/admin/campaigns — create a draft campaign for the current brand.
export async function POST(req: NextRequest) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in to create a campaign.", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const gameType = parsed.data.game_type as GameType;
  if (!GAME_META[gameType]?.enabled) {
    return err("game_disabled", "That game type isn’t available yet.", 400);
  }

  const name = parsed.data.name?.trim() || `${GAME_META[gameType].label} campaign`;
  const slug = `${slugify(name) || "campaign"}-${Math.random().toString(36).slice(2, 8)}`;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      brand_id: brand.id,
      game_type: gameType,
      name,
      slug,
      status: "draft",
      theme: {},
      config: {},
    })
    .select("id, slug")
    .single();

  if (error) return err("create_failed", error.message, 500);
  return NextResponse.json({ id: data.id, slug: data.slug });
}
