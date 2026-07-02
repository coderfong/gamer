import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { loadBrandDashboard } from "@/lib/portal/loadBrandDashboard";
import { loadLoyaltyStats } from "@/lib/loyalty/loadLoyaltyStats";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { BrandSignupsView } from "@/components/admin/BrandSignupsView";

export const dynamic = "force-dynamic";

// Read-only, single-brand client dashboard. Auth is the brand-scoped session
// cookie (set at /api/portal/login); no Supabase auth account involved.
export default async function PortalPage() {
  const token = cookies().get(PORTAL_COOKIE)?.value ?? null;
  const brandId = verifyBrandSession(token);
  if (!brandId) redirect("/portal/login");

  const admin = createAdminClient();
  const data = await loadBrandDashboard(admin, brandId);
  if (!data) redirect("/portal/login");
  const loyalty = await loadLoyaltyStats(admin, brandId);

  return (
    <PortalShell brandName={data.brandName}>
      <div>
        <h1 className="text-2xl font-extrabold">Your dashboard</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Live results for your rewards program and games — members, redemptions, plays, and the customers you&apos;ve captured.
        </p>
      </div>

      {/* Rewards program — the recurring product */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Rewards program</h2>
          <a href="/portal/members" className="text-sm font-semibold" style={{ color: "var(--ad-accent, #6D4AFF)" }}>Manage members →</a>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <LoyaltyStat label="Members" value={loyalty.members} />
          <LoyaltyStat label="Active stamp cards" value={loyalty.activeCards} />
          <LoyaltyStat label="Rewards ready" value={loyalty.vouchersOutstanding} />
          <LoyaltyStat label="Rewards redeemed" value={loyalty.redemptions} />
        </div>
      </section>

      <h2 className="text-lg font-bold">Game campaigns</h2>
      <PortalDashboard data={data} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Captured customers</h2>
        <BrandSignupsView brandName={data.brandName} signups={data.signups} />
      </section>
    </PortalShell>
  );
}

function LoyaltyStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8ee", borderRadius: 16, padding: 16, flex: "1 1 140px", minWidth: 140 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#191921" }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a2a2ad", marginTop: 2 }}>{label}</div>
    </div>
  );
}
