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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
        <div className="ad-card overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ad-border)" }}>
                {["Captured", "Email", "Name", "Game", "Result", "Consent"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--ad-border)" }}>
                  <td className="px-3 py-3 whitespace-nowrap" style={{ color: "var(--ad-muted)" }}>{fmtDate(s.created_at)}</td>
                  <td className="px-3 py-3">
                    <a href={`mailto:${s.email}`} className="underline" style={{ color: "var(--ad-accent)" }}>{s.email}</a>
                  </td>
                  <td className="px-3 py-3">{s.name || "—"}</td>
                  <td className="px-3 py-3" style={{ color: "var(--ad-muted)" }}>{s.game_type ? getGameMeta(s.game_type).label : "—"}</td>
                  <td className="px-3 py-3">{s.won === null ? "—" : s.won ? "Won" : "Lost"}</td>
                  <td className="px-3 py-3">
                    {s.marketing_consent ? (
                      <span style={{ color: "var(--ad-accent-ink)", fontWeight: 700 }}>Yes</span>
                    ) : (
                      <span style={{ color: "var(--ad-faint)" }}>No</span>
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
    <div className="ad-card p-4">
      <div className="text-2xl font-extrabold" style={{ color: "var(--ad-ink)" }}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>{label}</div>
    </div>
  );
}
