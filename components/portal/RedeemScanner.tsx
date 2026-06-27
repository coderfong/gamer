"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/admin/redemptions/QrScanner";

interface Voucher {
  code: string;
  prizeName: string | null;
  claimed: boolean;
  redeemed: boolean;
  wonAt: string | null;
  contact: string | null;
}

type View = "idle" | "scanning" | "result";

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

// Scan-only redemption: a voucher can only be redeemed here by scanning its QR.
export function RedeemScanner() {
  const router = useRouter();
  const [view, setView] = useState<View>("idle");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const reset = useCallback(() => {
    setVoucher(null);
    setNotFound(false);
    setError(null);
    setDone(null);
    setView("idle");
  }, []);

  const onScan = useCallback(async (code: string) => {
    setView("result");
    setNotFound(false);
    setError(null);
    setDone(null);
    setVoucher(null);
    try {
      const res = await fetch("/api/portal/redeem/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError("Couldn't read that code — try again."); return; }
      if (!json.found) { setNotFound(true); return; }
      setVoucher(json.voucher as Voucher);
    } catch {
      setError("Network error — try again.");
    }
  }, []);

  async function redeem() {
    if (!voucher) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: voucher.code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Couldn't redeem — try again.");
        return;
      }
      setDone(`Redeemed${voucher.prizeName ? ` · ${voucher.prizeName}` : ""}`);
      setVoucher({ ...voucher, redeemed: true });
      router.refresh(); // update the redemption history list below

    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-card p-5 space-y-4" style={{ maxWidth: 520 }}>
      <div>
        <h2 className="text-lg font-bold">Redeem a voucher</h2>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Scan the customer&apos;s voucher QR with your phone camera. Redemption is scan-only.
        </p>
      </div>

      {view === "scanning" ? (
        <QrScanner onScan={onScan} onClose={() => setView("idle")} />
      ) : view === "idle" ? (
        <button type="button" onClick={() => setView("scanning")} className="ad-btn ad-btn-primary w-full" style={{ padding: "12px" }}>
          📷 Scan voucher QR
        </button>
      ) : (
        <div className="space-y-4">
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

          {notFound ? (
            <div className="rounded-lg px-3 py-3 text-sm font-semibold text-center" style={{ background: "#fef2f2", color: "#b91c1c" }}>
              Not one of your vouchers.
            </div>
          ) : voucher ? (
            <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--ad-border)" }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: "var(--ad-faint)" }}>Prize</div>
              <div className="text-xl font-extrabold">{voucher.prizeName ?? "—"}</div>
              <div className="text-sm" style={{ color: "var(--ad-muted)" }}>
                <div>Code · <span className="font-mono">{voucher.code}</span></div>
                <div>Won · {fmt(voucher.wonAt)}</div>
                {voucher.contact ? <div>Customer · {voucher.contact}</div> : null}
              </div>
              <div className="pt-1">
                {voucher.redeemed ? (
                  <span className="ad-badge" style={{ background: "#f4f4f6", color: "#71717a" }}>Already redeemed</span>
                ) : !voucher.claimed ? (
                  <span className="ad-badge" style={{ background: "#fef2f2", color: "#b91c1c" }}>Not a winning voucher</span>
                ) : (
                  <span className="ad-badge" style={{ background: "#ecfdf5", color: "#065f46" }}>Valid — ready to redeem</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--ad-muted)" }}>Reading…</p>
          )}

          {done ? (
            <div className="rounded-lg px-3 py-3 text-sm font-semibold text-center" style={{ background: "#ecfdf5", color: "#065f46" }}>
              ✅ {done}
            </div>
          ) : voucher && voucher.claimed && !voucher.redeemed ? (
            <button type="button" onClick={redeem} disabled={busy} className="ad-btn ad-btn-primary w-full" style={{ padding: "11px" }}>
              {busy ? "Redeeming…" : "Mark as redeemed"}
            </button>
          ) : null}

          <button type="button" onClick={reset} className="ad-btn ad-btn-ghost w-full">Scan another</button>
        </div>
      )}
    </div>
  );
}
