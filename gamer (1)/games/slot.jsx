/* ============================================================
   SLOT MACHINE — arcade cabinet with a draggable pull-lever
   ============================================================ */
function SlotMachine({ onResult, plays }) {
  const SYMBOLS = [
    { icon: "🥤", prize: PRIZES.drink }, { icon: "🍩", prize: PRIZES.bogo },
    { icon: "💎", prize: PRIZES.jackpot }, { icon: "🎁", prize: PRIZES.gift },
    { icon: "🧋", prize: PRIZES.topping }, { icon: "🏷️", prize: PRIZES.off20 },
    { icon: "🍀", prize: PRIZES.miss },
  ];
  const SH = 80; // symbol height
  const STRIP = 36;
  const [offsets, setOffsets] = React.useState([0, 0, 0]);
  const [durs, setDurs] = React.useState([0, 0, 0]);
  const [spinning, setSpinning] = React.useState(false);
  const [winFlash, setWinFlash] = React.useState(false);
  const [pull, setPull] = React.useState(0); // lever px 0..110
  const dragging = React.useRef(false);
  const strips = React.useRef([buildStrip(), buildStrip(), buildStrip()]);

  function buildStrip() {
    const arr = [];
    for (let i = 0; i < STRIP; i++) arr.push(SYMBOLS[(Math.random() * SYMBOLS.length) | 0]);
    return arr;
  }

  function doSpin() {
    if (spinning || plays <= 0) return;
    setSpinning(true); setWinFlash(false);
    // decide outcome: 40% win
    const isWin = Math.random() < 0.42;
    const target = SYMBOLS[(Math.random() * (SYMBOLS.length - 1)) | 0]; // not the loss for a clean win
    const stops = [0, 1, 2].map((r) => {
      const strip = strips.current[r];
      const idx = 10 + r * 4 + ((Math.random() * 6) | 0);
      if (isWin) strip[idx] = target;
      else strip[idx] = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
      return idx;
    });
    setDurs([2200, 2900, 3600]);
    setOffsets(stops.map((idx) => -(idx - 1) * SH));
    const finalSyms = stops.map((idx, r) => strips.current[r][idx]);
    const matched = finalSyms.every((s) => s.icon === finalSyms[0].icon);
    setTimeout(() => {
      setSpinning(false);
      if (matched) { setWinFlash(true); window.fireConfetti(80); }
      setTimeout(() => onResult(matched ? finalSyms[0].prize : PRIZES.miss), matched ? 900 : 500);
    }, 3750);
  }

  // lever drag
  React.useEffect(() => {
    function mv(e) {
      if (!dragging.current) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      const d = Math.max(0, Math.min(110, y - dragging.current));
      setPull(d);
    }
    function up() {
      if (!dragging.current) return;
      const fire = pull > 60;
      dragging.current = false;
      setPull(0);
      if (fire) doSpin();
    }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv, { passive: false }); window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", up); };
  }, [pull, spinning, plays]);

  function leverDown(e) {
    if (spinning || plays <= 0) return;
    dragging.current = (e.touches ? e.touches[0].clientY : e.clientY);
  }

  return (
    <GameBG base={POP.bubble} glow="#FFC7E4" pattern="dots">
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 14px" }}>
        <div className="pop-display titlepop" style={{ fontSize: 34, textAlign: "center", lineHeight: .95 }}>LUCKY SLOTS</div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          {/* cabinet */}
          <div className="sticker-lg" style={{ background: POP.coral, borderRadius: 28, padding: 14, position: "relative" }}>
            {/* marquee */}
            <div className="sticker-sm pop-display" style={{ background: POP.sun, color: POP.ink, borderRadius: 12, padding: "5px 0", textAlign: "center", fontSize: 16, marginBottom: 12, letterSpacing: 1 }}>
              ✦ JACKPOT ✦
            </div>
            {/* reels window */}
            <div className="sticker" style={{ background: POP.ink, borderRadius: 16, padding: 8, display: "flex", gap: 8, position: "relative" }}>
              {[0, 1, 2].map((r) => (
                <div key={r} style={{ width: SH, height: SH, overflow: "hidden", borderRadius: 10, background: POP.paper, border: `2.5px solid ${POP.ink}`, position: "relative" }}>
                  <div style={{ transform: `translateY(${offsets[r]}px)`, transition: durs[r] ? `transform ${durs[r]}ms cubic-bezier(.16,.7,.18,1)` : "none", filter: spinning ? "blur(.6px)" : "none" }}>
                    {strips.current[r].map((s, j) => (
                      <div key={j} style={{ height: SH, display: "grid", placeItems: "center", fontSize: 42 }}>{s.icon}</div>
                    ))}
                  </div>
                  {/* gloss */}
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg,rgba(255,255,255,.5),transparent 28%,transparent 72%,rgba(0,0,0,.18))" }} />
                </div>
              ))}
              {/* payline */}
              <div style={{ position: "absolute", left: 4, right: 4, top: "50%", transform: "translateY(-50%)", height: 4, borderRadius: 2, background: winFlash ? POP.sun : "rgba(255,255,255,.25)", boxShadow: winFlash ? `0 0 14px 3px ${POP.sun}` : "none", transition: "all .3s" }} />
            </div>
            {/* coin slot + label */}
            <div className="pop-ui" style={{ textAlign: "center", color: "#fff", fontWeight: 700, fontSize: 12, marginTop: 10, textShadow: `1.5px 1.5px 0 ${POP.ink}`, height: 16 }}>
              {spinning ? "SPINNING…" : winFlash ? "🎉 MATCH! 🎉" : "PULL THE LEVER →"}
            </div>
          </div>

          {/* lever */}
          <div style={{ position: "relative", width: 34, height: 230, marginTop: 30 }}>
            <div style={{ position: "absolute", left: 13, top: 18, bottom: 8, width: 8, background: `linear-gradient(${POP.ink},#555)`, borderRadius: 4, border: `2px solid ${POP.ink}` }} />
            <div onMouseDown={leverDown} onTouchStart={leverDown}
              style={{ position: "absolute", left: 0, top: pull, width: 34, height: 34, borderRadius: "50%", background: POP.aqua, border: `3px solid ${POP.ink}`, boxShadow: `0 3px 0 ${POP.ink}`, cursor: spinning ? "default" : "grab", transition: dragging.current ? "none" : "top .25s cubic-bezier(.3,1.6,.5,1)", touchAction: "none", display: "grid", placeItems: "center" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,.6)" }} />
            </div>
          </div>
        </div>

        {/* fallback button for accessibility */}
        <PopButton color={POP.sun} onClick={doSpin} disabled={spinning || plays <= 0}
          style={spinning ? { fontSize: 16, padding: "12px 24px" } : { fontSize: 16, padding: "12px 24px", animation: "wob 1.6s ease-in-out infinite" }}>
          {spinning ? "GOOD LUCK…" : plays > 0 ? "SPIN!" : "NO PLAYS"}
        </PopButton>
      </div>
    </GameBG>
  );
}
window.SlotMachine = SlotMachine;
