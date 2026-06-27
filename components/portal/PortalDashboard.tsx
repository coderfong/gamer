"use client";

import dynamic from "next/dynamic";
import type { BrandDashboard } from "@/lib/portal/loadBrandDashboard";

// Charts are loaded lazily and client-only (ssr:false), so the recharts library
// is NOT in this component's bundle. The stat cards + tables below always render
// even if the chart chunk fails to load on a given device.
const PortalCharts = dynamic(() => import("./PortalCharts").then((m) => m.PortalCharts), {
  ssr: false,
  loading: () => <div className="ad-card p-4" style={{ height: 120 }} />,
});

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ad-card p-4">
      <div className="text-2xl font-extrabold" style={{ color: "var(--ad-ink)" }}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>{label}</div>
      {sub ? <div className="text-xs mt-0.5" style={{ color: "var(--ad-muted)" }}>{sub}</div> : null}
    </div>
  );
}

export function PortalDashboard({ data }: { data: BrandDashboard }) {
  const { stats, campaigns, playsByDay, signupsByDay, prizeBreakdown } = data;
  const fmtDay = (day: string) => new Date(day).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
  const playsData = playsByDay.map((d) => ({ label: fmtDay(d.day), plays: d.plays }));
  const signupsData = signupsByDay.map((d) => ({ label: fmtDay(d.day), signups: d.signups }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total plays" value={String(stats.plays)} sub={`${stats.activeCampaigns} of ${stats.campaigns} games live`} />
        <Stat label="Unique customers" value={String(stats.uniqueCustomers)} sub={`${pct(stats.repeatRate)} came back 2+`} />
        <Stat label="Win rate" value={pct(stats.winRate)} sub={`${stats.vouchersRemaining} vouchers left`} />
        <Stat label="Redemptions" value={String(stats.redemptions)} sub={`${pct(stats.redemptionRate)} of wins claimed`} />
        <Stat label="Signups captured" value={String(stats.signups)} sub={`${stats.consented} marketing-consented`} />
        <Stat label="Marketing list" value={String(stats.consented)} sub="opted-in contacts" />
        <Stat label="Games live" value={String(stats.activeCampaigns)} />
        <Stat label="Campaigns" value={String(stats.campaigns)} />
      </div>

      <PortalCharts playsData={playsData} signupsData={signupsData} prizeBreakdown={prizeBreakdown} />

      {campaigns.length > 0 ? (
        <div className="ad-card overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ad-border)" }}>
                {["Campaign", "Status", "Plays", "Wins", "Win rate"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--ad-border)" }}>
                  <td className="px-3 py-3 font-semibold">{c.name}</td>
                  <td className="px-3 py-3 capitalize" style={{ color: "var(--ad-muted)" }}>{c.status === "active" ? "Live" : c.status}</td>
                  <td className="px-3 py-3">{c.plays}</td>
                  <td className="px-3 py-3">{c.wins}</td>
                  <td className="px-3 py-3">{c.plays > 0 ? `${Math.round((c.wins / c.plays) * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
