"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { ChartBoundary } from "@/components/ChartBoundary";
import type { BrandDashboard } from "@/lib/portal/loadBrandDashboard";

const ACCENT = "#6d28d9";
const ACCENT2 = "#0ea5e9";
const BAR_COLORS = ["#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

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

function ChartCard({ title, subtitle, mounted, children }: { title: string; subtitle: string; mounted: boolean; children: React.ReactElement }) {
  return (
    <div className="ad-card p-4 space-y-3">
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="text-xs" style={{ color: "var(--ad-muted)" }}>{subtitle}</p>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        {/* Render the chart only after mount (avoids a recharts SSR/hydration
            mismatch) and inside a boundary (so a chart error can't blank the page). */}
        {mounted ? (
          <ChartBoundary fallback={<div className="grid h-full place-items-center text-xs" style={{ color: "var(--ad-faint)" }}>Chart unavailable</div>}>
            <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
          </ChartBoundary>
        ) : null}
      </div>
    </div>
  );
}

export function PortalDashboard({ data }: { data: BrandDashboard }) {
  const { stats, campaigns, playsByDay, signupsByDay, prizeBreakdown } = data;
  // Charts are client-only to avoid a recharts hydration mismatch (which can
  // blank the whole section on mobile). The stat cards + tables always render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fmtDay = (day: string) => new Date(day).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
  const playsData = playsByDay.map((d) => ({ label: fmtDay(d.day), plays: d.plays }));
  const signupsData = signupsByDay.map((d) => ({ label: fmtDay(d.day), signups: d.signups }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
        <Stat label="Total plays" value={String(stats.plays)} sub={`${stats.activeCampaigns} of ${stats.campaigns} games live`} />
        <Stat label="Unique customers" value={String(stats.uniqueCustomers)} sub={`${pct(stats.repeatRate)} came back 2+`} />
        <Stat label="Win rate" value={pct(stats.winRate)} sub={`${stats.vouchersRemaining} vouchers left`} />
        <Stat label="Redemptions" value={String(stats.redemptions)} sub={`${pct(stats.redemptionRate)} of wins claimed`} />
        <Stat label="Signups captured" value={String(stats.signups)} sub={`${stats.consented} marketing-consented`} />
        <Stat label="Marketing list" value={String(stats.consented)} sub="opted-in contacts" />
        <Stat label="Games live" value={String(stats.activeCampaigns)} />
        <Stat label="Campaigns" value={String(stats.campaigns)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Plays · last 30 days" subtitle="Daily completed plays across your games." mounted={mounted}>
          <AreaChart data={playsData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="pPlays" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Area type="monotone" dataKey="plays" name="Plays" stroke={ACCENT} fill="url(#pPlays)" strokeWidth={2} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Signups · last 30 days" subtitle="Emails captured from your play hub." mounted={mounted}>
          <AreaChart data={signupsData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="pSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT2} stopOpacity={0.35} />
                <stop offset="95%" stopColor={ACCENT2} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Area type="monotone" dataKey="signups" name="Signups" stroke={ACCENT2} fill="url(#pSignups)" strokeWidth={2} />
          </AreaChart>
        </ChartCard>
      </div>

      {prizeBreakdown.length > 0 ? (
        <ChartCard title="Prizes awarded" subtitle="Which prizes players have won." mounted={mounted}>
          <BarChart data={prizeBreakdown} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="Awarded" radius={[6, 6, 0, 0]}>
              {prizeBreakdown.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      ) : null}

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
