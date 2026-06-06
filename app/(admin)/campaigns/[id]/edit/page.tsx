import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { CampaignBuilder } from "@/components/admin/builder/CampaignBuilder";
import type { BuilderCampaign, BuilderTheme, PrizeDraft } from "@/components/admin/builder/types";
import type { GameType } from "@/lib/types/game";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) redirect("/login");

  const supabase = createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "id, slug, name, game_type, status, theme, config, starts_at, ends_at, max_plays_per_player, require_capture, cooldown_hours",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) notFound();

  const { data: prizeRows } = await supabase
    .from("prizes")
    .select("id, name, description, image_url, weight, stock_total, is_loss, min_score, voucher_codes(count)")
    .eq("campaign_id", params.id)
    .order("tier", { ascending: true });

  const initialCampaign: BuilderCampaign = {
    id: campaign.id,
    brandId: brand.id,
    name: campaign.name,
    slug: campaign.slug,
    game_type: campaign.game_type as GameType,
    status: campaign.status,
    theme: (campaign.theme ?? {}) as BuilderTheme,
    config: (campaign.config ?? {}) as Record<string, unknown>,
    starts_at: campaign.starts_at,
    ends_at: campaign.ends_at,
    max_plays_per_player: campaign.max_plays_per_player,
    require_capture: campaign.require_capture,
    cooldown_hours: campaign.cooldown_hours,
  };

  const initialPrizes: PrizeDraft[] = (prizeRows ?? []).map((p) => {
    const vc = p.voucher_codes as unknown as Array<{ count: number }> | null;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      image_url: p.image_url,
      weight: p.weight,
      stock_total: p.stock_total,
      is_loss: p.is_loss,
      min_score: p.min_score,
      pendingCodes: [],
      existingCodeCount: Array.isArray(vc) ? vc[0]?.count ?? 0 : 0,
    };
  });

  return <CampaignBuilder initialCampaign={initialCampaign} initialPrizes={initialPrizes} />;
}
