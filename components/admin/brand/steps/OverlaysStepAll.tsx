"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEnabledGames } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { OverlayElement, OverlayAnimation } from "@/lib/types/campaign";
import type { BrandStudioConfig, StudioGameAssets } from "@/lib/types/studio";
import { buildGameConfig } from "@/lib/brand/gameAssets";
import { MiniGamePreview } from "../MiniGamePreview";

const ENABLED = getEnabledGames();

const ANIMATIONS: Exclude<OverlayAnimation, "none">[] = [
  "float", "bounce", "pulse", "spin", "wiggle", "swing", "shake", "rubber-band", "heartbeat", "jello", "tada",
];

// Animations active on an element — prefers the new `animations` array, falls
// back to the legacy single `animation`.
function animSet(el: OverlayElement): OverlayAnimation[] {
  if (el.animations && el.animations.length) return el.animations;
  return el.animation && el.animation !== "none" ? [el.animation] : [];
}

interface Props {
  brandId: string;
  config: BrandStudioConfig;
  patchConfig: (updater: (c: BrandStudioConfig) => BrandStudioConfig) => void;
}

export function OverlaysStepAll({ brandId, config, patchConfig }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);

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
  function toggleAnim(gt: string, el: OverlayElement, a: OverlayAnimation) {
    const cur = animSet(el);
    const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
    updateEl(gt, el.id, { animations: next, animation: "none" });
  }

  // Copy this game's overlays (and all their settings) onto every other game.
  function applyToAll(srcGt: string) {
    const src = config.games[srcGt]?.overlays ?? [];
    const others = ENABLED.filter(([gt]) => gt !== srcGt).length;
    if (!window.confirm(`Apply these ${src.length} extra asset(s) to all ${others} other game(s)? This replaces their current extra assets.`)) return;
    patchConfig((c) => {
      const games = { ...c.games };
      for (const [gt] of ENABLED) {
        if (gt === srcGt) continue;
        const copy = src.map((e, i) => ({ ...e, id: `el-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` }));
        games[gt] = { ...(games[gt] ?? {}), overlays: copy };
      }
      return { ...c, games };
    });
  }

  async function add(gt: string, file: File) {
    if (!brandId) { setError("Brand not loaded yet — reload the page and try again."); return; }
    setBusyKey(gt); setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${brandId}/studio/overlay/${gt}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const url = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
      const el: OverlayElement = { id: `el-${Date.now()}`, imageUrl: url, x: 40, y: 60, width: 80, height: 80, rotation: 0, animation: "none", animations: [], opacity: 1 };
      setOverlays(gt, [...(config.games[gt]?.overlays ?? []), el]);
      setSelId(el.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally { setBusyKey(null); }
  }

  // Upload every image in a drop / file selection, sequentially.
  async function addFiles(gt: string, files: FileList | File[]) {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    for (const f of imgs) await add(gt, f);
  }

  function onDrop(gt: string, e: React.DragEvent) {
    e.preventDefault();
    setDragKey(null);
    if (e.dataTransfer.files?.length) addFiles(gt, e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
        Drag images straight onto a game (or use ＋ image) to add stickers, mascots or confetti. Then drag them in the preview to move, drag the corner to resize, and stack one or more animations. Use <strong>Apply to all</strong> to copy a game&apos;s setup to the rest.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ENABLED.map(([gt, meta]) => {
          const assets = config.games[gt];
          const els = assets?.overlays ?? [];
          const isOver = dragKey === gt;
          return (
            <div
              key={gt}
              className="ad-card overflow-hidden p-0"
              style={isOver ? { outline: "2px dashed #6D4AFF", outlineOffset: -2 } : undefined}
              onDragOver={(e) => { e.preventDefault(); setDragKey(gt); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setDragKey(null); }}
              onDrop={(e) => onDrop(gt, e)}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--ad-border)" }}>
                <span>{meta.icon}</span>
                <span className="text-xs font-bold truncate">{meta.label}</span>
                {els.length > 0 && (
                  <button type="button" onClick={() => applyToAll(gt)}
                    className="ml-auto text-[11px] rounded border px-2 py-0.5 hover:bg-zinc-100" title="Copy these extra assets to every other game">
                    Apply to all
                  </button>
                )}
                <label className={`${els.length > 0 ? "" : "ml-auto"} cursor-pointer text-[11px] rounded border px-2 py-0.5 hover:bg-zinc-100`}>
                  {busyKey === gt ? "…" : "＋ image"}
                  <input type="file" accept="image/*" multiple className="hidden" disabled={busyKey === gt}
                    onChange={(e) => { if (e.target.files?.length) addFiles(gt, e.target.files); e.target.value = ""; }} />
                </label>
              </div>
              <div className="relative">
                <MiniGamePreview
                  gameType={gt as GameType}
                  theme={config.theme}
                  config={buildGameConfig(gt, assets, config.text)}
                  bg={assets?.bg}
                  overlays={els}
                  texts={assets?.texts}
                  padTop={assets?.padTop ?? 0}
                  onOverlayChange={(id, patch) => updateEl(gt, id, patch)}
                  selectedOverlayId={selId}
                  onSelectOverlay={setSelId}
                  text={config.text}
                />
                {isOver && (
                  <div className="absolute inset-0 grid place-items-center pointer-events-none" style={{ background: "rgba(109,74,255,0.08)" }}>
                    <span className="text-xs font-bold rounded-full px-3 py-1" style={{ background: "#6D4AFF", color: "#fff" }}>Drop image to add</span>
                  </div>
                )}
              </div>
              {els.length > 0 && (
                <div className="p-2 space-y-2 border-t max-h-72 overflow-y-auto" style={{ borderColor: "var(--ad-border)" }}>
                  <p className="text-[10px]" style={{ color: "var(--ad-faint)" }}>Drag an asset in the preview to move it; drag its corner to resize.</p>
                  {els.map((el, i) => {
                    const active = animSet(el);
                    const selected = selId === el.id;
                    return (
                      <div key={el.id} className="rounded-lg border p-2 space-y-1.5"
                        style={{ borderColor: selected ? "#6D4AFF" : "var(--ad-border)" }}
                        onClick={() => setSelId(el.id)}>
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={el.imageUrl} alt="" className="h-6 w-6 rounded border object-contain bg-white" />
                          <span className="text-[10px] font-semibold" style={{ color: "var(--ad-muted)" }}>#{i + 1}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeEl(gt, el.id); }} className="ml-auto text-[11px] text-red-400 hover:text-red-600">✕</button>
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
                        {/* Multiple animations — toggle any combination. */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px]" style={{ color: "var(--ad-faint)" }}>Animations {active.length > 0 ? `(${active.length})` : ""}</span>
                            {active.length > 0 && (
                              <button type="button" onClick={() => updateEl(gt, el.id, { animations: [], animation: "none" })} className="text-[9px] text-zinc-400 hover:text-red-600">clear</button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {ANIMATIONS.map((a) => {
                              const on = active.includes(a);
                              return (
                                <button key={a} type="button" onClick={() => toggleAnim(gt, el, a)}
                                  className="text-[10px] rounded-full border px-2 py-0.5 capitalize"
                                  style={{ background: on ? "#6D4AFF" : "#fff", color: on ? "#fff" : "#666", borderColor: on ? "#6D4AFF" : "var(--ad-border)" }}>
                                  {a.replace("-", " ")}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
