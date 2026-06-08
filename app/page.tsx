import Link from "next/link";
import "./landing.css";

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#36CF8E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function Home() {
  const demoUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/play/test-spinwheel`;

  return (
    <div className="lp">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <div className="logo"><span className="mark">F</span> FIZZ&amp;POP</div>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#games">Games</a>
            <a href="#proof">Results</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="nav-cta">
            <Link className="btn btn-ghost" href="/login">Log in</Link>
            <Link className="btn btn-primary" href="/signup">Start free</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" style={{ padding: 0 }}>
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow on-dark">★ Gamified marketing platform</span>
            <h1>Turn every customer into a <span className="pop">player</span>.</h1>
            <p className="hero-sub">Spin-to-win, scratch cards, quizzes &amp; more — branded to your business in minutes. Capture leads, drive repeat visits, and reward loyalty with games people actually want to play.</p>
            <div className="hero-cta">
              <Link className="btn btn-sun btn-lg" href="/signup">Launch your first game →</Link>
              <a className="btn btn-ghost on-dark btn-lg" href="#games">See all games</a>
            </div>
            <div className="hero-stats">
              <div className="s"><div className="n">3×</div><div className="l">more email sign-ups</div></div>
              <div className="s"><div className="n">41%</div><div className="l">play-again rate</div></div>
              <div className="s"><div className="n">5&nbsp;min</div><div className="l">to go live</div></div>
            </div>
          </div>

          {/* LIVE DEMO */}
          <div className="demo-stage">
            <div className="demo-badge"><span className="dot" /> LIVE DEMO · PLAY IT</div>
            <span className="float spark" style={{ top: 40, left: -26, fontSize: 34 }}>✨</span>
            <span className="float spark" style={{ bottom: 80, right: -22, fontSize: 30 }}>🎁</span>
            <span className="float spark" style={{ bottom: -14, left: 30, fontSize: 26 }}>⭐</span>
            <div className="demo-frame">
              <iframe src={demoUrl} title="Live Spin Wheel demo" scrolling="no" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <div className="trust">
        <div className="wrap trust-inner">
          <span className="lbl">Powering campaigns for</span>
          <span className="chip">☕ Glow Café</span>
          <span className="chip">💪 Iron Gym</span>
          <span className="chip">💅 Lush Salon</span>
          <span className="chip">🥗 Fresh Bowl</span>
          <span className="chip">✨ Skin Clinic</span>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">How it works</span>
            <h2>Live in three steps. No code, no agency.</h2>
            <p>You bring the brand and the prizes. We handle the game, the capture, and the redemption loop.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="num" style={{ background: "var(--grape)" }}>1</div>
              <h3>Skin it to your brand</h3>
              <p>Drop in your logo, pick two colors, choose a vertical. Every game instantly matches your look — no designer needed.</p>
            </div>
            <div className="step">
              <div className="num" style={{ background: "var(--coral)" }}>2</div>
              <h3>Share a link or QR</h3>
              <p>Print a QR for the counter, drop the link in an email, or embed the game on your site. Players are one tap away.</p>
            </div>
            <div className="step">
              <div className="num" style={{ background: "var(--mint)" }}>3</div>
              <h3>Capture &amp; reward</h3>
              <p>Collect the lead, hand out the prize, and track every redemption. Vouchers live on the player&apos;s phone until used.</p>
            </div>
          </div>
        </div>
      </section>

      {/* GAMES SHOWCASE */}
      <section id="games" className="games-sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow on-dark">The arcade</span>
            <h2 style={{ color: "#fff" }}>20 games. One playful system.</h2>
            <p>Mix and match by campaign. Each one is fully branded, mobile-first, and built to convert.</p>
          </div>
          <div className="games">
            <div className="gcard" style={{ background: "var(--grape)", color: "#fff" }}>
              <div className="ico">🎡</div>
              <h3>Spin Wheel</h3>
              <p>The classic. Weighted odds, prize slices, big payoff moment.</p>
              <div className="tag">Best for foot traffic →</div>
            </div>
            <div className="gcard" style={{ background: "var(--sun)" }}>
              <div className="ico">🪙</div>
              <h3>Scratch Card</h3>
              <p>Real finger-scratch foil with a satisfying reveal threshold.</p>
              <div className="tag">Best for receipts →</div>
            </div>
            <div className="gcard" style={{ background: "var(--coral)", color: "#fff" }}>
              <div className="ico">❓</div>
              <h3>Quiz Time</h3>
              <p>Teach your brand while they play. Score-based rewards.</p>
              <div className="tag">Best for engagement →</div>
            </div>
            <div className="gcard" style={{ background: "var(--bubble)", color: "#fff" }}>
              <div className="ico">🎰</div>
              <h3>Lucky Slots</h3>
              <p>Pull the lever, match three, win big. Pure dopamine.</p>
              <div className="tag">Best for repeat play →</div>
            </div>
            <div className="gcard" style={{ background: "var(--aqua)" }}>
              <div className="ico">🎁</div>
              <h3>Pick a Box</h3>
              <p>Choose a wrapped gift and flip to reveal. Simple &amp; addictive.</p>
              <div className="tag">Best for events →</div>
            </div>
            <div className="gcard" style={{ background: "#fff", alignItems: "flex-start", justifyContent: "center" }}>
              <h3 style={{ color: "var(--grape-d)", fontSize: 22 }}>+ 15 more</h3>
              <p style={{ color: "var(--muted)" }}>Memory, dice, whack-a-mole, claw machine, reaction &amp; more — all included.</p>
              <Link className="tag" style={{ color: "var(--grape-d)" }} href="/signup">Browse the arcade →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section id="proof">
        <div className="wrap">
          <div className="proof">
            <div><div className="n">2.4M+</div><div className="l">games played</div></div>
            <div><div className="n">380k</div><div className="l">leads captured</div></div>
            <div><div className="n">68%</div><div className="l">voucher redemption</div></div>
            <div><div className="n">1,200+</div><div className="l">local brands</div></div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: "var(--cream)" }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Pricing</span>
            <h2>Plans that scale with your foot traffic.</h2>
            <p>Start free. Upgrade when the leads start rolling in. No contracts, cancel anytime.</p>
          </div>
          <div className="tiers">
            <div className="tier">
              <div className="pname">Starter</div>
              <div className="price">$0<span>/mo</span></div>
              <div className="pdesc">For trying your first campaign.</div>
              <ul>
                <li><Check /> 1 active campaign</li>
                <li><Check /> 500 plays / month</li>
                <li><Check /> All 20 games</li>
                <li><Check /> QR &amp; link sharing</li>
              </ul>
              <Link className="btn btn-ghost" href="/signup">Start free</Link>
            </div>
            <div className="tier feat">
              <div className="ribbon">MOST POPULAR</div>
              <div className="pname">Growth</div>
              <div className="price">$49<span>/mo</span></div>
              <div className="pdesc">For brands running campaigns year-round.</div>
              <ul>
                <li><Check /> Unlimited campaigns</li>
                <li><Check /> 5,000 plays / month</li>
                <li><Check /> Custom branding &amp; presets</li>
                <li><Check /> Lead export &amp; CRM sync</li>
                <li><Check /> Analytics dashboard</li>
              </ul>
              <Link className="btn btn-primary" href="/signup">Start 14-day trial</Link>
            </div>
            <div className="tier">
              <div className="pname">Scale</div>
              <div className="price">$149<span>/mo</span></div>
              <div className="pdesc">For multi-location &amp; franchises.</div>
              <ul>
                <li><Check /> Everything in Growth</li>
                <li><Check /> 25,000 plays / month</li>
                <li><Check /> Multi-location &amp; roles</li>
                <li><Check /> Webhooks &amp; API</li>
                <li><Check /> Priority support</li>
              </ul>
              <Link className="btn btn-ghost" href="/signup">Talk to sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-band">
        <div className="wrap">
          <div className="cta-card">
            <h2>Your customers are <span className="display" style={{ color: "var(--sun)" }}>ready to play</span>.</h2>
            <p>Launch a branded game in five minutes. Free to start — no card required.</p>
            <div className="hero-cta">
              <Link className="btn btn-sun btn-lg" href="/signup">Create your first campaign →</Link>
              <a className="btn btn-ghost on-dark btn-lg" href="#how">See how it works</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="logo"><span className="mark">F</span> FIZZ&amp;POP</div>
              <p style={{ marginTop: 14, maxWidth: 240, fontSize: 14 }}>Gamified marketing for local brands. Play more, sell more.</p>
            </div>
            <div><h4>Product</h4><ul><li><a href="#games">Games</a></li><li><a href="#how">How it works</a></li><li><a href="#pricing">Pricing</a></li><li><a href="#">Integrations</a></li></ul></div>
            <div><h4>Company</h4><ul><li><a href="#">About</a></li><li><a href="#">Case studies</a></li><li><a href="#">Blog</a></li><li><a href="#">Contact</a></li></ul></div>
            <div><h4>Legal</h4><ul><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li><li><a href="#">Cookies</a></li></ul></div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 FIZZ&amp;POP, Inc. All rights reserved.</span>
            <span>Made with 🎡 for local business.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
