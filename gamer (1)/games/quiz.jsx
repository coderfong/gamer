/* ============================================================
   QUIZ — retro rainbow-stripe arcade card with instant feedback
   ============================================================ */
function RainbowStripe({ flip }) {
  const cols = [POP.aqua, POP.sun, POP.coral, POP.bubble];
  return (
    <div style={{ display: "flex", flexDirection: "column", transform: flip ? "scaleY(-1)" : "none" }}>
      {cols.map((c, i) => (
        <div key={i} style={{ height: 7, background: c, borderTop: i === 0 ? `2.5px solid ${POP.ink}` : "none" }} />
      ))}
      <div style={{ height: 0, borderBottom: `2.5px solid ${POP.ink}` }} />
    </div>
  );
}

function Quiz({ onResult, plays }) {
  const QUESTIONS = [
    { q: "What earns you a FIZZ&POP stamp?", a: ["Every order", "Only Mondays", "Never"], correct: 0 },
    { q: "Best topping on a classic milk tea?", a: ["Pebbles", "Boba pearls", "Ketchup"], correct: 1 },
    { q: "How many plays do you get each day?", a: ["Zero, sadly", "Three free spins", "One hundred"], correct: 1 },
  ];
  const [idx, setIdx] = React.useState(0);
  const [picked, setPicked] = React.useState(null);
  const [score, setScore] = React.useState(0);
  const cur = QUESTIONS[idx];

  function choose(i) {
    if (picked != null) return;
    setPicked(i);
    const right = i === cur.correct;
    if (right) setScore((s) => s + 1);
    setTimeout(() => {
      if (idx + 1 < QUESTIONS.length) { setIdx(idx + 1); setPicked(null); }
      else {
        const final = score + (right ? 1 : 0);
        const prize = final >= 3 ? PRIZES.jackpot : final >= 2 ? PRIZES.drink : PRIZES.miss;
        if (!prize.loss) window.fireConfetti(60);
        setTimeout(() => onResult(prize), 500);
      }
    }, 1150);
  }

  function pillColor(i) {
    if (picked == null) return POP.coral;
    if (i === cur.correct) return POP.mint;
    if (i === picked) return "#E8604F";
    return "#C77A5E";
  }

  return (
    <GameBG base="#8E1B2E" glow="transparent" pattern="grid">
      <div className="pop-ui" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        <RainbowStripe />
        {/* corner sparkles */}
        <Sparkle size={16} color="#fff" style={{ position: "absolute", top: 60, left: 22 }} />
        <Sparkle size={12} color="#fff" style={{ position: "absolute", top: 96, right: 30 }} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "10px 22px" }}>
          {/* ? badge */}
          <div className="sticker pop-display" style={{ width: 52, height: 52, borderRadius: "50%", background: POP.sun, color: POP.ink, display: "grid", placeItems: "center", fontSize: 30, marginBottom: -4 }}>?</div>
          <div className="pop-display titlepop" style={{ fontSize: 42, lineHeight: .9 }}>QUIZ TIME</div>

          {/* progress dots */}
          <div style={{ display: "flex", gap: 7 }}>
            {QUESTIONS.map((_, i) => (
              <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", border: `2px solid ${POP.ink}`, background: i < idx ? POP.mint : i === idx ? POP.sun : "rgba(255,255,255,.4)" }} />
            ))}
          </div>

          {/* question card */}
          <div className="sticker-lg" style={{ background: POP.coral, color: "#fff", borderRadius: 22, padding: "24px 20px", width: "100%", textAlign: "center", minHeight: 132, display: "grid", placeItems: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 21, lineHeight: 1.2, textShadow: `1.5px 1.5px 0 ${POP.ink}` }}>{cur.q}</div>
          </div>

          {/* answers */}
          <div style={{ display: "flex", flexDirection: "column", gap: 11, width: "100%" }}>
            {cur.a.map((ans, i) => (
              <button key={i} onClick={() => choose(i)} disabled={picked != null || plays <= 0}
                className="sticker pop-ui" style={{
                  background: pillColor(i), color: "#fff", borderRadius: 999, padding: "13px 18px",
                  fontWeight: 700, fontSize: 17, cursor: picked == null ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background .2s, transform .1s", transform: picked === i ? "scale(1.03)" : "none",
                  textShadow: `1px 1px 0 ${POP.ink}`,
                }}>
                {ans}
                {picked != null && i === cur.correct ? <span>✓</span> : null}
                {picked === i && i !== cur.correct ? <span>✕</span> : null}
              </button>
            ))}
          </div>

          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, opacity: .8 }}>
            Score {score}/{QUESTIONS.length} · {idx + 1} of {QUESTIONS.length}
          </div>
        </div>
        <RainbowStripe flip />
      </div>
    </GameBG>
  );
}
window.Quiz = Quiz;
