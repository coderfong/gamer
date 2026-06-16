import Link from "next/link";
import "../landing.css";
import HowItWorksTabs from "@/components/site/HowItWorksTabs";

export const metadata = {
  title: "How it works — Gameable Studios",
  description: "From one QR scan to a number on your dashboard — the full loop, what we measure, how we stay compliant, and the outcomes we move.",
};

const AGENCY = {
  name: "GAMEABLE STUDIOS",
  mark: "G",
  email: "gameablestudiosg@gmail.com",
  phone: "+6594799717",
  phoneDisplay: "+65 9479 9717",
};

export default function HowItWorksPage() {
  return (
    <div className="lp">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="logo" href="/"><span className="mark">{AGENCY.mark}</span> {AGENCY.name}</Link>
          <nav className="nav-links">
            <Link href="/how-it-works#dashboard">Dashboard</Link>
            <Link href="/#services">Services</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/#contact">Contact</Link>
          </nav>
          <div className="nav-cta">
            <Link className="btn btn-ghost" href="/brands">Studio</Link>
            <a className="btn btn-primary" href={`tel:${AGENCY.phone}`}>Book a call</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hiw-hero">
        <div className="wrap">
          <span className="eyebrow on-dark">How it works</span>
          <h1>A scan becomes a number<br />you can report upward.</h1>
          <p>Not &ldquo;we make fun games&rdquo; — the full loop: a brand touchpoint turns into a measurable business outcome. Here&apos;s exactly how.</p>
        </div>
      </section>

      {/* TABS */}
      <section className="hiw-sec">
        <div className="wrap">
          <HowItWorksTabs />
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band" id="contact">
        <div className="wrap">
          <div className="cta-card">
            <h2>Start from your <span className="display" style={{ color: "var(--sun)" }}>KPI</span>.</h2>
            <p>Tell us the number you need to move. We&apos;ll come back with the game shape, the CTA, and how we&apos;ll prove it.</p>
            <div className="hero-cta">
              <a className="btn btn-sun btn-lg" href={`mailto:${AGENCY.email}`}>Email the studio →</a>
              <Link className="btn btn-ghost on-dark btn-lg" href="/#work">See the work</Link>
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
            <div><h4>Studio</h4><ul><li><Link href="/how-it-works#dashboard">Dashboard</Link></li><li><Link href="/#services">Services</Link></li><li><Link href="/#process">Process</Link></li></ul></div>
            <div><h4>Explore</h4><ul><li><Link href="/how-it-works">How it works</Link></li><li><Link href="/#formats">Game formats</Link></li><li><Link href="/brands">Studio login</Link></li></ul></div>
            <div><h4>Contact</h4><ul><li><a href={`mailto:${AGENCY.email}`}>{AGENCY.email}</a></li><li><a href={`tel:${AGENCY.phone}`}>{AGENCY.phoneDisplay}</a></li></ul></div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} {AGENCY.name}. All rights reserved.</span>
            <span>Made with 🎮 by Gameable Studios.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
