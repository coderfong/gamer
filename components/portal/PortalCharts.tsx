"use client";

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { ChartBoundary } from "@/components/ChartBoundary";

const ACCENT = "#6d28d9";
const ACCENT2 = "#0ea5e9";
const BAR_COLORS = ["#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactElement }) {
  return (
    <div className="ad-card p-4 space-y-3">
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="text-xs" style={{ color: "var(--ad-muted)" }}>{subtitle}</p>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ChartBoundary fallback={<div className="grid h-full place-items-center text-xs" style={{ color: "var(--ad-faint)" }}>Chart unavailable</div>}>
          <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        </ChartBoundary>
      </div>
    </div>
  );
}

// All recharts usage lives here so it can be lazily loaded (ssr:false) — keeping
// the charting library out of the dashboard's main bundle, so the dashboard
// cards/tables render even if recharts fails to load on a given device.
export function PortalCharts({
  playsData,
  signupsData,
  prizeBreakdown,
}: {
  playsData: Array<{ label: string; plays: number }>;
  signupsData: Array<{ label: string; signups: number }>;
  prizeBreakdown: Array<{ name: string; count: number }>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Plays · last 30 days" subtitle="Daily completed plays across your games.">
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

        <ChartCard title="Signups · last 30 days" subtitle="Emails captured from your play hub.">
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
        <ChartCard title="Prizes awarded" subtitle="Which prizes players have won.">
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
    </div>
  );
}
