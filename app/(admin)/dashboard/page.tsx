import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignCard, type CampaignCardData } from "@/components/admin/CampaignCard";
import { DashboardToolbar } from "@/components/admin/DashboardToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
import type { CampaignStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string; sort?: string; q?: string };

interface PrizeLite {
  id: string;
  is_loss: boolean;
  stock_remaining: number | null;
}
interface CampaignWithPrizes {
  id: string;
  slug: string;
  name: string;
  game_type: string;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  prizes: PrizeLite[];
}
interface PlayLite {
  campaign_id: string;
  prize_id: string | null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select("name, subscription_tier, contact_email")
    .eq("owner_id", user.id)
    .maybeSingle();

  // Campaigns scoped by RLS (brands.owner_id = auth.uid()), with prizes for
  // voucher/win-rate math. Falls back gracefully if the schema isn't migrated.
  const { data: campaignRows, error: campaignsErr } = await supabase
    .from("campaigns")
    .select(
      "id, slug, name, game_type, status, starts_at, ends_at, created_at, prizes(id, is_loss, stock_remaining)",
    )
    .order("created_at", { ascending: false });

  const campaigns = (campaignRows ?? []) as unknown as CampaignWithPrizes[];

  // Plays for these campaigns, for plays_count + win_rate.
  let plays: PlayLite[] = [];
  if (campaigns.length > 0) {
    const { data: playRows } = await supabase
      .from("plays")
      .select("campaign_id, prize_id")
      .in(
        "campaign_id",
        campaigns.map((c) => c.id),
      )
      .eq("status", "completed");
    plays = (playRows ?? []) as PlayLite[];
  }

  // Index plays by campaign, and which prizes are "losses".
  const lossPrizeIds = new Set<string>();
  for (const c of campaigns) for (const p of c.prizes) if (p.is_loss) lossPrizeIds.add(p.id);

  const playsByCampaign = new Map<string, { total: number; wins: number }>();
  for (const play of plays) {
    const agg = playsByCampaign.get(play.campaign_id) ?? { total: 0, wins: 0 };
    agg.total += 1;
    if (play.prize_id && !lossPrizeIds.has(play.prize_id)) agg.wins += 1;
    playsByCampaign.set(play.campaign_id, agg);
  }

  const cards: CampaignCardData[] = campaigns.map((c) => {
    const agg = playsByCampaign.get(c.id) ?? { total: 0, wins: 0 };
    const vouchers = c.prizes
      .filter((p) => !p.is_loss && p.stock_remaining !== null)
      .reduce((sum, p) => sum + (p.stock_remaining ?? 0), 0);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      game_type: c.game_type,
      status: c.status,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      plays_count: agg.total,
      win_rate: agg.total > 0 ? agg.wins / agg.total : null,
      vouchers_remaining: vouchers,
      // carry created_at for sorting (not part of card props, kept locally)
    };
  });

  // ---- Apply filter / sort / search (URL-driven) ----
  const statusFilter = (searchParams.status ?? "all") as CampaignStatus | "all";
  const sort = searchParams.sort ?? "recent";
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const createdAtById = new Map(campaigns.map((c) => [c.id, c.created_at]));

  let visible = cards;
  if (statusFilter !== "all") visible = visible.filter((c) => c.status === statusFilter);
  if (q) visible = visible.filter((c) => c.name.toLowerCase().includes(q));

  visible = [...visible].sort((a, b) => {
    if (sort === "most_plays") return b.plays_count - a.plays_count;
    if (sort === "name_asc") return a.name.localeCompare(b.name);
    // recent (default)
    return (createdAtById.get(b.id) ?? "").localeCompare(createdAtById.get(a.id) ?? "");
  });

  const hasAnyCampaign = campaigns.length > 0 && !campaignsErr;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {brand?.name ?? "there"}</h1>
          <p className="text-sm text-zinc-600">
            {brand?.contact_email ?? user.email} · {brand?.subscription_tier ?? "—"}
          </p>
        </div>
        <a href="/campaigns/new" className="btn-brand shrink-0">
          New campaign
        </a>
      </header>

      {hasAnyCampaign ? (
        <>
          <DashboardToolbar />
          {visible.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="🔍"
              title="No campaigns match your filters"
              description="Try clearing the search or choosing a different status."
            />
          )}
        </>
      ) : (
        <EmptyState
          title="No campaigns yet"
          description="Create your first prize-game campaign to start collecting plays and growing your audience."
          actionLabel="New campaign"
          actionHref="/campaigns/new"
        />
      )}
    </div>
  );
}
