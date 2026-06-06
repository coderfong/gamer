import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignCard } from "@/components/admin/CampaignCard";
import { DashboardToolbar } from "@/components/admin/DashboardToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
import { loadCampaignCards } from "@/lib/admin/loadCampaignCards";
import type { CampaignStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string; sort?: string; q?: string };

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { cards, createdAtById, error } = await loadCampaignCards(supabase);

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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
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
          description="Create your first prize-game campaign to get started."
          actionLabel="New campaign"
          actionHref="/campaigns/new"
        />
      )}
    </div>
  );
}
