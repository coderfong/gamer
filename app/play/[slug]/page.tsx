import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GameWrapper } from "@/components/games/GameWrapper";
import { playUrl, qrGatingEnabled, verifySlug } from "@/lib/play/qrToken";
import type { CampaignRow, PrizeRow } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { k?: string };
}) {
  const supabase = createAdminClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!campaign) notFound();

  // QR-only gate: when enabled, the playable game is reachable only with the
  // signed token carried by the displayed QR/link.
  const token = typeof searchParams.k === "string" ? searchParams.k : null;
  if (qrGatingEnabled() && !verifySlug(params.slug, token)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-3">
          <div className="text-5xl">📷</div>
          <h1 className="text-2xl font-bold">{(campaign as CampaignRow).name}</h1>
          <p className="text-zinc-600">Scan the official QR code to play this game.</p>
        </div>
      </main>
    );
  }

  const { data: prizes } = await supabase
    .from("prizes")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("tier", { ascending: true });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = playUrl(appUrl, campaign.slug);

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
      accessToken={token}
    />
  );
}
