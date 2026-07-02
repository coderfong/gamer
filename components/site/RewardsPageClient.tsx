"use client";

import { useState } from "react";
import type { BrandStudioTheme, StampCardAssets } from "@/lib/types/studio";
import { StampCard } from "@/components/shared/StampCard";

interface Member { id: string; name: string | null; phone: string; marketingConsent: boolean }
interface Card { id: string; stamps: number; goal: number; status: string }
interface Voucher { code: string; rewardLabel: string; status: string; redeemedAt: string | null }
interface State { member: Member; card: Card | null; voucher: Voucher | null }

export function RewardsPageClient({
  slug, brandName, theme, stampCard, logoUrl,
}: {
  slug: string;
  brandName: string;
  theme: BrandStudioTheme;
  stampCard: StampCardAssets;
  logoUrl: string | null;
}) {
  const [mode, setMode] = useState<"join" | "check">("join");
  const [state, setState] = useState<State | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "notfound">("idle");
  const brand = theme.brandColor;
  const brandFg = theme.brandFg;

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      marketingConsent: fd.get("consent") === "on",
      website: String(fd.get("website") || ""),
    };
    setStatus("sending");
    try {
      const res = await fetch(`/api/rewards/${slug}/join`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { setStatus("error"); return; }
      setState(await res.json());
      setStatus("idle");
    } catch { setStatus("error"); }
  }

  async function check(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const phone = String(new FormData(e.currentTarget).get("phone") || "").trim();
    if (!phone) return;
    setStatus("sending");
    try {
      const res = await fetch(`/api/rewards/${slug}/card?phone=${encodeURIComponent(phone)}`);
      if (res.status === 404) { setStatus("notfound"); return; }
      if (!res.ok) { setStatus("error"); return; }
      setState(await res.json());
      setStatus("idle");
    } catch { setStatus("error"); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: 14, border: "2px solid rgba(0,0,0,0.1)", padding: "12px 14px", fontSize: 16, outline: "none",
  };
  const btnStyle: React.CSSProperties = {
    width: "100%", borderRadius: 14, padding: "14px 16px", fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer",
    background: brand, color: brandFg,
  };

  return (
    <main style={{ minHeight: "100dvh", background: theme.bgColor, color: "#18181b", fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "24px 16px 64px" }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" style={{ height: 48, width: 48, borderRadius: 14, objectFit: "contain", background: "rgba(255,255,255,0.85)" }} />
          ) : (
            <span style={{ display: "grid", placeItems: "center", height: 48, width: 48, borderRadius: 14, background: brand, color: brandFg, fontSize: 22, fontWeight: 800 }}>
              {brandName.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{brandName}</div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: brand }}>Rewards</div>
          </div>
        </header>

        {state ? (
          // ── Member's card ──
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <StampCard assets={stampCard} theme={theme} brandName={brandName} fallbackLogo={logoUrl} stamps={state.card?.stamps ?? 0} />

            {state.voucher && state.voucher.status === "active" && (
              <div style={{ borderRadius: 18, border: `2px solid ${brand}`, background: "#fff", overflow: "hidden" }}>
                <div style={{ background: brand, color: brandFg, padding: "10px 16px", fontWeight: 800, fontSize: 13 }}>🎉 REWARD UNLOCKED</div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{state.voucher.rewardLabel}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#52525b" }}>
                    Show this code to staff to redeem: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#18181b" }}>{state.voucher.code}</span>
                  </div>
                </div>
              </div>
            )}

            <p style={{ textAlign: "center", fontSize: 13, color: "#52525b" }}>
              Show this to our staff each visit — they&apos;ll add your stamp. See you soon! 👋
            </p>
          </div>
        ) : (
          // ── Join / check ──
          <div>
            <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 999, padding: 5, marginBottom: 18 }}>
              {(["join", "check"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setStatus("idle"); }}
                  style={{ flex: 1, borderRadius: 999, padding: "9px 0", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
                    background: mode === m ? brand : "transparent", color: mode === m ? brandFg : "#6b7280" }}>
                  {m === "join" ? "Join" : "My card"}
                </button>
              ))}
            </div>

            {mode === "join" ? (
              <form onSubmit={join} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Join {brandName} Rewards</h1>
                <p style={{ fontSize: 14, color: "#52525b", margin: 0 }}>
                  Collect a stamp every visit. {stampCard.goal} stamps unlocks {stampCard.rewardLabel.toLowerCase()}. No app needed.
                </p>
                <input name="name" placeholder="Your name" maxLength={120} style={inputStyle} />
                <input name="phone" placeholder="Mobile number" required inputMode="tel" maxLength={40} style={inputStyle} />
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#52525b" }}>
                  <input type="checkbox" name="consent" style={{ marginTop: 3 }} />
                  <span>Send me offers and reward reminders (optional).</span>
                </label>
                {/* honeypot */}
                <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1 }} />
                <button type="submit" disabled={status === "sending"} style={{ ...btnStyle, opacity: status === "sending" ? 0.6 : 1 }}>
                  {status === "sending" ? "Joining…" : "Join now"}
                </button>
                {status === "error" && <p style={{ color: "#dc2626", fontSize: 14 }}>Something went wrong — please try again.</p>}
                <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>By joining you agree to your details being stored to run this rewards program.</p>
              </form>
            ) : (
              <form onSubmit={check} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>See your card</h1>
                <p style={{ fontSize: 14, color: "#52525b", margin: 0 }}>Enter the mobile number you joined with.</p>
                <input name="phone" placeholder="Mobile number" required inputMode="tel" maxLength={40} style={inputStyle} />
                <button type="submit" disabled={status === "sending"} style={{ ...btnStyle, opacity: status === "sending" ? 0.6 : 1 }}>
                  {status === "sending" ? "Checking…" : "Show my card"}
                </button>
                {status === "notfound" && <p style={{ color: "#52525b", fontSize: 14 }}>No card found for that number. Try joining first.</p>}
                {status === "error" && <p style={{ color: "#dc2626", fontSize: 14 }}>Something went wrong — please try again.</p>}
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
