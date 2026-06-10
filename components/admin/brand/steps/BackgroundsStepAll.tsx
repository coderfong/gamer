"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEnabledGames } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BrandStudioConfig, StudioGameAssets } from "@/lib/types/studio";
import { buildGameConfig } from "@/lib/brand/gameAssets";
import { MiniGamePreview } from "../MiniGamePreview";
import { ImageDrop } from "../ImageDrop";

const ENABLED = getEnabledGames();
const DEFAULT_BG = { x: 0, y: 0, scale: 1, opacity: 1 };

interface Props {
  brandId: string;
  config: BrandStudioConfig;
  patchConfig: (updater: (c: BrandStudioConfig) => BrandStudioConfig) => void;
}

export function BackgroundsStepAll({ brandId, config, patchConfig }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setBg(gt: string, patch: Partial<NonNullable<StudioGameAssets["bg"]>> | null) {
    patchConfig((c) => {
      const game: StudioGameAssets = { ...(c.games[gt] ?? {}) };
      if (patch === null) { delete game.bg; }
      else game.bg = { url: game.bg?.url ?? "", ...DEFAULT_BG, ...game.bg, ...patch };
      return { ...c, games: { ...c.games, [gt]: game } };
    });
  }

  async function upload(gt: string, file: File) {
    if (!brandId) { setError("Brand not loaded yet — reload the page and try again."); return; }
    setBusyKey(gt); setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${brandId}/studio/bg/${gt}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const url = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
      setBg(gt, { url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally { setBusyKey(null); }
  }

  function applyToAll(gt: string) {
    const src = config.games[gt]?.bg;
    if (!src) return;
    patchConfig((c) => {
      const games = { ...c.games };
      for (const [g] of ENABLED) games[g] = { ...(games[g] ?? {}), bg: { ...src } };
      return { ...c, games };
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
        Add a background image per game, then nudge its position, zoom and opacity. Use “Apply to all” to copy one background everywhere.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ENABLED.map(([gt, meta]) => {
          const assets = config.games[gt];
          const bg = assets?.bg;
          return (
            <div key={gt} className="ad-card overflow-hidden p-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--ad-border)" }}>
                <span>{meta.icon}</span>
                <span className="text-xs font-bold truncate">{meta.label}</span>
              </div>
              <MiniGamePreview gameType={gt as GameType} theme={config.theme} config={buildGameConfig(gt, assets, config.text)} bg={bg} overlays={assets?.overlays} texts={assets?.texts} padTop={assets?.padTop ?? 0} text={config.text} />
              <div className="p-3 space-y-2 border-t" style={{ borderColor: "var(--ad-border)" }}>
                {!bg?.url ? (
                  <ImageDrop label="🖼 Upload / drop background" busy={busyKey === gt} onFile={(f) => upload(gt, f)} />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold" style={{ color: "var(--ad-muted)" }}>Background framing</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => applyToAll(gt)} className="text-[11px] text-violet-600 hover:text-violet-800">Apply to all</button>
                        <button type="button" onClick={() => setBg(gt, null)} className="text-[11px] text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    </div>
                    <Slider label="X" min={-100} max={100} value={bg.x} onChange={(v) => setBg(gt, { x: v })} />
                    <Slider label="Y" min={-100} max={100} value={bg.y} onChange={(v) => setBg(gt, { y: v })} />
                    <Slider label="Zoom" min={1} max={3} step={0.05} value={bg.scale} onChange={(v) => setBg(gt, { scale: v })} fmt={(v) => `${v.toFixed(2)}×`} />
                    <Slider label="Opacity" min={0} max={1} step={0.05} value={bg.opacity} onChange={(v) => setBg(gt, { opacity: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Slider({ label, min, max, step = 1, value, onChange, fmt }: {
  label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] w-12 shrink-0" style={{ color: "var(--ad-muted)" }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="text-[10px] w-10 text-right tabular-nums" style={{ color: "var(--ad-faint)" }}>{fmt ? fmt(value) : value}</span>
    </label>
  );
}
