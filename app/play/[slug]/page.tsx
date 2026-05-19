import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GameWrapper } from "@/components/games/GameWrapper";
import type { CampaignRow, PrizeRow } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!campaign) notFound();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("tier", { ascending: true });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = `${appUrl}/play/${campaign.slug}`;

  if (campaign.status !== "active") {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-3">
          <h1 className="text-2xl font-bold">{(campaign as CampaignRow).name}</h1>
          <p className="text-zinc-600">This campaign isn&apos;t accepting plays right now.</p>
        </div>
      </main>
    );
  }

  return (
    <GameWrapper
      campaign={{ ...(campaign as CampaignRow), prizes: (prizes as PrizeRow[]) ?? [] }}
      shareUrl={shareUrl}
    />
  );
}
