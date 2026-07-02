"use client";

import { useState } from "react";

interface Member { id: string; name: string | null; phone: string; marketingConsent: boolean }
interface Card { id: string; stamps: number; goal: number; status: "active" | "completed" | "redeemed" }
interface Voucher { code: string; rewardLabel: string; status: "active" | "redeemed"; redeemedAt: string | null }
interface State { member: Member; card: Card | null; voucher: Voucher | null }

const CARD: React.CSSProperties = { background: "#fff", border: "1px solid #e8e8ee", borderRadius: 16, padding: 20 };
const BTN: React.CSSProperties = { borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 15, cursor: "pointer", border: "none" };

export function MembersStaffClient({ goal, rewardLabel }: { goal: number; rewardLabel: string }) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<State | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "notfound" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function lookup(p = phone) {
    const q = p.trim();
    if (!q) return;
    setStatus("loading"); setFlash(null); setState(null);
    try {
      const res = await fetch(`/api/portal/loyalty/lookup?phone=${encodeURIComponent(q)}`);
      if (res.status === 404) { setStatus("notfound"); return; }
      if (!res.ok) { setStatus("error"); return; }
      setState(await res.json());
      setStatus("idle");
    } catch { setStatus("error"); }
  }

  async function addStamp() {
    if (!state) return;
    setBusy(true); setFlash(null);
    try {
      const res = await fetch("/api/portal/loyalty/add-stamp", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: state.member.phone }),
      });
      const json = await res.json();
      if (!res.ok) { setFlash("Couldn't add a stamp — try again."); return; }
      setState({ member: json.member, card: json.card, voucher: json.voucher });
      if (json.result?.voucherCode) setFlash(`🎉 Card full — reward unlocked (${json.result.voucherCode})`);
      else setFlash("Stamp added.");
    } catch { setFlash("Network error — try again."); }
    finally { setBusy(false); }
  }

  async function redeem() {
    if (!state?.voucher) return;
    setBusy(true); setFlash(null);
    try {
      const res = await fetch("/api/portal/loyalty/redeem", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: state.voucher.code }),
      });
      const json = await res.json();
      if (json.ok) { setFlash(`✓ Redeemed: ${json.rewardLabel ?? rewardLabel}`); await lookup(state.member.phone); }
      else if (json.already) setFlash("That voucher was already redeemed.");
      else setFlash("Couldn't redeem — check the code.");
    } catch { setFlash("Network error — try again."); }
    finally { setBusy(false); }
  }

  const card = state?.card;
  const voucher = state?.voucher;
  const full = !!card && card.stamps >= card.goal;

  return (
    <div className="space-y-4">
      {/* Search */}
      <form
        onSubmit={(e) => { e.preventDefault(); void lookup(); }}
        style={{ ...CARD, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
      >
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="Customer phone number"
          style={{ flex: "1 1 220px", borderRadius: 12, border: "1px solid #e8e8ee", padding: "12px 14px", fontSize: 16 }}
        />
        <button type="submit" style={{ ...BTN, background: "var(--ad-accent, #6D4AFF)", color: "#fff" }}>
          {status === "loading" ? "Searching…" : "Find member"}
        </button>
      </form>

      {status === "notfound" && (
        <div style={{ ...CARD, color: "#73737f" }}>
          No member with that number yet. Ask them to join at your rewards page first, then search again.
        </div>
      )}
      {status === "error" && <div style={{ ...CARD, color: "#dc2626" }}>Something went wrong — try again.</div>}

      {state && (
        <div style={CARD}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#191921" }}>{state.member.name || "Member"}</div>
              <div style={{ fontSize: 13, color: "#a2a2ad" }}>{state.member.phone}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ad-accent, #6D4AFF)" }}>
                {card ? `${card.stamps}/${card.goal}` : "—"}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a2a2ad" }}>stamps</div>
            </div>
          </div>

          {/* Stamp dots */}
          {card && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(card.goal, 10)}, 1fr)`, gap: 8, marginTop: 16 }}>
              {Array.from({ length: card.goal }).map((_, i) => (
                <div key={i} style={{
                  aspectRatio: "1", borderRadius: 10, display: "grid", placeItems: "center", fontSize: 16,
                  background: i < card.stamps ? "var(--ad-accent, #6D4AFF)" : "#f4f4f6",
                  color: "#fff", border: i < card.stamps ? "none" : "2px solid #e8e8ee",
                }}>{i < card.stamps ? "✓" : ""}</div>
              ))}
            </div>
          )}

          {/* Voucher status */}
          {voucher && (
            <div style={{ marginTop: 16, borderRadius: 12, padding: "12px 14px", background: voucher.status === "redeemed" ? "#f4f4f6" : "rgba(54,207,142,.14)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#191921" }}>
                {voucher.rewardLabel} · <span style={{ fontFamily: "monospace" }}>{voucher.code}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: voucher.status === "redeemed" ? "#73737f" : "#1A8F60" }}>
                {voucher.status === "redeemed" ? "Redeemed" : "Ready to redeem"}
              </div>
            </div>
          )}

          {flash && <div style={{ marginTop: 14, fontSize: 14, fontWeight: 700, color: "#191921" }}>{flash}</div>}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button
              type="button" onClick={addStamp} disabled={busy || full}
              style={{ ...BTN, flex: "1 1 160px", background: "var(--ad-accent, #6D4AFF)", color: "#fff", opacity: busy || full ? 0.5 : 1 }}
            >
              + Add 1 stamp
            </button>
            <button
              type="button" onClick={redeem} disabled={busy || !voucher || voucher.status === "redeemed"}
              style={{ ...BTN, flex: "1 1 160px", background: "#191921", color: "#fff", opacity: busy || !voucher || voucher.status === "redeemed" ? 0.5 : 1 }}
            >
              ✓ Redeem reward
            </button>
          </div>
          {full && (!voucher || voucher.status === "redeemed") && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#73737f" }}>
              Card complete. A new card starts on the next stamp.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
