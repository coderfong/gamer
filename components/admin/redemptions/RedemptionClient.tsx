"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { VoucherTicket, type VoucherStatus } from "@/components/shared/VoucherTicket";

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
      setMessage("Voucher redeemed!");
      setResult((r) => (r && r.voucher ? { ...r, voucher: { ...r.voucher, redeemed: true } } : r));
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setRedeeming(false);
    }
  }

  function reset() {
    setCode("");
    setResult(null);
    setError(null);
    setMessage(null);
  }

  const v = result?.voucher;
  const ticketStatus: VoucherStatus = v
    ? v.redeemed
      ? "redeemed"
      : v.claimed
        ? "valid"
        : "pending"
    : "valid";

  return (
    <div className="arcade-shell rounded-3xl p-6 sm:p-8">
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <div className="arcade-title text-2xl">🎟️ Redeem a Voucher</div>
          <p className="arcade-muted text-sm">Scan the QR or enter the code to verify and redeem.</p>
        </div>

        {/* code entry */}
        <div className="flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="ENTER CODE"
            className="sticker-sm w-full rounded-xl bg-[var(--paper)] px-4 py-3 text-center font-mono text-lg tracking-[0.2em] text-[var(--ink)] placeholder-zinc-400 outline-none"
          />
          <div className="flex gap-3">
            <button onClick={() => lookup()} disabled={loading || !code.trim()} className="btn-arcade flex-1">
              {loading ? "Looking…" : "LOOK UP"}
            </button>
            <button
              onClick={() => setScanning((s) => !s)}
              className="sticker-sm rounded-xl bg-[var(--paper)] px-4 font-bold text-[var(--ink)] hover:-translate-y-px transition-transform"
            >
              {scanning ? "Stop" : "📷 Scan"}
            </button>
          </div>
        </div>

        {scanning ? (
          <div className="overflow-hidden rounded-xl sticker-sm">
            <QrScanner
              onScan={(text) => {
                const c = extractCode(text);
                setCode(c);
                setScanning(false);
                lookup(c);
              }}
              onClose={() => setScanning(false)}
            />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-2 text-center text-sm font-semibold text-red-200">
            {error}
          </div>
        ) : null}

        {result && !result.found ? (
          <div className="sticker-sm rounded-xl bg-[var(--paper)] p-5 text-center">
            <div className="text-3xl">🔎</div>
            <div className="mt-1 font-bold text-[var(--ink)]">No voucher found</div>
            <p className="arcade-muted text-sm">No voucher with that code in this campaign.</p>
          </div>
        ) : null}

        {result?.found && v ? (
          <div className="space-y-4 animate-[pop-in_0.4s_ease-out]">
            <VoucherTicket code={v.code} prizeName={v.prizeName} status={ticketStatus} showQr={false} />

            <div className="sticker-sm rounded-xl bg-[var(--paper)] p-3 text-sm">
              <Row label="Won at" value={result.play?.wonAt ? new Date(result.play.wonAt).toLocaleString() : "—"} />
              <Row label="Player" value={result.play?.contact ?? "—"} />
            </div>

            {message ? (
              <div className="rounded-xl border border-green-400/40 bg-green-500/15 px-4 py-3 text-center font-semibold text-green-200 animate-[pop-in_0.4s_ease-out]">
                ✅ {message}
              </div>
            ) : v.redeemed ? (
              <div className="sticker-sm rounded-xl bg-[var(--paper)] px-4 py-3 text-center text-sm arcade-muted">
                This voucher was already redeemed.
              </div>
            ) : !result.play ? (
              <div className="sticker-sm rounded-xl bg-[var(--paper)] px-4 py-3 text-center text-sm arcade-muted">
                Voucher not yet claimed by a play — nothing to redeem.
              </div>
            ) : (
              <button onClick={redeem} disabled={redeeming} className="btn-arcade w-full">
                {redeeming ? "Redeeming…" : "✓ MARK AS REDEEMED"}
              </button>
            )}

            <button onClick={reset} className="w-full text-center text-sm font-semibold text-zinc-500 hover:text-[var(--ink)]">
              Look up another
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="arcade-muted">{label}</span>
      <span className="font-bold text-[var(--ink)]">{value}</span>
    </div>
  );
}

export default RedemptionClient;
