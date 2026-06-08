/* ============================================================
   VOUCHER FLOW — two screens:
   1) ResultPage  = /play/[slug]/result/[playId]  (persistent, shareable)
   2) RedeemPage  = /r/[code]                       (in-store, staff confirms)
   ============================================================ */

/* ---------- 1. Persistent result / voucher page ---------- */
function ResultPage({ voucher, onRedeem }) {
  const [copied, setCopied] = React.useState(false);
  const shortUrl = "fzp.gg/r/" + voucher.code.replace("FZP-", "").toLowerCase();

  React.useEffect(() => { const t = setTimeout(() => window.fireConfetti(80), 350); return () => clearTimeout(t); }, []);

  function copy() {
    navigator.clipboard?.writeText("https://" + shortUrl);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <GameBG base={POP.grape} glow={POP.bubble} pattern="dots">
      <div className="pop-ui screen-scroll" style={{ position: "absolute", inset: 0, padding: "16px 20px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {/* saved reassurance pill */}
        <div className="sticker-sm pop-ui" style={{ background: POP.mint, color: POP.ink, borderRadius: 999, padding: "6px 14px", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginTop: 4, whiteSpace: "nowrap" }}>
          <span>✓</span> SAVED TO YOUR PHONE
        </div>

        <div className="pop-display titlepop" style={{ fontSize: 34, textAlign: "center", lineHeight: .92 }}>YOUR REWARD</div>

        <div style={{ transform: "rotate(-2deg)" }}>
          <Ticket voucher={voucher} />
        </div>

        {/* meta */}
        <div className="pop-ui" style={{ color: "#fff", fontWeight: 700, fontSize: 12.5, opacity: .92, textAlign: "center", textShadow: `1px 1px 0 ${POP.ink}` }}>
          Won on {voucher.wonVia} · {voucher.wonOn}<br />
          Valid through {voucher.expires}
        </div>

        {/* primary: redeem */}
        <PopButton color={POP.sun} onClick={onRedeem} style={{ fontSize: 19, padding: "15px 30px", width: "100%", maxWidth: 300 }}>
          REDEEM IN STORE
        </PopButton>

        {/* share row */}
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 300 }}>
          <button onClick={copy} className="sticker-sm pop-ui" style={{ flex: 1, background: POP.paper, color: POP.ink, borderRadius: 14, padding: "11px 8px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {copied ? "✓ Copied!" : "🔗 Copy link"}
          </button>
          <button className="sticker-sm pop-ui" style={{ flex: 1, background: POP.paper, color: POP.ink, borderRadius: 14, padding: "11px 8px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            📲 Wallet
          </button>
        </div>

        {/* bookmark hint */}
        <div className="pop-ui" style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,.18)", borderRadius: 12, padding: "9px 13px", color: "#fff", fontWeight: 600, fontSize: 12, maxWidth: 300 }}>
          <span style={{ fontSize: 16 }}>🔖</span>
          <span>Bookmark this page — your voucher lives here. Lost it? We'll text the link.</span>
        </div>
      </div>
    </GameBG>
  );
}
window.ResultPage = ResultPage;

/* ---------- 2. In-store redemption page /r/[code] ---------- */
function RedeemPage({ voucher, redeemed, redeemedAt, onConfirm }) {
  const [hold, setHold] = React.useState(0); // 0..1
  const raf = React.useRef(null);
  const holding = React.useRef(false);
  const [clock, setClock] = React.useState(new Date());

  // live clock (anti-screenshot)
  React.useEffect(() => { const i = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(i); }, []);

  function startHold() {
    if (redeemed) return;
    holding.current = true;
    const t0 = performance.now();
    const dur = 1200;
    const step = (now) => {
      if (!holding.current) return;
      const p = Math.min(1, (now - t0) / dur);
      setHold(p);
      if (p >= 1) { holding.current = false; window.fireConfetti(50); onConfirm(); return; }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }
  function endHold() {
    holding.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);
    if (hold < 1) setHold(0);
  }
  React.useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const timeStr = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <GameBG base={redeemed ? "#5C5566" : POP.aqua} glow={redeemed ? "transparent" : "#BDEFF6"} pattern="dots">
      <div className="pop-ui screen-scroll" style={{ position: "absolute", inset: 0, padding: "14px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* store context */}
        <div style={{ textAlign: "center", marginTop: 2 }}>
          <div className="pop-display" style={{ fontSize: 13, letterSpacing: 2, color: "#fff", textShadow: `1.5px 1.5px 0 ${POP.ink}` }}>{BRAND.name} · GLOW CAFÉ</div>
          <div className="pop-display titlepop" style={{ fontSize: 28, lineHeight: .95, marginTop: 2 }}>
            {redeemed ? "ALL DONE!" : "SHOW TO STAFF"}
          </div>
        </div>

        <div style={{ transform: redeemed ? "rotate(-2deg)" : "rotate(-1deg)", transition: "transform .3s" }}>
          <Ticket voucher={voucher} redeemed={redeemed} redeemedAt={redeemedAt} mode="redeem" />
        </div>

        {!redeemed ? (
          <React.Fragment>
            {/* live verification strip — hard to screenshot */}
            <div className="sticker-sm pop-ui" style={{ background: POP.ink, color: POP.sun, borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: POP.mint, animation: "glowpulse 1.4s infinite" }} />
              LIVE · {timeStr}
            </div>

            {/* staff confirm panel */}
            <div className="sticker pop-ui" style={{ background: POP.paper, borderRadius: 18, padding: 14, width: "100%", maxWidth: 300, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, color: POP.coral }}>FOR STAFF ONLY</div>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: POP.ink, opacity: .75, margin: "4px 0 12px" }}>
                Confirm the order, then press &amp; hold to mark this voucher used. This can't be undone.
              </div>
              <button onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold}
                onTouchStart={(e) => { e.preventDefault(); startHold(); }} onTouchEnd={endHold}
                className="pop-display" style={{
                  position: "relative", width: "100%", border: `3.5px solid ${POP.ink}`, borderRadius: 999,
                  background: POP.coral, color: "#fff", padding: "15px 0", fontSize: 19, cursor: "pointer",
                  overflow: "hidden", userSelect: "none", touchAction: "none", boxShadow: `0 5px 0 ${POP.ink}`,
                }}>
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${hold * 100}%`, background: POP.mint, transition: holding.current ? "none" : "width .2s" }} />
                <span style={{ position: "relative" }}>{hold > 0 ? "KEEP HOLDING…" : "HOLD TO REDEEM"}</span>
              </button>
            </div>
          </React.Fragment>
        ) : (
          <div className="sticker pop-ui" style={{ background: POP.paper, borderRadius: 18, padding: "16px 18px", width: "100%", maxWidth: 300, textAlign: "center" }}>
            <div style={{ fontSize: 30 }}>✅</div>
            <div className="pop-display" style={{ fontSize: 20, color: POP.ink, marginTop: 2 }}>VOUCHER USED</div>
            <div style={{ fontWeight: 600, fontSize: 12.5, color: POP.ink, opacity: .75, marginTop: 4 }}>
              Redeemed at {redeemedAt}. Thanks for playing — your next free play unlocks tomorrow morning!
            </div>
          </div>
        )}
      </div>
    </GameBG>
  );
}
window.RedeemPage = RedeemPage;

/* ---------- router ---------- */
function VoucherApp() {
  const [voucher] = React.useState(() => window.makeVoucher());
  const [route, setRoute] = React.useState("result"); // result | redeem
  const [redeemed, setRedeemed] = React.useState(false);
  const [redeemedAt, setRedeemedAt] = React.useState("");

  function confirmRedeem() {
    setRedeemedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setRedeemed(true);
  }

  const tabs = [
    { id: "result", label: "Player voucher", sub: "/result/[playId]" },
    { id: "redeem", label: "In-store redeem", sub: "/r/[code]" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "26px 24px 34px", background: `radial-gradient(circle at 30% 18%, #3a3146, #221b2e 72%)` }}>
      {/* prototype route switcher (outside phone) */}
      <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,.07)", padding: 6, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)" }}>
        {tabs.map((t) => {
          const on = route === t.id;
          return (
            <button key={t.id} onClick={() => setRoute(t.id)} style={{
              border: "none", cursor: "pointer", borderRadius: 10, padding: "8px 14px", textAlign: "left",
              background: on ? POP.sun : "transparent", color: on ? POP.ink : "rgba(255,255,255,.7)",
              fontFamily: "Fredoka, sans-serif", transition: "all .15s",
            }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 10, fontFamily: "monospace", opacity: .7 }}>{t.sub}</div>
            </button>
          );
        })}
      </div>

      <PhoneFrame>
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          {route === "result"
            ? <ResultPage voucher={voucher} onRedeem={() => setRoute("redeem")} />
            : <RedeemPage voucher={voucher} redeemed={redeemed} redeemedAt={redeemedAt} onConfirm={confirmRedeem} />}
        </div>
      </PhoneFrame>

      {route === "redeem" && redeemed ? (
        <button onClick={() => { setRedeemed(false); setRedeemedAt(""); }} style={{ background: "none", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.6)", borderRadius: 999, padding: "6px 14px", fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          ↺ Reset redemption (demo)
        </button>
      ) : null}
    </div>
  );
}
window.VoucherApp = VoucherApp;

ReactDOM.createRoot(document.getElementById("root")).render(<VoucherApp />);
