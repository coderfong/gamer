import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { playUrl } from "@/lib/play/qrToken";
import { ShareHub } from "@/components/admin/share/ShareHub";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) redirect("/login");

  const supabase = createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, slug, status, theme")
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) notFound();

  const theme = (campaign.theme ?? {}) as { brandColor?: string; headline?: string };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = playUrl(appUrl, campaign.slug);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">Share Hub</span>
        <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Dashboard
        </Link>
      </div>
      <ShareHub
        campaignName={campaign.name}
        shareUrl={shareUrl}
        status={campaign.status}
        brandColor={theme.brandColor}
        headline={theme.headline}
      />
    </div>
  );
}
