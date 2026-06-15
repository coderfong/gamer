"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// ── Content ──────────────────────────────────────────────────────────────────
// Drop a matching file into /public/loop/ and the step renders the image instead
// of the emoji. Missing files fall back to the emoji automatically.
const LOOP: { ico: string; title: string; desc: string; image: string }[] = [
  { ico: "📲", title: "Scan",    image: "/loop/scan.png",    desc: "A QR on your touchpoint opens an instant-play game — no app, no download." },
  { ico: "🎮", title: "Play",    image: "/loop/play.png",    desc: "A fully branded game loads in the phone's browser in a couple of seconds." },
  { ico: "✍️", title: "Capture", image: "/loop/capture.png", desc: "Opt-ins, contacts and zero-party data — handed over willingly to unlock a reward." },
  { ico: "🎯", title: "Act",     image: "/loop/act.png",     desc: "CTA clicks, coupon redemptions and click-through to your store." },
  { ico: "📊", title: "Report",  image: "/loop/report.png",  desc: "Every step lands on a live dashboard you can show upward." },
];

// Drop a matching file into /public/qr/ and the card renders the photo instead of
// the colored mock. Missing files fall back to the mock automatically.
const PLACEMENTS: { ico: string; bg: string; label: string; desc: string; image: string }[] = [
  { ico: "📦", bg: "var(--sun)",    label: "Product packaging",   image: "/qr/packaging.png",     desc: "On-pack and on-label — the code travels home with every unit sold." },
  { ico: "🛒", bg: "var(--aqua)",   label: "In-store",            image: "/qr/in-store.png",      desc: "Shelf-talkers, standees and counter cards right at the point of decision." },
  { ico: "🚆", bg: "var(--bubble)", label: "Billboards & transit",image: "/qr/billboards.png",    desc: "Out-of-home posters, billboards and transit panels." },
  { ico: "📺", bg: "var(--grape)",  label: "TV & streaming",      image: "/qr/tv-streaming.png",  desc: "End-cards on TV spots and streaming pre-rolls." },
  { ico: "🧾", bg: "var(--mint)",   label: "Receipts",            image: "/qr/receipts.png",      desc: "Printed on the receipt, the moment after a purchase." },
  { ico: "🎪", bg: "var(--coral)",  label: "Event booths",        image: "/qr/event-booths.png",  desc: "Booths, banners and activations at live events." },
  { ico: "📱", bg: "var(--grape-d)",label: "Social & influencer", image: "/qr/social.png",        desc: "Influencer and social bios, stories and link-in-bio." },
  { ico: "✨", bg: "#15101C",       label: "Anywhere else",       image: "/qr/anywhere.png",      desc: "Wherever your brand already lives — one tap and they're playing." },
];

const FUNNEL: { stage: string; color: string; detail: string }[] = [
  { stage: "Reach",      color: "var(--grape)",  detail: "Total scans, unique devices, and source per placement — straight from the dynamic codes." },
  { stage: "Engagement", color: "var(--aqua)",   detail: "Plays, completion rate, average session time, and replays." },
  { stage: "Data",       color: "var(--bubble)", detail: "Opt-ins, contacts captured, and zero-party data — the preferences and favourites people hand over willingly inside the game." },
  { stage: "Action",     color: "var(--coral)",  detail: "CTA clicks, coupon and code redemptions, and click-through to your store." },
  { stage: "Advocacy",   color: "var(--mint)",   detail: "Shares, referrals, and leaderboard invites." },
];

// ── Live dashboard demo data ────────────────────────────────────────────────
const DASH_KPIS: { value: string; label: string; delta: string; up: boolean }[] = [
  { value: "48,210", label: "Scans",         delta: "12%",  up: true },
  { value: "31,847", label: "Unique players",delta: "9%",   up: true },
  { value: "39,562", label: "Plays",         delta: "14%",  up: true },
  { value: "82%",    label: "Completion",    delta: "4 pts",up: true },
  { value: "11,930", label: "Opt-ins",       delta: "18%",  up: true },
  { value: "6,418",  label: "Redemptions",   delta: "7%",   up: true },
];

const DASH_DAYS: { d: string; v: number }[] = [
  { d: "Mon", v: 3200 }, { d: "Tue", v: 4100 }, { d: "Wed", v: 3800 },
  { d: "Thu", v: 5200 }, { d: "Fri", v: 6100 }, { d: "Sat", v: 7400 }, { d: "Sun", v: 9762 },
];

const DASH_FUNNEL: { label: string; value: string; pct: number; color: string }[] = [
  { label: "Reach",      value: "48,210", pct: 100, color: "var(--grape)" },
  { label: "Engagement", value: "39,562", pct: 82,  color: "var(--aqua)" },
  { label: "Data",       value: "11,930", pct: 25,  color: "var(--bubble)" },
  { label: "Action",     value: "6,418",  pct: 13,  color: "var(--coral)" },
  { label: "Advocacy",   value: "4,205",  pct: 9,   color: "var(--mint)" },
];

const DASH_SOURCES: { label: string; value: string; pct: number; color: string }[] = [
  { label: "In-store standees",    value: "18,320", pct: 38, color: "var(--aqua)" },
  { label: "Product packaging",    value: "13,017", pct: 27, color: "var(--sun)" },
  { label: "Billboards & transit", value: "7,714",  pct: 16, color: "var(--bubble)" },
  { label: "Social & influencer",  value: "5,785",  pct: 12, color: "var(--grape)" },
  { label: "Receipts",             value: "3,374",  pct: 7,  color: "var(--mint)" },
];

const PRINCIPLES: [string, string, string][] = [
  ["🤝", "Consent-first", "Explicit opt-in with a clear privacy notice before any personal data is collected."],
  ["🎚️", "Data minimization", "We collect only what the campaign actually needs — nothing more."],
  ["🔞", "Age-gating", "A neutral age screen with extra care around minors, since games attract under-18s."],
];

const FRAMEWORKS = ["PDPA — Singapore", "GDPR & ePrivacy — EU / UK", "CCPA & CPRA — US"];

const OUTCOMES: [string, string, string, string][] = [
  ["Brand awareness",    "Short, shareable, no signup",               "Challenge a friend",               "Reach, plays, shares, time spent"],
  ["New product launch", "Themed around the product, reveal mechanic","Explore / pre-order",              "Plays, product-page clicks, signups"],
  ["Returning customers","Reward loop, leaderboard, daily challenge", "Come back tomorrow / join loyalty","Repeat plays, return rate, loyalty signups"],
  ["Increase sales",     "Play-to-win discount or instant reward",    "Redeem code at checkout",          "Redemptions, conversion, revenue"],
  ["Data / lead gen",    "Quiz or personalised reward, gated",        "Unlock reward with email",         "Opt-in rate, contacts captured"],
  ["Drive foot traffic", "Location-locked or in-store unlock",        "Show this in store",               "Store visits, in-store redemptions"],
];

const BENEFITS: [string, string, string][] = [
  ["⚡", "Active, not passive", "People play your brand instead of scrolling past it — interaction beats a banner impression."],
  ["🧲", "Attention that sticks", "Seconds of focused play and replays, where an ad gets a fraction of a second."],
  ["🪶", "Tiny footprint", "Nothing to install on anyone's phone — a QR or link drops straight into media you already pay for."],
  ["🎨", "Brand-aligned by design", "Every game is catered to your brand — your logo, colours, characters and tone baked in, so it never feels generic."],
  ["🚀", "Custom-built for your goal", "A game designed ground-up for each campaign — your characters, your mechanic — not a template with a logo dropped on top."],
  ["🔑", "Data you own", "Zero-party data and opt-ins customers hand over willingly — not rented from a platform."],
  ["📣", "Built to be shared", "Challenges, leaderboards and referrals turn one play into many — organic reach you don't pay for."],
  ["📈", "Provably worth it", "Every play, lead and redemption is measured, so you can show the return — not just the spend."],
];

const BENEFIT_NOTES: [string, string][] = [
  ["Tiny footprint, operationally", "Beyond “no app to install” — the code or link slots into packaging, out-of-home, receipts and social you’ve already bought, so distribution costs you nothing extra."],
  ["Played, not skipped", "People skip ads, but they'll play a game. That minute of attention gets you sign-ups, shares with their friends, and a brand they actually remember."],
];

const PROVIDE: { label: string; key?: boolean }[] = [
  { label: "Strategy & game design" },
  { label: "Full brand theming — built around your brand" },
  { label: "Build, QA & device testing" },
  { label: "Hosting & uptime", key: true },
  { label: "Consent & compliance flows", key: true },
  { label: "Privacy & data processing", key: true },
  { label: "Live analytics dashboard" },
  { label: "Prize logic & fulfilment" },
  { label: "QR codes, links & launch assets" },
];

const TABS = [
  { id: "why",        label: "Why a game" },
  { id: "loop",       label: "The loop" },
  { id: "qr",         label: "QR placements" },
  { id: "measure",    label: "What's measured" },
  { id: "dashboard",  label: "Live dashboard" },
  { id: "compliance", label: "Compliance" },
  { id: "provide",    label: "What we provide" },
  { id: "outcomes",   label: "Outcomes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Stylised, tintable QR mark (code-generated motif — not a scannable code).
function QrMark({ className }: { className?: string }) {
  const n = 21;
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (inFinder(x, y)) continue;
      if ((x * 73 + y * 151 + x * y * 31) % 7 < 3) cells.push([x, y]);
    }
  }
  const finder = (ox: number, oy: number) => (
    <g key={`f-${ox}-${oy}`}>
      <rect x={ox} y={oy} width={7} height={7} rx={1.4} fill="currentColor" />
      <rect x={ox + 1} y={oy + 1} width={5} height={5} rx={1} fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width={3} height={3} rx={0.6} fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className={className} role="img" aria-label="QR code">
      <rect x={-1} y={-1} width={n + 2} height={n + 2} rx={2} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
}

export default function HowItWorksTabs() {
  const [tab, setTab] = useState<TabId>("why");
  const [failed, setFailed] = useState<Set<string>>(new Set());

  // Deep-link support: /how-it-works#dashboard opens that tab (and reacts to nav clicks).
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace("#", "");
      if (TABS.some((t) => t.id === h)) setTab(h as TabId);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return (
    <div className="hiw">
      <div className="hiw-tabs" role="tablist" aria-label="How it works">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`hiw-tab${tab === t.id ? " on" : ""}`}
            onClick={() => {
              setTab(t.id);
              window.history.replaceState(null, "", `#${t.id}`);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* WHY A GAME */}
      {tab === "why" && (
        <div className="hiw-panel" role="tabpanel">
          <div className="sec-head" style={{ marginBottom: 40 }}>
            <h2>Why a game beats another ad.</h2>
            <p>Before we&apos;ve even shown you a concept — here&apos;s why the format itself is worth it, versus another banner or social spot.</p>
          </div>
          <div className="ben-grid">
            {BENEFITS.map(([, t, d]) => (
              <div className="ben-card" key={t}>
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div className="ben-note">
            {BENEFIT_NOTES.map(([t, d]) => (
              <div className="ben-note-item" key={t}>
                <strong>{t}</strong>
                {d}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THE LOOP */}
      {tab === "loop" && (
        <div className="hiw-panel" role="tabpanel">
          <div className="sec-head" style={{ marginBottom: 40 }}>
            <h2>From one scan to a number on your dashboard.</h2>
            <p>The path from a brand touchpoint to a measurable business outcome — the full loop, end to end.</p>
          </div>
          <div className="loop">
            {LOOP.map((step, i) => {
              const showPhoto = step.image && !failed.has(step.title);
              return (
                <div className="loop-step" key={step.title}>
                  {showPhoto ? (
                    <Image
                      className="loop-photo"
                      src={step.image}
                      alt={step.title}
                      width={160}
                      height={160}
                      onError={() => setFailed((f) => new Set(f).add(step.title))}
                    />
                  ) : (
                    <div className="loop-ico">{step.ico}</div>
                  )}
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                  {i < LOOP.length - 1 && <span className="loop-arrow">→</span>}
                </div>
              );
            })}
          </div>
          <p className="pitch-line">
            Every game we build starts from your KPI — and we instrument it end-to-end, so you see the{" "}
            <span>return, not just the reach.</span>
          </p>
        </div>
      )}

      {/* QR PLACEMENTS */}
      {tab === "qr" && (
        <div className="hiw-panel" role="tabpanel">
          <div className="sec-head" style={{ marginBottom: 40 }}>
            <h2>One QR. Everywhere you already spend.</h2>
            <p>The code opens an instant-play game in the phone&apos;s browser — no app store, no download, live in a couple of seconds on any phone. Put it wherever your brand already lives.</p>
          </div>
          <div className="qr-grid">
            {PLACEMENTS.map((p) => {
              const showPhoto = p.image && !failed.has(p.label);
              return (
                <div className="qr-card" key={p.label}>
                  <div className="qr-mock" style={showPhoto ? undefined : { background: p.bg }}>
                    {showPhoto ? (
                      <Image
                        className="qr-photo"
                        src={p.image}
                        alt={`QR code on ${p.label.toLowerCase()}`}
                        fill
                        sizes="(max-width: 540px) 100vw, (max-width: 980px) 50vw, 25vw"
                        onError={() => setFailed((f) => new Set(f).add(p.label))}
                      />
                    ) : (
                      <>
                        <span className="qr-medium">{p.ico}</span>
                        <QrMark className="qr-svg" />
                      </>
                    )}
                  </div>
                  <div className="qr-meta">
                    <h4>{p.label}</h4>
                    <p>{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="qr-note">
            <div className="qr-note-item">
              <strong>Dynamic codes.</strong> A unique, trackable code per placement — so you know whether the billboard, the pack, or the influencer drove the play.
            </div>
            <div className="qr-note-item">
              <strong>Branded from second one.</strong> The first screen after the scan is yours — your logo, your colours — so it feels like you from the very first tap.
            </div>
          </div>
        </div>
      )}

      {/* WHAT'S MEASURED */}
      {tab === "measure" && (
        <div className="hiw-panel" role="tabpanel">
          <div className="sec-head" style={{ marginBottom: 40 }}>
            <h2>A funnel, not a vanity metric.</h2>
            <p>We track the journey the way marketers report it — and deliver it as a live dashboard, not a PDF after the fact.</p>
          </div>
          <div className="funnel">
            {FUNNEL.map((f, i) => (
              <div className="funnel-row" key={f.stage}>
                <div className="funnel-stage">
                  <span className="funnel-n" style={{ background: f.color }}>{i + 1}</span>
                  <h4>{f.stage}</h4>
                </div>
                <p>{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIVE DASHBOARD */}
      {tab === "dashboard" && (
        <div className="hiw-panel" role="tabpanel">
          <div className="sec-head" style={{ marginBottom: 32 }}>
            <h2>The live dashboard your team sees.</h2>
            <p>Real-time, every metric in one view — not a PDF weeks after the campaign ends.</p>
          </div>

          <div className="dash">
            <div className="dash-bar">
              <div className="dash-title">
                <strong>Summer Scratch & Win — Live campaign</strong>
                <span>gamefiystudios.com/b/acme · 14 placements tracked</span>
              </div>
              <div className="dash-tools">
                <span className="dash-live"><span className="dot" /> Live</span>
                <span className="dash-range">Last 7 days ▾</span>
              </div>
            </div>

            <div className="dash-kpis">
              {DASH_KPIS.map((k) => (
                <div className="dash-kpi" key={k.label}>
                  <div className="v">{k.value}</div>
                  <div className="l">{k.label}</div>
                  <div className={`d ${k.up ? "up" : "down"}`}>{k.up ? "▲" : "▼"} {k.delta}</div>
                </div>
              ))}
            </div>

            <div className="dash-cols">
              <div className="dash-panel">
                <h5>Plays over time</h5>
                <div className="dash-chart">
                  {DASH_DAYS.map((day) => {
                    const max = Math.max(...DASH_DAYS.map((x) => x.v));
                    return (
                      <div className="col" key={day.d}>
                        <div className="bar" style={{ height: `${Math.round((day.v / max) * 100)}%` }} />
                        <span className="lab">{day.d}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="dash-panel">
                <h5>Conversion funnel</h5>
                <div className="dash-funnel">
                  {DASH_FUNNEL.map((f) => (
                    <div className="dash-frow" key={f.label}>
                      <div className="top"><b>{f.label}</b><span>{f.value}</span></div>
                      <div className="dash-track">
                        <div className="dash-fill" style={{ width: `${f.pct}%`, background: f.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dash-sources">
              <h5>Plays by placement — dynamic QR codes</h5>
              {DASH_SOURCES.map((s) => (
                <div className="dash-src" key={s.label}>
                  <span className="nm">{s.label}</span>
                  <span className="tk"><span className="fl" style={{ width: `${s.pct}%`, background: s.color }} /></span>
                  <span className="vl">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="dash-caption">Sample data shown for illustration — your dashboard fills with real numbers the moment your campaign goes live.</p>
        </div>
      )}

      {/* COMPLIANCE */}
      {tab === "compliance" && (
        <div className="hiw-panel" role="tabpanel">
          <div className="sec-head" style={{ marginBottom: 40 }}>
            <h2>Compliant by default — and we lead with it.</h2>
            <p>Most game vendors skip this. We de-risk the whole thing up front.</p>
          </div>
          <div className="comp-grid">
            {PRINCIPLES.map(([ico, t, d]) => (
              <div className="comp-card" key={t}>
                <div className="ico">{ico}</div>
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div className="comp-frame">
            <div className="comp-frameworks">
              {FRAMEWORKS.map((f) => (
                <span className="comp-chip" key={f}>{f}</span>
              ))}
            </div>
            <p className="comp-role">
              Anonymised analytics on by default, with easy opt-out. We act as the <strong>data processor</strong>; your brand stays the <strong>data controller</strong>, and we provide a data processing agreement.
            </p>
          </div>
          <p className="comp-caveat">
            One honest caveat: we&apos;re not lawyers — have local counsel review the specifics for each market a campaign runs in.
          </p>
        </div>
      )}

      {/* WHAT WE PROVIDE */}
      {tab === "provide" && (
        <div className="hiw-panel" role="tabpanel">
          <div className="sec-head" style={{ marginBottom: 32 }}>
            <h2>Turnkey, end to end.</h2>
            <p>No dev team to stand up, no legal scramble — the reason a brand can say yes.</p>
          </div>
          <p className="prov-lead">
            You bring the brand and the goal. <span>We handle everything else.</span>
          </p>
          <div className="prov-list">
            {PROVIDE.map((p) => (
              <div className={`prov-item${p.key ? " key" : ""}`} key={p.label}>
                <span className="tick">✓</span>
                <div>
                  <h5>{p.label}</h5>
                  {p.key && <span className="prov-badge">Off your plate</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="prov-foot">
            For a marketing team with no game-building experience and a cautious legal department, knowing they won&apos;t have to manage <strong>hosting</strong>, <strong>compliance</strong>, or <strong>privacy</strong> is often what actually closes it — the creative gets them excited, turnkey gets the signature.
          </p>
        </div>
      )}

      {/* OUTCOMES */}
      {tab === "outcomes" && (
        <div className="hiw-panel" role="tabpanel">
          <div className="sec-head" style={{ marginBottom: 40 }}>
            <h2>Tell us your goal. We&apos;ll tell you the game.</h2>
            <p>We don&apos;t sell a game — we sell the game shape, the CTA, and the number we&apos;ll move.</p>
          </div>
          <div className="outcomes-wrap">
            <table className="outcomes">
              <thead>
                <tr>
                  <th>Brand goal</th>
                  <th>Game shape</th>
                  <th>In-game CTA</th>
                  <th>Metric that proves it</th>
                </tr>
              </thead>
              <tbody>
                {OUTCOMES.map(([goal, shape, cta, metric]) => (
                  <tr key={goal}>
                    <td>{goal}</td>
                    <td>{shape}</td>
                    <td>{cta}</td>
                    <td className="metric">{metric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pitch-line">
            Every game we build starts from your KPI, and we instrument it end-to-end so you see the{" "}
            <span>return, not just the reach.</span>
          </p>
        </div>
      )}
    </div>
  );
}
