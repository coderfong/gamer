import Link from "next/link";
import type { Metadata } from "next";
import "../landing.css";
import { BookCallButton } from "@/components/site/BookCallButton";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { WA_DEFAULT, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY, IDENTITY_LINE } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "How it works — loyalty program for small business | Gameable Studios",
  description:
    "The whole loop in plain English: a customer scans, joins your rewards page, collects stamps, unlocks a voucher, and redeems in-store — while your dashboard fills up. QR rewards for cafés, salons, and more. Singapore.",
};

const AGENCY = { name: "GAMEABLE STUDIOS", mark: "G", email: CONTACT_EMAIL, phone: CONTACT_PHONE, phoneDisplay: CONTACT_PHONE_DISPLAY };

// ── The loop — the centerpiece ───────────────────────────────────────────────
const LOOP: { ico: string; title: string; desc: string }[] = [
  { ico: "📲", title: "Scan or tap", desc: "A customer scans your QR at the counter or taps your Instagram link." },
  { ico: "✍️", title: "Join in 10 seconds", desc: "They join your rewards page with a name and number. No app to download." },
  { ico: "🎟️", title: "Collect a stamp", desc: "Your staff add a stamp each visit, from any phone. Buy 5, get 1 free." },
  { ico: "✅", title: "Unlock & redeem", desc: "A full card unlocks a voucher. Staff verify the code and redeem it at the counter." },
  { ico: "📊", title: "They come back", desc: "Your dashboard updates, and the customer has a reason to return next week." },
];

// ── At the counter ───────────────────────────────────────────────────────────
const COUNTER: { num: string; color: string; title: string; desc: string }[] = [
  { num: "1", color: "var(--grape)", title: "Find the customer", desc: "Scan their member QR, or type their phone number into the search box." },
  { num: "2", color: "var(--coral)", title: "Add a stamp", desc: "One tap adds a stamp. When the card fills, the voucher unlocks on its own." },
  { num: "3", color: "var(--mint)", title: "Redeem a voucher", desc: "Check the code shows Active, tap Redeem, and hand over the reward. Done." },
];

// ── What you see — loyalty dashboard preview ─────────────────────────────────
const DASH_KPIS: { v: string; l: string }[] = [
  { v: "324", l: "Members" },
  { v: "57", l: "New this month" },
  { v: "188", l: "Voucher claims" },
  { v: "61", l: "Redemptions" },
  { v: "32%", l: "Redemption rate" },
  { v: "97", l: "Active stamp cards" },
];
const DASH_DAYS: { d: string; v: number }[] = [
  { d: "Mon", v: 42 }, { d: "Tue", v: 55 }, { d: "Wed", v: 48 },
  { d: "Thu", v: 63 }, { d: "Fri", v: 71 }, { d: "Sat", v: 88 }, { d: "Sun", v: 96 },
];
const DASH_OUTLETS: { label: string; value: string; pct: number; color: string }[] = [
  { label: "Tampines outlet", value: "142", pct: 100, color: "var(--grape)" },
  { label: "Jurong outlet", value: "108", pct: 76, color: "var(--aqua)" },
  { label: "Online / Instagram", value: "74", pct: 52, color: "var(--bubble)" },
];

// ── Campaigns on top ─────────────────────────────────────────────────────────
const BOOSTERS: { ico: string; bg: string; title: string; desc: string }[] = [
  { ico: "🎂", bg: "var(--sun)", title: "Birthday rewards", desc: "A treat lands automatically on a member's birthday — a reason to come in and bring a friend." },
  { ico: "🔗", bg: "var(--aqua)", title: "Referral links", desc: "Members share a link; new signups get tagged to who brought them in." },
  { ico: "🎡", bg: "var(--coral)", title: "Game campaigns", desc: "Run a spin-the-wheel or scratch card for a launch or slow month — every player joins your rewards program." },
];

// ── Why a game beats another ad — condensed ──────────────────────────────────
const WHY: { title: string; desc: string }[] = [
  { title: "Played, not skipped", desc: "People skip ads, but they'll play a game — that's a minute of attention on your brand, not a fraction of a second." },
  { title: "Every player becomes a member", desc: "A campaign game isn't just likes. Each play lands a real member in your rewards program." },
  { title: "Fits where you already are", desc: "A QR or link drops onto your counter, packaging, or Instagram — no new channel to buy." },
  { title: "You can see it worked", desc: "Signups, stamps, and redemptions are all counted, so you know what the campaign actually did." },
];

export default function HowItWorksPage() {
  const maxDay = Math.max(...DASH_DAYS.map((x) => x.v));
  return (
    <div className="lp">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="logo" href="/"><span className="mark">{AGENCY.mark}</span> {AGENCY.name}</Link>
          <nav className="nav-links">
            <Link href="/#rewards">Rewards</Link>
            <a href="#loop">The loop</a>
            <a href="#dashboard">Dashboard</a>
            <Link href="/#contact">Contact</Link>
          </nav>
          <div className="nav-cta">
            <Link href="/portal/login" className="btn btn-ghost">Client login</Link>
            <a className="btn btn-primary" href={WA_DEFAULT} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hiw-hero">
        <div className="wrap">
          <span className="eyebrow on-dark">How it works</span>
          <h1>One scan today.<br />A regular by next month.</h1>
          <p>No jargon. Here&apos;s the whole thing — how a customer joins, how your staff add a stamp, and how you watch it all from one dashboard.</p>
          <div className="hero-cta">
            <a className="btn btn-sun btn-lg" href={WA_DEFAULT} target="_blank" rel="noopener noreferrer">WhatsApp us →</a>
            <Link className="btn btn-ghost on-dark btn-lg" href="/demo">Play a live demo</Link>
          </div>
        </div>
      </section>

      {/* THE LOOP */}
      <section id="loop">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">The loop</span>
            <h2>Scan → join → stamp → reward → come back.</h2>
            <p>The same simple loop runs every day. Set it up once and it just keeps going.</p>
          </div>
          <div className="loop">
            {LOOP.map((s, i) => (
              <div className="loop-step" key={s.title}>
                <div className="loop-ico">{s.ico}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
                {i < LOOP.length - 1 && <span className="loop-arrow">→</span>}
              </div>
            ))}
          </div>
          <p className="pitch-line">
            Customers come back for the free one. You get a list of your regulars and a{" "}
            <span>reason for them to return.</span>
          </p>
        </div>
      </section>

      {/* AT THE COUNTER */}
      <section id="counter" style={{ background: "var(--cream)" }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">At the counter</span>
            <h2>What your staff actually do.</h2>
            <p>No new hardware. It works on the same phone that&apos;s already behind your counter.</p>
          </div>
          <div className="steps">
            {COUNTER.map((c) => (
              <div className="step" key={c.num}>
                <div className="num" style={{ background: c.color }}>{c.num}</div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="pitch-line">If it takes more than 10 seconds, we&apos;ve failed. <span>It doesn&apos;t.</span></p>
        </div>
      </section>

      {/* WHAT YOU SEE — DASHBOARD */}
      <section id="dashboard">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">What you see</span>
            <h2>One dashboard. Your whole rewards program.</h2>
            <p>Members, stamps, claims, redemptions, and which outlet is doing best — all in one live view.</p>
          </div>

          <div className="dash">
            <div className="dash-bar">
              <div className="dash-title">
                <strong>Your rewards program — live</strong>
                <span>Members, stamps, and redemptions, updated as they happen</span>
              </div>
              <div className="dash-tools">
                <span className="dash-live"><span className="dot" /> Live</span>
                <span className="dash-range">This month ▾</span>
              </div>
            </div>

            <div className="dash-kpis">
              {DASH_KPIS.map((k) => (
                <div className="dash-kpi" key={k.l}>
                  <div className="v">{k.v}</div>
                  <div className="l">{k.l}</div>
                </div>
              ))}
            </div>

            <div className="dash-cols">
              <div className="dash-panel">
                <h5>Signups this week</h5>
                <div className="dash-chart">
                  {DASH_DAYS.map((day) => (
                    <div className="col" key={day.d}>
                      <div className="bar" style={{ height: `${Math.round((day.v / maxDay) * 100)}%` }} />
                      <span className="lab">{day.d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dash-panel">
                <h5>Redemptions by outlet</h5>
                <div className="dash-funnel">
                  {DASH_OUTLETS.map((o) => (
                    <div className="dash-frow" key={o.label}>
                      <div className="top"><b>{o.label}</b><span>{o.value}</span></div>
                      <div className="dash-track"><div className="dash-fill" style={{ width: `${o.pct}%`, background: o.color }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="dash-caption">
            Sample figures shown. Every merchant gets a live dashboard like this — <Link href="/portal/login" style={{ color: "var(--grape-d)", fontWeight: 700 }}>client login →</Link>
          </p>
        </div>
      </section>

      {/* CAMPAIGNS ON TOP */}
      <section id="campaigns" style={{ background: "var(--cream)" }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Campaigns on top</span>
            <h2>Want a burst of attention? Add a campaign.</h2>
            <p>Boosters that run on the same system — every play and reward tied to a real member, not a like.</p>
          </div>
          <div className="rw-grid">
            {BOOSTERS.map((b) => (
              <div className="rw-card" key={b.title}>
                <span className="rw-ico" style={{ background: b.bg, color: "#15101C" }}>{b.ico}</span>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY A GAME */}
      <section id="why">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Why a game</span>
            <h2>Why a game beats another ad.</h2>
            <p>The campaign is the hook that fills the rewards program. Here&apos;s why the format earns its place.</p>
          </div>
          <div className="ben-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {WHY.map((w) => (
              <div className="ben-card" key={w.title}>
                <h4>{w.title}</h4>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DATA & COMPLIANCE */}
      <section id="data" style={{ background: "var(--cream)" }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Data &amp; compliance</span>
            <h2>The data is yours, and it&apos;s handled properly.</h2>
          </div>
          <div className="comp-frame">
            <div className="comp-frameworks">
              <span className="comp-chip">PDPA — Singapore</span>
            </div>
            <p className="comp-role">
              We only collect what the program needs — a name, a phone number, and a birthday if you offer a birthday reward.
              Every customer opts in at signup, and every message has an unsubscribe. The customer data belongs to you, the merchant;
              we hold it on your behalf and never share it with anyone. See our{" "}
              <Link href="/privacy" style={{ color: "var(--grape-d)", fontWeight: 700 }}>privacy page</Link> for the full picture.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band" id="contact">
        <div className="wrap">
          <div className="cta-card">
            <h2>Tell us about your <span className="display" style={{ color: "var(--sun)" }}>shop</span>.</h2>
            <p>We&apos;ll come back with a rewards page concept and a game you can play. Pricing depends on your setup — message us and we&apos;ll scope it together.</p>
            <div className="hero-cta">
              <a className="btn btn-sun btn-lg" href={WA_DEFAULT} target="_blank" rel="noopener noreferrer">WhatsApp us →</a>
              <BookCallButton className="btn btn-ghost on-dark btn-lg" />
            </div>
            <div className="cta-email">Prefer email? <a href={`mailto:${AGENCY.email}`}>{AGENCY.email}</a></div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="logo"><span className="mark">{AGENCY.mark}</span> {AGENCY.name}</div>
              <p style={{ marginTop: 14, maxWidth: 280, fontSize: 14 }}>{IDENTITY_LINE}</p>
            </div>
            <div><h4>Product</h4><ul><li><Link href="/#rewards">Rewards program</Link></li><li><Link href="/#who">Who it&apos;s for</Link></li><li><Link href="/demo">Live demo</Link></li></ul></div>
            <div><h4>Explore</h4><ul><li><a href="#loop">The loop</a></li><li><a href="#dashboard">Dashboard</a></li><li><Link href="/portal/login">Client login</Link></li></ul></div>
            <div><h4>Contact</h4><ul><li><a href={WA_DEFAULT} target="_blank" rel="noopener noreferrer">WhatsApp us</a></li><li><a href={`mailto:${AGENCY.email}`}>{AGENCY.email}</a></li><li><a href={`tel:${AGENCY.phone}`}>{AGENCY.phoneDisplay}</a></li><li><Link href="/privacy">Privacy</Link></li></ul></div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} {AGENCY.name}. All rights reserved.</span>
            <span>Made with 🎮 by Gameable Studios.</span>
          </div>
        </div>
      </footer>

      <WhatsAppFab />
    </div>
  );
}
