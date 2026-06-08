/* ============================================================
   LAUNCHER + APP ROUTER
   ============================================================ */
const GAMES = [
  { id: "wheel", name: "Spin Wheel", tag: "Spin to win", icon: "🎡", color: POP.grape, dark: false, Comp: () => window.SpinWheel },
  { id: "scratch", name: "Scratch Card", tag: "Rub to reveal", icon: "🪙", color: POP.sun, dark: false, Comp: () => window.ScratchCard },
  { id: "quiz", name: "Quiz Time", tag: "Answer & win", icon: "❓", color: POP.coral, dark: true, Comp: () => window.Quiz },
  { id: "slot", name: "Lucky Slots", tag: "Pull the lever", icon: "🎰", color: POP.bubble, dark: false, Comp: () => window.SlotMachine },
  { id: "box", name: "Pick a Box", tag: "Choose a gift", icon: "🎁", color: POP.aqua, dark: false, Comp: () => window.PickABox },
];

function Home({ plays, onPlay }) {
  return (
    <div className="pop-ui screen-scroll" style={{ position: "absolute", inset: 0, padding: "6px 18px 24px", display: "flex", flexDirection: "column", gap: 16,
      background: POP.cream, backgroundImage: window.halftone("rgba(35,27,46,.05)", 16, 2.2) }}>
      {/* brand lockup */}
      <div style={{ textAlign: "center", position: "relative", paddingTop: 6 }}>
        <Sparkle size={22} color={POP.bubble} style={{ position: "absolute", left: 8, top: 14, animation: "bob 3s ease-in-out infinite" }} />
        <Sparkle size={16} color={POP.aqua} style={{ position: "absolute", right: 14, top: 4, animation: "bob 3.4s ease-in-out infinite" }} />
        <div className="pop-display" style={{ fontSize: 15, letterSpacing: 3, color: POP.coral }}>WELCOME TO</div>
        <div className="pop-display titlepop" style={{ fontSize: 46, lineHeight: .9 }}>{BRAND.name}</div>
        <div className="pop-display" style={{ fontSize: 16, color: POP.ink, marginTop: 2 }}>· {BRAND.tagline} ·</div>
      </div>

      {/* plays ticket */}
      <div className="sticker pop-ui" style={{ background: POP.mint, borderRadius: 18, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: POP.ink }}>Daily Plays</div>
          <div style={{ fontWeight: 600, fontSize: 12, color: POP.ink, opacity: .75 }}>Refills every morning</div>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="sticker-sm" style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: i < plays ? POP.sun : "rgba(255,255,255,.6)", fontSize: 15 }}>
              {i < plays ? "🎟️" : "·"}
            </span>
          ))}
        </div>
      </div>

      {/* game grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        {GAMES.map((g, i) => (
          <button key={g.id} onClick={() => plays > 0 && onPlay(g.id)} disabled={plays <= 0}
            className="sticker" style={{
              background: g.color, borderRadius: 20, padding: "16px 12px 14px", textAlign: "center", cursor: plays > 0 ? "pointer" : "not-allowed",
              color: g.dark ? "#fff" : POP.ink, position: "relative", overflow: "hidden",
              gridColumn: i === 4 ? "1 / -1" : undefined, transition: "transform .1s",
            }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: window.halftone("rgba(255,255,255,.18)", 13, 2), opacity: .6 }} />
            <div style={{ position: "relative", display: "flex", flexDirection: i === 4 ? "row" : "column", alignItems: "center", justifyContent: "center", gap: i === 4 ? 12 : 4 }}>
              <div style={{ fontSize: 38, lineHeight: 1, filter: `drop-shadow(2px 2px 0 ${POP.ink})` }}>{g.icon}</div>
              <div>
                <div className="pop-display" style={{ fontSize: 19, lineHeight: 1, textShadow: g.dark ? `1.5px 1.5px 0 ${POP.ink}` : "none" }}>{g.name}</div>
                <div style={{ fontWeight: 700, fontSize: 11.5, opacity: .85, marginTop: 3 }}>{g.tag}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: POP.ink, opacity: .55, marginTop: "auto" }}>
        {plays > 0 ? "Pick a game to play →" : "Out of plays — come back tomorrow!"}
        <div style={{ marginTop: 4, textDecoration: "underline" }}>Activity rules</div>
      </div>
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brandName": "FIZZ&POP",
  "accent": "#FFC23C",
  "titleFill": "#FFC23C",
  "displayFont": "Luckiest Guy",
  "confetti": 110
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState("home"); // home | <gameId>
  const [result, setResult] = React.useState(null);
  const [plays, setPlays] = React.useState(3);

  // apply tweaks to system tokens + globals
  React.useEffect(() => {
    document.documentElement.style.setProperty("--sun", t.titleFill);
    document.documentElement.style.setProperty("--accent", t.accent);
    window.BRAND.name = t.brandName;
    window.__confettiBase = t.confetti;
    [...document.querySelectorAll(".pop-display")].forEach((el) => { el.style.fontFamily = `"${t.displayFont}", cursive`; });
  }, [t]);

  const meta = GAMES.find((g) => g.id === route);

  function launch(id) { setResult(null); setRoute(id); }
  function onResult(prize) { setPlays((p) => Math.max(0, p - 1)); setResult(prize); }
  function home() { setResult(null); setRoute("home"); }
  function again() { if (plays > 0) { setResult(null); /* re-mount same game */ setRoute("home"); setTimeout(() => setRoute(meta ? meta.id : route), 0); } }

  let body;
  if (route === "home") {
    body = <Home plays={plays} onPlay={launch} />;
  } else if (result) {
    body = <ResultCard prize={result} onAgain={again} onHome={home} plays={plays} />;
  } else if (meta) {
    const Comp = meta.Comp();
    body = (
      <React.Fragment>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          {Comp ? <Comp onResult={onResult} plays={plays} /> : <div style={{ padding: 40 }}>Loading…</div>}
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 }}>
          <GameHeader onBack={home} plays={plays} dark={meta.dark} />
        </div>
      </React.Fragment>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
      background: `radial-gradient(circle at 30% 20%, #3a3146, #221b2e 70%)` }}>
      <PhoneFrame>
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>{body}</div>
      </PhoneFrame>

      <TweaksPanel>
        <TweakSection label="Brand" />
        <TweakText label="Brand name" value={t.brandName} onChange={(v) => setTweak("brandName", v)} />
        <TweakColor label="Accent" value={t.accent}
          options={["#FFC23C", "#FF5A4D", "#FF74B0", "#27C4D9", "#36CF8E", "#8A6BFF"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakColor label="Title fill" value={t.titleFill}
          options={["#FFC23C", "#FF74B0", "#27C4D9", "#36CF8E", "#FFFFFF"]}
          onChange={(v) => setTweak("titleFill", v)} />
        <TweakSection label="Type" />
        <TweakSelect label="Display font" value={t.displayFont}
          options={["Luckiest Guy", "Fredoka", "Bungee", "Titan One"]}
          onChange={(v) => setTweak("displayFont", v)} />
        <TweakSection label="Celebration" />
        <TweakSlider label="Confetti" value={t.confetti} min={30} max={220} step={10}
          onChange={(v) => setTweak("confetti", v)} />
        <TweakButton label="Test confetti" onClick={() => window.fireConfetti(t.confetti)} />
      </TweaksPanel>
    </div>
  );
}
window.App = App;

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
