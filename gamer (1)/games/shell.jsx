/* ============================================================
   SHELL — per-game background, header bar, and the win/result card
   ============================================================ */

/* Themed full-bleed background: a base color, halftone dots, and a soft glow.
   `pattern` can be "dots" | "stripes" | "grid". */
function GameBG({ base, glow, pattern = "dots", children }) {
  let layer;
  if (pattern === "stripes") {
    layer = `repeating-linear-gradient(115deg, transparent 0 26px, rgba(255,255,255,.06) 26px 52px)`;
  } else if (pattern === "grid") {
    layer = `linear-gradient(rgba(255,255,255,.07) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,.07) 1.5px, transparent 1.5px)`;
  } else {
    layer = window.halftone("rgba(255,255,255,.10)", 16, 2.4);
  }
  return (
    <div style={{
      position: "absolute", inset: 0, background: base, overflow: "hidden",
      backgroundImage: pattern === "grid" ? layer : undefined,
      backgroundSize: pattern === "grid" ? "26px 26px" : undefined,
    }}>
      {pattern !== "grid" ? (
        <div style={{ position: "absolute", inset: 0, backgroundImage: layer, backgroundSize: pattern === "stripes" ? undefined : "16px 16px" }} />
      ) : null}
      {glow ? (
        <div style={{
          position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)",
          width: 460, height: 460, borderRadius: "50%",
          background: `radial-gradient(circle, ${glow}, transparent 65%)`, opacity: .85, filter: "blur(6px)",
        }} />
      ) : null}
      <div style={{ position: "relative", height: "100%" }}>{children}</div>
    </div>
  );
}
window.GameBG = GameBG;

/* Top header used inside each game: back chevron + brand wordmark + plays pill. */
function GameHeader({ onBack, plays, dark = false }) {
  const col = dark ? "#fff" : POP.ink;
  return (
    <div className="pop-ui" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 16px 4px", position: "relative", zIndex: 30,
    }}>
      <button onClick={onBack} aria-label="Back" className="sticker-sm" style={{
        width: 40, height: 40, borderRadius: 12, background: POP.paper, color: POP.ink,
        fontSize: 20, cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1, paddingBottom: 2,
      }}>‹</button>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
        <span className="pop-display" style={{ fontSize: 19, color: col }}>{BRAND.name}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: col, opacity: .7, textTransform: "uppercase" }}>{BRAND.tagline}</span>
      </div>
      <div className="sticker-sm pop-ui" style={{
        background: POP.sun, color: POP.ink, borderRadius: 999, padding: "5px 11px",
        fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{ fontSize: 13 }}>🎟️</span>{plays}
      </div>
    </div>
  );
}
window.GameHeader = GameHeader;

/* ============================================================
   RESULT CARD — celebratory takeover after a play resolves
   ============================================================ */
function ResultCard({ prize, onAgain, onHome, plays }) {
  const win = !prize.loss;
  const code = React.useMemo(() => "FZP-" + Math.random().toString(36).slice(2, 7).toUpperCase(), []);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (win) {
      const t1 = setTimeout(() => window.fireConfetti(110), 250);
      const t2 = setTimeout(() => window.fireConfetti(70), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [win]);

  return (
    <GameBG base={win ? POP.grape : "#6E6478"} glow={win ? POP.bubble : "transparent"} pattern="dots">
      <div className="pop-ui screen-scroll" style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 26, gap: 18, textAlign: "center",
      }}>
        {/* floating sparkles */}
        {win ? (
          <React.Fragment>
            <Sparkle size={30} color={POP.sun} style={{ position: "absolute", top: 70, left: 40, animation: "bob 2.4s ease-in-out infinite" }} />
            <Sparkle size={20} color={POP.aqua} style={{ position: "absolute", top: 130, right: 46, animation: "bob 2.8s ease-in-out infinite" }} />
            <Sparkle size={24} color={POP.coral} style={{ position: "absolute", bottom: 150, left: 54, animation: "bob 3.1s ease-in-out infinite" }} />
          </React.Fragment>
        ) : null}

        <div className="pop-display titlepop" style={{ fontSize: 46, lineHeight: .95, animation: "pop-in .5s ease-out both" }}>
          {win ? "YOU WON!" : "AW, SHUCKS"}
        </div>

        <div style={{ animation: "pop-in .5s .1s ease-out both", transform: "rotate(-3deg)" }}>
          <div style={{ transform: "scale(1.35)" }}>
            <PrizeChip prize={prize} size="lg" />
          </div>
        </div>

        {win ? (
          <React.Fragment>
            <div style={{ marginTop: 10, fontWeight: 600, color: "#fff", fontSize: 14, opacity: .92 }}>
              Show this code at checkout
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
              className="sticker pop-display" style={{
                background: POP.paper, color: POP.ink, borderRadius: 14, padding: "12px 22px",
                fontSize: 24, letterSpacing: 3, cursor: "pointer", borderStyle: "dashed",
              }}>
              {copied ? "COPIED!" : code}
            </button>
          </React.Fragment>
        ) : (
          <div style={{ marginTop: 6, fontWeight: 600, color: "#fff", fontSize: 15, opacity: .92, maxWidth: 260 }}>
            No prize this round — but every play earns a stamp. Come back tomorrow!
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <PopButton color={POP.sun} onClick={onAgain} disabled={plays <= 0} style={{ fontSize: 17, padding: "13px 22px" }}>
            {plays > 0 ? "PLAY AGAIN" : "NO PLAYS"}
          </PopButton>
          <PopButton color={POP.paper} onClick={onHome} style={{ fontSize: 17, padding: "13px 22px" }}>HOME</PopButton>
        </div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, opacity: .85 }}>
          {plays} {plays === 1 ? "play" : "plays"} left today
        </div>
      </div>
    </GameBG>
  );
}
window.ResultCard = ResultCard;
