import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { GameWrapper } from "@/components/games/GameWrapper";
import { playUrl } from "@/lib/play/qrToken";
import type { CampaignRow, PrizeRow } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) redirect("/login");

  // RLS only returns the campaign if this brand owns it, so a foreign campaign
  // 404s here (and the play API enforces 403 on the actual preview calls).
  const supabase = createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) notFound();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("*")
    .eq("campaign_id", params.id)
    .order("tier", { ascending: true });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = playUrl(appUrl, (campaign as CampaignRow).slug);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-600">Previewing “{(campaign as CampaignRow).name}”</span>
        <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Dashboard
        </Link>
      </div>
      <div className="rounded-2xl border overflow-hidden">
        <GameWrapper
          campaign={{ ...(campaign as CampaignRow), prizes: (prizes as PrizeRow[]) ?? [] }}
          shareUrl={shareUrl}
          preview
        />
      </div>
    </div>
  );
}
