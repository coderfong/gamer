import { redirect } from "next/navigation";
import { getCurrentBrand } from "@/lib/admin/brand";
import { CampaignBuilder } from "@/components/admin/builder/CampaignBuilder";
import type { BuilderCampaign } from "@/components/admin/builder/types";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const brand = await getCurrentBrand();
  if (!brand) redirect("/login");

  const now = new Date();
  const in14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const initialCampaign: BuilderCampaign = {
    id: null,
    brandId: brand.id,
    name: "",
    slug: null,
    game_type: null,
    status: "draft",
    theme: {},
    config: {},
    starts_at: now.toISOString(),
    ends_at: in14d.toISOString(),
    max_plays_per_player: 1,
    require_capture: true,
    cooldown_hours: 24,
  };

  return <CampaignBuilder initialCampaign={initialCampaign} initialPrizes={[]} />;
}
