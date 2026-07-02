"use client";

import { useState } from "react";
import { SpinWheel } from "@/components/games/SpinWheel";
import { celebrate } from "@/lib/games/celebrate";
import type { GameResult } from "@/lib/types/game";
import type { BrandStudioTheme, StampCardAssets } from "@/lib/types/studio";
import { StampCard } from "@/components/shared/StampCard";
import { waLink } from "@/lib/site/contact";

// ── Fictional brand — a demo, never a real client ────────────────────────────
const BRAND = "#12A7A0"; // Whale Tea teal
const BRAND_D = "#0C7C77";
const BRAND_FG = "#ffffff";
const INK = "#12232B";
const CREAM = "#F3FBFA";

// The demo's stamp card renders from a StampCardAssets config — the same model
// and <StampCard> component the Brand Studio configures per brand. Swap these
// values (or upload icons in the Studio) and the card re-themes with no code.
const WHALE_THEME: BrandStudioTheme = {
  brandColor: BRAND,
  brandFg: BRAND_FG,
  accentColor: "#FFC23C",
  bgColor: "#FFFFFF",
  fontFamily: "Plus Jakarta Sans",
};
const WHALE_STAMP: StampCardAssets = {
  goal: 5,
  rewardLabel: "Free Topping",
  stampEmoji: "🧋",
  rewardEmoji: "🧋",
};
const GOAL = WHALE_STAMP.goal;
const VOUCHER_CODE = "TOPPING482";
const REFERRAL_POOL = ["Ben", "Priya", "Wei", "Marcus", "Nadia", "Chloe"];
const WA = waLink("Hi Gameable, I saw the Whale Tea demo — I'd like a rewards page for my business");

// Bonus spin-wheel config — outcomes like Double Stamp. Reuses the real SpinWheel.
const WHEEL_CONFIG = {
  numSlices: 6,
  labels: ["DOUBLE STAMP", "FREE TOPPING", "TRY AGAIN", "+1 STAMP", "10% OFF", "FREE UPSIZE"],
  segments: ["🧋", "🫧", "🔁", "➕", "🏷️", "⬆️"],
  colorPreset: "candy",
  wheelSize: 232,
  spinDuration: 3400,
  spinButtonText: "SPIN",
  spinningText: "GOOD LUCK…",
  pointerColor: "#FF5A4D",
  pegColor: "#FFC23C",
  hubColor: "#FFFFFF",
  pointerAnim: "tick",
};

type Tab = "card" | "staff" | "owner";

export function WhaleTeaLoopDemo() {
  const [tab, setTab] = useState<Tab>("card");
  const [joined, setJoined] = useState(false);
  const [stamps, setStamps] = useState(4); // Sarah is one stamp from her reward
  const [redeemed, setRedeemed] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelNonce, setWheelNonce] = useState(0);
  const [bonus, setBonus] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<string[]>(["Amanda"]);

  const voucherActive = stamps >= GOAL && !redeemed;

  function addStamp() {
    setStamps((prev) => {
      const next = Math.min(GOAL, prev + 1);
      if (prev < GOAL && next === GOAL) void celebrate(BRAND);
      return next;
    });
    // Starting to fill again means a new card — clear the previous redeemed voucher
    // so the whole loop can be demoed repeatedly.
    setRedeemed((r) => (r ? false : r));
  }

  function redeemVoucher() {
    // Redeeming gives Sarah her free drink and resets the card for the next one.
    setRedeemed(true);
    setStamps(0);
  }

  function inviteFriend() {
    const next = REFERRAL_POOL.find((n) => !referrals.includes(n));
    if (!next) return;
    setReferrals((prev) => [next, ...prev]);
    addStamp(); // a successful referral earns a bonus stamp
  }

  function resetDemo() {
    setStamps(4);
    setRedeemed(false);
    setBonus(null);
    setWheelOpen(false);
    setReferrals(["Amanda"]);
    setJoined(true);
  }

  function openWheel() {
    setBonus(null);
    setWheelNonce((n) => n + 1);
    setWheelOpen(true);
  }

  function onWheelComplete(r: GameResult) {
    const label = r.prizeLabel ?? "TRY AGAIN";
    setBonus(label);
    if (r.won) void celebrate(BRAND);
  }

  return (
    <main
      style={{ background: CREAM, color: INK, minHeight: "100dvh", fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
    >
      {/* Persistent demo banner */}
      <div
        style={{ background: INK, color: "#fff" }}
        className="sticky top-0 z-40 px-4 py-2.5 text-center text-[13px] leading-snug"
      >
        <span className="font-semibold">This is a demo.</span>{" "}
        <span className="opacity-85">Your page gets your brand, your rewards.</span>{" "}
        <a href={WA} target="_blank" rel="noopener noreferrer" className="font-bold underline" style={{ color: "#8DE7E1" }}>
          WhatsApp us to get yours →
        </a>
      </div>

      <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-4">
        {/* Brand header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl text-2xl"
              style={{ background: BRAND, color: BRAND_FG }}
            >
              🐳
            </span>
            <div className="leading-tight">
              <div className="text-lg font-extrabold" style={{ color: INK }}>Whale Tea</div>
              <div className="text-[12px] font-semibold" style={{ color: BRAND_D }}>Rewards</div>
            </div>
          </div>
          <button
            type="button"
            onClick={resetDemo}
            className="rounded-full px-3 py-1.5 text-[12px] font-bold"
            style={{ background: "#fff", color: BRAND_D, border: `1px solid ${BRAND}33` }}
          >
            ↺ Reset demo
          </button>
        </header>

        {/* Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-full p-1" style={{ background: "#fff", border: `1px solid ${BRAND}22` }}>
          {([["card", "Customer"], ["staff", "Staff"], ["owner", "Dashboard"]] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="rounded-full py-2 text-[13.5px] font-bold transition-colors"
              style={tab === id ? { background: BRAND, color: BRAND_FG } : { background: "transparent", color: "#5B6B70" }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "card" && (
            <CustomerView
              joined={joined}
              onJoin={() => setJoined(true)}
              stamps={stamps}
              addStamp={addStamp}
              voucherActive={voucherActive}
              redeemed={redeemed}
              onPlayBonus={openWheel}
              referrals={referrals}
              onInvite={inviteFriend}
            />
          )}
          {tab === "staff" && (
            <StaffView stamps={stamps} addStamp={addStamp} voucherActive={voucherActive} redeemed={redeemed} onRedeem={redeemVoucher} />
          )}
          {tab === "owner" && <OwnerView />}
        </div>
      </div>

      {wheelOpen && (
        <WheelModal nonce={wheelNonce} bonus={bonus} onComplete={onWheelComplete} onClose={() => setWheelOpen(false)} onAgain={openWheel} />
      )}
    </main>
  );
}

// ── Customer view ────────────────────────────────────────────────────────────
function CustomerView({
  joined, onJoin, stamps, addStamp, voucherActive, redeemed, onPlayBonus, referrals, onInvite,
}: {
  joined: boolean; onJoin: () => void; stamps: number; addStamp: () => void;
  voucherActive: boolean; redeemed: boolean; onPlayBonus: () => void;
  referrals: string[]; onInvite: () => void;
}) {
  if (!joined) {
    return (
      <section className="rounded-3xl p-6 text-center" style={{ background: "#fff", border: `1px solid ${BRAND}22`, boxShadow: "0 20px 50px -30px rgba(18,167,160,.6)" }}>
        <div className="text-4xl">🧋</div>
        <h2 className="mt-3 text-2xl font-extrabold" style={{ color: INK }}>Join Whale Tea Rewards</h2>
        <p className="mt-2 text-[14.5px] font-medium" style={{ color: "#5B6B70" }}>
          Collect a stamp every visit. Buy 5, get 1 free. No app — just your name and number.
        </p>
        <div className="mt-5 space-y-2.5 text-left">
          <MockField label="Name" value="Sarah Tan" />
          <MockField label="Mobile" value="9123 4567" />
        </div>
        <button
          type="button"
          onClick={onJoin}
          className="mt-5 w-full rounded-2xl py-3.5 text-base font-extrabold transition-transform active:scale-[0.98]"
          style={{ background: BRAND, color: BRAND_FG }}
        >
          Join in one tap →
        </button>
        <p className="mt-3 text-[11.5px]" style={{ color: "#93A3A7" }}>Demo only — no real details are collected.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Stamp card — rendered from the StampCardAssets config via the shared component */}
      <StampCard assets={WHALE_STAMP} theme={WHALE_THEME} brandName="Whale Tea" stamps={stamps} onTapNext={addStamp} hideHeader />
      {stamps < GOAL && (
        <p className="text-center text-[13px] font-semibold" style={{ color: BRAND_D }}>
          👆 Tap the next stamp — {GOAL - stamps} to go until a free {WHALE_STAMP.rewardLabel.toLowerCase()}
        </p>
      )}

      {/* Voucher */}
      {(voucherActive || redeemed) && (
        <div
          className="overflow-hidden rounded-3xl"
          style={{ border: `2px solid ${redeemed ? "#C6D2D3" : BRAND}`, background: redeemed ? "#F1F5F5" : "#fff" }}
        >
          <div className="flex items-center justify-between px-5 py-3" style={{ background: redeemed ? "#E7EEEE" : BRAND, color: redeemed ? "#5B6B70" : BRAND_FG }}>
            <span className="text-[13px] font-extrabold tracking-wide">{redeemed ? "REDEEMED" : "🎉 REWARD UNLOCKED"}</span>
            <span className="text-[12px] font-bold opacity-90">{redeemed ? "used in-store" : "ready to use"}</span>
          </div>
          <div className="px-5 py-4">
            <div className="text-lg font-extrabold" style={{ color: INK }}>{WHALE_STAMP.rewardLabel}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[12px] font-semibold" style={{ color: "#93A3A7" }}>Code</span>
              <span className="rounded-md px-2 py-0.5 font-mono text-[13px] font-bold" style={{ background: "#F1F5F5", color: INK }}>{VOUCHER_CODE}</span>
            </div>
            <p className="mt-2 text-[13px]" style={{ color: "#5B6B70" }}>
              {redeemed ? "This voucher has been redeemed at the counter." : "Show this at the counter — staff verify and redeem it in seconds."}
            </p>
            {voucherActive && (
              <button
                type="button"
                onClick={onPlayBonus}
                className="mt-4 w-full rounded-2xl py-3 text-[15px] font-extrabold transition-transform active:scale-[0.98]"
                style={{ background: INK, color: "#fff" }}
              >
                🎡 Play bonus game
              </button>
            )}
          </div>
        </div>
      )}

      {/* Refer a friend — extend reach, capture new members */}
      <div className="rounded-3xl p-5" style={{ background: "#fff", border: `1px solid ${BRAND}22` }}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-extrabold" style={{ color: INK }}>Refer a friend</div>
          <span className="text-lg">🔗</span>
        </div>
        <p className="mt-1 text-[13px]" style={{ color: "#5B6B70" }}>
          Share your link. When a friend joins, they become a member too — and you earn a bonus stamp.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: CREAM }}>
          <span className="flex-1 truncate font-mono text-[13px]" style={{ color: BRAND_D }}>whaletea.sg/join/sarah</span>
          <button
            type="button"
            onClick={onInvite}
            className="rounded-xl px-3.5 py-1.5 text-[13px] font-extrabold transition-transform active:scale-95"
            style={{ background: BRAND, color: BRAND_FG }}
          >
            Invite
          </button>
        </div>
        {referrals.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {referrals.map((n) => (
              <li key={n} className="flex items-center gap-2 text-[13px]" style={{ color: "#3A4A50" }}>
                <span style={{ color: "#1A8F60" }}>✓</span>
                <span><b>{n}</b> joined through your link — +1 bonus stamp</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3.5 py-2.5" style={{ background: "#F1F5F5", border: "1px solid #E7EEEE" }}>
      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#93A3A7" }}>{label}</div>
      <div className="text-[15px] font-semibold" style={{ color: INK }}>{value}</div>
    </div>
  );
}

// ── Staff view ───────────────────────────────────────────────────────────────
function StaffView({
  stamps, addStamp, voucherActive, redeemed, onRedeem,
}: {
  stamps: number; addStamp: () => void; voucherActive: boolean; redeemed: boolean; onRedeem: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl px-4 py-3" style={{ background: "#fff", border: `1px solid ${BRAND}22` }}>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#F1F5F5" }}>
          <span className="text-[15px]">🔍</span>
          <input
            readOnly
            defaultValue="Sarah / 9123 4567"
            className="w-full bg-transparent text-[14px] font-medium outline-none"
            style={{ color: INK }}
          />
        </div>
      </div>

      <div className="rounded-3xl p-5" style={{ background: "#fff", border: `1px solid ${BRAND}22`, boxShadow: "0 20px 50px -34px rgba(18,167,160,.6)" }}>
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full text-xl" style={{ background: `${BRAND}18`, color: BRAND_D }}>ST</span>
          <div className="leading-tight">
            <div className="text-lg font-extrabold" style={{ color: INK }}>Sarah Tan</div>
            <div className="text-[13px] font-semibold" style={{ color: "#93A3A7" }}>9123 4567 · Member since Mar</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: CREAM }}>
          <span className="text-[14px] font-bold" style={{ color: INK }}>Stamp card</span>
          <span className="text-lg font-extrabold" style={{ color: BRAND }}>{stamps}/{GOAL}</span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: CREAM }}>
          <span className="text-[14px] font-bold" style={{ color: INK }}>Voucher · {WHALE_STAMP.rewardLabel}</span>
          <StatusChip state={redeemed ? "redeemed" : voucherActive ? "active" : "none"} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={addStamp}
            disabled={stamps >= GOAL}
            className="rounded-2xl py-3.5 text-[15px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40"
            style={{ background: BRAND, color: BRAND_FG }}
          >
            + Add 1 Stamp
          </button>
          <button
            type="button"
            onClick={onRedeem}
            disabled={!voucherActive}
            className="rounded-2xl py-3.5 text-[15px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40"
            style={{ background: INK, color: "#fff" }}
          >
            ✓ Redeem Voucher
          </button>
        </div>
        <p className="mt-3 text-center text-[12.5px] font-medium" style={{ color: "#93A3A7" }}>
          {redeemed
            ? "Voucher redeemed — the customer's card resets for the next reward."
            : voucherActive
            ? "Card is full — tap Redeem Voucher to give Sarah her free topping."
            : "Tap Add 1 Stamp each visit. At 5/5 the voucher unlocks automatically."}
        </p>
      </div>
    </section>
  );
}

function StatusChip({ state }: { state: "none" | "active" | "redeemed" }) {
  const map = {
    none: { label: "Locked", bg: "#F1F5F5", fg: "#93A3A7" },
    active: { label: "Active", bg: "rgba(54,207,142,.16)", fg: "#1A8F60" },
    redeemed: { label: "Redeemed", bg: "#E7EEEE", fg: "#5B6B70" },
  }[state];
  return (
    <span className="rounded-full px-3 py-1 text-[12px] font-extrabold" style={{ background: map.bg, color: map.fg }}>
      {map.label}
    </span>
  );
}

// ── Owner dashboard view ─────────────────────────────────────────────────────
const KPIS: { v: string; l: string }[] = [
  { v: "324", l: "Members" },
  { v: "57", l: "New this month" },
  { v: "188", l: "Voucher claims" },
  { v: "61", l: "Redemptions" },
  { v: "32%", l: "Redemption rate" },
  { v: "97", l: "Active stamp cards" },
];
const WEEK = [42, 55, 48, 63, 71, 88, 96];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function OwnerView() {
  const max = Math.max(...WEEK);
  return (
    <section className="space-y-4">
      <div className="rounded-3xl p-5" style={{ background: "#fff", border: `1px solid ${BRAND}22`, boxShadow: "0 20px 50px -34px rgba(18,167,160,.6)" }}>
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-extrabold" style={{ color: INK }}>Whale Tea · Owner dashboard</div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold" style={{ background: "rgba(54,207,142,.16)", color: "#1A8F60" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#36CF8E" }} /> Live
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {KPIS.map((k) => (
            <div key={k.l} className="rounded-2xl px-4 py-3" style={{ background: CREAM }}>
              <div className="text-2xl font-extrabold" style={{ color: INK }}>{k.v}</div>
              <div className="text-[12px] font-semibold" style={{ color: "#5B6B70" }}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl p-5" style={{ background: "#fff", border: `1px solid ${BRAND}22` }}>
        <div className="text-[13px] font-extrabold uppercase tracking-wide" style={{ color: INK }}>Signups this week</div>
        <div className="mt-4 flex h-32 items-end gap-2.5">
          {WEEK.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="w-full rounded-t-lg" style={{ height: `${Math.round((v / max) * 100)}%`, background: `linear-gradient(180deg, ${BRAND}, ${BRAND_D})`, minHeight: 6 }} />
              <span className="text-[11px] font-bold" style={{ color: "#93A3A7" }}>{DAYS[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-[12px] italic" style={{ color: "#93A3A7" }}>
        Sample figures shown for the demo. Your dashboard fills with your own numbers.
      </p>
    </section>
  );
}

// ── Bonus wheel modal ────────────────────────────────────────────────────────
function WheelModal({
  nonce, bonus, onComplete, onClose, onAgain,
}: {
  nonce: number; bonus: string | null; onComplete: (r: GameResult) => void; onClose: () => void; onAgain: () => void;
}) {
  const lost = bonus != null && /try ?again/i.test(bonus);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,20,24,.6)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Bonus game"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[360px] rounded-3xl p-5" style={{ background: CREAM }}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-xl" style={{ background: "#fff", color: INK }}>×</button>
        <h3 className="text-center text-xl font-extrabold" style={{ color: INK }}>Bonus spin 🎡</h3>
        <p className="mt-1 text-center text-[13px] font-medium" style={{ color: "#5B6B70" }}>A little extra for full-card members.</p>

        {bonus == null ? (
          <div className="mt-2 flex justify-center">
            <SpinWheel
              key={nonce}
              campaignId="whale-tea-demo"
              config={WHEEL_CONFIG}
              theme={{ brandColor: BRAND, brandFg: BRAND_FG }}
              onComplete={onComplete}
            />
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="text-5xl">{lost ? "🎯" : "🎉"}</div>
            <div className="mt-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: "#93A3A7" }}>{lost ? "So close" : "You won"}</div>
            <div className="text-2xl font-extrabold" style={{ color: INK }}>{bonus}</div>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={onAgain} className="rounded-2xl py-3 text-[15px] font-extrabold" style={{ background: "#fff", color: INK, border: `1px solid ${BRAND}33` }}>Spin again</button>
              <button type="button" onClick={onClose} className="rounded-2xl py-3 text-[15px] font-extrabold" style={{ background: BRAND, color: BRAND_FG }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
