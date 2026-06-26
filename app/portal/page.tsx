import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { loadBrandDashboard } from "@/lib/portal/loadBrandDashboard";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
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
    <div className="ad" style={{ minHeight: "100vh", background: "var(--ad-bg)" }}>
      <header
        className="flex items-center justify-between px-6"
        style={{ height: 58, borderBottom: "1px solid var(--ad-border)", background: "var(--ad-surface)" }}
      >
        <div className="font-extrabold">{data.brandName}</div>
        <form action="/api/portal/logout" method="post">
          <button type="submit" className="ad-btn ad-btn-ghost" style={{ padding: "7px 13px" }}>Sign out</button>
        </form>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-extrabold">Your dashboard</h1>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            Live results for your games — plays, wins, redemptions, and the customers you&apos;ve captured.
          </p>
        </div>

        <PortalDashboard data={data} />

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Captured customers</h2>
          <BrandSignupsView brandName={data.brandName} signups={data.signups} />
        </section>
      </main>
    </div>
  );
}
