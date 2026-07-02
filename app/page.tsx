import Link from "next/link";
import type { Metadata } from "next";
import "./landing.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { readStudioConfig } from "@/lib/types/studio";
import { type PortfolioBrand } from "@/components/site/BrandGamePreview";
import { BrandGameCarousel } from "@/components/site/BrandGameCarousel";
import { BookCallButton } from "@/components/site/BookCallButton";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { WA_DEFAULT, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY, IDENTITY_LINE } from "@/lib/site/contact";
import type { GameType } from "@/lib/types/game";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gameable Studios — Digital Rewards, Stamp Cards & Game Campaigns for Small Businesses in Singapore",
  description:
    "We build your branded rewards page — customers scan, join, collect stamps, and redeem in-store. Launch it with a game campaign. A loyalty program for small business, no POS needed. Singapore.",
};

// ── Agency identity (edit here) ──────────────────────────────────────────────
const AGENCY = {
  name: "GAMEABLE STUDIOS",
  mark: "G",
  email: CONTACT_EMAIL,
  phone: CONTACT_PHONE,
  phoneDisplay: CONTACT_PHONE_DISPLAY,
};

// One game per grid cell, in order. Brand k is paired with game k.
const GAME_ORDER: GameType[] = [
  "spin_wheel", "scratch", "memory", "dice_roll", "wheel_of_fortune", "color_match",
  "card_flip", "lucky_dip", "pop_balloon", "stack_blocks", "claw_machine", "slot_machine",
];

// The rewards product — four plain-English cards.
const REWARDS: { ico: string; bg: string; title: string; desc: string }[] = [
  { ico: "🏪", bg: "var(--grape)", title: "Your branded rewards page", desc: "Your logo, colours, and rewards at your own link. Customers join in 10 seconds with a name and phone number. No app." },
  { ico: "🎟️", bg: "var(--coral)", title: "Digital stamp card", desc: "Buy 5, get 1 free. Stamps added by your staff from any phone. When the card is full, the reward unlocks automatically." },
  { ico: "✅", bg: "var(--aqua)", title: "Vouchers & redemption", desc: "Every voucher has a code and a status. Staff verify and redeem at the counter in seconds. No fake screenshots." },
  { ico: "📊", bg: "var(--bubble)", title: "Your dashboard", desc: "See members, stamps, claims, and redemptions. Know who your regulars are. The data is yours." },
];

// Who it's for — verified live demo brands, presented as demos/concepts.
const FOOD_BRANDS: { name: string; slug: string }[] = [
  { name: "Smashburger", slug: "smashburger" },
  { name: "Itea", slug: "itea" },
  { name: "Tea Pulse", slug: "tea-pulse" },
  { name: "Hey Long Cha", slug: "hey-long-cha" },
  { name: "TDC", slug: "tdc" },
  { name: "Stuff'd", slug: "stuff-d" },
  { name: "Soup Spoon", slug: "soup-spoon" },
  { name: "Irvin's", slug: "irvin-s" },
];
const SERVICE_BRANDS: { name: string; slug: string }[] = [
  { name: "Glowfully", slug: "glowfully" },
  { name: "Skin 1006", slug: "skin-1006" },
  { name: "Aesthetic Clinic", slug: "aesthetic-clinic" },
  { name: "Epsilon Tuition", slug: "epsilon-tuition" },
];

// Honest comparison — no competitor names. POS gets its deserved checks.
const YES = <span className="cmp-yes" aria-label="yes">✓</span>;
const NO = <span className="cmp-no" aria-label="no">✕</span>;
const CMP: { row: string; paper: React.ReactNode; pos: React.ReactNode; us: React.ReactNode }[] = [
  { row: "Setup", paper: "Print it yourself", pos: "Vendor install + training", us: "We set it up for you" },
  { row: "Hardware needed", paper: "None", pos: "POS terminal or tablet", us: "None — any phone" },
  { row: "Works from an Instagram link", paper: NO, pos: "Sometimes", us: YES },
  { row: "Game campaigns built in", paper: NO, pos: NO, us: YES },
  { row: "Who keeps the customer data", paper: "No data at all", pos: "Often the POS vendor", us: "You do" },
  { row: "Staff effort per visit", paper: "Stamp by hand", pos: "Ring it through the POS", us: "One tap on any phone" },
];

export default async function Home() {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("brands")
    .select("name, public_slug, studio, created_at")
    .order("created_at", { ascending: true });

  const brands: PortfolioBrand[] = (rows ?? [])
    .map((r) => {
      const row = r as { name: string; public_slug: string | null; studio?: unknown };
      return { name: row.name, publicSlug: row.public_slug ?? null, config: readStudioConfig(row.studio) };
    })
    .filter((b) => b.name.trim().toLowerCase() !== "seed brand");

  const cells = brands.slice(0, GAME_ORDER.length);

  return (
    <div className="lp">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <div className="logo"><span className="mark">{AGENCY.mark}</span> {AGENCY.name}</div>
          <nav className="nav-links">
            <a href="#rewards">Rewards</a>
            <a href="#who">Who it&apos;s for</a>
            <Link href="/how-it-works">How it works</Link>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-cta">
            <Link href="/portal/login" className="btn btn-ghost">Client login</Link>
            <a className="btn btn-primary" href={WA_DEFAULT} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <span className="eyebrow on-dark">Rewards + game campaigns · Singapore</span>
              <h1>Games get them in. <span className="pop">Rewards</span> bring them back.</h1>
              <p className="hero-sub">
                We build your branded rewards page — customers scan, join, collect stamps, and redeem in-store.
                Launch it with a game campaign that gets everyone playing. You track it all from one dashboard.
              </p>
              <div className="hero-cta">
                <a className="btn btn-sun btn-lg" href={WA_DEFAULT} target="_blank" rel="noopener noreferrer">WhatsApp us →</a>
                <Link className="btn btn-ghost on-dark btn-lg" href="/b/whale-tea">Open full demo ↗</Link>
              </div>
            </div>

            {/* Live, tappable demo embedded in a phone */}
            <div className="demo-stage">
              <div className="demo-badge"><span className="dot" /> Live demo — tap to play</div>
              <div className="demo-frame">
                <iframe src="/b/whale-tea" title="Whale Tea rewards demo" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WORK — the live grid of branded games we've built */}
      <section id="work">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">The work</span>
            <h2>Real branded games we&apos;ve built.</h2>
          </div>
          <p className="work-caption">
            Every player can become a member of your <span>rewards program</span> — not just a like.
          </p>

          {cells.length > 0 ? (
            <div className="pf-grid">
              {cells.map((brand, k) => {
                return (
                  <div className="pf-grid-cell" key={brand.name + k}>
                    <BrandGameCarousel brand={brand} games={GAME_ORDER} startIndex={k} phoneWidth={300} />
                    {brand.publicSlug ? (
                      <Link className="pf-grid-brand pf-grid-hub" href={`/b/${brand.publicSlug}`} style={{ color: "#000" }}>
                        {brand.name} ↗
                      </Link>
                    ) : (
                      <span className="pf-grid-brand" style={{ color: "#000" }}>{brand.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pf-empty">
              No brands yet — new games appear here automatically once they&apos;re live.
            </div>
          )}
        </div>
      </section>

      {/* THE REWARDS PROGRAM — the product */}
      <section id="rewards" className="rw">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">The rewards program</span>
            <h2>The part that keeps them coming back.</h2>
            <p>One branded page where customers join, collect stamps, and claim rewards — and one dashboard where you see all of it.</p>
          </div>
          <div className="rw-grid">
            {REWARDS.map((c) => (
              <div className="rw-card" key={c.title}>
                <span className="rw-ico" style={{ background: c.bg }}>{c.ico}</span>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="rw-connect">
            Then, when you want a burst of attention — a launch, a promo, a slow month — we run a game campaign on top.{" "}
            <span>Every player lands in your rewards program, not just your likes.</span>
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="games-sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow on-dark">What we do</span>
            <h2 style={{ color: "#fff" }}>We run your rewards system — campaigns included.</h2>
            <p>Your rewards page, your stamp cards, your vouchers, and the game campaigns that fill them — set up, hosted, and supported by us.</p>
          </div>
          <div className="games">
            <div className="gcard" style={{ background: "var(--grape)", color: "#fff" }}>
              <h3>Campaign Strategy &amp; Concepts</h3>
              <p>The campaign idea and game concepts, matched to your brand and the reason you&apos;re running it.</p>
            </div>
            <div className="gcard" style={{ background: "var(--sun)" }}>
              <h3>Full Brand Theming</h3>
              <p>Your logo, colours, fonts and assets baked into your rewards page and every game.</p>
            </div>
            <div className="gcard" style={{ background: "var(--coral)", color: "#fff" }}>
              <h3>Rewards, Stamps &amp; Vouchers</h3>
              <p>Weighted prizes, voucher codes, stamp cards, and member signup — built in.</p>
            </div>
            <div className="gcard" style={{ background: "var(--aqua)" }}>
              <h3>QR &amp; Link Delivery</h3>
              <p>One tap to join or play — a hosted page, QR codes for the counter, or an Instagram link.</p>
            </div>
            <div className="gcard" style={{ background: "var(--bubble)", color: "#fff" }}>
              <h3>Tracking &amp; Insights</h3>
              <p>See members, stamps, claims and redemptions so you know exactly what worked.</p>
            </div>
            <div className="gcard" style={{ background: "#fff", justifyContent: "center" }}>
              <h3 style={{ color: "var(--grape-d)", fontSize: 22 }}>Hosting &amp; support</h3>
              <p style={{ color: "var(--muted)" }}>We host, maintain, and tweak your rewards page and games so they&apos;re always live and on-brand.</p>
              <a className="tag" style={{ color: "var(--grape-d)" }} href={WA_DEFAULT} target="_blank" rel="noopener noreferrer">Get yours →</a>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section id="who">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Who it&apos;s for</span>
            <h2>Built for shops that live on regulars.</h2>
            <p>The brands below are demos and concepts we&apos;ve built — tap any to play.</p>
          </div>

          <div className="who-row">
            <div className="who-head">
              <h3>Food &amp; drinks</h3>
              <p>A stamp card turns a one-time bubble tea run into a weekly habit — buy a few, the next one&apos;s on the house.</p>
            </div>
            <div className="who-brands">
              {FOOD_BRANDS.map((b) => (
                <Link key={b.slug} className="who-chip" href={`/b/${b.slug}`}>{b.name} ↗</Link>
              ))}
            </div>
          </div>

          <div className="who-row">
            <div className="who-head">
              <h3>Services &amp; lifestyle</h3>
              <p>Salons, clinics and tuition run on repeat visits — rewards and birthday perks give people a reason to book the next one with you.</p>
            </div>
            <div className="who-brands">
              {SERVICE_BRANDS.map((b) => (
                <Link key={b.slug} className="who-chip" href={`/b/${b.slug}`}>{b.name} ↗</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HONEST COMPARISON */}
      <section id="compare" style={{ background: "var(--cream)" }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Honest comparison</span>
            <h2>Where a rewards page fits.</h2>
            <p>A paper card is free but forgettable. A POS system is powerful but heavy. We sit in between — set up for you, no terminal.</p>
          </div>
          <div className="cmp-wrap">
            <table className="cmp">
              <colgroup>
                <col />
                <col />
                <col />
                <col className="us-col" />
              </colgroup>
              <thead>
                <tr>
                  <th></th>
                  <th>Paper stamp card</th>
                  <th>POS loyalty system</th>
                  <th className="us">Gameable <span className="cmp-badge">Us</span></th>
                </tr>
              </thead>
              <tbody>
                {CMP.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.paper}</td>
                    <td>{r.pos}</td>
                    <td className="us">{r.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards for small screens */}
          <div className="cmp-cards">
            {([
              ["Paper stamp card", "paper", false],
              ["POS loyalty system", "pos", false],
              ["Gameable", "us", true],
            ] as [string, "paper" | "pos" | "us", boolean][]).map(([title, key, us]) => (
              <div className={`cmp-col${us ? " us" : ""}`} key={key}>
                <div className="cmp-col-head">
                  <span>{title}</span>
                  {us && <span className="cmp-badge">Us</span>}
                </div>
                {CMP.map((r) => (
                  <div className="cmp-col-row" key={r.row}>
                    <span className="k">{r.row}</span>
                    <span className="val">{r[key]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p className="cmp-note">No POS needed. Set up for you. Campaign games included. Starts from a link, not a terminal.</p>
        </div>
      </section>

      {/* GAME FORMATS — the arcade */}
      <section id="formats">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">The arcade</span>
            <h2>20+ game formats.</h2>
            <p>Every one plugs into your rewards program. Mobile-first and fully brandable — mix and match per campaign.</p>
          </div>
          <div className="formats">
            {[
              ["🎡", "Spin Wheel"], ["🪙", "Scratch Card"], ["❓", "Quiz"], ["🎰", "Fill the Outline"],
              ["🎁", "Pick a Box"], ["🧩", "Memory Match"], ["🔴", "Plinko"], ["🥤", "Cup Shuffle"],
              ["🎯", "Ring Shooter"], ["🧺", "Catch the Drops"], ["📌", "Pin Drop"], ["🧱", "Stack the Blocks"],
              ["⚡", "Speed Tap"], ["⏱️", "Stop the Timer"], ["🟢", "Reaction Test"], ["🧭", "Angle Stop"],
            ].map(([ico, label]) => (
              <div key={label} className="fmt">
                <span className="fmt-ico">{ico}</span>
                <span className="fmt-label">{label}</span>
              </div>
            ))}
            <div className="fmt fmt-more">+ more, custom-built</div>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
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
              <p style={{ marginTop: 14, maxWidth: 280, fontSize: 14 }}>
                {IDENTITY_LINE}
              </p>
            </div>
            <div><h4>Product</h4><ul><li><a href="#rewards">Rewards program</a></li><li><a href="#who">Who it&apos;s for</a></li><li><Link href="/b/whale-tea">Live demo</Link></li></ul></div>
            <div><h4>Explore</h4><ul><li><Link href="/how-it-works">How it works</Link></li><li><a href="#formats">Game formats</a></li><li><Link href="/portal/login">Client login</Link></li></ul></div>
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
