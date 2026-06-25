"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/admin/EmptyState";
import { inSegment, type CustomerRow, type CustomerSegment, LAPSED_DAYS } from "@/lib/admin/loadCustomers";

const SEGMENTS: Array<{ value: CustomerSegment; label: string }> = [
  { value: "all", label: "All" },
  { value: "winners", label: "Winners" },
  { value: "repeat", label: "Repeat players" },
  { value: "lapsed", label: `Lapsed (${LAPSED_DAYS}d+)` },
  { value: "consented", label: "Marketing-consented" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

function csvCell(v: string | number | boolean | null): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function CustomersView({ customers, errored }: { customers: CustomerRow[]; errored: boolean }) {
  const [segment, setSegment] = useState<CustomerSegment>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<CustomerSegment, number> = { all: 0, winners: 0, repeat: 0, lapsed: 0, consented: 0 };
    for (const cust of customers) for (const s of SEGMENTS) if (inSegment(cust, s.value)) c[s.value] += 1;
    return c;
  }, [customers]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return customers.filter((c) => {
      if (!inSegment(c, segment)) return false;
      if (!needle) return true;
      return (
        (c.name ?? "").toLowerCase().includes(needle) ||
        (c.email ?? "").toLowerCase().includes(needle) ||
        (c.phone ?? "").toLowerCase().includes(needle)
      );
    });
  }, [customers, segment, q]);

  function exportCsv() {
    const header = ["Name", "Email", "Phone", "Plays", "Wins", "Redemptions", "First seen", "Last seen", "Marketing consent", "Consent at", "Is lead", "Brands"];
    const rows = visible.map((c) => [
      c.name, c.email, c.phone, c.plays, c.wins, c.redemptions,
      c.firstSeen, c.lastSeen, c.marketingConsent, c.marketingConsentAt, c.isLead, c.brandNames.join("; "),
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${segment}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (errored) {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn't load customers"
        description="Some data failed to load — the marketing_consent migration (0011) may not be applied yet."
      />
    );
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title="No customers yet"
        description="When people play your games or book a call, they'll show up here with their full engagement history."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {SEGMENTS.map((s) => {
            const on = s.value === segment;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setSegment(s.value)}
                className="ad-btn"
                style={{
                  padding: "6px 11px",
                  background: on ? "var(--ad-accent)" : "var(--ad-surface2)",
                  color: on ? "#fff" : "var(--ad-ink)",
                  border: "1px solid var(--ad-border)",
                }}
              >
                {s.label} <span style={{ opacity: 0.7 }}>{counts[s.value]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone…"
            className="min-w-[180px] rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--ad-border)" }}
          />
          <button type="button" onClick={exportCsv} className="ad-btn ad-btn-ghost" disabled={visible.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="🔍" title="No customers match" description="Try a different segment or clear the search." />
      ) : (
        <div className="ad-card overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ad-border)" }}>
                {["Customer", "Brand", "Plays", "Wins", "Redeemed", "Consent", "Last seen"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.key} style={{ borderBottom: "1px solid var(--ad-border)" }} className="align-top">
                  <td className="px-3 py-3">
                    <div className="font-semibold flex items-center gap-2">
                      {c.name || "—"}
                      {c.isLead && (
                        <span className="ad-badge" style={{ background: "var(--ad-accent-soft)", color: "var(--ad-accent-ink)" }}>
                          Lead
                        </span>
                      )}
                    </div>
                    <div style={{ color: "var(--ad-muted)" }}>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="underline" style={{ color: "var(--ad-accent)" }}>{c.email}</a>
                      ) : null}
                      {c.email && c.phone ? " · " : null}
                      {c.phone ? <a href={`tel:${c.phone}`} style={{ color: "var(--ad-accent)" }}>{c.phone}</a> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3" style={{ color: "var(--ad-muted)" }}>{c.brandNames.length ? c.brandNames.join(", ") : "—"}</td>
                  <td className="px-3 py-3">{c.plays}</td>
                  <td className="px-3 py-3">{c.wins}</td>
                  <td className="px-3 py-3">{c.redemptions}</td>
                  <td className="px-3 py-3">
                    {c.marketingConsent ? (
                      <span style={{ color: "var(--ad-accent-ink)", fontWeight: 700 }}>Yes</span>
                    ) : (
                      <span style={{ color: "var(--ad-faint)" }}>No</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap" style={{ color: "var(--ad-muted)" }}>{fmtDate(c.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
