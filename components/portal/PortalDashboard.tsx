"use client";

import dynamic from "next/dynamic";
import type { BrandDashboard } from "@/lib/portal/loadBrandDashboard";

// NOTE: this view uses INLINE styles (not the .ad-card / grid utility classes) on
// purpose — some mobile Safari versions drop the custom .ad-* rules, which blanked
// the whole dashboard. Inline styles always render.

const PortalCharts = dynamic(() => import("./PortalCharts").then((m) => m.PortalCharts), {
  ssr: false,
  loading: () => <div style={CARD} />,
});

const CARD: React.CSSProperties = { background: "#ffffff", border: "1px solid #e8e8ee", borderRadius: 16 };
const INK = "#191921";
const MUTED = "#73737f";
const FAINT = "#a2a2ad";
const BORDER = "#e8e8ee";

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ ...CARD, padding: 16, flex: "1 1 140px", minWidth: 140 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: INK }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: FAINT, marginTop: 2 }}>{label}</div>
      {sub ? <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}

const th: React.CSSProperties = { padding: "12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: FAINT };
const td: React.CSSProperties = { padding: "12px", fontSize: 14 };

export function PortalDashboard({ data }: { data: BrandDashboard }) {
  const { stats, campaigns, playsByDay, signupsByDay, prizeBreakdown } = data;
  const fmtDay = (day: string) => new Date(day).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
  const playsData = playsByDay.map((d) => ({ label: fmtDay(d.day), plays: d.plays }));
  const signupsData = signupsByDay.map((d) => ({ label: fmtDay(d.day), signups: d.signups }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
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
        <div style={{ ...CARD, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Campaign", "Status", "Plays", "Wins", "Win rate"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                  <td style={{ ...td, color: MUTED, textTransform: "capitalize" }}>{c.status === "active" ? "Live" : c.status}</td>
                  <td style={td}>{c.plays}</td>
                  <td style={td}>{c.wins}</td>
                  <td style={td}>{c.plays > 0 ? `${Math.round((c.wins / c.plays) * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
