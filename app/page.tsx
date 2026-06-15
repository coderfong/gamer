import Link from "next/link";
import "./landing.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { readStudioConfig } from "@/lib/types/studio";
import { getGameMeta } from "@/lib/games/gameMeta";
import { BrandGamePreview, type PortfolioBrand } from "@/components/site/BrandGamePreview";
import type { GameType } from "@/lib/types/game";

export const dynamic = "force-dynamic";

// ── Agency identity (edit here) ──────────────────────────────────────────────
const AGENCY = {
  name: "GAMEFIY STUDIOS",
  mark: "G",
  email: "hello@gamefiystudios.com",
};

// One game per grid cell, in order. Brand k is paired with game k.
const GAME_ORDER: GameType[] = [
  "spin_wheel", "scratch", "memory", "dice_roll", "wheel_of_fortune", "color_match",
  "card_flip", "lucky_dip", "pop_balloon", "stack_blocks", "claw_machine", "slot_machine",
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

  const cells = brands.slice(0, GAME_ORDER.length).map((brand, k) => ({
    brand,
    gameType: GAME_ORDER[k % GAME_ORDER.length],
  }));

  return (
    <div className="lp">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <div className="logo"><span className="mark">{AGENCY.mark}</span> {AGENCY.name}</div>
          <nav className="nav-links">
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#process">Process</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-cta">
            <Link className="btn btn-ghost" href="/brands">Studio</Link>
            <a className="btn btn-primary" href={`mailto:${AGENCY.email}`}>Book a call</a>
          </div>
        </div>
      </header>

      {/* WORK — the live grid */}
      <section id="work">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Gamefiy Studios</span>
            <h2>{cells.length || ""} brands. Every kind of game.</h2>
            <p>Custom-built, fully-branded mini-games. Each one is live — play it right here, or open its hub.</p>
          </div>

          {cells.length > 0 ? (
            <div className="pf-grid">
              {cells.map(({ brand, gameType }) => {
                const meta = getGameMeta(gameType);
                const brandColor = brand.config.theme.brandColor;
                return (
                  <div className="pf-grid-cell" key={brand.name + gameType}>
                    <BrandGamePreview brand={brand} gameType={gameType} phoneWidth={300} />
                    <span className="pf-grid-label" style={{ color: brandColor }}>{meta.icon} {meta.label}</span>
                    {brand.publicSlug ? (
                      <Link className="pf-grid-brand pf-grid-hub" href={`/b/${brand.publicSlug}`} style={{ color: brandColor, opacity: 0.78 }}>
                        {brand.name} ↗
                      </Link>
                    ) : (
                      <span className="pf-grid-brand" style={{ color: brandColor, opacity: 0.72 }}>{brand.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pf-empty">
              No brands yet — build one in your{" "}
              <Link href="/brands" style={{ textDecoration: "underline" }}>Studio</Link>{" "}
              and it appears here automatically.
            </div>
          )}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="games-sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow on-dark">What we do</span>
            <h2 style={{ color: "#fff" }}>A full-service branded game studio.</h2>
            <p>From first concept to a live, shareable link — we handle design, build, and the whole capture-and-reward loop.</p>
          </div>
          <div className="games">
            <div className="gcard" style={{ background: "var(--grape)", color: "#fff" }}>
              <div className="ico">🎨</div>
              <h3>Custom Game Design</h3>
              <p>Bespoke mechanics and art direction matched to your brand and campaign goal.</p>
            </div>
            <div className="gcard" style={{ background: "var(--sun)" }}>
              <div className="ico">🖌️</div>
              <h3>Full Brand Theming</h3>
              <p>Your logo, colours, fonts and assets baked into every pixel of the game.</p>
            </div>
            <div className="gcard" style={{ background: "var(--coral)", color: "#fff" }}>
              <div className="ico">🎁</div>
              <h3>Prizes &amp; Lead Capture</h3>
              <p>Weighted prize logic, voucher codes, and name/email capture built in.</p>
            </div>
            <div className="gcard" style={{ background: "var(--aqua)" }}>
              <div className="ico">📱</div>
              <h3>QR &amp; Link Delivery</h3>
              <p>One tap to play — a hosted hub, QR codes for the counter, or an embed.</p>
            </div>
            <div className="gcard" style={{ background: "var(--bubble)", color: "#fff" }}>
              <div className="ico">📊</div>
              <h3>Tracking &amp; Insights</h3>
              <p>See plays, leads, and redemptions so you know exactly what worked.</p>
            </div>
            <div className="gcard" style={{ background: "#fff", justifyContent: "center" }}>
              <h3 style={{ color: "var(--grape-d)", fontSize: 22 }}>Hosting &amp; support</h3>
              <p style={{ color: "var(--muted)" }}>We host, maintain, and tweak your game so it&apos;s always live and on-brand.</p>
              <a className="tag" style={{ color: "var(--grape-d)" }} href={`mailto:${AGENCY.email}`}>Start a project →</a>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">How we work</span>
            <h2>From brief to live game in three steps.</h2>
            <p>You bring the brand and the prize. We design the game, build it, and hand you a link.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="num" style={{ background: "var(--grape)" }}>1</div>
              <h3>Discovery</h3>
              <p>We learn your brand, audience, and goal — leads, footfall, launch buzz — and pick the right game.</p>
            </div>
            <div className="step">
              <div className="num" style={{ background: "var(--coral)" }}>2</div>
              <h3>Design &amp; build</h3>
              <p>We theme and build a fully custom game, then send you a live preview to play and refine.</p>
            </div>
            <div className="step">
              <div className="num" style={{ background: "var(--mint)" }}>3</div>
              <h3>Launch &amp; measure</h3>
              <p>Go live with a link or QR, hand out prizes, and watch the plays and leads roll in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* GAME FORMATS */}
      <section id="formats" style={{ background: "var(--cream)" }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">The arcade</span>
            <h2>20+ game formats to build from.</h2>
            <p>Every format is mobile-first and fully brandable. Mix and match per campaign.</p>
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
            <h2>Let&apos;s build your <span className="display" style={{ color: "var(--sun)" }}>branded game</span>.</h2>
            <p>Tell us about your brand and what you want to achieve. We&apos;ll come back with a concept — and a game you can play.</p>
            <div className="hero-cta">
              <a className="btn btn-sun btn-lg" href={`mailto:${AGENCY.email}`}>Email the studio →</a>
              <a className="btn btn-ghost on-dark btn-lg" href="#work">See the work</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="logo"><span className="mark">{AGENCY.mark}</span> {AGENCY.name}</div>
              <p style={{ marginTop: 14, maxWidth: 260, fontSize: 14 }}>
                A branded game studio. We design and build custom games that make brands play.
              </p>
            </div>
            <div><h4>Studio</h4><ul><li><a href="#work">Work</a></li><li><a href="#services">Services</a></li><li><a href="#process">Process</a></li></ul></div>
            <div><h4>Explore</h4><ul><li><a href="#formats">Game formats</a></li><li><Link href="/brands">Studio login</Link></li></ul></div>
            <div><h4>Contact</h4><ul><li><a href={`mailto:${AGENCY.email}`}>{AGENCY.email}</a></li></ul></div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} {AGENCY.name}. All rights reserved.</span>
            <span>Made with 🎮 by Gamefiy Studios.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
