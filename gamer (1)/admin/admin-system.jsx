/* ============================================================
   ADMIN DESIGN SYSTEM — clean SaaS shell for brand-owner pages.
   Neutral zinc surface, single violet accent (ties to the player
   brand's grape), Plus Jakarta Sans + JetBrains Mono.
   ============================================================ */
const AD = {
  bg: "#F6F6F8",
  surface: "#FFFFFF",
  surface2: "#FBFBFC",
  border: "#E8E8EE",
  border2: "#F0F0F3",
  ink: "#191921",
  body: "#43434E",
  muted: "#73737F",
  faint: "#A2A2AD",
  accent: "#6D4AFF",
  accentSoft: "#EEEAFF",
  accentInk: "#4A2FCC",
  green: "#15A06A",
  greenSoft: "#E4F6EE",
  amber: "#C9820A",
  amberSoft: "#FBF0DA",
  red: "#DC4A4A",
};
window.AD = AD;

function injectAdminCSS() {
  if (document.getElementById("admin-css")) return;
  const s = document.createElement("style");
  s.id = "admin-css";
  s.textContent = `
  .ad{ font-family:"Plus Jakarta Sans",system-ui,sans-serif; color:${AD.ink}; }
  .ad *{ box-sizing:border-box; }
  .mono{ font-family:"JetBrains Mono",ui-monospace,monospace; }
  .ad-card{ background:${AD.surface}; border:1px solid ${AD.border}; border-radius:16px; }
  .ad-btn{ font-family:"Plus Jakarta Sans",sans-serif; font-weight:600; font-size:14px;
    border-radius:10px; padding:9px 15px; cursor:pointer; border:1px solid transparent;
    display:inline-flex; align-items:center; gap:8px; transition:all .13s ease; white-space:nowrap; }
  .ad-btn-primary{ background:${AD.accent}; color:#fff; box-shadow:0 1px 2px rgba(109,74,255,.35); }
  .ad-btn-primary:hover{ background:${AD.accentInk}; }
  .ad-btn-ghost{ background:${AD.surface}; color:${AD.ink}; border-color:${AD.border}; }
  .ad-btn-ghost:hover{ background:${AD.surface2}; border-color:#DADAE2; }
  .ad-btn-soft{ background:${AD.accentSoft}; color:${AD.accentInk}; }
  .ad-btn-soft:hover{ filter:brightness(.97); }
  .ad-nav{ display:flex; align-items:center; gap:11px; padding:9px 12px; border-radius:10px;
    font-weight:600; font-size:14px; color:${AD.muted}; cursor:pointer; transition:all .12s; }
  .ad-nav:hover{ background:#EFEFF3; color:${AD.ink}; }
  .ad-nav.on{ background:${AD.accentSoft}; color:${AD.accentInk}; }
  .ad-tab{ padding:13px 2px; font-weight:600; font-size:14px; color:${AD.muted}; cursor:pointer;
    border-bottom:2px solid transparent; margin-bottom:-1px; transition:all .12s; }
  .ad-tab:hover{ color:${AD.ink}; }
  .ad-tab.on{ color:${AD.accent}; border-bottom-color:${AD.accent}; }
  .ad-scroll{ scrollbar-width:thin; scrollbar-color:#D7D7DE transparent; }
  .ad-scroll::-webkit-scrollbar{ width:10px; height:10px; }
  .ad-scroll::-webkit-scrollbar-thumb{ background:#D7D7DE; border-radius:6px; border:3px solid ${AD.bg}; }
  .copyfield{ display:flex; align-items:center; gap:8px; background:${AD.surface2};
    border:1px solid ${AD.border}; border-radius:10px; padding:4px 4px 4px 13px; }
  `;
  document.head.appendChild(s);
}
injectAdminCSS();

/* ---- icons (simple stroke set) ---- */
function Ic({ d, size = 18, fill = "none", sw = 1.8, color = "currentColor", style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}
const ICON = {
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  rocket: ["M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2", "M19 3c-4 0-7 1.5-10 5l-2 3 4 4 3-2c3.5-3 5-6 5-10z", "M12.5 8.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0"],
  chart: ["M4 20V10", "M10 20V4", "M16 20v-6", "M3 20h18"],
  ticket: ["M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z", "M14 6v12"],
  palette: ["M12 2a10 10 0 1 0 0 20c1 0 2-1 2-2s-1-2 0-3 2 1 3 1a4 4 0 0 0 4-4c0-6-4-12-9-12z", "M7.5 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1", "M12 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1", "M16 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  card: ["M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z", "M2 10h20"],
  gear: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7.5 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.18 14a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 7.5a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 3.18 2 2 0 0 1 14 3.18a1.65 1.65 0 0 0 2.5 1.42 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.82 10 2 2 0 0 1 21 14h-.09a1.65 1.65 0 0 0-1.51 1z"],
  copy: ["M9 9h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  external: ["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", "M15 3h6v6", "M10 14L21 3"],
  check: ["M20 6L9 17l-5-5"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.35-4.35"],
  help: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3", "M12 17h.01"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  mail: ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M22 7l-10 6L2 7"],
  chat: ["M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"],
  link: ["M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5", "M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"],
  printer: ["M6 9V2h12v7", "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2", "M6 14h12v8H6z"],
  code: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"],
  share: ["M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", "M16 6l-4-4-4 4", "M12 2v13"],
};
window.Ic = Ic; window.ICON = ICON;

/* ---- QR (ported) ---- */
function AdQR({ text, size = 150, fg = AD.ink, bg = "#fff" }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const N = 25;
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    let seed = h >>> 0;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const g = Array.from({ length: N }, () => Array(N).fill(false));
    const q = (br, bc, r, c) => r >= br - 1 && r <= br + 7 && c >= bc - 1 && c <= bc + 7;
    const inF = (r, c) => q(0, 0, r, c) || q(0, N - 7, r, c) || q(N - 7, 0, r, c);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inF(r, c)) g[r][c] = rnd() > 0.52;
    const fin = (br, bc) => { for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) { const e = r === 0 || r === 6 || c === 0 || c === 6; const core = r >= 2 && r <= 4 && c >= 2 && c <= 4; g[br + r][bc + c] = e || core; } };
    fin(0, 0); fin(0, N - 7); fin(N - 7, 0);
    const cv = ref.current, dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    const m = size / N; ctx.fillStyle = fg;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c]) ctx.fillRect(c * m + .5, r * m + .5, m - .6, m - .6);
  }, [text, size, fg, bg]);
  return <canvas ref={ref} style={{ width: size, height: size, display: "block" }} />;
}
window.AdQR = AdQR;

/* ---- copy field ---- */
function CopyField({ value, mono = true, prefix }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="copyfield">
      {prefix ? <span style={{ color: AD.faint, fontSize: 13 }}>{prefix}</span> : null}
      <span className={mono ? "mono" : ""} style={{ flex: 1, fontSize: 13.5, color: AD.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      <button className="ad-btn ad-btn-soft" style={{ padding: "7px 11px" }}
        onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
        <Ic d={copied ? ICON.check : ICON.copy} size={15} />{copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
window.CopyField = CopyField;

function Badge({ children, tone = "green" }) {
  const map = { green: [AD.greenSoft, AD.green], amber: [AD.amberSoft, AD.amber], violet: [AD.accentSoft, AD.accentInk] };
  const [bg, fg] = map[tone] || map.green;
  return (
    <span style={{ background: bg, color: fg, fontWeight: 700, fontSize: 12, padding: "4px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: fg }} />{children}
    </span>
  );
}
window.Badge = Badge;
