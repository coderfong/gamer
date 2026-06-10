"use client";

import { getEnabledGames } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BrandStudioConfig, BrandTextStyle, BrandStudioText, StudioGameAssets, StudioText } from "@/lib/types/studio";
import { studioTextCss } from "@/lib/types/studio";
import { FONT_OPTIONS } from "@/components/admin/builder/types";
import { buildGameConfig } from "@/lib/brand/gameAssets";
import { MiniGamePreview } from "../MiniGamePreview";

const ENABLED = getEnabledGames();
const TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"] as const;

interface Props {
  config: BrandStudioConfig;
  patchConfig: (updater: (c: BrandStudioConfig) => BrandStudioConfig) => void;
}

export function TextStepAll({ config, patchConfig }: Props) {
  const text = config.text;

  function setStyle(role: keyof BrandStudioText, patch: Partial<BrandTextStyle>) {
    patchConfig((c) => ({ ...c, text: { ...c.text, [role]: { ...c.text[role], ...patch } } }));
  }

  function setTexts(gt: string, list: StudioText[]) {
    patchConfig((c) => {
      const game: StudioGameAssets = { ...(c.games[gt] ?? {}), texts: list };
      return { ...c, games: { ...c.games, [gt]: game } };
    });
  }
  function addText(gt: string) {
    const list = config.games[gt]?.texts ?? [];
    setTexts(gt, [...list, { id: `t-${Date.now()}`, content: "Your text", role: "display", x: 30, y: 16, width: 280, size: 30, color: "", align: "center" }]);
  }
  function updateText(gt: string, id: string, patch: Partial<StudioText>) {
    const list = config.games[gt]?.texts ?? [];
    setTexts(gt, list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function removeText(gt: string, id: string) {
    setTexts(gt, (config.games[gt]?.texts ?? []).filter((t) => t.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] items-start">
      <div className="space-y-4">
        <StyleCard title="Headline / big text" hint="The bold display text (titles, “SPIN”, scores)."
          style={text.display} onChange={(p) => setStyle("display", p)} sample="CLASSIC" fallbackFont={config.theme.fontFamily} />
        <StyleCard title="Small / supporting text" hint="Instructions, labels, captions."
          style={text.body} onChange={(p) => setStyle("body", p)} sample="smashburger" fallbackFont={config.theme.fontFamily} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-bold">Live preview — all games</span>
          <span className="text-xs" style={{ color: "var(--ad-faint)" }}>Backgrounds you set carry over here</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ENABLED.map(([gt, meta]) => {
            const assets = config.games[gt];
            const texts = assets?.texts ?? [];
            return (
              <div key={gt} className="ad-card overflow-hidden p-0">
                <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--ad-border)" }}>
                  <span>{meta.icon}</span>
                  <span className="text-xs font-bold truncate">{meta.label}</span>
                  <button type="button" onClick={() => addText(gt)} className="ml-auto text-[11px] rounded border px-2 py-0.5 hover:bg-zinc-100">＋ text</button>
                </div>
                <MiniGamePreview gameType={gt as GameType} theme={config.theme} config={buildGameConfig(gt, assets, text)} bg={assets?.bg} overlays={assets?.overlays} texts={texts} padTop={assets?.padTop ?? 0} onTextChange={(id, patch) => updateText(gt, id, patch)} text={text} />
                {texts.length > 0 && (
                  <div className="p-2 space-y-2 border-t max-h-60 overflow-y-auto" style={{ borderColor: "var(--ad-border)" }}>
                    <p className="text-[10px]" style={{ color: "var(--ad-faint)" }}>Drag a text in the preview to move it; drag its corner to resize.</p>
                    {texts.map((t) => (
                      <div key={t.id} className="rounded-lg border p-2 space-y-1.5" style={{ borderColor: "var(--ad-border)" }}>
                        <div className="flex items-center gap-1.5">
                          <input value={t.content} onChange={(e) => updateText(gt, t.id, { content: e.target.value })}
                            className="flex-1 rounded border px-2 py-1 text-xs" placeholder="Text" />
                          <input type="color" value={t.color || "#000000"} onChange={(e) => updateText(gt, t.id, { color: e.target.value })} className="h-7 w-7 rounded border bg-white" title="Colour (overrides style)" />
                          <button type="button" onClick={() => removeText(gt, t.id)} className="text-[11px] text-red-400 hover:text-red-600">✕</button>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Headline vs small style */}
                          <div className="flex gap-0.5">
                            {(["display", "body"] as const).map((r) => (
                              <button key={r} type="button" onClick={() => updateText(gt, t.id, { role: r })}
                                className="text-[10px] rounded border px-1.5 py-0.5"
                                style={{ background: t.role === r ? "#6D4AFF" : "#fff", color: t.role === r ? "#fff" : "#666" }}>
                                {r === "display" ? "Headline" : "Small"}
                              </button>
                            ))}
                          </div>
                          {/* alignment */}
                          <div className="flex gap-0.5 ml-auto">
                            {(["left", "center", "right"] as const).map((a) => (
                              <button key={a} type="button" onClick={() => updateText(gt, t.id, { align: a })}
                                className="text-[10px] rounded border px-1.5 py-0.5"
                                style={{ background: t.align === a ? "#6D4AFF" : "#fff", color: t.align === a ? "#fff" : "#666" }}>
                                {a === "left" ? "⤙" : a === "center" ? "≡" : "⤚"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StyleCard({
  title, hint, style, onChange, sample, fallbackFont,
}: {
  title: string; hint: string; style: BrandTextStyle; onChange: (p: Partial<BrandTextStyle>) => void; sample: string; fallbackFont: string;
}) {
  // Live sample using the same CSS the games get
  const scopeId = `samp-${title.replace(/\W/g, "")}`;
  const sampleText: BrandStudioText = { display: style, body: style };
  const resolvedFont = style.font || fallbackFont;
  return (
    <div className="ad-card p-5 space-y-3">
      <div className="text-[15px] font-extrabold">{title}</div>
      <p className="text-xs" style={{ color: "var(--ad-muted)" }}>{hint}</p>

      {/* sample — set the font vars .arcade-title reads, so it matches the games */}
      <div className={scopeId} style={{ ["--font-arcade" as string]: resolvedFont, ["--font-body" as string]: resolvedFont, fontFamily: resolvedFont }}>
        <style dangerouslySetInnerHTML={{ __html: studioTextCss(sampleText, `.${scopeId}`) }} />
        <div className="rounded-lg px-3 py-4 text-center" style={{ background: "var(--ad-surface2, #f4f4f6)" }}>
          <span className="arcade-title" style={{ fontSize: style.size, color: style.color || "var(--ad-ink)" }}>{sample}</span>
        </div>
      </div>

      <Field label="Font">
        <select value={style.font} onChange={(e) => onChange({ font: e.target.value })}
          className="w-full rounded-[10px] px-3 py-2 text-sm bg-white" style={{ border: "1px solid var(--ad-border)" }}>
          <option value="">Theme default</option>
          {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Size · ${style.size}px`}>
          <input type="range" min={10} max={48} step={1} value={style.size}
            onChange={(e) => onChange({ size: Number(e.target.value) })} className="w-full" />
        </Field>
        <Field label={`Weight · ${style.weight}`}>
          <input type="range" min={100} max={900} step={100} value={style.weight}
            onChange={(e) => onChange({ weight: Number(e.target.value) })} className="w-full" />
        </Field>
        <Field label={`Letter spacing · ${style.spacing.toFixed(2)}em`}>
          <input type="range" min={-0.05} max={0.3} step={0.01} value={style.spacing}
            onChange={(e) => onChange({ spacing: Number(e.target.value) })} className="w-full" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <Field label="Case">
          <select value={style.transform} onChange={(e) => onChange({ transform: e.target.value as BrandTextStyle["transform"] })}
            className="w-full rounded-[10px] px-3 py-2 text-sm bg-white" style={{ border: "1px solid var(--ad-border)" }}>
            {TRANSFORMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Colour">
          <div className="flex items-center gap-2">
            <input type="color" value={style.color || "#000000"} onChange={(e) => onChange({ color: e.target.value })} className="h-9 w-12 rounded border bg-white" />
            {style.color ? (
              <button type="button" onClick={() => onChange({ color: "" })} className="text-xs text-zinc-400 hover:text-red-600">Auto</button>
            ) : <span className="text-xs" style={{ color: "var(--ad-faint)" }}>Auto</span>}
          </div>
        </Field>
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
