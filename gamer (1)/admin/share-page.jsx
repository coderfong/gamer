/* ============================================================
   CAMPAIGN SHARE HUB  —  /campaigns/[id]/share
   ============================================================ */
const CAMPAIGN = {
  name: "Summer Spin-to-Win",
  vertical: "Glow Café",
  shortUrl: "fzp.gg/s/summer",
  playUrl: "play.fizzpop.gg/summer-spin",
  game: "Spin Wheel",
};

function SectionLabel({ icon, title, desc, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: AD.accentSoft, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Ic d={icon} size={19} color={AD.accentInk} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <div style={{ fontSize: 13, color: AD.muted, marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

function SharePage() {
  const [qrStyle, setQrStyle] = React.useState("brand"); // brand | mono
  const [posterSize, setPosterSize] = React.useState("A5");
  const [embedKind, setEmbedKind] = React.useState("inline"); // inline | popup

  const embedCode = embedKind === "inline"
    ? `<iframe src="https://${CAMPAIGN.playUrl}"\n  width="100%" height="640" frameborder="0"\n  title="${CAMPAIGN.name}"></iframe>`
    : `<script src="https://fizzpop.gg/embed.js"\n  data-campaign="summer-spin"\n  data-mode="popup"></script>`;

  return (
    <div className="ad" style={{ padding: "26px 30px 48px", maxWidth: 1160, margin: "0 auto" }}>
      {/* page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{CAMPAIGN.name}</h1>
            <Badge tone="green">Active</Badge>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, color: AD.muted, fontSize: 13.5 }}>
            <span>{CAMPAIGN.vertical}</span><span>·</span><span>{CAMPAIGN.game}</span><span>·</span>
            <span className="mono" style={{ color: AD.accentInk }}>{CAMPAIGN.shortUrl}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ad-btn ad-btn-ghost"><Ic d={ICON.eye} size={17} />Preview game</button>
          <button className="ad-btn ad-btn-primary"><Ic d={ICON.share} size={17} />Share campaign</button>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 26, borderBottom: `1px solid ${AD.border}`, margin: "20px 0 26px" }}>
        {["Builder", "Share", "Analytics", "Redemptions", "Settings"].map((t) => (
          <div key={t} className={"ad-tab" + (t === "Share" ? " on" : "")}>{t}</div>
        ))}
      </div>

      {/* two-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 22, alignItems: "start" }}>
        {/* ---------- left column ---------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* link card */}
          <div className="ad-card" style={{ padding: 22 }}>
            <SectionLabel icon={ICON.link} title="Campaign link" desc="Send this anywhere — it opens the game and player capture." />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: AD.muted, marginBottom: 6 }}>SHORT LINK</div>
                <CopyField value={"https://" + CAMPAIGN.shortUrl} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: AD.muted, marginBottom: 6 }}>FULL PLAY URL</div>
                <CopyField value={"https://" + CAMPAIGN.playUrl} />
              </div>
            </div>
          </div>

          {/* QR card */}
          <div className="ad-card" style={{ padding: 22 }}>
            <SectionLabel icon={ICON.grid} title="QR code" desc="Print on receipts, table tents, or window decals." />
            <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ border: `1px solid ${AD.border}`, borderRadius: 14, padding: 14, background: "#fff", flexShrink: 0 }}>
                <AdQR text={CAMPAIGN.shortUrl} size={150} fg={qrStyle === "brand" ? AD.accent : AD.ink} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: AD.muted, marginBottom: 8 }}>STYLE</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {[["brand", "Brand violet"], ["mono", "Classic black"]].map(([id, lbl]) => (
                    <button key={id} onClick={() => setQrStyle(id)} className="ad-btn"
                      style={{ border: `1.5px solid ${qrStyle === id ? AD.accent : AD.border}`, background: qrStyle === id ? AD.accentSoft : AD.surface, color: qrStyle === id ? AD.accentInk : AD.body, fontWeight: 600 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: id === "brand" ? AD.accent : AD.ink }} />{lbl}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="ad-btn ad-btn-primary"><Ic d={ICON.download} size={16} />PNG</button>
                  <button className="ad-btn ad-btn-ghost"><Ic d={ICON.download} size={16} />SVG</button>
                </div>
                <div style={{ fontSize: 12, color: AD.faint, marginTop: 10 }}>Exports at 2048px · transparent background available</div>
              </div>
            </div>
          </div>

          {/* embed card */}
          <div className="ad-card" style={{ padding: 22 }}>
            <SectionLabel icon={ICON.code} title="Embed on your website" desc="Drop the game straight into your site or booking page." />
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[["inline", "Inline frame"], ["popup", "Popup button"]].map(([id, lbl]) => (
                <button key={id} onClick={() => setEmbedKind(id)} className="ad-btn"
                  style={{ border: `1.5px solid ${embedKind === id ? AD.accent : AD.border}`, background: embedKind === id ? AD.accentSoft : AD.surface, color: embedKind === id ? AD.accentInk : AD.body }}>{lbl}</button>
              ))}
            </div>
            <div style={{ position: "relative", background: "#1C1B2A", borderRadius: 12, padding: "16px 16px", overflow: "auto" }}>
              <pre className="mono" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: "#D9D6F2", whiteSpace: "pre" }}>{embedCode}</pre>
              <button className="ad-btn" style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,.1)", color: "#fff", padding: "6px 10px" }}
                onClick={() => navigator.clipboard?.writeText(embedCode)}><Ic d={ICON.copy} size={14} />Copy</button>
            </div>
          </div>
        </div>

        {/* ---------- right column ---------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* poster card */}
          <div className="ad-card" style={{ padding: 22 }}>
            <SectionLabel icon={ICON.printer} title="In-store poster" desc="Print-ready PDF." />
            {/* poster preview */}
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${AD.border}`, marginBottom: 14 }}>
              <Poster />
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
              {["A4", "A5", "Tent"].map((s) => (
                <button key={s} onClick={() => setPosterSize(s)} className="ad-btn"
                  style={{ flex: 1, justifyContent: "center", border: `1.5px solid ${posterSize === s ? AD.accent : AD.border}`, background: posterSize === s ? AD.accentSoft : AD.surface, color: posterSize === s ? AD.accentInk : AD.body, padding: "8px 0" }}>{s === "Tent" ? "Table tent" : s}</button>
              ))}
            </div>
            <button className="ad-btn ad-btn-primary" style={{ width: "100%", justifyContent: "center" }}><Ic d={ICON.download} size={16} />Download PDF</button>
          </div>

          {/* social card */}
          <div className="ad-card" style={{ padding: 22 }}>
            <SectionLabel icon={ICON.share} title="Social card" desc="Preview for shared links." />
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${AD.border}` }}>
              <div style={{ background: "linear-gradient(135deg,#8A6BFF,#FF74B0)", height: 132, position: "relative", display: "grid", placeItems: "center" }}>
                <div style={{ textAlign: "center", color: "#fff" }}>
                  <div style={{ fontWeight: 800, fontSize: 19, textShadow: "0 1px 4px rgba(0,0,0,.25)" }}>🎡 Spin to Win!</div>
                  <div style={{ fontSize: 12.5, opacity: .95, marginTop: 2 }}>Free drinks & prizes at Glow Café</div>
                </div>
              </div>
              <div style={{ padding: "10px 13px", background: AD.surface2 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Summer Spin-to-Win</div>
                <div className="mono" style={{ fontSize: 11.5, color: AD.faint }}>{CAMPAIGN.shortUrl}</div>
              </div>
            </div>
          </div>

          {/* quick channels */}
          <div className="ad-card" style={{ padding: 22 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 13 }}>Quick share</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {[[ICON.mail, "Email"], [ICON.chat, "SMS"], [ICON.link, "Copy link"], [ICON.external, "More…"]].map(([ic, lbl], i) => (
                <button key={i} className="ad-btn ad-btn-ghost" style={{ justifyContent: "flex-start" }}><Ic d={ic} size={16} color={AD.accentInk} />{lbl}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* a realistic in-store poster preview (real artifact, not decoration) */
function Poster() {
  return (
    <div style={{ aspectRatio: "3 / 4", background: "linear-gradient(160deg,#FFF1D6,#FFE3C2)", position: "relative", padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#231B2E", fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
      <div style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5, color: "#FF5A4D" }}>GLOW CAFÉ · REWARDS</div>
      <div style={{ fontFamily: '"Luckiest Guy", cursive', fontSize: 30, lineHeight: .95, marginTop: 8, color: "#FFC23C", WebkitTextStroke: "0", textShadow: "2px 2px 0 #231B2E" }}>SPIN<br />TO WIN!</div>
      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8, maxWidth: 150 }}>Free drinks, toppings & cash prizes every day</div>
      <div style={{ background: "#fff", border: "3px solid #231B2E", borderRadius: 12, padding: 8, marginTop: "auto", boxShadow: "3px 3px 0 #231B2E" }}>
        <AdQR text="poster-summer" size={92} fg="#231B2E" />
      </div>
      <div style={{ fontWeight: 800, fontSize: 11, marginTop: 8 }}>Scan to play 👆</div>
    </div>
  );
}

function App() {
  const [dims, setDims] = React.useState({ w: 1240, h: 800 });
  React.useEffect(() => {
    const fit = () => setDims({
      w: Math.min(1240, window.innerWidth - 28),
      h: Math.min(820, window.innerHeight - 28),
    });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 14, background: "#E9E9EF" }}>
      <ChromeWindow width={dims.w} height={dims.h} url="app.fizzpop.gg/campaigns/summer-spin/share"
        tabs={[{ title: "FIZZ&POP · Share" }, { title: "Glow Café site" }]} activeIndex={0}>
        <AdminShell crumbs={["Campaigns", "Summer Spin-to-Win", "Share"]}>
          <SharePage />
        </AdminShell>
      </ChromeWindow>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
