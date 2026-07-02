import Link from "next/link";
import type { Metadata } from "next";
import "../landing.css";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { WA_DEFAULT, CONTACT_EMAIL, IDENTITY_LINE } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Privacy — Gameable Studios",
  description:
    "How Gameable Studios handles the customer data we store for merchants — names, phone numbers, birthdays, and consent records. PDPA-aligned. Merchants own their customer data.",
};

const AGENCY = { name: "GAMEABLE STUDIOS", mark: "G", email: CONTACT_EMAIL };

const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: "Who we are",
    body: (
      <p>
        Gameable Studios builds branded rewards pages and game campaigns for small businesses. When a business
        (the &ldquo;merchant&rdquo;) runs a rewards program with us, we store a small amount of customer data on the
        merchant&apos;s behalf. This page explains what we collect, why, and your rights over it.
      </p>
    ),
  },
  {
    h: "What we collect",
    body: (
      <>
        <p>When a customer joins a merchant&apos;s rewards program or plays a campaign game, we may store:</p>
        <ul>
          <li><strong>Name</strong> — so staff can recognise the customer at the counter.</li>
          <li><strong>Phone number</strong> — to identify the member and (with consent) send reward reminders.</li>
          <li><strong>Birthday</strong> — only if the merchant offers a birthday reward, and only if the customer gives it.</li>
          <li><strong>Consent records</strong> — a timestamped note of what the customer agreed to at signup.</li>
          <li><strong>Activity</strong> — stamps collected, vouchers claimed, and redemptions, so the program works.</li>
        </ul>
        <p>We do not collect payment card details. We do not buy or rent contact lists.</p>
      </>
    ),
  },
  {
    h: "Consent",
    body: (
      <p>
        Customers opt in when they join. Marketing messages are only sent to customers who explicitly agree, and every
        message includes a way to unsubscribe. Customers can withdraw consent at any time by contacting the merchant
        or us.
      </p>
    ),
  },
  {
    h: "Merchants own their customer data",
    body: (
      <p>
        The customer data collected through a merchant&apos;s rewards program belongs to that merchant. We act as the
        data processor and hold it on their behalf; the merchant is the data controller. We do not use one
        merchant&apos;s customer data for another, and we do not sell it to anyone.
      </p>
    ),
  },
  {
    h: "How it’s stored",
    body: (
      <p>
        Data is stored securely with access limited to the merchant&apos;s own dashboard and our operations. We keep it
        only for as long as the merchant runs a program with us, plus a short period for records, after which it can be
        deleted on request.
      </p>
    ),
  },
  {
    h: "Your rights (PDPA — Singapore)",
    body: (
      <p>
        Under Singapore&apos;s Personal Data Protection Act, you can ask to access the personal data we hold about you,
        correct it, or have it deleted. To make a request, or if you have any question about your data, message us on
        WhatsApp or email <a href={`mailto:${AGENCY.email}`}>{AGENCY.email}</a> and we&apos;ll pass verified requests to
        the relevant merchant where needed.
      </p>
    ),
  },
  {
    h: "One honest note",
    body: (
      <p>
        We&apos;re a small studio, not a law firm. This page describes how we handle data in plain terms; merchants
        with specific compliance obligations should have their own counsel review the setup for their business.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="lp">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="logo" href="/"><span className="mark">{AGENCY.mark}</span> {AGENCY.name}</Link>
          <nav className="nav-links">
            <Link href="/#rewards">Rewards</Link>
            <Link href="/#who">Who it&apos;s for</Link>
            <Link href="/how-it-works">How it works</Link>
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
          <span className="eyebrow on-dark">Privacy</span>
          <h1>The customer data we hold,<br />and how we handle it.</h1>
          <p>Plain English. We store a little data for merchants who run rewards programs — here&apos;s exactly what, why, and your rights over it.</p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="hiw-sec">
        <div className="wrap" style={{ maxWidth: 800 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {SECTIONS.map((s) => (
              <div key={s.h} className="rw-card" style={{ boxShadow: "none", background: "var(--paper)" }}>
                <h3 style={{ fontSize: 20, marginBottom: 10 }}>{s.h}</h3>
                <div className="privacy-body">{s.body}</div>
              </div>
            ))}
          </div>
          <p className="cmp-note" style={{ marginTop: 28 }}>Last updated {new Date().getFullYear()}.</p>
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
            <div><h4>Explore</h4><ul><li><Link href="/how-it-works">How it works</Link></li><li><Link href="/#formats">Game formats</Link></li><li><Link href="/portal/login">Client login</Link></li></ul></div>
            <div><h4>Contact</h4><ul><li><a href={WA_DEFAULT} target="_blank" rel="noopener noreferrer">WhatsApp us</a></li><li><a href={`mailto:${AGENCY.email}`}>{AGENCY.email}</a></li><li><Link href="/privacy">Privacy</Link></li></ul></div>
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
