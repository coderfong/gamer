/* ============================================================
   SCRATCH CARD — real canvas scratch-off with reveal threshold
   ============================================================ */
function ScratchCard({ onResult, plays }) {
  const PRIZE = React.useMemo(() => {
    const pool = [PRIZES.drink, PRIZES.off20, PRIZES.bogo, PRIZES.topping, PRIZES.gift, PRIZES.jackpot, PRIZES.miss, PRIZES.miss];
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);
  const W = 286, H = 286;
  const canvasRef = React.useRef(null);
  const [revealed, setRevealed] = React.useState(false);
  const [pct, setPct] = React.useState(0);
  const drawing = React.useRef(false);
  const done = React.useRef(false);

  // paint the foil
  React.useEffect(() => {
    const cv = canvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    // base foil gradient
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, POP.sun); g.addColorStop(1, "#FFB03B");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // halftone dots
    ctx.fillStyle = "rgba(255,116,176,.55)";
    for (let y = 8; y < H; y += 18) for (let x = 8; x < W; x += 18) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.28); ctx.fill(); }
    // diagonal sheen band
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.5); ctx.fillRect(-W, -26, W * 2, 40); ctx.restore();
    // text
    ctx.textAlign = "center"; ctx.fillStyle = POP.coral;
    ctx.font = "700 34px 'Luckiest Guy', cursive";
    ctx.lineWidth = 4; ctx.strokeStyle = POP.ink;
    ctx.strokeText("SCRATCH", W / 2, H / 2 - 6);
    ctx.fillText("SCRATCH", W / 2, H / 2 - 6);
    ctx.font = "700 20px 'Luckiest Guy', cursive";
    ctx.strokeText("HERE TO WIN", W / 2, H / 2 + 26);
    ctx.fillText("HERE TO WIN", W / 2, H / 2 + 26);
    ctx.font = "30px sans-serif";
    ctx.strokeText("🪙", W / 2, H / 2 + 74); ctx.fillText("🪙", W / 2, H / 2 + 74);
    ctx.globalCompositeOperation = "destination-out";
  }, []);

  function pos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: ((t.clientX - r.left) / r.width) * W, y: ((t.clientY - r.top) / r.height) * H };
  }
  function scratch(e) {
    if (done.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.beginPath(); ctx.arc(x, y, 26, 0, 6.28); ctx.fill();
  }
  function sample() {
    const cv = canvasRef.current;
    const ctx = cv.getContext("2d");
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 40) { total++; if (data[i] === 0) clear++; }
    const p = clear / total;
    setPct(p);
    if (p > 0.52 && !done.current) {
      done.current = true;
      setRevealed(true);
      if (!PRIZE.loss) window.fireConfetti(70);
      setTimeout(() => onResult(PRIZE), 1100);
    }
  }
  function down(e) { e.preventDefault(); if (plays <= 0) return; drawing.current = true; scratch(e); }
  function move(e) { if (!drawing.current) return; e.preventDefault(); scratch(e); }
  function up() { if (!drawing.current) return; drawing.current = false; sample(); }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center", gap: 18, padding: "0 16px" }}>
      <div className="pop-display titlepop" style={{ fontSize: 32, textAlign: "center", lineHeight: .95 }}>LUCKY SCRATCH</div>

      {/* ticket */}
      <div className="sticker-lg" style={{ background: POP.aqua, borderRadius: 26, padding: 16, position: "relative", width: 322 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 2px" }}>
          <span className="sticker-sm pop-display" style={{ background: POP.bubble, color: POP.ink, borderRadius: 8, padding: "2px 9px", fontSize: 13 }}>$0</span>
          <span className="pop-ui" style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: 1.5, textShadow: `1.5px 1.5px 0 ${POP.ink}` }}>FEELING LUCKY?</span>
          <span className="sticker-sm pop-display" style={{ background: POP.sun, color: POP.ink, borderRadius: 8, padding: "2px 9px", fontSize: 11 }}>FZP</span>
        </div>

        {/* scratch zone */}
        <div style={{ position: "relative", width: W, height: H, margin: "0 auto", borderRadius: 16, overflow: "hidden", border: `3px solid ${POP.ink}` }}>
          {/* prize underneath */}
          <div style={{
            position: "absolute", inset: 0, background: POP.paper, display: "grid", placeItems: "center",
            backgroundImage: window.halftone("rgba(35,27,46,.07)", 14, 2),
          }}>
            <div style={{ textAlign: "center", transform: "rotate(-3deg)" }}>
              <div style={{ fontSize: 66, lineHeight: 1 }}>{PRIZE.icon}</div>
              <div className="pop-display" style={{ fontSize: PRIZE.loss ? 26 : 30, color: PRIZE.loss ? "#9889A8" : POP.coral, marginTop: 6 }}>{PRIZE.loss ? "SO CLOSE!" : PRIZE.label.toUpperCase()}</div>
              {!PRIZE.loss ? <div className="pop-ui" style={{ fontWeight: 700, fontSize: 13, color: POP.ink, opacity: .7 }}>{PRIZE.sub}</div> : null}
            </div>
          </div>
          {/* foil canvas */}
          <canvas ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: "grab", opacity: revealed ? 0 : 1, transition: "opacity .5s ease" }}
            onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
            onTouchStart={down} onTouchMove={move} onTouchEnd={up} />
        </div>

        <div className="pop-ui" style={{ textAlign: "center", color: "#fff", fontWeight: 700, fontSize: 12, marginTop: 10, textShadow: `1.5px 1.5px 0 ${POP.ink}` }}>
          ★ ONE FREE PLAY · {BRAND.name} REWARDS ★
        </div>
      </div>

      {/* progress hint */}
      <div className="pop-ui" style={{ fontWeight: 700, color: POP.ink, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
        {revealed ? "✨ Revealed!" : plays <= 0 ? "No plays left" : (
          <React.Fragment>
            <span>👆 Scratch the foil</span>
            <span className="sticker-sm" style={{ width: 90, height: 12, borderRadius: 99, background: POP.paper, overflow: "hidden", padding: 0 }}>
              <span style={{ display: "block", height: "100%", width: `${Math.min(100, (pct / 0.52) * 100)}%`, background: POP.coral, transition: "width .15s" }} />
            </span>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}
window.ScratchCard = ScratchCard;
