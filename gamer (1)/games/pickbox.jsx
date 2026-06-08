/* ============================================================
   PICK-A-BOX — chunky wrapped gifts, bounce + flip reveal
   ============================================================ */
function PickABox({ onResult, plays }) {
  const COUNT = 6;
  const boxColors = [POP.coral, POP.aqua, POP.sun, POP.bubble, POP.mint, POP.grape];
  const contents = React.useMemo(() => {
    // one good prize placed randomly; rest decoys (mostly misses + small)
    const pool = [PRIZES.jackpot, PRIZES.drink, PRIZES.miss, PRIZES.off20, PRIZES.miss, PRIZES.bogo];
    for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool;
  }, []);
  const [picked, setPicked] = React.useState(null);
  const [revealAll, setRevealAll] = React.useState(false);

  function pick(i) {
    if (picked != null || plays <= 0) return;
    setPicked(i);
    if (!contents[i].loss) setTimeout(() => window.fireConfetti(70), 650);
    setTimeout(() => setRevealAll(true), 1000);
    setTimeout(() => onResult(contents[i]), 1900);
  }

  return (
    <GameBG base={POP.aqua} glow="#BDEFF6" pattern="dots">
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "0 18px" }}>
        <div style={{ textAlign: "center" }}>
          <div className="pop-display titlepop" style={{ fontSize: 34, lineHeight: .95 }}>PICK A BOX</div>
          <div className="pop-ui" style={{ fontWeight: 700, color: "#fff", fontSize: 14, marginTop: 6, textShadow: `1.5px 1.5px 0 ${POP.ink}` }}>
            {picked == null ? "One holds the grand prize 🎁" : revealAll ? "Here's what everyone held!" : "Opening…"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, width: "100%", maxWidth: 320 }}>
          {Array.from({ length: COUNT }).map((_, i) => {
            const isPicked = picked === i;
            const flipped = isPicked || revealAll;
            const dim = revealAll && !isPicked;
            return (
              <button key={i} onClick={() => pick(i)} disabled={picked != null}
                style={{ background: "none", border: "none", padding: 0, height: 96, perspective: 700, cursor: picked == null ? "pointer" : "default", animation: picked == null ? `bob 2.6s ease-in-out ${i * 0.18}s infinite` : "none" }}>
                <div style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", transition: "transform .6s cubic-bezier(.3,1.4,.5,1)", transform: flipped ? "rotateY(180deg)" : "rotateY(0)", filter: dim ? "grayscale(.5) brightness(.92)" : "none", opacity: dim ? .6 : 1 }}>
                  {/* front: wrapped gift */}
                  <div className="sticker" style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 16, background: boxColors[i], overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 14, transform: "translateX(-50%)", background: POP.paper, opacity: .92 }} />
                    <div style={{ position: "absolute", top: "38%", left: 0, right: 0, height: 14, background: POP.paper, opacity: .92, borderTop: `2px solid ${POP.ink}`, borderBottom: `2px solid ${POP.ink}` }} />
                    <div style={{ position: "absolute", left: "50%", top: "38%", transform: "translate(-50%,-50%)", fontSize: 26 }}>🎀</div>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,.45),transparent 45%)" }} />
                  </div>
                  {/* back: reveal */}
                  <div className="sticker" style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 16, background: isPicked ? POP.paper : "#F1ECE6", display: "grid", placeItems: "center", boxShadow: isPicked ? `4px 5px 0 ${POP.ink}, 0 0 0 3px ${POP.sun} inset` : undefined }}>
                    <div style={{ textAlign: "center", animation: isPicked ? "pop-in .5s ease-out" : "none" }}>
                      <div style={{ fontSize: 34, lineHeight: 1 }}>{contents[i].icon}</div>
                      <div className="pop-display" style={{ fontSize: 9, color: POP.ink, marginTop: 2, lineHeight: 1 }}>{contents[i].loss ? "MISS" : contents[i].label.toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pop-ui" style={{ fontWeight: 700, color: "#fff", fontSize: 13, opacity: .85, textShadow: `1px 1px 0 ${POP.ink}` }}>
          {plays > 0 ? "Tap a box to open it" : "No plays left"}
        </div>
      </div>
    </GameBG>
  );
}
window.PickABox = PickABox;
