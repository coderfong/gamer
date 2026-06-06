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
    .select("id, name, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) notFound();

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
    <div className="space-y-6">
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

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-700">Recent redemptions</h2>
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Prize</th>
                <th className="text-left px-3 py-2">Redeemed by</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-zinc-600">{new Date(r.at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{r.code}</td>
                  <td className="px-3 py-2">{r.prizeName}</td>
                  <td className="px-3 py-2">{r.redeemedBy}</td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
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
