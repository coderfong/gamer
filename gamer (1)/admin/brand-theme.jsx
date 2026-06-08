/* ============================================================
   BRAND THEME ENGINE — color utils + live themed game preview.
   The preview re-skins a mini Spin Wheel in real time from the
   brand's primary/accent/logo/copy/font — demonstrating the
   skin system that powers every campaign.
   ============================================================ */
function hex2rgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex(r, g, b) { return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function lum(h) { const [r, g, b] = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function readable(bg) { return lum(bg) > 0.45 ? "#1A1A22" : "#FFFFFF"; }
window.brandColor = { hex2rgb, rgb2hex, mix, lum, readable };

/* font presets */
const FONT_PRESETS = {
  playful: { label: "Playful", display: '"Luckiest Guy", cursive', body: '"Fredoka", sans-serif' },
  modern: { label: "Modern", display: '"Plus Jakarta Sans", sans-serif', body: '"Plus Jakarta Sans", sans-serif' },
  bold: { label: "Bold", display: '"Bungee", sans-serif', body: '"Plus Jakarta Sans", sans-serif' },
  classic: { label: "Classic", display: '"Fraunces", serif', body: '"Plus Jakarta Sans", sans-serif' },
};
window.FONT_PRESETS = FONT_PRESETS;

/* vertical presets — clicking applies palette + copy */
const VERTICALS = {
  Cafe: { label: "Café", primary: "#C2410C", accent: "#F59E0B", headline: "Spin for a free drink!", btn: "Spin now", win: "Enjoy your free drink ☕", font: "playful" },
  Clinic: { label: "Clinic", primary: "#0E7490", accent: "#22C55E", headline: "Glow & win!", btn: "Reveal my offer", win: "Your treatment offer is ready ✨", font: "modern" },
  Gym: { label: "Gym", primary: "#1F2937", accent: "#F43F5E", headline: "Train. Spin. Win.", btn: "Spin it", win: "Crush it — reward unlocked 💪", font: "bold" },
  Salon: { label: "Salon", primary: "#9D174D", accent: "#F472B6", headline: "Treat yourself!", btn: "Play now", win: "Pamper time — you won 💅", font: "classic" },
  Retail: { label: "Retail", primary: "#4338CA", accent: "#F59E0B", headline: "Spin to save!", btn: "Spin & save", win: "Discount unlocked 🛍️", font: "modern" },
  Food: { label: "Restaurant", primary: "#B91C1C", accent: "#FACC15", headline: "Hungry for a deal?", btn: "Spin now", win: "Dig in — deal unlocked 🍝", font: "playful" },
};
window.VERTICALS = VERTICALS;

/* ---- the live themed preview ---- */
function ThemedPreview({ theme }) {
  const { primary, accent, headline, btn, font } = theme;
  const fp = FONT_PRESETS[font] || FONT_PRESETS.playful;
  const screenBg = mix(primary, "#000000", 0.12);
  const panel = mix(primary, "#FFFFFF", 0.92);
  const onPrimary = readable(primary);
  const onAccent = readable(accent);
  const N = 8, slice = 360 / N, R = 92;
  const sliceCols = [];
  for (let i = 0; i < N; i++) sliceCols.push(i % 2 === 0 ? accent : mix(primary, "#FFFFFF", 0.18));

  const [rot, setRot] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  function spin() {
    if (spinning) return; setSpinning(true);
    setRot((r) => r + 360 * 4 + Math.floor(Math.random() * 360));
    setTimeout(() => setSpinning(false), 3000);
  }

  return (
    <div style={{ width: 268, borderRadius: 34, background: "#15151B", padding: 9, boxShadow: "0 20px 50px -16px rgba(0,0,0,.5)", margin: "0 auto" }}>
      <div style={{ borderRadius: 27, overflow: "hidden", background: screenBg, position: "relative", height: 520, fontFamily: fp.body }}>
        {/* notch */}
        <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 80, height: 20, background: "#15151B", borderRadius: 12, zIndex: 5 }} />
        {/* halftone */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: window.halftone ? window.halftone("rgba(255,255,255,.06)", 15, 2) : "none" }} />

        <div style={{ position: "relative", padding: "40px 18px 18px", display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
          {/* logo */}
          <div style={{ background: panel, borderRadius: 14, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
            <image-slot id="brand-logo-preview" style={{ width: 28, height: 28, display: "block" }} shape="circle" placeholder="Logo"></image-slot>
            <span style={{ fontWeight: 800, fontSize: 14, color: readable(panel) }}>{theme.name || "Your Brand"}</span>
          </div>

          {/* headline */}
          <div style={{ fontFamily: fp.display, color: "#fff", fontSize: font === "playful" ? 27 : 23, textAlign: "center", lineHeight: 1.02, marginTop: 16, textShadow: "0 2px 8px rgba(0,0,0,.3)", maxWidth: 210 }}>
            {headline}
          </div>

          {/* wheel */}
          <div style={{ position: "relative", marginTop: 18 }}>
            <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", zIndex: 3, width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `16px solid ${accent}`, filter: "drop-shadow(0 2px 2px rgba(0,0,0,.3))" }} />
            <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} style={{ transform: `rotate(${rot}deg)`, transition: spinning ? "transform 3s cubic-bezier(.16,.7,.16,1)" : "none", filter: "drop-shadow(0 6px 14px rgba(0,0,0,.3))" }}>
              <circle cx={R} cy={R} r={R - 2} fill="#15151B" />
              {sliceCols.map((c, i) => {
                const a0 = (i * slice - 90) * Math.PI / 180, a1 = ((i + 1) * slice - 90) * Math.PI / 180;
                const x0 = R + (R - 6) * Math.cos(a0), y0 = R + (R - 6) * Math.sin(a0);
                const x1 = R + (R - 6) * Math.cos(a1), y1 = R + (R - 6) * Math.sin(a1);
                const mid = (i * slice + slice / 2 - 90) * Math.PI / 180;
                const ix = R + (R - 6) * 0.62 * Math.cos(mid), iy = R + (R - 6) * 0.62 * Math.sin(mid);
                return (
                  <g key={i}>
                    <path d={`M${R},${R} L${x0},${y0} A${R - 6},${R - 6} 0 0 1 ${x1},${y1} Z`} fill={c} stroke="#15151B" strokeWidth="2" />
                    <text x={ix} y={iy} fontSize="15" textAnchor="middle" dominantBaseline="central" transform={`rotate(${i * slice + slice / 2},${ix},${iy})`}>{["🥤", "★", "🎁", "%", "🍩", "★", "💎", "%"][i]}</text>
                  </g>
                );
              })}
              <circle cx={R} cy={R} r="16" fill={panel} stroke="#15151B" strokeWidth="2.5" />
            </svg>
          </div>

          {/* spin button */}
          <button onClick={spin} disabled={spinning} style={{ marginTop: "auto", width: "100%", border: "none", borderRadius: 999, background: accent, color: onAccent, fontFamily: fp.display, fontSize: font === "modern" || font === "classic" ? 17 : 20, fontWeight: font === "modern" ? 800 : 400, padding: "13px 0", cursor: spinning ? "default" : "pointer", boxShadow: `0 5px 0 ${mix(accent, "#000", 0.25)}`, letterSpacing: font === "playful" ? 0.5 : 0 }}>
            {spinning ? "…" : btn}
          </button>
        </div>
      </div>
    </div>
  );
}
window.ThemedPreview = ThemedPreview;
