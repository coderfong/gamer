import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { AnalyticsClient, type AnalyticsPlay } from "@/components/admin/analytics/AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) redirect("/login");

  const supabase = createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, slug, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) notFound();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name, is_loss, stock_remaining")
    .eq("campaign_id", params.id)
    .order("tier", { ascending: true });

  const { data: playRows } = await supabase
    .from("plays")
    .select(
      "id, started_at, completed_at, status, prizes(name, is_loss), players(email, phone)",
    )
    .eq("campaign_id", params.id)
    .in("status", ["completed", "flagged"])
    .order("started_at", { ascending: false });

  const plays: AnalyticsPlay[] = (playRows ?? []).map((p) => {
    const prize = (Array.isArray(p.prizes) ? p.prizes[0] : p.prizes) as
      | { name: string; is_loss: boolean }
      | null;
    const player = (Array.isArray(p.players) ? p.players[0] : p.players) as
      | { email: string | null; phone: string | null }
      | null;
    return {
      id: p.id,
      started_at: p.started_at,
      completed_at: p.completed_at,
      status: p.status,
      prize_name: prize?.name ?? null,
      is_loss: prize?.is_loss ?? null,
      email: player?.email ?? null,
      phone: player?.phone ?? null,
    };
  });

  // Re-engagement: broadcasts that promoted this campaign (Phase 3).
  const { data: broadcastRows } = await supabase
    .from("broadcasts")
    .select("sent")
    .eq("campaign_id", params.id);
  const broadcastCount = broadcastRows?.length ?? 0;
  const broadcastEmailsSent = (broadcastRows ?? []).reduce((sum, b) => sum + (b.sent ?? 0), 0);

  const vouchersRemaining = (prizes ?? [])
    .filter((p) => !p.is_loss && p.stock_remaining !== null)
    .reduce((sum, p) => sum + (p.stock_remaining ?? 0), 0);

  const prizeNames = Array.from(
    new Set((prizes ?? []).filter((p) => !p.is_loss).map((p) => p.name)),
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-zinc-600">Analytics · {campaign.status}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Dashboard
        </Link>
      </header>

      {broadcastCount > 0 ? (
        <div
          className="rounded-lg px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--ad-accent-soft, #f5f3ff)", color: "var(--ad-accent-ink, #5b21b6)" }}
        >
          📣 Re-engagement: {broadcastCount} broadcast{broadcastCount === 1 ? "" : "s"} · {broadcastEmailsSent} email
          {broadcastEmailsSent === 1 ? "" : "s"} sent promoting this campaign.
        </div>
      ) : null}

      <AnalyticsClient
        plays={plays}
        vouchersRemaining={vouchersRemaining}
        prizeNames={prizeNames}
        campaignName={campaign.name}
      />
    </div>
  );
}
