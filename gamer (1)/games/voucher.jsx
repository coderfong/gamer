/* ============================================================
   QR — deterministic faux-QR matrix drawn on canvas.
   Not scannable; a convincing placeholder for prototype.
   ============================================================ */
function QRCanvas({ text, size = 150, fg = POP.ink, bg = "#fff" }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const N = 25; // modules
    // seeded PRNG from text
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    let seed = h >>> 0;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

    const grid = Array.from({ length: N }, () => Array(N).fill(false));
    const inFinder = (r, c) => {
      const f = (br, bc) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
      const q = (br, bc) => r >= br - 1 && r <= br + 7 && c >= bc - 1 && c <= bc + 7;
      return q(0, 0) || q(0, N - 7) || q(N - 7, 0);
    };
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inFinder(r, c)) grid[r][c] = rnd() > 0.52;
    // finder patterns
    const finder = (br, bc) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[br + r][bc + c] = edge || core;
      }
    };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);

    const cv = ref.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    const m = size / N;
    ctx.fillStyle = fg;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c]) {
      ctx.fillRect(c * m + 0.5, r * m + 0.5, m - 0.6, m - 0.6);
    }
  }, [text, size, fg, bg]);
  return <canvas ref={ref} style={{ width: size, height: size, display: "block", borderRadius: 6 }} />;
}
window.QRCanvas = QRCanvas;

/* shared voucher record */
function makeVoucher() {
  const prizes = [PRIZES.drink, PRIZES.off20, PRIZES.bogo, PRIZES.topping, PRIZES.jackpot];
  const prize = prizes[Math.floor(Math.random() * prizes.length)];
  const code = "FZP-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  const won = new Date();
  const exp = new Date(won.getTime() + 14 * 864e5);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { prize, code, wonVia: "Spin Wheel", wonOn: fmt(won), expires: fmt(exp), id: Math.random().toString(36).slice(2, 8) };
}
window.makeVoucher = makeVoucher;

/* ============================================================
   VOUCHER TICKET — the shared coupon visual (perforated, notched)
   ============================================================ */
function Ticket({ voucher, redeemed, redeemedAt, mode }) {
  const { prize, code } = voucher;
  return (
    <div style={{ position: "relative", width: 300, filter: redeemed ? "saturate(.5)" : "none", transition: "filter .4s" }}>
      {/* REDEEMED stamp */}
      {redeemed ? (
        <div className="pop-display" style={{
          position: "absolute", inset: 0, zIndex: 20, display: "grid", placeItems: "center", pointerEvents: "none",
        }}>
          <div style={{
            border: `5px solid ${POP.coral}`, color: POP.coral, borderRadius: 12, padding: "8px 18px",
            fontSize: 30, transform: "rotate(-14deg)", letterSpacing: 2, background: "rgba(255,255,255,.82)",
            boxShadow: "0 4px 0 rgba(0,0,0,.15)", textAlign: "center", lineHeight: 1,
          }}>
            REDEEMED
            <div className="pop-ui" style={{ fontSize: 11, letterSpacing: 1, marginTop: 3, fontWeight: 700 }}>{redeemedAt}</div>
          </div>
        </div>
      ) : null}

      {/* top: prize */}
      <div className="sticker-lg" style={{
        background: prize.color, borderRadius: "22px 22px 4px 4px", padding: "18px 18px 22px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: window.halftone("rgba(255,255,255,.16)", 14, 2.2) }} />
        <div style={{ position: "relative" }}>
          <div className="pop-ui" style={{ fontWeight: 800, fontSize: 11, letterSpacing: 2, color: POP.ink, opacity: .7 }}>{BRAND.name} VOUCHER</div>
          <div style={{ fontSize: 56, lineHeight: 1.1, marginTop: 4, filter: `drop-shadow(2px 2px 0 ${POP.ink})` }}>{prize.icon}</div>
          <div className="pop-display" style={{ fontSize: 30, color: POP.ink, lineHeight: 1, marginTop: 4 }}>{prize.label.toUpperCase()}</div>
          <div className="pop-ui" style={{ fontWeight: 700, fontSize: 13, color: POP.ink, opacity: .75 }}>{prize.sub}</div>
        </div>
      </div>

      {/* perforation */}
      <div style={{ position: "relative", height: 0 }}>
        <div style={{ position: "absolute", left: -10, top: -11, width: 22, height: 22, borderRadius: "50%", background: POP.cream, border: `3px solid ${POP.ink}` }} />
        <div style={{ position: "absolute", right: -10, top: -11, width: 22, height: 22, borderRadius: "50%", background: POP.cream, border: `3px solid ${POP.ink}` }} />
      </div>

      {/* bottom: code + QR */}
      <div className="sticker-lg" style={{
        background: POP.paper, borderRadius: "4px 4px 22px 22px", borderTop: "none", marginTop: 0,
        padding: "20px 18px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        <div style={{ borderTop: `3px dashed ${POP.ink}`, opacity: .25, width: "100%", marginTop: -8 }} />
        <div className="sticker-sm" style={{ background: "#fff", padding: 9, borderRadius: 12 }}>
          <QRCanvas text={code} size={132} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="pop-ui" style={{ fontWeight: 700, fontSize: 11, color: POP.ink, opacity: .6, letterSpacing: 1 }}>VOUCHER CODE</div>
          <div className="pop-display" style={{ fontSize: 26, color: POP.ink, letterSpacing: 3, lineHeight: 1.1 }}>{code}</div>
        </div>
      </div>
    </div>
  );
}
window.Ticket = Ticket;
