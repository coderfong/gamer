"use client";

import { useEffect, useState, useTransition } from "react";
import { mix, readableText } from "@/lib/games/colors";
import { saveBrandName } from "@/app/(admin)/brand/actions";

const PRIMARY_SWATCHES = ["#C2410C", "#B91C1C", "#9D174D", "#7C3AED", "#4338CA", "#0E7490", "#1F2937", "#15803D"];
const ACCENT_SWATCHES = ["#F59E0B", "#FACC15", "#F472B6", "#F43F5E", "#22C55E", "#38BDF8", "#A78BFA", "#FB923C"];

const FONT_PRESETS: Record<string, { label: string; display: string }> = {
  playful: { label: "Playful", display: '"Luckiest Guy", cursive' },
  modern: { label: "Modern", display: '"Plus Jakarta Sans", sans-serif' },
  bold: { label: "Bold", display: '"Bungee", sans-serif' },
  classic: { label: "Classic", display: '"Titan One", serif' },
};

const VERTICALS: Record<string, { label: string; primary: string; accent: string; headline: string; btn: string; win: string; font: string }> = {
  Cafe: { label: "Café", primary: "#C2410C", accent: "#F59E0B", headline: "Spin for a free drink!", btn: "Spin now", win: "Enjoy your free drink ☕", font: "playful" },
  Clinic: { label: "Clinic", primary: "#0E7490", accent: "#22C55E", headline: "Glow & win!", btn: "Reveal my offer", win: "Your treatment offer is ready ✨", font: "modern" },
  Gym: { label: "Gym", primary: "#1F2937", accent: "#F43F5E", headline: "Train. Spin. Win.", btn: "Spin it", win: "Crush it — reward unlocked 💪", font: "bold" },
  Salon: { label: "Salon", primary: "#9D174D", accent: "#F472B6", headline: "Treat yourself!", btn: "Play now", win: "Pamper time — you won 💅", font: "classic" },
  Retail: { label: "Retail", primary: "#4338CA", accent: "#F59E0B", headline: "Spin to save!", btn: "Spin & save", win: "Discount unlocked 🛍️", font: "modern" },
  Food: { label: "Restaurant", primary: "#B91C1C", accent: "#FACC15", headline: "Hungry for a deal?", btn: "Spin now", win: "Dig in — deal unlocked 🍝", font: "playful" },
};

interface Theme {
  name: string;
  vertical: string;
  primary: string;
  accent: string;
  headline: string;
  btn: string;
  win: string;
  font: string;
}

const STORAGE_KEY = "fizzpop-brand-defaults";

export function BrandSkinClient({ brandId, initialName }: { brandId: string; initialName: string }) {
  const init = VERTICALS.Cafe;
  const [theme, setTheme] = useState<Theme>({
    name: initialName || "Glow Café",
    vertical: "Cafe",
    primary: init.primary,
    accent: init.accent,
    headline: init.headline,
    btn: init.btn,
    win: init.win,
    font: init.font,
  });
  const [saved, setSaved] = useState(true);
  const [pending, startTransition] = useTransition();

  // Restore previously saved defaults (client-side cache).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTheme((t) => ({ ...t, ...JSON.parse(raw) }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<Theme>) => {
    setTheme((t) => ({ ...t, ...patch }));
    setSaved(false);
  };
  const applyVertical = (key: string) => {
    const v = VERTICALS[key];
    set({ vertical: key, primary: v.primary, accent: v.accent, headline: v.headline, btn: v.btn, win: v.win, font: v.font });
  };

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {}
    startTransition(async () => {
      await saveBrandName(brandId, theme.name);
      setSaved(true);
    });
  }

  return (
    <div className="ad">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Brand &amp; Skin</h1>
          <p className="mt-1.5 max-w-lg text-sm" style={{ color: "var(--ad-muted)" }}>
            Set your defaults once. Every new campaign starts pre-skinned with this look — owners can still tweak per campaign.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {!saved ? <span className="text-[13px] font-semibold" style={{ color: "#C9820A" }}>Unsaved changes</span> : null}
          <button className="ad-btn ad-btn-primary" onClick={save} disabled={pending}>
            {pending ? "Saving…" : saved ? "✓ Saved" : "Save brand"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* form */}
        <div className="space-y-5">
          <Card title="Identity">
            <Field label="Brand name">
              <TextInput value={theme.name} onChange={(v) => set({ name: v })} placeholder="Your brand" />
            </Field>
            <Field label="Business type" hint="Pre-fills a starting palette & copy for this vertical.">
              <div className="flex flex-wrap gap-2">
                {Object.entries(VERTICALS).map(([k, v]) => {
                  const on = theme.vertical === k;
                  return (
                    <button
                      key={k}
                      onClick={() => applyVertical(k)}
                      className="ad-btn"
                      style={{
                        border: `1.5px solid ${on ? "var(--ad-accent)" : "var(--ad-border)"}`,
                        background: on ? "var(--ad-accent-soft)" : "var(--ad-surface)",
                        color: on ? "var(--ad-accent-ink)" : "var(--ad-body)",
                        padding: "8px 13px",
                      }}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Card>

          <Card title="Colors">
            <Field label="Primary" hint="Backgrounds, headers, the dominant brand tone.">
              <Swatches list={PRIMARY_SWATCHES} value={theme.primary} onChange={(v) => set({ primary: v })} />
            </Field>
            <Field label="Accent" hint="Buttons, highlights, the spin/scratch call-to-action.">
              <Swatches list={ACCENT_SWATCHES} value={theme.accent} onChange={(v) => set({ accent: v })} />
            </Field>
          </Card>

          <Card title="Typography">
            <Field label="Headline style">
              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(FONT_PRESETS).map(([k, f]) => {
                  const on = theme.font === k;
                  return (
                    <button
                      key={k}
                      onClick={() => set({ font: k })}
                      className="rounded-xl p-3 text-left"
                      style={{ border: `1.5px solid ${on ? "var(--ad-accent)" : "var(--ad-border)"}`, background: on ? "var(--ad-accent-soft)" : "var(--ad-surface)" }}
                    >
                      <div style={{ fontFamily: f.display, fontSize: 21, lineHeight: 1, color: on ? "var(--ad-accent-ink)" : "var(--ad-ink)" }}>Spin to win</div>
                      <div className="mt-1.5 text-xs font-semibold" style={{ color: "var(--ad-muted)" }}>{f.label}</div>
                    </button>
                  );
                })}
              </div>
            </Field>
          </Card>

          <Card title="Default copy">
            <Field label="Game headline"><TextInput value={theme.headline} onChange={(v) => set({ headline: v })} maxLength={40} /></Field>
            <Field label="Button label"><TextInput value={theme.btn} onChange={(v) => set({ btn: v })} maxLength={22} /></Field>
            <Field label="Win message"><TextInput value={theme.win} onChange={(v) => set({ win: v })} maxLength={48} /></Field>
          </Card>
        </div>

        {/* sticky preview */}
        <div className="sticky top-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-bold">Live preview</span>
            <span className="ad-badge" style={{ background: "var(--ad-accent-soft)", color: "var(--ad-accent-ink)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ad-accent-ink)" }} /> Spin Wheel
            </span>
          </div>
          <ThemedPreview theme={theme} />
          <div className="mt-3 text-center text-xs leading-relaxed" style={{ color: "var(--ad-faint)" }}>
            This skin applies to all game types.
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemedPreview({ theme }: { theme: Theme }) {
  const { primary, accent, headline, btn, font } = theme;
  const fp = FONT_PRESETS[font] || FONT_PRESETS.playful;
  const screenBg = mix(primary, "#000000", 0.12);
  const panel = mix(primary, "#FFFFFF", 0.92);
  const onAccent = readableText(accent);
  const N = 8, slice = 360 / N, R = 92;
  const sliceCols = Array.from({ length: N }, (_, i) => (i % 2 === 0 ? accent : mix(primary, "#FFFFFF", 0.18)));
  const icons = ["🥤", "★", "🎁", "%", "🍩", "★", "💎", "%"];

  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  function spin() {
    if (spinning) return;
    setSpinning(true);
    setRot((r) => r + 360 * 4 + Math.floor(Math.random() * 360));
    setTimeout(() => setSpinning(false), 3000);
  }

  return (
    <div style={{ width: 268, borderRadius: 34, background: "#15151B", padding: 9, boxShadow: "0 20px 50px -16px rgba(0,0,0,.5)", margin: "0 auto" }}>
      <div style={{ borderRadius: 27, overflow: "hidden", background: screenBg, position: "relative", height: 520, fontFamily: '"Fredoka", sans-serif' }}>
        <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 80, height: 20, background: "#15151B", borderRadius: 12, zIndex: 5 }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.06) 2px, transparent 2px)", backgroundSize: "15px 15px" }} />

        <div style={{ position: "relative", padding: "40px 18px 18px", display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
          <div style={{ background: panel, borderRadius: 14, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: primary, display: "grid", placeItems: "center", color: readableText(primary), fontWeight: 800, fontSize: 13 }}>
              {(theme.name || "B").slice(0, 1).toUpperCase()}
            </span>
            <span style={{ fontWeight: 800, fontSize: 14, color: readableText(panel) }}>{theme.name || "Your Brand"}</span>
          </div>

          <div style={{ fontFamily: fp.display, color: "#fff", fontSize: font === "playful" ? 27 : 23, textAlign: "center", lineHeight: 1.02, marginTop: 16, textShadow: "0 2px 8px rgba(0,0,0,.3)", maxWidth: 210 }}>
            {headline}
          </div>

          <div style={{ position: "relative", marginTop: 18 }}>
            <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", zIndex: 3, width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `16px solid ${accent}`, filter: "drop-shadow(0 2px 2px rgba(0,0,0,.3))" }} />
            <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} style={{ transform: `rotate(${rot}deg)`, transition: spinning ? "transform 3s cubic-bezier(.16,.7,.16,1)" : "none", filter: "drop-shadow(0 6px 14px rgba(0,0,0,.3))" }}>
              <circle cx={R} cy={R} r={R - 2} fill="#15151B" />
              {sliceCols.map((c, i) => {
                const a0 = ((i * slice - 90) * Math.PI) / 180, a1 = (((i + 1) * slice - 90) * Math.PI) / 180;
                const x0 = R + (R - 6) * Math.cos(a0), y0 = R + (R - 6) * Math.sin(a0);
                const x1 = R + (R - 6) * Math.cos(a1), y1 = R + (R - 6) * Math.sin(a1);
                const mid = ((i * slice + slice / 2 - 90) * Math.PI) / 180;
                const ix = R + (R - 6) * 0.62 * Math.cos(mid), iy = R + (R - 6) * 0.62 * Math.sin(mid);
                return (
                  <g key={i}>
                    <path d={`M${R},${R} L${x0},${y0} A${R - 6},${R - 6} 0 0 1 ${x1},${y1} Z`} fill={c} stroke="#15151B" strokeWidth="2" />
                    <text x={ix} y={iy} fontSize="15" textAnchor="middle" dominantBaseline="central" transform={`rotate(${i * slice + slice / 2},${ix},${iy})`}>{icons[i]}</text>
                  </g>
                );
              })}
              <circle cx={R} cy={R} r="16" fill={panel} stroke="#15151B" strokeWidth="2.5" />
            </svg>
          </div>

          <button
            onClick={spin}
            disabled={spinning}
            style={{ marginTop: "auto", width: "100%", border: "none", borderRadius: 999, background: accent, color: onAccent, fontFamily: fp.display, fontSize: font === "modern" || font === "classic" ? 17 : 20, fontWeight: font === "modern" ? 800 : 400, padding: "13px 0", cursor: spinning ? "default" : "pointer", boxShadow: `0 5px 0 ${mix(accent, "#000", 0.25)}`, letterSpacing: font === "playful" ? 0.5 : 0 }}
          >
            {spinning ? "…" : btn}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- small primitives ---- */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ad-card p-6">
      <div className="mb-4 text-[17px] font-extrabold">{title}</div>
      {children}
    </div>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="text-[13.5px] font-bold" style={{ marginBottom: hint ? 2 : 8 }}>{label}</div>
      {hint ? <div className="mb-2 text-[12.5px]" style={{ color: "var(--ad-muted)" }}>{hint}</div> : null}
      {children}
    </div>
  );
}
function TextInput({ value, onChange, ...p }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...p}
      className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
      style={{ border: "1px solid var(--ad-border)", background: "var(--ad-surface2)", color: "var(--ad-ink)" }}
    />
  );
}
function Swatches({ list, value, onChange }: { list: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {list.map((c) => {
        const on = value.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            style={{ width: 34, height: 34, borderRadius: 9, background: c, cursor: "pointer", border: on ? "3px solid var(--ad-ink)" : "2px solid rgba(0,0,0,.08)", boxShadow: on ? "0 0 0 2px #fff inset" : "none", transform: on ? "scale(1.08)" : "none", transition: "transform .1s" }}
          />
        );
      })}
      <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5">
        <span style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px dashed var(--ad-faint)", display: "grid", placeItems: "center", color: readableText(value), position: "relative", overflow: "hidden", background: value }}>
          +
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
        </span>
        <span className="mono text-xs" style={{ color: "var(--ad-muted)" }}>{value.toUpperCase()}</span>
      </label>
    </div>
  );
}
