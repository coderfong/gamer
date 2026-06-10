"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEnabledGames } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { OverlayElement } from "@/lib/types/campaign";
import type { BrandStudioConfig, StudioGameAssets } from "@/lib/types/studio";
import { buildGameConfig } from "@/lib/brand/gameAssets";
import { MiniGamePreview } from "../MiniGamePreview";

const ENABLED = getEnabledGames();

const ANIMATIONS: OverlayElement["animation"][] = [
  "none", "float", "bounce", "pulse", "spin", "wiggle", "swing", "shake", "rubber-band", "heartbeat", "jello", "tada",
];

interface Props {
  brandId: string;
  config: BrandStudioConfig;
  patchConfig: (updater: (c: BrandStudioConfig) => BrandStudioConfig) => void;
}

export function OverlaysStepAll({ brandId, config, patchConfig }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setOverlays(gt: string, els: OverlayElement[]) {
    patchConfig((c) => {
      const game: StudioGameAssets = { ...(c.games[gt] ?? {}), overlays: els };
      return { ...c, games: { ...c.games, [gt]: game } };
    });
  }
  function updateEl(gt: string, id: string, patch: Partial<OverlayElement>) {
    const els = config.games[gt]?.overlays ?? [];
    setOverlays(gt, els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function removeEl(gt: string, id: string) {
    setOverlays(gt, (config.games[gt]?.overlays ?? []).filter((e) => e.id !== id));
  }

  async function add(gt: string, file: File) {
    if (!brandId) { setError("Brand not loaded yet — reload the page and try again."); return; }
    setBusyKey(gt); setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${brandId}/studio/overlay/${gt}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const url = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
      const el: OverlayElement = { id: `el-${Date.now()}`, imageUrl: url, x: 40, y: 60, width: 80, height: 80, rotation: 0, animation: "none", opacity: 1 };
      setOverlays(gt, [...(config.games[gt]?.overlays ?? []), el]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally { setBusyKey(null); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
        Add decorative images (stickers, mascots, confetti) per game, then position, size, rotate, flip and animate them. They render in front of each game.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ENABLED.map(([gt, meta]) => {
          const assets = config.games[gt];
          const els = assets?.overlays ?? [];
          return (
            <div key={gt} className="ad-card overflow-hidden p-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--ad-border)" }}>
                <span>{meta.icon}</span>
                <span className="text-xs font-bold truncate">{meta.label}</span>
                <label className="ml-auto cursor-pointer text-[11px] rounded border px-2 py-0.5 hover:bg-zinc-100">
                  {busyKey === gt ? "…" : "＋ image"}
                  <input type="file" accept="image/*" className="hidden" disabled={busyKey === gt}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) add(gt, f); e.target.value = ""; }} />
                </label>
              </div>
              <MiniGamePreview gameType={gt as GameType} theme={config.theme} config={buildGameConfig(gt, assets, config.text)} bg={assets?.bg} overlays={els} texts={assets?.texts} padTop={assets?.padTop ?? 0} text={config.text} />
              {els.length > 0 && (
                <div className="p-2 space-y-2 border-t max-h-56 overflow-y-auto" style={{ borderColor: "var(--ad-border)" }}>
                  {els.map((el, i) => (
                    <div key={el.id} className="rounded-lg border p-2 space-y-1.5" style={{ borderColor: "var(--ad-border)" }}>
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={el.imageUrl} alt="" className="h-6 w-6 rounded border object-contain bg-white" />
                        <span className="text-[10px] font-semibold" style={{ color: "var(--ad-muted)" }}>#{i + 1}</span>
                        <select value={el.animation} onChange={(e) => updateEl(gt, el.id, { animation: e.target.value as OverlayElement["animation"] })}
                          className="text-[10px] rounded border bg-white px-1 py-0.5 ml-auto">
                          {ANIMATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <button type="button" onClick={() => removeEl(gt, el.id)} className="text-[11px] text-red-400 hover:text-red-600">✕</button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <Num label="X" value={el.x} onChange={(v) => updateEl(gt, el.id, { x: v })} />
                        <Num label="Y" value={el.y} onChange={(v) => updateEl(gt, el.id, { y: v })} />
                        <Num label="W" value={el.width} onChange={(v) => updateEl(gt, el.id, { width: Math.max(8, v) })} />
                        <Num label="H" value={el.height} onChange={(v) => updateEl(gt, el.id, { height: Math.max(8, v) })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="range" min={-180} max={180} value={Math.round(el.rotation)} onChange={(e) => updateEl(gt, el.id, { rotation: Number(e.target.value) })} className="flex-1" title="Rotation" />
                        <button type="button" onClick={() => updateEl(gt, el.id, { flipH: !el.flipH })} className="text-[10px] rounded border px-1.5 py-0.5" style={{ background: el.flipH ? "#6D4AFF" : "#fff", color: el.flipH ? "#fff" : "#666" }}>↔</button>
                        <button type="button" onClick={() => updateEl(gt, el.id, { flipV: !el.flipV })} className="text-[10px] rounded border px-1.5 py-0.5" style={{ background: el.flipV ? "#6D4AFF" : "#fff", color: el.flipV ? "#fff" : "#666" }}>↕</button>
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
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[9px]" style={{ color: "var(--ad-faint)" }}>{label}</span>
      <input type="number" value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border px-1 py-0.5 text-[11px] bg-white" />
    </label>
  );
}
