"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartBoundary } from "@/components/ChartBoundary";
import type { RoiMetrics, RoiPoint } from "@/lib/admin/loadRoiMetrics";

const ACCENT = "#6d28d9";

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="ad-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>{label}</div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: "var(--ad-ink)" }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--ad-muted)" }}>{sub}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  mounted,
  children,
}: {
  title: string;
  subtitle: string;
  mounted: boolean;
  children: React.ReactElement;
}) {
  return (
    <div className="ad-card p-4 space-y-3">
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs" style={{ color: "var(--ad-muted)" }}>{subtitle}</p>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        {/* Client-only + boundary: avoids a recharts SSR/hydration mismatch
            (which can blank the section on mobile) and isolates chart errors. */}
        {mounted ? (
          <ChartBoundary fallback={<div className="grid h-full place-items-center text-xs" style={{ color: "var(--ad-faint)" }}>Chart unavailable</div>}>
            <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
          </ChartBoundary>
        ) : null}
      </div>
    </div>
  );
}

export function RoiCharts({ metrics }: { metrics: RoiMetrics }) {
  const { series, totals } = metrics;
  const data: RoiPoint[] = series;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card label="Total customers" value={String(totals.customers)} sub="and counting" />
        <Card label="Repeat-visit rate" value={`${totals.repeatRatePct}%`} sub="2+ plays" />
        <Card label="Redemptions / customer" value={totals.redemptionsPerCustomer.toFixed(2)} sub="lifetime" />
      </div>

      <ChartCard title="Customer list growth" subtitle="Cumulative unique customers — the asset that compounds with tenure." mounted={mounted}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="roiCustomers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
              <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="cumulativeCustomers" name="Customers" stroke={ACCENT} fill="url(#roiCustomers)" strokeWidth={2} />
        </AreaChart>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Repeat-visit rate over time" subtitle="Share of customers who came back for 2+ plays." mounted={mounted}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="repeatRatePct" name="Repeat %" stroke={ACCENT} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Redemptions per customer" subtitle="Lifetime value realized per customer, growing over time." mounted={mounted}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals />
            <Tooltip />
            <Line type="monotone" dataKey="redemptionsPerCustomer" name="Redemptions/customer" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}
