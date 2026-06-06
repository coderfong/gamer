"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const QrScanner = dynamic(() => import("./QrScanner").then((m) => m.QrScanner), { ssr: false });

interface LookupResult {
  found: boolean;
  voucher?: { code: string; prizeName: string | null; claimed: boolean; redeemed: boolean };
  play?: { id: string; wonAt: string | null; contact: string | null } | null;
}

// Pull a voucher code out of whatever the QR encodes — a bare code, or a URL
// with ?code= / a trailing path segment.
function extractCode(raw: string): string {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const param = url.searchParams.get("code");
    if (param) return param;
    const seg = url.pathname.split("/").filter(Boolean).pop();
    if (seg) return seg;
  } catch {
    /* not a URL */
  }
  return text;
}

export function RedemptionClient({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function lookup(rawCode?: string) {
    const c = (rawCode ?? code).trim();
    if (!c) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/campaigns/${campaignId}/voucher-lookup?code=${encodeURIComponent(c)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Lookup failed.");
        return;
      }
      setResult(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function redeem() {
    const playId = result?.play?.id;
    if (!playId) return;
    setRedeeming(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/plays/${playId}/redeem`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not redeem.");
        return;
      }
      setMessage("Voucher marked as redeemed.");
      setResult((r) =>
        r && r.voucher ? { ...r, voucher: { ...r.voucher, redeemed: true } } : r,
      );
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="Enter voucher code"
          className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 text-sm font-mono"
        />
        <button onClick={() => lookup()} disabled={loading} className="btn-brand">
          {loading ? "Looking up…" : "Look up"}
        </button>
        <button
          onClick={() => setScanning((s) => !s)}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
        >
          {scanning ? "Stop scan" : "Scan QR"}
        </button>
      </div>

      {scanning ? (
        <QrScanner
          onScan={(text) => {
            const c = extractCode(text);
            setCode(c);
            setScanning(false);
            lookup(c);
          }}
          onClose={() => setScanning(false)}
        />
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      {result && !result.found ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-zinc-600">
          No voucher with that code in this campaign.
        </div>
      ) : null}

      {result?.found && result.voucher ? (
        <div className="rounded-xl border bg-white p-4 space-y-2">
          <Row label="Voucher code" value={result.voucher.code} mono />
          <Row label="Prize" value={result.voucher.prizeName ?? "—"} />
          <Row
            label="Won at"
            value={result.play?.wonAt ? new Date(result.play.wonAt).toLocaleString() : "—"}
          />
          <Row label="Player" value={result.play?.contact ?? "—"} />
          <Row
            label="Status"
            value={result.voucher.redeemed ? "Already redeemed" : "Not redeemed"}
          />
          <div className="pt-2">
            {result.voucher.redeemed ? (
              <span className="text-sm text-zinc-500">This voucher was already redeemed.</span>
            ) : !result.play ? (
              <span className="text-sm text-zinc-500">
                Voucher not yet claimed by a play — nothing to redeem.
              </span>
            ) : (
              <button onClick={redeem} disabled={redeeming} className="btn-brand">
                {redeeming ? "Marking…" : "Mark as Redeemed"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}

export default RedemptionClient;
