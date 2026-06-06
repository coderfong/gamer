"use client";

import { useState } from "react";

export function InvoiceRequestForm({ defaultCount }: { defaultCount: number }) {
  const [count, setCount] = useState(defaultCount);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/invoice-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaign_count: count, notes }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not send request.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-green-700">
        Invoice request sent — we’ll be in touch shortly.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-4 space-y-3">
      <h3 className="font-medium">Request an invoice</h3>
      <label className="block space-y-1">
        <span className="text-sm text-zinc-600">Campaign count</span>
        <input
          type="number"
          min={0}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-zinc-600">Notes (optional)</span>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Billing address, PO number, anything else…"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={sending} className="btn-brand">
        {sending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}

export default InvoiceRequestForm;
