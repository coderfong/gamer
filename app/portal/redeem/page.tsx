import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { RedeemScanner } from "@/components/portal/RedeemScanner";

export const dynamic = "force-dynamic";

// Scan-to-redeem tab in the client portal — vouchers can only be redeemed by
// scanning their QR with the phone camera here.
export default async function PortalRedeemPage() {
  const brandId = verifyBrandSession(cookies().get(PORTAL_COOKIE)?.value ?? null);
  if (!brandId) redirect("/portal/login");

  const admin = createAdminClient();
  const { data: brand } = await admin.from("brands").select("name").eq("id", brandId).maybeSingle();
  if (!brand) redirect("/portal/login");

  return (
    <PortalShell brandName={(brand as { name: string }).name}>
      <div>
        <h1 className="text-2xl font-extrabold">Redeem</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Scan a customer&apos;s winning voucher to redeem it in-store.
        </p>
      </div>
      <RedeemScanner />
    </PortalShell>
  );
}
