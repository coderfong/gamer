"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { maskContact } from "@/lib/admin/mask";

export interface AnalyticsPlay {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  prize_name: string | null;
  is_loss: boolean | null;
  email: string | null;
  phone: string | null;
}

const PAGE_SIZE = 50;

export function AnalyticsClient({
  plays,
  vouchersRemaining,
  prizeNames,
  campaignName,
}: {
  plays: AnalyticsPlay[];
  vouchersRemaining: number;
  prizeNames: string[];
  campaignName: string;
}) {
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const [prizeFilter, setPrizeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  // ---- Stat cards ----
  const stats = useMemo(() => {
    const total = plays.length;
    const contacts = new Set<string>();
    let wins = 0;
    let flagged = 0;
    for (const p of plays) {
      const key = p.email || p.phone;
      if (key) contacts.add(key);
      if (p.status === "completed" && p.prize_name && !p.is_loss) wins += 1;
      if (p.status === "flagged") flagged += 1;
    }
    return {
      total,
      unique: contacts.size,
      wins,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      flagged,
    };
  }, [plays]);

  // ---- Plays over time ----
  const timeSeries = useMemo(() => {
    const days: { date: string; plays: number }[] = [];
    const counts = new Map<string, number>();
    const now = new Date();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      counts.set(key, 0);
      days.push({ date: key.slice(5), plays: 0 });
    }
    for (const p of plays) {
      const key = p.started_at.slice(0, 10);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let i = 0;
    for (const [, v] of counts) {
      days[i].plays = v;
      i++;
    }
    return days;
  }, [plays, windowDays]);

  // ---- Prize distribution ----
  const prizeDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of plays) {
      if (p.status === "completed" && p.prize_name && !p.is_loss) {
        counts.set(p.prize_name, (counts.get(p.prize_name) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [plays]);

  // ---- Filtered table ----
  const filtered = useMemo(() => {
    return plays.filter((p) => {
      if (prizeFilter !== "all" && p.prize_name !== prizeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (from && p.started_at < from) return false;
      if (to && p.started_at > `${to}T23:59:59`) return false;
      return true;
    });
  }, [plays, prizeFilter, statusFilter, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function exportCsv() {
    const header = ["timestamp", "email", "phone", "prize", "status"];
    const rows = filtered.map((p) => [
      p.started_at,
      p.email ?? "",
      p.phone ?? "",
      p.prize_name ?? "",
      p.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignName.replace(/\s+/g, "-").toLowerCase()}-plays.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total plays" value={stats.total} />
        <StatCard label="Unique players" value={stats.unique} />
        <StatCard label="Wins" value={stats.wins} />
        <StatCard label="Win rate" value={`${stats.winRate}%`} />
        <StatCard label="Vouchers left" value={vouchersRemaining} />
        <StatCard label="Flagged" value={stats.flagged} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">Plays over time</h3>
            <div className="flex gap-1 text-xs">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setWindowDays(d)}
                  className={`px-2 py-1 rounded ${
                    windowDays === d ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="plays" stroke="#6d28d9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-medium text-sm mb-3">Prize distribution</h3>
          {prizeDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={prizeDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#6d28d9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-500 py-12 text-center">No prizes awarded yet.</p>
          )}
        </div>
      </div>

      {/* Filters + export */}
      <div className="flex flex-wrap items-end gap-2">
        <FilterField label="From">
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className="rounded-lg border px-2 py-1.5 text-sm" />
        </FilterField>
        <FilterField label="To">
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className="rounded-lg border px-2 py-1.5 text-sm" />
        </FilterField>
        <FilterField label="Prize">
          <select value={prizeFilter} onChange={(e) => { setPrizeFilter(e.target.value); setPage(0); }} className="rounded-lg border px-2 py-1.5 text-sm bg-white">
            <option value="all">All prizes</option>
            {prizeNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="rounded-lg border px-2 py-1.5 text-sm bg-white">
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="flagged">Flagged</option>
          </select>
        </FilterField>
        <button onClick={exportCsv} className="ml-auto rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50">
          Export CSV
        </button>
      </div>

      {/* Recent plays table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">Contact</th>
              <th className="text-left px-3 py-2">Prize</th>
              <th className="text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 text-zinc-600">{new Date(p.started_at).toLocaleString()}</td>
                <td className="px-3 py-2">{maskContact(p.email, p.phone)}</td>
                <td className="px-3 py-2">{p.prize_name ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusPill status={p.status} isLoss={p.is_loss} />
                </td>
              </tr>
            ))}
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                  No plays match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {pageCount > 1 ? (
          <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
            <span className="text-zinc-500">
              Page {page + 1} of {pageCount} · {filtered.length} plays
            </span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded border disabled:opacity-40">
                Prev
              </button>
              <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded border disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block text-[11px] uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status, isLoss }: { status: string; isLoss: boolean | null }) {
  if (status === "flagged")
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Flagged</span>;
  if (isLoss)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">No win</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Won</span>;
}

export default AnalyticsClient;
