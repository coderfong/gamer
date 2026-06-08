/* ============================================================
   CAMPAIGN BUILDER — /campaigns/new  (also /[id]/edit)
   5-step stepper with a persistent live preview on the right.
   ============================================================ */
const GAME_TYPES = [
  { id: "wheel", name: "Spin Wheel", icon: "🎡", desc: "Weighted slices, big payoff", tag: "Most popular" },
  { id: "scratch", name: "Scratch Card", icon: "🪙", desc: "Finger-scratch reveal", tag: "" },
  { id: "quiz", name: "Quiz Time", icon: "❓", desc: "Score-based rewards", tag: "" },
  { id: "slot", name: "Lucky Slots", icon: "🎰", desc: "Match-three lever pull", tag: "" },
  { id: "box", name: "Pick a Box", icon: "🎁", desc: "Flip to reveal", tag: "" },
];

const STEPS = ["Game", "Theme", "Prizes", "Capture", "Launch"];

function Stepper({ step, setStep }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STEPS.map((s, i) => {
        const done = i < step, on = i === step;
        return (
          <React.Fragment key={s}>
            <button onClick={() => i <= step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: i <= step ? "pointer" : "default", padding: 0 }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center",
                fontWeight: 800, fontSize: 13, flexShrink: 0,
                background: done ? AD.accent : on ? AD.accentSoft : "#ECECF1",
                color: done ? "#fff" : on ? AD.accentInk : AD.faint,
                border: on ? `2px solid ${AD.accent}` : "2px solid transparent",
              }}>{done ? "✓" : i + 1}</span>
              <span style={{ fontWeight: on ? 800 : 600, fontSize: 14, color: on ? AD.ink : done ? AD.body : AD.faint }}>{s}</span>
            </button>
            {i < STEPS.length - 1 ? <span style={{ flex: 1, height: 2, background: i < step ? AD.accent : "#ECECF1", margin: "0 14px", minWidth: 24, borderRadius: 2 }} /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PrizeRow({ p, onChange, onRemove }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 92px 84px 34px", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${AD.border2}` }}>
      <div style={{ fontSize: 22 }}>{p.icon}</div>
      <input value={p.label} onChange={(e) => onChange({ ...p, label: e.target.value })} style={{ border: `1px solid ${AD.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13.5, fontFamily: "inherit", background: AD.surface2 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" value={p.odds} min="0" max="100" onChange={(e) => onChange({ ...p, odds: +e.target.value })} style={{ width: 56, border: `1px solid ${AD.border}`, borderRadius: 8, padding: "8px 8px", fontSize: 13.5, fontFamily: "inherit", background: AD.surface2 }} />
        <span style={{ fontSize: 12.5, color: AD.muted, fontWeight: 600 }}>%</span>
      </div>
      <input value={p.stock} onChange={(e) => onChange({ ...p, stock: e.target.value })} style={{ border: `1px solid ${AD.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13.5, fontFamily: "inherit", background: AD.surface2, textAlign: "center" }} />
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: AD.faint, fontSize: 16 }}>✕</button>
    </div>
  );
}

function BuilderPage() {
  const [step, setStep] = React.useState(1);
  const [game, setGame] = React.useState("wheel");
  const v = VERTICALS.Cafe;
  const [theme, setTheme] = React.useState({ name: "Glow Café", vertical: "Cafe", primary: v.primary, accent: v.accent, headline: v.headline, btn: v.btn, win: v.win, font: v.font });
  const set = (patch) => setTheme((t) => ({ ...t, ...patch }));
  const [prizes, setPrizes] = React.useState([
    { icon: "🥤", label: "Free Drink", odds: 15, stock: "200" },
    { icon: "🏷️", label: "20% Off", odds: 25, stock: "∞" },
    { icon: "🍩", label: "Free Donut", odds: 10, stock: "150" },
    { icon: "🎁", label: "Mystery Gift", odds: 5, stock: "50" },
    { icon: "🍀", label: "Try Again", odds: 45, stock: "∞" },
  ]);
  const totalOdds = prizes.reduce((a, p) => a + (+p.odds || 0), 0);

  const [capture, setCapture] = React.useState({ email: true, phone: false, name: true, consent: true });

  return (
    <div className="ad" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* builder topbar */}
      <div style={{ borderBottom: `1px solid ${AD.border}`, background: AD.surface, padding: "16px 28px", display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>New campaign</div>
          <div style={{ fontSize: 12.5, color: AD.muted }}>Draft · autosaved</div>
        </div>
        <div style={{ flex: 1, maxWidth: 620 }}><Stepper step={step} setStep={setStep} /></div>
        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          <button className="ad-btn ad-btn-ghost">Save draft</button>
          <button className="ad-btn ad-btn-primary" onClick={() => setStep((s) => Math.min(4, s + 1))}>
            {step >= 4 ? "Launch campaign" : "Continue"} <Ic d={ICON.check} size={15} />
          </button>
        </div>
      </div>

      {/* body: form + preview */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", overflow: "hidden" }}>
        <div className="ad-scroll" style={{ overflow: "auto", padding: "28px 32px 48px" }}>
          {step === 0 ? <StepGame game={game} setGame={setGame} /> : null}
          {step === 1 ? <StepTheme theme={theme} set={set} /> : null}
          {step === 2 ? <StepPrizes prizes={prizes} setPrizes={setPrizes} totalOdds={totalOdds} /> : null}
          {step === 3 ? <StepCapture capture={capture} setCapture={setCapture} /> : null}
          {step === 4 ? <StepLaunch theme={theme} game={game} prizes={prizes} /> : null}
        </div>

        {/* sticky preview */}
        <div style={{ borderLeft: `1px solid ${AD.border}`, background: AD.surface2, padding: "26px 24px", display: "flex", flexDirection: "column", alignItems: "center", overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Live preview</span>
            <Badge tone="violet">{GAME_TYPES.find((g) => g.id === game).name}</Badge>
          </div>
          <ThemedPreview theme={theme} />
          <div style={{ fontSize: 12, color: AD.faint, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
            Updates as you build.<br />This is exactly what players see.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Step 1: Game ---- */
function StepGame({ game, setGame }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <StepHead n="Choose your game" d="Pick the mechanic. You can swap it later — your theme and prizes carry over." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {GAME_TYPES.map((g) => {
          const on = game === g.id;
          return (
            <button key={g.id} onClick={() => setGame(g.id)} style={{
              textAlign: "left", display: "flex", gap: 14, alignItems: "center", padding: "16px 18px", cursor: "pointer",
              border: `2px solid ${on ? AD.accent : AD.border}`, background: on ? AD.accentSoft : AD.surface, borderRadius: 16, position: "relative",
            }}>
              <div style={{ fontSize: 34, lineHeight: 1 }}>{g.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15.5 }}>{g.name}</div>
                <div style={{ fontSize: 12.5, color: AD.muted, marginTop: 1 }}>{g.desc}</div>
              </div>
              {g.tag ? <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10.5, fontWeight: 800, color: AD.accentInk, background: "#fff", border: `1px solid ${AD.accent}`, borderRadius: 999, padding: "2px 8px" }}>{g.tag}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Step 2: Theme ---- */
function StepTheme({ theme, set }) {
  const applyVertical = (key) => { const v = VERTICALS[key]; set({ vertical: key, primary: v.primary, accent: v.accent, headline: v.headline, btn: v.btn, win: v.win, font: v.font }); };
  return (
    <div style={{ maxWidth: 640 }}>
      <StepHead n="Skin it to your brand" d="Starts from your brand defaults. Adjust anything for this campaign — the preview updates live." />
      <BCard title="Brand & vertical">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <BLabel>Logo</BLabel>
            <image-slot id="builder-logo" style={{ width: 76, height: 76, display: "block" }} shape="rounded" radius="14" placeholder="Logo"></image-slot>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <BLabel>Campaign name shown to players</BLabel>
            <BInput value={theme.name} onChange={(val) => set({ name: val })} />
            <div style={{ height: 12 }} />
            <BLabel>Vertical preset</BLabel>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {Object.entries(VERTICALS).map(([k, vv]) => {
                const on = theme.vertical === k;
                return <button key={k} onClick={() => applyVertical(k)} className="ad-btn" style={{ border: `1.5px solid ${on ? AD.accent : AD.border}`, background: on ? AD.accentSoft : AD.surface, color: on ? AD.accentInk : AD.body, padding: "7px 12px", fontSize: 13 }}>{vv.label}</button>;
              })}
            </div>
          </div>
        </div>
      </BCard>
      <BCard title="Colors">
        <BLabel>Primary</BLabel>
        <BSwatches list={["#C2410C", "#B91C1C", "#9D174D", "#7C3AED", "#4338CA", "#0E7490", "#1F2937", "#15803D"]} value={theme.primary} onChange={(c) => set({ primary: c })} />
        <div style={{ height: 16 }} />
        <BLabel>Accent</BLabel>
        <BSwatches list={["#F59E0B", "#FACC15", "#F472B6", "#F43F5E", "#22C55E", "#38BDF8", "#A78BFA", "#FB923C"]} value={theme.accent} onChange={(c) => set({ accent: c })} />
      </BCard>
      <BCard title="Copy">
        <BLabel>Headline</BLabel><BInput value={theme.headline} onChange={(val) => set({ headline: val })} />
        <div style={{ height: 12 }} />
        <BLabel>Button</BLabel><BInput value={theme.btn} onChange={(val) => set({ btn: val })} />
      </BCard>
    </div>
  );
}

/* ---- Step 3: Prizes ---- */
function StepPrizes({ prizes, setPrizes, totalOdds }) {
  const upd = (i, p) => setPrizes(prizes.map((x, j) => j === i ? p : x));
  const rm = (i) => setPrizes(prizes.filter((_, j) => j !== i));
  const add = () => setPrizes([...prizes, { icon: "🎉", label: "New Prize", odds: 5, stock: "100" }]);
  const off = totalOdds !== 100;
  return (
    <div style={{ maxWidth: 660 }}>
      <StepHead n="Set your prizes & odds" d="Define what players can win and how often. Odds should total 100%." />
      <div className="ad-card" style={{ padding: "8px 20px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 92px 84px 34px", gap: 10, padding: "12px 0 8px", fontSize: 11.5, fontWeight: 800, color: AD.muted, letterSpacing: ".5px", borderBottom: `1px solid ${AD.border}` }}>
          <span></span><span>PRIZE</span><span>WIN ODDS</span><span style={{ textAlign: "center" }}>STOCK</span><span></span>
        </div>
        {prizes.map((p, i) => <PrizeRow key={i} p={p} onChange={(np) => upd(i, np)} onRemove={() => rm(i)} />)}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <button onClick={add} className="ad-btn ad-btn-soft"><span style={{ fontSize: 16 }}>+</span> Add prize</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: AD.muted, fontWeight: 600 }}>Total odds</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: off ? AD.amber : AD.green }}>{totalOdds}%</span>
            {off ? <span style={{ fontSize: 12, color: AD.amber, fontWeight: 600 }}>{totalOdds > 100 ? "over" : "under"} 100%</span> : <Ic d={ICON.check} size={16} color={AD.green} />}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16, padding: "12px 16px", background: AD.accentSoft, borderRadius: 12, fontSize: 13, color: AD.accentInk, fontWeight: 600 }}>
        <Ic d={ICON.help} size={17} /> "Try Again" slots keep the wheel exciting without giving away inventory. We recommend 40–50%.
      </div>
    </div>
  );
}

/* ---- Step 4: Capture ---- */
function StepCapture({ capture, setCapture }) {
  const toggle = (k) => setCapture({ ...capture, [k]: !capture[k] });
  const fields = [
    ["name", "Full name", "Personalize vouchers & follow-ups"],
    ["email", "Email address", "Required for sending the voucher"],
    ["phone", "Phone number", "Enable SMS voucher delivery"],
    ["consent", "Marketing consent", "Opt-in checkbox for your mailing list"],
  ];
  return (
    <div style={{ maxWidth: 600 }}>
      <StepHead n="Capture player details" d="Choose what to collect before they play. Less friction means more plays — ask only for what you need." />
      <div className="ad-card" style={{ padding: 8 }}>
        {fields.map(([k, label, desc], i) => (
          <div key={k} onClick={() => toggle(k)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 16px", borderBottom: i < fields.length - 1 ? `1px solid ${AD.border2}` : "none", cursor: "pointer" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{label}</div>
              <div style={{ fontSize: 12.5, color: AD.muted, marginTop: 1 }}>{desc}</div>
            </div>
            <Toggle on={capture[k]} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Step 5: Launch ---- */
function StepLaunch({ theme, game, prizes }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <StepHead n="Review & launch" d="Everything looks good? Launch now or schedule it. You can pause anytime." />
      <div className="ad-card" style={{ padding: 22, marginBottom: 18 }}>
        {[["Game", GAME_TYPES.find((g) => g.id === game).name], ["Brand", theme.name], ["Vertical", VERTICALS[theme.vertical].label], ["Prizes", prizes.length + " configured"], ["Capture", "Name + Email"]].map(([k, val], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < 4 ? `1px solid ${AD.border2}` : "none" }}>
            <span style={{ color: AD.muted, fontWeight: 600, fontSize: 14 }}>{k}</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{val}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="ad-btn ad-btn-primary" style={{ flex: 1, justifyContent: "center", padding: "13px 0", fontSize: 15 }}><Ic d={ICON.rocket} size={17} />Launch now</button>
        <button className="ad-btn ad-btn-ghost" style={{ flex: 1, justifyContent: "center", padding: "13px 0", fontSize: 15 }}>Schedule for later</button>
      </div>
    </div>
  );
}

/* ---- small builder primitives ---- */
function StepHead({ n, d }) {
  return <div style={{ marginBottom: 24 }}>
    <h2 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em" }}>{n}</h2>
    <p style={{ color: AD.muted, fontSize: 14.5, marginTop: 7, maxWidth: 520 }}>{d}</p>
  </div>;
}
function BCard({ title, children }) {
  return <div className="ad-card" style={{ padding: 20, marginBottom: 18 }}>
    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{title}</div>{children}
  </div>;
}
function BLabel({ children }) { return <div style={{ fontWeight: 700, fontSize: 12.5, color: AD.muted, marginBottom: 7 }}>{children}</div>; }
function BInput({ value, onChange }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", border: `1px solid ${AD.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", background: AD.surface2, color: AD.ink }} />;
}
function BSwatches({ list, value, onChange }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {list.map((c) => {
      const on = value.toLowerCase() === c.toLowerCase();
      return <button key={c} onClick={() => onChange(c)} style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: "pointer", border: on ? `3px solid ${AD.ink}` : "2px solid rgba(0,0,0,.08)", boxShadow: on ? "0 0 0 2px #fff inset" : "none" }} />;
    })}
  </div>;
}
function Toggle({ on }) {
  return <div style={{ width: 44, height: 26, borderRadius: 999, background: on ? AD.accent : "#D8D8E0", position: "relative", transition: "background .15s", flexShrink: 0 }}>
    <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .15s" }} />
  </div>;
}

function App() {
  const [dims, setDims] = React.useState({ w: 1240, h: 800 });
  React.useEffect(() => {
    const fit = () => setDims({ w: Math.min(1280, window.innerWidth - 28), h: Math.min(840, window.innerHeight - 28) });
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 14, background: "#E9E9EF" }}>
      <ChromeWindow width={dims.w} height={dims.h} url="app.fizzpop.gg/campaigns/new" tabs={[{ title: "FIZZ&POP · New campaign" }]} activeIndex={0}>
        <div className="ad" style={{ display: "flex", height: "100%", background: AD.bg }}>
          <Sidebar active="campaigns" />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <BuilderPage />
          </div>
        </div>
      </ChromeWindow>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
