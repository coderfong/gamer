import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { RedemptionClient } from "@/components/admin/redemptions/RedemptionClient";

export const dynamic = "force-dynamic";

export default async function RedemptionsPage({ params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) redirect("/login");

  const supabase = createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, status, theme")
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) notFound();

  const theme = (campaign.theme ?? {}) as { brandColor?: string; brandFg?: string };

  const { data: recentRows } = await supabase
    .from("redemptions")
    .select("id, redeemed_by, created_at, voucher_codes!inner(code, prizes!inner(name, campaign_id))")
    .eq("voucher_codes.prizes.campaign_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const recent = (recentRows ?? []).map((r) => {
    const vc = (Array.isArray(r.voucher_codes) ? r.voucher_codes[0] : r.voucher_codes) as
      | { code: string; prizes: { name: string } | { name: string }[] }
      | null;
    const prize = vc ? (Array.isArray(vc.prizes) ? vc.prizes[0] : vc.prizes) : null;
    return {
      id: r.id,
      code: vc?.code ?? "—",
      prizeName: prize?.name ?? "—",
      redeemedBy: r.redeemed_by ?? "—",
      at: r.created_at,
    };
  });

  return (
    <div
      className="space-y-6"
      style={
        {
          "--brand-color": theme.brandColor ?? "#6d28d9",
          "--brand-fg": theme.brandFg ?? "#ffffff",
        } as React.CSSProperties
      }
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-zinc-600">Redemptions · {campaign.status}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Dashboard
        </Link>
      </header>

      <RedemptionClient campaignId={campaign.id} />

      <section className="arcade-shell sticker-lg rounded-3xl p-5 sm:p-6">
        <h2 className="arcade-title text-lg mb-3">Recent redemptions</h2>
        <div className="overflow-hidden rounded-xl sticker-sm bg-[var(--paper)]">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Prize</th>
                <th className="text-left px-3 py-2">Redeemed by</th>
              </tr>
            </thead>
            <tbody className="text-[var(--ink)]">
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-black/10">
                  <td className="px-3 py-2 text-zinc-500">{new Date(r.at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{r.code}</td>
                  <td className="px-3 py-2">{r.prizeName}</td>
                  <td className="px-3 py-2">{r.redeemedBy}</td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center arcade-muted">
                    No redemptions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
