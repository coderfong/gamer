/* ============================================================
   ARCADE POP — design system
   Shared tokens, sticker primitives, confetti, decals, phone shell.
   Exported to window for the other game scripts.
   ============================================================ */

const POP = {
  ink: "#231B2E",
  cream: "#FFF1D6",
  paper: "#FFFCF4",
  coral: "#FF5A4D",
  sun: "#FFC23C",
  bubble: "#FF74B0",
  aqua: "#27C4D9",
  grape: "#8A6BFF",
  mint: "#36CF8E",
};
window.POP = POP;

/* The fictional brand everything is themed around. */
const BRAND = {
  name: "FIZZ&POP",
  tagline: "Rewards Club",
};
window.BRAND = BRAND;

/* Prize catalogue shared across games. color = tile color, icon = emoji glyph. */
const PRIZES = {
  drink:   { label: "Free Drink",   sub: "any size",        icon: "🥤", color: POP.aqua },
  off20:   { label: "20% OFF",      sub: "next order",      icon: "🏷️", color: POP.bubble },
  cash5:   { label: "$5 Cash",      sub: "store credit",    icon: "💵", color: POP.mint },
  gift:    { label: "Mystery Gift", sub: "in-store",        icon: "🎁", color: POP.grape },
  topping: { label: "Free Topping", sub: "boba / cream",    icon: "🧋", color: POP.coral },
  bogo:    { label: "BOGO",         sub: "buy 1 get 1",     icon: "🍩", color: POP.sun },
  jackpot: { label: "$100 JACKPOT", sub: "grand prize",     icon: "💎", color: POP.coral },
  miss:    { label: "So Close!",    sub: "try again next time", icon: "🍀", color: "#C9BFD6", loss: true },
};
window.PRIZES = PRIZES;

/* ---------- shared CSS (injected once) ---------- */
function injectSystemCSS() {
  if (document.getElementById("pop-system-css")) return;
  const css = `
  :root{
    --ink:${POP.ink}; --cream:${POP.cream}; --paper:${POP.paper};
    --coral:${POP.coral}; --sun:${POP.sun}; --bubble:${POP.bubble};
    --aqua:${POP.aqua}; --grape:${POP.grape}; --mint:${POP.mint};
    --accent:${POP.coral};
  }
  *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body{ margin:0; }
  .pop-ui{ font-family:"Fredoka",system-ui,sans-serif; color:var(--ink); }
  .pop-display{ font-family:"Luckiest Guy",system-ui,cursive; font-weight:400; letter-spacing:.5px; }

  /* chunky sticker shadow + outline */
  .sticker{ border:3px solid var(--ink); box-shadow:4px 5px 0 var(--ink); }
  .sticker-lg{ border:4px solid var(--ink); box-shadow:6px 7px 0 var(--ink); }
  .sticker-sm{ border:2.5px solid var(--ink); box-shadow:3px 3px 0 var(--ink); }

  /* big tactile button */
  .pop-btn{
    font-family:"Luckiest Guy",cursive; letter-spacing:1px;
    border:3.5px solid var(--ink); border-radius:999px;
    box-shadow:0 6px 0 var(--ink); background:var(--sun); color:var(--ink);
    padding:16px 30px; font-size:22px; cursor:pointer; user-select:none;
    transition:transform .08s ease, box-shadow .08s ease; position:relative;
    -webkit-text-stroke:0;
  }
  .pop-btn:hover:not(:disabled){ transform:translateY(-1px); box-shadow:0 7px 0 var(--ink); }
  .pop-btn:active:not(:disabled){ transform:translateY(6px); box-shadow:0 0 0 var(--ink); }
  .pop-btn:disabled{ opacity:.5; cursor:default; }
  .pop-btn .sheen{
    position:absolute; inset:4px 4px auto 4px; height:38%; border-radius:999px;
    background:linear-gradient(#fff,transparent); opacity:.45; pointer-events:none;
  }

  /* outlined display text with hard drop */
  .titlepop{
    color:var(--sun);
    text-shadow:3px 3px 0 var(--ink), -1px -1px 0 var(--ink), 1px -1px 0 var(--ink), -1px 1px 0 var(--ink);
  }

  .screen-scroll{ overflow-y:auto; scrollbar-width:none; }
  .screen-scroll::-webkit-scrollbar{ display:none; }

  @keyframes pop-in{ 0%{opacity:0;transform:scale(.5)} 70%{transform:scale(1.12)} 100%{opacity:1;transform:scale(1)} }
  @keyframes bob{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes wob{ 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
  @keyframes spin360{ to{ transform:rotate(360deg) } }
  @keyframes shimmer{ 0%{background-position:-150% 0} 100%{background-position:250% 0} }
  @keyframes glowpulse{ 0%,100%{filter:drop-shadow(0 0 0 transparent)} 50%{filter:drop-shadow(0 0 10px var(--sun))} }
  @keyframes pressbob{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
  `;
  const tag = document.createElement("style");
  tag.id = "pop-system-css";
  tag.textContent = css;
  document.head.appendChild(tag);
}
injectSystemCSS();

/* ---------- decorative SVG decals ---------- */
// 4-point sparkle
function Sparkle({ size = 22, color = POP.sun, stroke = POP.ink, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z"
        fill={color} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
// starburst seal (behind a label)
function Burst({ size = 120, points = 14, color = POP.coral, stroke = POP.ink, children, style }) {
  const r1 = 50, r2 = 40, cx = 50, cy = 50;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} `;
  }
  d += "Z";
  return (
    <div style={{ position: "relative", width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, filter: `drop-shadow(3px 4px 0 ${stroke})` }}>
        <path d={d} fill={color} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}
// halftone dot field as a background data-uri
function halftone(color = "#00000022", gap = 10, r = 2) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><circle cx='${gap / 2}' cy='${gap / 2}' r='${r}' fill='${color}'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}
window.Sparkle = Sparkle;
window.Burst = Burst;
window.halftone = halftone;

/* ---------- prize chip (used on wheel result, slot, boxes) ---------- */
function PrizeChip({ prize, size = "md" }) {
  const s = size === "lg" ? { pad: "14px 16px", icon: 40, label: 20, sub: 13 }
    : size === "sm" ? { pad: "7px 9px", icon: 22, label: 12, sub: 10 }
      : { pad: "10px 12px", icon: 30, label: 15, sub: 11 };
  return (
    <div className="sticker-sm pop-ui" style={{
      background: prize.color, borderRadius: 16, padding: s.pad,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      color: POP.ink, minWidth: 0,
    }}>
      <div style={{ fontSize: s.icon, lineHeight: 1 }}>{prize.icon}</div>
      <div className="pop-display" style={{ fontSize: s.label, lineHeight: 1, marginTop: 4, textAlign: "center", color: POP.ink }}>{prize.label}</div>
      {s.sub && prize.sub ? <div style={{ fontSize: s.sub, fontWeight: 600, opacity: .8 }}>{prize.sub}</div> : null}
    </div>
  );
}
window.PrizeChip = PrizeChip;

/* ---------- big play button ---------- */
function PopButton({ children, color = POP.sun, onClick, disabled, style }) {
  return (
    <button className="pop-btn" onClick={onClick} disabled={disabled}
      style={{ background: color, ...style }}>
      <span className="sheen" />
      <span style={{ position: "relative" }}>{children}</span>
    </button>
  );
}
window.PopButton = PopButton;

/* ============================================================
   CONFETTI — single fixed canvas inside the phone, fired globally
   ============================================================ */
function ConfettiCanvas() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    let parts = [];
    let raf = null;
    function resize() {
      const r = cv.parentElement.getBoundingClientRect();
      cv.width = r.width; cv.height = r.height;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv.parentElement);
    const colors = [POP.coral, POP.sun, POP.bubble, POP.aqua, POP.grape, POP.mint, "#fff"];
    function burst(n = 90) {
      const W = cv.width;
      for (let i = 0; i < n; i++) {
        parts.push({
          x: W / 2 + (Math.random() - 0.5) * W * 0.5,
          y: cv.height * 0.42,
          vx: (Math.random() - 0.5) * 11,
          vy: -6 - Math.random() * 9,
          g: 0.28 + Math.random() * 0.12,
          s: 6 + Math.random() * 8,
          rot: Math.random() * 6.28,
          vr: (Math.random() - 0.5) * 0.4,
          c: colors[(Math.random() * colors.length) | 0],
          shape: Math.random() < 0.4 ? "rect" : "circ",
          life: 0,
        });
      }
      if (!raf) loop();
    }
    function loop() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr; p.life++;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.strokeStyle = POP.ink; ctx.lineWidth = 1.2;
        if (p.shape === "rect") { ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.strokeRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); }
        else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 6.28); ctx.fill(); ctx.stroke(); }
        ctx.restore();
      });
      parts = parts.filter((p) => p.y < cv.height + 40 && p.life < 260);
      if (parts.length) raf = requestAnimationFrame(loop);
      else { raf = null; ctx.clearRect(0, 0, cv.width, cv.height); }
    }
    window.__confetti = burst;
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); window.__confetti = null; };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 60 }} />;
}
window.fireConfetti = (n) => window.__confetti && window.__confetti(n ?? window.__confettiBase ?? 90);
window.ConfettiCanvas = ConfettiCanvas;

/* ============================================================
   PHONE SHELL — chunky candy bezel, status bar, confetti layer
   ============================================================ */
function PhoneFrame({ children, accent = POP.coral }) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(/^0/, "");
  return (
    <div style={{
      width: 390, height: 844, borderRadius: 54, background: POP.ink,
      padding: 11, boxShadow: "0 30px 70px -20px rgba(0,0,0,.55), inset 0 0 0 2px rgba(255,255,255,.08)",
      position: "relative", flex: "0 0 auto",
    }}>
      <div style={{
        position: "absolute", inset: 11, borderRadius: 44, overflow: "hidden",
        background: POP.cream, display: "flex", flexDirection: "column",
      }}>
        {/* status bar */}
        <div className="pop-ui" style={{
          height: 50, flex: "0 0 auto", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 30px", fontSize: 15, fontWeight: 700,
          color: POP.ink, position: "relative", zIndex: 40,
        }}>
          <span>{time}</span>
          <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
            <span>●●●</span><span>📶</span><span>🔋</span>
          </span>
        </div>
        {/* dynamic island */}
        <div style={{
          position: "absolute", top: 13, left: "50%", transform: "translateX(-50%)",
          width: 116, height: 32, background: POP.ink, borderRadius: 18, zIndex: 50,
        }} />
        {/* screen content */}
        <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {children}
          <ConfettiCanvas />
        </div>
      </div>
    </div>
  );
}
window.PhoneFrame = PhoneFrame;
