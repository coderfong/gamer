"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEnabledGames } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BrandStudioConfig, StudioGameAssets } from "@/lib/types/studio";
import { heroSlotsFor, buildGameConfig } from "@/lib/brand/gameAssets";
import { MiniGamePreview } from "../MiniGamePreview";
import { ImageDropClean } from "../ImageDropClean";
import { WedgeUploader } from "../WedgeUploader";

const ENABLED = getEnabledGames();

interface Props {
  brandId: string;
  config: BrandStudioConfig;
  patchConfig: (updater: (c: BrandStudioConfig) => BrandStudioConfig) => void;
}

export function HeroStepAll({ brandId, config, patchConfig }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setHero(gt: string, slotKey: string, url: string | null) {
    patchConfig((c) => {
      const game: StudioGameAssets = { ...(c.games[gt] ?? {}) };
      const hero = { ...(game.hero ?? {}) };
      if (url) hero[slotKey] = url; else delete hero[slotKey];
      game.hero = hero;
      return { ...c, games: { ...c.games, [gt]: game } };
    });
  }

  function addToList(gt: string, slotKey: string, url: string) {
    patchConfig((c) => {
      const game: StudioGameAssets = { ...(c.games[gt] ?? {}) };
      const heroList = { ...(game.heroList ?? {}) };
      heroList[slotKey] = [...(heroList[slotKey] ?? []), url];
      game.heroList = heroList;
      return { ...c, games: { ...c.games, [gt]: game } };
    });
  }
  function removeFromList(gt: string, slotKey: string, idx: number) {
    patchConfig((c) => {
      const game: StudioGameAssets = { ...(c.games[gt] ?? {}) };
      const heroList = { ...(game.heroList ?? {}) };
      heroList[slotKey] = (heroList[slotKey] ?? []).filter((_, i) => i !== idx);
      game.heroList = heroList;
      return { ...c, games: { ...c.games, [gt]: game } };
    });
  }

  async function doUpload(gt: string, slotKey: string, file: File): Promise<string | null> {
    if (!brandId) { setError("Brand not loaded yet — reload the page and try again."); return null; }
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "png";
    const path = `${brandId}/studio/hero/${gt}-${slotKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
    if (upErr) { setError(`Upload failed: ${upErr.message}`); return null; }
    return supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
  }

  async function upload(gt: string, slotKey: string, file: File) {
    const id = `${gt}:${slotKey}`;
    setBusyKey(id);
    try { const url = await doUpload(gt, slotKey, file); if (url) setHero(gt, slotKey, url); }
    finally { setBusyKey(null); }
  }

  async function uploadToList(gt: string, slotKey: string, file: File) {
    const id = `${gt}:${slotKey}`;
    setBusyKey(id);
    try { const url = await doUpload(gt, slotKey, file); if (url) addToList(gt, slotKey, url); }
    finally { setBusyKey(null); }
  }

  const themable = ENABLED.filter(([gt]) => heroSlotsFor(gt).length > 0);
  const themeOnly = ENABLED.filter(([gt]) => heroSlotsFor(gt).length === 0);

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
        Drop in one or more hero images per game. They appear instantly in each preview and on the play hub.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {themable.map(([gt, meta]) => {
          const assets = config.games[gt];
          const slots = heroSlotsFor(gt);
          return (
            <div key={gt} className="ad-card overflow-hidden p-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--ad-border)" }}>
                <span>{meta.icon}</span>
                <span className="text-xs font-bold truncate">{meta.label}</span>
              </div>
              <MiniGamePreview gameType={gt as GameType} theme={config.theme} config={buildGameConfig(gt, assets, config.text)} bg={assets?.bg} overlays={assets?.overlays} texts={assets?.texts} padTop={assets?.padTop ?? 0} text={config.text} />
              <div className="p-3 space-y-2 border-t" style={{ borderColor: "var(--ad-border)" }}>
                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold w-24 shrink-0" style={{ color: "var(--ad-muted)" }}>Push down</span>
                  <input type="range" min={0} max={240} step={4} value={assets?.padTop ?? 0}
                    onChange={(e) => patchConfig((c) => { const g = { ...(c.games[gt] ?? {}), padTop: Number(e.target.value) }; return { ...c, games: { ...c.games, [gt]: g } }; })}
                    className="flex-1" />
                  <span className="text-[10px] w-8 text-right tabular-nums" style={{ color: "var(--ad-faint)" }}>{assets?.padTop ?? 0}</span>
                </label>
                {slots.map((slot) => {
                  const id = `${gt}:${slot.key}`;
                  if (slot.multi) {
                    const list = assets?.heroList?.[slot.key] ?? [];
                    const max = slot.max ?? 6;
                    const unit = slot.unit ?? "image";
                    return (
                      <div key={slot.key} className="space-y-1.5">
                        <span className="text-[11px] font-semibold" style={{ color: "var(--ad-muted)" }}>{slot.label}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {list.map((url, idx) => (
                            <div key={idx} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="h-9 w-9 rounded border object-contain bg-white" />
                              <button type="button" onClick={() => removeFromList(gt, slot.key, idx)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-500">×</button>
                            </div>
                          ))}
                          {list.length < max && (
                            gt === "spin_wheel" && slot.key === "segmentImages" ? (
                              <WedgeUploader segments={8} label={list.length ? "Add" : "Add segments"} busy={busyKey === id} onFile={(f) => uploadToList(gt, slot.key, f)} />
                            ) : (
                              <ImageDropClean label={list.length ? "Add" : "Add images"} busy={busyKey === id} onFile={(f) => uploadToList(gt, slot.key, f)} />
                            )
                          )}
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--ad-faint)" }}>
                          {list.length} {unit}{list.length === 1 ? "" : "s"} — up to {max}.
                        </span>
                      </div>
                    );
                  }
                  const url = assets?.hero?.[slot.key];
                  return (
                    <div key={slot.key} className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold w-24 shrink-0" style={{ color: "var(--ad-muted)" }}>{slot.label}</span>
                      {url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-8 w-8 rounded border object-contain bg-white" />
                          <button type="button" onClick={() => setHero(gt, slot.key, null)} className="text-[11px] text-red-400 hover:text-red-600">Remove</button>
                        </>
                      ) : (
                        <ImageDropClean
                          label="Upload / drop"
                          busy={busyKey === id}
                          onFile={(f) => upload(gt, slot.key, f)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {themeOnly.length > 0 && (
        <p className="text-xs" style={{ color: "var(--ad-faint)" }}>
          Theme-only (no hero slot): {themeOnly.map(([, m]) => m.label).join(", ")}.
        </p>
      )}
    </div>
  );
}
