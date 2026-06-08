/* ============================================================
   /brand — Brand & Skin settings. Edits drive ThemedPreview live.
   ============================================================ */
const PRIMARY_SWATCHES = ["#C2410C", "#B91C1C", "#9D174D", "#7C3AED", "#4338CA", "#0E7490", "#1F2937", "#15803D"];
const ACCENT_SWATCHES = ["#F59E0B", "#FACC15", "#F472B6", "#F43F5E", "#22C55E", "#38BDF8", "#A78BFA", "#FB923C"];

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: hint ? 2 : 8 }}>{label}</div>
      {hint ? <div style={{ fontSize: 12.5, color: AD.muted, marginBottom: 9 }}>{hint}</div> : null}
      {children}
    </div>
  );
}

function Swatches({ list, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
      {list.map((c) => {
        const on = value.toLowerCase() === c.toLowerCase();
        return (
          <button key={c} onClick={() => onChange(c)} title={c} style={{
            width: 34, height: 34, borderRadius: 9, background: c, cursor: "pointer",
            border: on ? `3px solid ${AD.ink}` : `2px solid rgba(0,0,0,.08)`,
            boxShadow: on ? "0 0 0 2px #fff inset" : "none", transition: "transform .1s", transform: on ? "scale(1.08)" : "none",
          }} />
        );
      })}
      <label style={{ display: "inline-flex", alignItems: "center", gap: 7, marginLeft: 4, cursor: "pointer" }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px dashed ${AD.faint}`, display: "grid", placeItems: "center", color: AD.muted, position: "relative", overflow: "hidden", background: value }}>
          <span style={{ fontSize: 16, color: readableLocal(value) }}>+</span>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
        </span>
        <span className="mono" style={{ fontSize: 12, color: AD.muted }}>{value.toUpperCase()}</span>
      </label>
    </div>
  );
}
function readableLocal(bg) { try { return window.brandColor.readable(bg); } catch (e) { return "#000"; } }

function TextInput({ value, onChange, ...p }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} {...p} style={{
    width: "100%", border: `1px solid ${AD.border}`, borderRadius: 10, padding: "10px 13px",
    fontSize: 14, fontFamily: "inherit", color: AD.ink, background: AD.surface2, outline: "none",
  }} />;
}

function BrandPage() {
  const init = VERTICALS.Cafe;
  const [theme, setTheme] = React.useState({
    name: "Glow Café", vertical: "Cafe", primary: init.primary, accent: init.accent,
    headline: init.headline, btn: init.btn, win: init.win, font: init.font,
  });
  const set = (patch) => setTheme((t) => ({ ...t, ...patch }));
  const applyVertical = (key) => { const v = VERTICALS[key]; set({ vertical: key, primary: v.primary, accent: v.accent, headline: v.headline, btn: v.btn, win: v.win, font: v.font }); };
  const [saved, setSaved] = React.useState(true);
  React.useEffect(() => { setSaved(false); }, [theme]);

  return (
    <div className="ad" style={{ padding: "26px 30px 60px", maxWidth: 1160, margin: "0 auto" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>Brand &amp; Skin</h1>
          <div style={{ color: AD.muted, fontSize: 14, marginTop: 6, maxWidth: 520 }}>
            Set your defaults once. Every new campaign starts pre-skinned with this look — owners can still tweak per campaign.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved ? null : <span style={{ fontSize: 13, color: AD.amber, fontWeight: 600 }}>Unsaved changes</span>}
          <button className="ad-btn ad-btn-ghost">Reset</button>
          <button className="ad-btn ad-btn-primary" onClick={() => setSaved(true)}>
            <Ic d={ICON.check} size={16} />{saved ? "Saved" : "Save brand"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 30, alignItems: "start", marginTop: 26 }}>
        {/* ---- form ---- */}
        <div>
          {/* identity */}
          <div className="ad-card" style={{ padding: 24, marginBottom: 22 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18 }}>Identity</div>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              <Field label="Logo">
                <image-slot id="brand-logo-form" style={{ width: 92, height: 92, display: "block" }} shape="rounded" radius="16" placeholder="Drop logo"></image-slot>
                <div style={{ fontSize: 11.5, color: AD.faint, marginTop: 7, maxWidth: 130 }}>PNG or SVG, square. Shows on game &amp; vouchers.</div>
              </Field>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Field label="Brand name">
                  <TextInput value={theme.name} onChange={(v) => set({ name: v })} placeholder="Your brand" />
                </Field>
                <Field label="Business type" hint="Pre-fills a starting palette & copy for this vertical.">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(VERTICALS).map(([k, v]) => {
                      const on = theme.vertical === k;
                      return (
                        <button key={k} onClick={() => applyVertical(k)} className="ad-btn"
                          style={{ border: `1.5px solid ${on ? AD.accent : AD.border}`, background: on ? AD.accentSoft : AD.surface, color: on ? AD.accentInk : AD.body, fontWeight: 600, padding: "8px 13px" }}>{v.label}</button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* colors */}
          <div className="ad-card" style={{ padding: 24, marginBottom: 22 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18 }}>Colors</div>
            <Field label="Primary" hint="Backgrounds, headers, the dominant brand tone.">
              <Swatches list={PRIMARY_SWATCHES} value={theme.primary} onChange={(v) => set({ primary: v })} />
            </Field>
            <Field label="Accent" hint="Buttons, highlights, the spin/scratch call-to-action.">
              <Swatches list={ACCENT_SWATCHES} value={theme.accent} onChange={(v) => set({ accent: v })} />
            </Field>
          </div>

          {/* typography */}
          <div className="ad-card" style={{ padding: 24, marginBottom: 22 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18 }}>Typography</div>
            <Field label="Headline style">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Object.entries(FONT_PRESETS).map(([k, f]) => {
                  const on = theme.font === k;
                  return (
                    <button key={k} onClick={() => set({ font: k })} style={{
                      textAlign: "left", border: `1.5px solid ${on ? AD.accent : AD.border}`, background: on ? AD.accentSoft : AD.surface,
                      borderRadius: 12, padding: "12px 15px", cursor: "pointer",
                    }}>
                      <div style={{ fontFamily: f.display, fontSize: 21, color: on ? AD.accentInk : AD.ink, lineHeight: 1 }}>Spin to win</div>
                      <div style={{ fontSize: 12, color: AD.muted, fontWeight: 600, marginTop: 5 }}>{f.label}</div>
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          {/* default copy */}
          <div className="ad-card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18 }}>Default copy</div>
            <Field label="Game headline"><TextInput value={theme.headline} onChange={(v) => set({ headline: v })} maxLength={40} /></Field>
            <Field label="Button label"><TextInput value={theme.btn} onChange={(v) => set({ btn: v })} maxLength={22} /></Field>
            <Field label="Win message"><TextInput value={theme.win} onChange={(v) => set({ win: v })} maxLength={48} /></Field>
          </div>
        </div>

        {/* ---- sticky live preview ---- */}
        <div style={{ position: "sticky", top: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Live preview</span>
            <Badge tone="violet">Spin Wheel</Badge>
          </div>
          <ThemedPreview theme={theme} />
          <div style={{ fontSize: 12, color: AD.faint, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
            This skin applies to all 5 game types.<br />Drag a logo onto the slot to see it live.
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [dims, setDims] = React.useState({ w: 1240, h: 800 });
  React.useEffect(() => {
    const fit = () => setDims({ w: Math.min(1240, window.innerWidth - 28), h: Math.min(820, window.innerHeight - 28) });
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 14, background: "#E9E9EF" }}>
      <ChromeWindow width={dims.w} height={dims.h} url="app.fizzpop.gg/brand" tabs={[{ title: "FIZZ&POP · Brand" }]} activeIndex={0}>
        <AdminShellBrand crumbs={["Brand", "Skin"]}>
          <BrandPage />
        </AdminShellBrand>
      </ChromeWindow>
    </div>
  );
}

/* shell variant with Brand active in the sidebar */
function AdminShellBrand({ crumbs, children }) {
  return (
    <div className="ad" style={{ display: "flex", height: "100%", background: AD.bg }}>
      <Sidebar active="brand" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar crumbs={crumbs} />
        <div className="ad-scroll" style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
