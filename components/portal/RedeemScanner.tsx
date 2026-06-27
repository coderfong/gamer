"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/admin/redemptions/QrScanner";

// Decode a QR from a photo file. Reliable on iOS Safari, where live camera
// scanning can be blocked — the customer's voucher QR is captured as a photo
// and decoded locally.
async function scanFileForQr(file: File): Promise<string> {
  const { Html5Qrcode } = await import("html5-qrcode");
  const el = document.createElement("div");
  el.style.display = "none";
  el.id = "qr-file-reader-" + Date.now();
  document.body.appendChild(el);
  const scanner = new Html5Qrcode(el.id);
  try {
    return await scanner.scanFile(file, false);
  } finally {
    try { await scanner.clear(); } catch { /* noop */ }
    el.remove();
  }
}

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
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function onPhoto(file: File) {
    setView("result");
    setNotFound(false);
    setError(null);
    setDone(null);
    setVoucher(null);
    try {
      const code = await scanFileForQr(file);
      await onScan(code);
    } catch {
      setError("Couldn't read a QR code in that photo — try again, filling the frame with the QR.");
    }
  }

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
    <div style={{ ...CARD, padding: 20, maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Redeem a voucher</h2>
        <p style={{ fontSize: 14, color: MUTED }}>
          Scan the customer&apos;s voucher QR with your phone camera. Redemption is scan-only.
        </p>
      </div>

      {view === "scanning" ? (
        <QrScanner onScan={onScan} onClose={() => setView("idle")} />
      ) : view === "idle" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={() => setView("scanning")} style={btnPrimary}>
            📷 Scan voucher QR
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} style={btnGhost}>
            📸 Take a photo of the QR
          </button>
          <p style={{ fontSize: 12, textAlign: "center", color: FAINT }}>
            On iPhone, “Take a photo” is the most reliable.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPhoto(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error ? <p style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>{error}</p> : null}

          {notFound ? (
            <div style={{ borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, textAlign: "center", background: "#fef2f2", color: "#b91c1c" }}>
              Not one of your vouchers.
            </div>
          ) : voucher ? (
            <div style={{ borderRadius: 12, border: `1px solid ${BORDER}`, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: FAINT }}>Prize</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{voucher.prizeName ?? "—"}</div>
              <div style={{ fontSize: 14, color: MUTED }}>
                <div>Code · <span style={{ fontFamily: "monospace" }}>{voucher.code}</span></div>
                <div>Won · {fmt(voucher.wonAt)}</div>
                {voucher.contact ? <div>Customer · {voucher.contact}</div> : null}
              </div>
              <div>
                {voucher.redeemed ? (
                  <span style={{ ...badge, background: "#f4f4f6", color: "#71717a" }}>Already redeemed</span>
                ) : !voucher.claimed ? (
                  <span style={{ ...badge, background: "#fef2f2", color: "#b91c1c" }}>Not a winning voucher</span>
                ) : (
                  <span style={{ ...badge, background: "#ecfdf5", color: "#065f46" }}>Valid — ready to redeem</span>
                )}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: MUTED }}>Reading…</p>
          )}

          {done ? (
            <div style={{ borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, textAlign: "center", background: "#ecfdf5", color: "#065f46" }}>
              ✅ {done}
            </div>
          ) : voucher && voucher.claimed && !voucher.redeemed ? (
            <button type="button" onClick={redeem} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Redeeming…" : "Mark as redeemed"}
            </button>
          ) : null}

          <button type="button" onClick={reset} style={btnGhost}>Scan another</button>
        </div>
      )}
    </div>
  );
}

const CARD: React.CSSProperties = { background: "#ffffff", border: "1px solid #e8e8ee", borderRadius: 16 };
const BORDER = "#e8e8ee";
const MUTED = "#73737f";
const FAINT = "#a2a2ad";
const btnPrimary: React.CSSProperties = { padding: "12px", borderRadius: 10, border: "1px solid transparent", background: "#6D4AFF", color: "#fff", fontWeight: 600, fontSize: 15, width: "100%", cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "12px", borderRadius: 10, border: "1px solid #e8e8ee", background: "#fff", color: "#191921", fontWeight: 600, fontSize: 15, width: "100%", cursor: "pointer" };
const badge: React.CSSProperties = { fontWeight: 700, fontSize: 12, padding: "4px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center" };
