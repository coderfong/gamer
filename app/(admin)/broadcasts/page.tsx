import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCustomers } from "@/lib/admin/loadCustomers";
import { BroadcastComposer } from "@/components/admin/BroadcastComposer";
import { EmptyState } from "@/components/admin/EmptyState";
import type { BroadcastRow, CampaignStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-SG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Re-engagement: blast a segment of marketing-consented past contacts via Resend.
export default async function BroadcastsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { customers } = await loadCustomers(supabase, admin);
  const consentedCount = customers.filter((c) => c.marketingConsent && c.email).length;

  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select("id, name, status")
    .order("created_at", { ascending: false });
  const campaigns = (campaignRows ?? []) as Array<{ id: string; name: string; status: CampaignStatus }>;
  const campaignNameById = new Map(campaigns.map((c) => [c.id, c.name]));

  const { data: broadcastRows } = await supabase
    .from("broadcasts")
    .select("id, campaign_id, subject, recipients, sent, failed, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const broadcasts = (broadcastRows ?? []) as Array<Pick<BroadcastRow, "id" | "campaign_id" | "subject" | "recipients" | "sent" | "failed" | "created_at">>;

  return (
    <div className="ad space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Broadcasts</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Re-engage past customers who opted in. Every send goes only to marketing-consented contacts.
        </p>
      </header>

      <BroadcastComposer consentedCount={consentedCount} campaigns={campaigns} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">History</h2>
        {broadcasts.length === 0 ? (
          <EmptyState icon="🕓" title="No broadcasts yet" description="Your sent broadcasts will appear here with their delivery stats." />
        ) : (
          <div className="ad-card overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ad-border)" }}>
                  {["Sent", "Subject", "Campaign", "Recipients", "Delivered", "Failed"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--ad-border)" }}>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: "var(--ad-muted)" }}>{fmtDate(b.created_at)}</td>
                    <td className="px-3 py-3 font-semibold">{b.subject}</td>
                    <td className="px-3 py-3" style={{ color: "var(--ad-muted)" }}>{b.campaign_id ? campaignNameById.get(b.campaign_id) ?? "—" : "—"}</td>
                    <td className="px-3 py-3">{b.recipients}</td>
                    <td className="px-3 py-3">{b.sent}</td>
                    <td className="px-3 py-3">{b.failed || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
