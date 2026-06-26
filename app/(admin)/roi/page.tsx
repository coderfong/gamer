import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRoiMetrics } from "@/lib/admin/loadRoiMetrics";
import { RoiCharts } from "@/components/admin/RoiCharts";
import { EmptyState } from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

// Compounding ROI: metrics that grow with tenure so the account becomes a
// growing asset, not a one-off novelty.
export default async function RoiPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const metrics = await loadRoiMetrics(supabase, admin);

  return (
    <div className="ad space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">ROI &amp; growth</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          The numbers that compound the longer you run — your customer list, repeat-visit rate, and
          value realized per customer.
        </p>
      </header>

      {metrics.series.length === 0 ? (
        <EmptyState
          icon="📈"
          title="No data yet"
          description="Once customers start playing and redeeming, your compounding growth metrics will appear here."
        />
      ) : (
        <RoiCharts metrics={metrics} />
      )}
    </div>
  );
}
