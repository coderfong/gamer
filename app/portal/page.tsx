import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { loadBrandDashboard } from "@/lib/portal/loadBrandDashboard";
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

  return (
    <PortalShell brandName={data.brandName}>
      <div>
        <h1 className="text-2xl font-extrabold">Your dashboard</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Live results for your games — plays, wins, redemptions, and the customers you&apos;ve captured.
        </p>
      </div>

      {/* TEMP DIAGNOSTIC — plain inline styles (no .ad-card / grid). If you can
          read these numbers on the phone but the cards below are blank, the issue
          is the card CSS on iOS Safari. */}
      <div style={{ border: "2px solid #6d28d9", borderRadius: 8, padding: 12, fontSize: 14, color: "#191921", background: "#fff" }}>
        <strong>Diagnostic:</strong> plays {data.stats.plays} · customers {data.stats.uniqueCustomers} · signups {data.stats.signups} · campaigns {data.stats.campaigns}
      </div>

      <PortalDashboard data={data} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Captured customers</h2>
        <BrandSignupsView brandName={data.brandName} signups={data.signups} />
      </section>
    </PortalShell>
  );
}
