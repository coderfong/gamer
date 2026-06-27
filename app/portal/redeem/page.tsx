import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { loadBrandRedemptions } from "@/lib/portal/loadBrandRedemptions";
import { PortalShell } from "@/components/portal/PortalShell";
import { RedeemScanner } from "@/components/portal/RedeemScanner";
import { EmptyState } from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-SG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Scan-to-redeem tab in the client portal — vouchers can only be redeemed by
// scanning their QR with the phone camera here.
export default async function PortalRedeemPage() {
  const brandId = verifyBrandSession(cookies().get(PORTAL_COOKIE)?.value ?? null);
  if (!brandId) redirect("/portal/login");

  const admin = createAdminClient();
  const { data: brand } = await admin.from("brands").select("name").eq("id", brandId).maybeSingle();
  if (!brand) redirect("/portal/login");

  const redemptions = await loadBrandRedemptions(admin, brandId);

  return (
    <PortalShell brandName={(brand as { name: string }).name}>
      <div>
        <h1 className="text-2xl font-extrabold">Redeem</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Scan a customer&apos;s winning voucher to redeem it in-store.
        </p>
      </div>

      <RedeemScanner />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Redemption history</h2>
        {redemptions.length === 0 ? (
          <EmptyState icon="🎟️" title="No redemptions yet" description="Vouchers you redeem will be listed here, newest first." />
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e8e8ee", borderRadius: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e8ee" }}>
                  {["Redeemed", "Prize", "Code", "Customer"].map((h) => (
                    <th key={h} style={{ padding: 12, textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a2a2ad" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r, i) => (
                  <tr key={`${r.code}-${i}`} style={{ borderBottom: "1px solid #e8e8ee" }}>
                    <td style={{ padding: 12, whiteSpace: "nowrap", color: "#73737f" }}>{fmt(r.redeemedAt)}</td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{r.prizeName ?? "—"}</td>
                    <td style={{ padding: 12, fontFamily: "monospace", fontSize: 12 }}>{r.code}</td>
                    <td style={{ padding: 12, color: "#73737f" }}>{r.contact ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
