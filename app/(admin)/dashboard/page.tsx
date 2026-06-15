import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignCard } from "@/components/admin/CampaignCard";
import { DashboardToolbar } from "@/components/admin/DashboardToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
import { loadCampaignCards } from "@/lib/admin/loadCampaignCards";
import type { CampaignStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string; sort?: string; q?: string };

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
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { cards, createdAtById, error } = await loadCampaignCards(supabase);

  // ---- Apply filter / sort / search (URL-driven) ----
  const statusFilter = (searchParams.status ?? "all") as CampaignStatus | "all";
  const sort = searchParams.sort ?? "recent";
  const q = (searchParams.q ?? "").trim().toLowerCase();

  let visible = cards;
  if (statusFilter !== "all") visible = visible.filter((c) => c.status === statusFilter);
  if (q) visible = visible.filter((c) => c.name.toLowerCase().includes(q));
  visible = [...visible].sort((a, b) => {
    if (sort === "most_plays") return b.plays_count - a.plays_count;
    if (sort === "name_asc") return a.name.localeCompare(b.name);
    return (createdAtById.get(b.id) ?? "").localeCompare(createdAtById.get(a.id) ?? "");
  });

  const hasAnyCampaign = cards.length > 0 && !error;
  const liveCount = cards.filter((c) => c.status === "active").length;
  const totalPlays = cards.reduce((sum, c) => sum + c.plays_count, 0);
  const vouchersLeft = cards.reduce((sum, c) => sum + c.vouchers_remaining, 0);

  return (
    <div className="ad space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Welcome back, {brand?.name ?? "there"}</h1>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            {brand?.contact_email ?? user.email} · {brand?.subscription_tier ?? "—"}
          </p>
        </div>
        <a href="/campaigns/new" className="ad-btn ad-btn-primary shrink-0">
          + New campaign
        </a>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Campaigns" value={cards.length} />
        <StatCard label="Live now" value={liveCount} accent />
        <StatCard label="Total plays" value={totalPlays} />
        <StatCard label="Vouchers left" value={vouchersLeft} />
      </div>

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

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="ad-card p-4">
      <div
        className="text-2xl font-extrabold"
        style={{ color: accent ? "var(--ad-accent)" : "var(--ad-ink)" }}
      >
        {value}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>
        {label}
      </div>
    </div>
  );
}
