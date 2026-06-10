"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { extractPalette } from "@/lib/brand/extractPalette";
import { readableText } from "@/lib/games/colors";
import { getEnabledGames } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BrandStudioConfig } from "@/lib/types/studio";
import { FONT_OPTIONS } from "@/components/admin/builder/types";
import { MiniGamePreview } from "../MiniGamePreview";

const ENABLED = getEnabledGames();

// Curated font "styles" surfaced as quick picks (full list still in the dropdown).
const FONT_STYLES = [
  { value: "Luckiest Guy", label: "Playful", kind: "Fun & bouncy" },
  { value: "Bungee", label: "Bold", kind: "Loud & blocky" },
  { value: "Poppins", label: "Modern", kind: "Clean & geometric" },
  { value: "Titan One", label: "Chunky", kind: "Heavy & round" },
  { value: "Righteous", label: "Retro", kind: "Display / arcade" },
  { value: "Nunito", label: "Friendly", kind: "Soft & rounded" },
];

function eqHex(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// Heuristic "font style" suggestion from the palette's vibe — vivid brands lean
// playful, dark/muted lean bold, mid-range lean modern.
function suggestFont(palette: string[]): string | null {
  if (!palette.length) return null;
  const hex = palette[0].replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (sat > 0.55 && lum > 0.35) return "Luckiest Guy"; // vivid → playful
  if (lum < 0.35) return "Bungee";                      // dark → bold
  return "Poppins";                                     // muted/light → modern
}

interface Props {
  brandId: string;
  config: BrandStudioConfig;
  patchConfig: (updater: (c: BrandStudioConfig) => BrandStudioConfig) => void;
  brandName: string;
  setBrandName: (n: string) => void;
}

export function ThemeStepAll({ brandId, config, patchConfig, brandName, setBrandName }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = config.theme;
  function setTheme(patch: Partial<BrandStudioConfig["theme"]>) {
    patchConfig((c) => ({ ...c, theme: { ...c.theme, ...patch } }));
  }

  async function onImage(file: File) {
    if (!brandId) { setError("Brand not loaded yet — reload the page and try again."); return; }
    setBusy(true);
    setError(null);
    try {
      // Extract palette locally (instant), then upload the image for the logo.
      const palette = await extractPalette(file, 6);
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${brandId}/studio/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      let logoUrl: string | null = null;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (!upErr) logoUrl = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;

      patchConfig((c) => {
        const primary = palette[0] ?? c.theme.brandColor;
        const accent = palette.find((p) => p !== primary) ?? c.theme.accentColor;
        return {
          ...c,
          logoUrl: logoUrl ?? c.logoUrl,
          palette,
          theme: {
            ...c.theme,
            brandColor: primary,
            brandFg: readableText(primary),
            accentColor: accent,
            fontFamily: suggestFont(palette) ?? c.theme.fontFamily,
          },
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] items-start">
      {/* Controls */}
      <div className="space-y-4">
        <div className="ad-card p-5 space-y-4">
          <div className="text-[15px] font-extrabold">Brand image</div>
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" className="hidden" disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); e.target.value = ""; }} />
            <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm font-semibold"
              style={{ borderColor: "var(--ad-border)", color: "var(--ad-muted)" }}>
              {busy ? "Reading colours…" : config.logoUrl ? "Replace image" : "Upload a logo or photo"}
            </span>
          </label>
          {config.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt="" className="h-16 object-contain mx-auto" />
          )}
          {config.palette.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--ad-muted)" }}>Extracted palette — assign each colour to any slot</div>
              <div className="flex flex-wrap gap-2.5">
                {config.palette.map((c) => {
                  const usedAs = [
                    eqHex(theme.brandColor, c) && "P",
                    eqHex(theme.accentColor, c) && "A",
                    eqHex(theme.bgColor, c) && "BG",
                    eqHex(theme.brandFg, c) && "T",
                  ].filter(Boolean) as string[];
                  return (
                    <div key={c} className="flex flex-col items-center gap-1">
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: c, border: usedAs.length ? "3px solid #191921" : "2px solid rgba(0,0,0,.08)" }} />
                      <div className="flex gap-0.5">
                        {([["P", () => setTheme({ brandColor: c, brandFg: readableText(c) })],
                           ["A", () => setTheme({ accentColor: c })],
                           ["BG", () => setTheme({ bgColor: c })],
                           ["T", () => setTheme({ brandFg: c })]] as const).map(([lbl, fn]) => {
                          const on = usedAs.includes(lbl);
                          return (
                            <button key={lbl} onClick={fn} title={`Use ${c} as ${({P:"primary",A:"accent",BG:"background",T:"button text"} as Record<string,string>)[lbl]}`}
                              className="text-[9px] font-bold rounded px-1 py-0.5"
                              style={{ background: on ? "var(--ad-accent, #6D4AFF)" : "#e9e9ef", color: on ? "#fff" : "#555" }}>
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[10px]" style={{ color: "var(--ad-faint)" }}>P = primary · A = accent · BG = background · T = button text</div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="ad-card p-5 space-y-3">
          <div className="text-[15px] font-extrabold">Theme (applies to all games)</div>
          <Field label="Brand name">
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2 text-sm" style={{ border: "1px solid var(--ad-border)" }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Primary" value={theme.brandColor} onChange={(v) => setTheme({ brandColor: v, brandFg: readableText(v) })} />
            <ColorField label="Accent" value={theme.accentColor} onChange={(v) => setTheme({ accentColor: v })} />
            <ColorField label="Button text" value={theme.brandFg} onChange={(v) => setTheme({ brandFg: v })} />
            <ColorField label="Background" value={theme.bgColor} onChange={(v) => setTheme({ bgColor: v })} />
          </div>
          <Field label="Font style">
            <div className="grid grid-cols-2 gap-2">
              {FONT_STYLES.map((f) => {
                const on = theme.fontFamily === f.value;
                const suggested = config.palette.length > 0 && suggestFont(config.palette) === f.value;
                return (
                  <button key={f.value} onClick={() => setTheme({ fontFamily: f.value })}
                    className="rounded-xl p-2.5 text-left relative"
                    style={{ border: `1.5px solid ${on ? "var(--ad-accent, #6D4AFF)" : "var(--ad-border)"}`, background: on ? "var(--ad-accent-soft, #f0ebff)" : "var(--ad-surface, #fff)" }}>
                    <div style={{ fontFamily: f.value, fontSize: 18, lineHeight: 1, color: "var(--ad-ink)" }}>{f.label}</div>
                    <div className="mt-1 text-[10px] font-semibold" style={{ color: "var(--ad-muted)" }}>{f.kind}</div>
                    {suggested && !on && <span className="absolute top-1 right-1 text-[8px] font-bold rounded px-1" style={{ background: "var(--ad-accent, #6D4AFF)", color: "#fff" }}>SUGGESTED</span>}
                  </button>
                );
              })}
            </div>
            <select value={theme.fontFamily} onChange={(e) => setTheme({ fontFamily: e.target.value })}
              className="mt-2 w-full rounded-[10px] px-3 py-2 text-sm bg-white" style={{ border: "1px solid var(--ad-border)" }}>
              {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Preview grid — every game, live, themed */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-bold">All {ENABLED.length} games — live preview</span>
          <span className="text-xs" style={{ color: "var(--ad-faint)" }}>This theme applies to every game</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ENABLED.map(([gt, meta]) => (
            <div key={gt} className="ad-card overflow-hidden p-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--ad-border)" }}>
                <span>{meta.icon}</span>
                <span className="text-xs font-bold truncate">{meta.label}</span>
              </div>
              <MiniGamePreview gameType={gt as GameType} theme={theme} text={config.text} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold" style={{ color: "var(--ad-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold" style={{ color: "var(--ad-muted)" }}>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 rounded border bg-white" />
    </label>
  );
}
