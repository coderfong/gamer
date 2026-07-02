import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { loadLoyaltyStats } from "@/lib/loyalty/loadLoyaltyStats";
import { programConfig } from "@/lib/loyalty/loyalty";
import { PortalShell } from "@/components/portal/PortalShell";
import { MembersStaffClient } from "@/components/portal/MembersStaffClient";

export const dynamic = "force-dynamic";

// Staff tool: search a member by phone, add stamps, redeem the reward.
export default async function PortalMembersPage() {
  const brandId = verifyBrandSession(cookies().get(PORTAL_COOKIE)?.value ?? null);
  if (!brandId) redirect("/portal/login");

  const admin = createAdminClient();
  const { data: brand } = await admin.from("brands").select("name, studio").eq("id", brandId).maybeSingle();
  if (!brand) redirect("/portal/login");

  const b = brand as { name: string; studio: unknown };
  const stats = await loadLoyaltyStats(admin, brandId);
  const program = programConfig(b.studio);

  return (
    <PortalShell brandName={b.name}>
      <div>
        <h1 className="text-2xl font-extrabold">Members</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Search a customer by phone, add a stamp each visit, and redeem their reward when the card is full.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Stat label="Members" value={stats.members} />
        <Stat label="Active cards" value={stats.activeCards} />
        <Stat label="Rewards ready" value={stats.vouchersOutstanding} />
        <Stat label="Redeemed" value={stats.redemptions} />
      </div>

      <MembersStaffClient goal={program.goal} rewardLabel={program.rewardLabel} />
    </PortalShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8ee", borderRadius: 16, padding: 16, flex: "1 1 130px", minWidth: 130 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#191921" }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a2a2ad", marginTop: 2 }}>{label}</div>
    </div>
  );
}
