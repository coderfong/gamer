"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { BrandDashboard } from "@/lib/portal/loadBrandDashboard";

const ACCENT = "#6d28d9";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ad-card p-4">
      <div className="text-2xl font-extrabold" style={{ color: "var(--ad-ink)" }}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>{label}</div>
    </div>
  );
}

export function PortalDashboard({ data }: { data: BrandDashboard }) {
  const { stats, campaigns, playsByDay } = data;
  const chartData = playsByDay.map((d) => ({
    label: new Date(d.day).toLocaleDateString("en-SG", { day: "numeric", month: "short" }),
    plays: d.plays,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Campaigns" value={String(stats.campaigns)} />
        <Stat label="Total plays" value={String(stats.plays)} />
        <Stat label="Win rate" value={stats.winRate === null ? "—" : `${Math.round(stats.winRate * 100)}%`} />
        <Stat label="Redemptions" value={String(stats.redemptions)} />
        <Stat label="Signups" value={String(stats.signups)} />
        <Stat label="Consented" value={String(stats.consented)} />
      </div>

      <div className="ad-card p-4 space-y-3">
        <div>
          <h2 className="font-bold">Plays · last 30 days</h2>
          <p className="text-xs" style={{ color: "var(--ad-muted)" }}>Daily completed plays across your games.</p>
        </div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="portalPlays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="plays" name="Plays" stroke={ACCENT} fill="url(#portalPlays)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {campaigns.length > 0 ? (
        <div className="ad-card overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ad-border)" }}>
                {["Campaign", "Status", "Plays", "Wins"].map((h) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
