"use client";

import { useMemo, useState } from "react";
import { getGameMeta } from "@/lib/games/gameMeta";
import { EmptyState } from "@/components/admin/EmptyState";

export interface SignupRow {
  id: string;
  email: string;
  name: string | null;
  game_type: string | null;
  won: boolean | null;
  marketing_consent: boolean;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-SG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function csvCell(v: string | number | boolean | null): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function BrandSignupsView({ brandName, signups }: { brandName: string; signups: SignupRow[] }) {
  const [q, setQ] = useState("");
  const [consentedOnly, setConsentedOnly] = useState(false);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return signups.filter((s) => {
      if (consentedOnly && !s.marketing_consent) return false;
      if (!needle) return true;
      return s.email.toLowerCase().includes(needle) || (s.name ?? "").toLowerCase().includes(needle);
    });
  }, [signups, q, consentedOnly]);

  const consentedCount = useMemo(() => signups.filter((s) => s.marketing_consent).length, [signups]);

  function exportCsv() {
    const header = ["Captured", "Email", "Name", "Game", "Won", "Marketing consent"];
    const rows = visible.map((s) => [
      s.created_at, s.email, s.name, s.game_type ? getGameMeta(s.game_type).label : "", s.won, s.marketing_consent,
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandName.replace(/\s+/g, "-").toLowerCase()}-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (signups.length === 0) {
    return (
      <EmptyState
        icon="📥"
        title="No signups yet"
        description="When someone plays this brand's hub and enters their email, they'll appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Stat label="Total signups" value={String(signups.length)} />
        <Stat label="Marketing-consented" value={String(consentedCount)} />
        <Stat label="Win-claims" value={String(signups.filter((s) => s.won).length)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or name…"
          className="min-w-[180px] flex-1 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--ad-border)" }}
        />
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ad-muted)" }}>
          <input type="checkbox" checked={consentedOnly} onChange={(e) => setConsentedOnly(e.target.checked)} />
          Consented only
        </label>
        <button type="button" onClick={exportCsv} className="ad-btn ad-btn-ghost" disabled={visible.length === 0}>
          Export CSV
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="🔍" title="No matches" description="Try a different search or clear the consent filter." />
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e8e8ee", borderRadius: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e8e8ee" }}>
                {["Captured", "Email", "Name", "Game", "Result", "Consent"].map((h) => (
                  <th key={h} style={{ padding: 12, textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a2a2ad" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #e8e8ee" }}>
                  <td style={{ padding: 12, whiteSpace: "nowrap", color: "#73737f" }}>{fmtDate(s.created_at)}</td>
                  <td style={{ padding: 12 }}>
                    <a href={`mailto:${s.email}`} style={{ color: "#6D4AFF", textDecoration: "underline" }}>{s.email}</a>
                  </td>
                  <td style={{ padding: 12 }}>{s.name || "—"}</td>
                  <td style={{ padding: 12, color: "#73737f" }}>{s.game_type ? getGameMeta(s.game_type).label : "—"}</td>
                  <td style={{ padding: 12 }}>{s.won === null ? "—" : s.won ? "Won" : "Lost"}</td>
                  <td style={{ padding: 12 }}>
                    {s.marketing_consent ? (
                      <span style={{ color: "#4A2FCC", fontWeight: 700 }}>Yes</span>
                    ) : (
                      <span style={{ color: "#a2a2ad" }}>No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8ee", borderRadius: 16, padding: 16, flex: "1 1 140px", minWidth: 140 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#191921" }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a2a2ad" }}>{label}</div>
    </div>
  );
}
