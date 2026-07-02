"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BrandStudioConfig, StampCardAssets } from "@/lib/types/studio";
import { StampCard } from "@/components/shared/StampCard";
import { ImageDrop } from "../ImageDrop";

const DEFAULT_BG = { x: 0, y: 0, scale: 1, opacity: 1 };

// Image slots on the stamp card, mirroring the per-game hero/background pattern.
const SLOTS: { key: "logoUrl" | "stampEmptyUrl" | "stampFilledUrl" | "rewardImageUrl"; label: string; hint: string }[] = [
  { key: "logoUrl", label: "Card logo", hint: "Shown in the card header. Falls back to your brand logo." },
  { key: "stampFilledUrl", label: "Collected stamp", hint: "Icon for a stamp the customer has earned." },
  { key: "stampEmptyUrl", label: "Empty stamp", hint: "Icon for a slot not yet stamped." },
  { key: "rewardImageUrl", label: "Reward image", hint: "Shown when the card is full and the reward unlocks." },
];

interface Props {
  brandId: string;
  brandName: string;
  config: BrandStudioConfig;
  patchConfig: (updater: (c: BrandStudioConfig) => BrandStudioConfig) => void;
}

export function StampCardStep({ brandId, brandName, config, patchConfig }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewStamps, setPreviewStamps] = useState(0);

  const sc = config.stampCard;

  function patchStamp(patch: Partial<StampCardAssets>) {
    patchConfig((c) => ({ ...c, stampCard: { ...c.stampCard, ...patch } }));
  }

  function setBg(patch: Partial<NonNullable<StampCardAssets["bg"]>> | null) {
    patchConfig((c) => {
      const next: StampCardAssets = { ...c.stampCard };
      if (patch === null) delete next.bg;
      else next.bg = { url: next.bg?.url ?? "", ...DEFAULT_BG, ...next.bg, ...patch };
      return { ...c, stampCard: next };
    });
  }

  async function uploadTo(slot: string, file: File, apply: (url: string) => void) {
    if (!brandId) { setError("Brand not loaded yet — reload the page and try again."); return; }
    setBusyKey(slot); setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${brandId}/studio/stamp/${slot}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const url = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
      apply(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally { setBusyKey(null); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* Live preview */}
      <div className="space-y-3">
        <div className="mx-auto w-full max-w-[320px]">
          <StampCard
            assets={sc}
            theme={config.theme}
            brandName={brandName}
            fallbackLogo={config.logoUrl}
            stamps={previewStamps}
            onTapNext={() => setPreviewStamps((s) => Math.min(sc.goal, s + 1))}
          />
        </div>
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--ad-muted)" }}>
          <button type="button" onClick={() => setPreviewStamps((s) => Math.max(0, s - 1))} className="rounded border px-2 py-1" style={{ borderColor: "var(--ad-border)" }}>−</button>
          <span>Preview: {previewStamps}/{sc.goal} stamps — tap the card to add</span>
          <button type="button" onClick={() => setPreviewStamps((s) => Math.min(sc.goal, s + 1))} className="rounded border px-2 py-1" style={{ borderColor: "var(--ad-border)" }}>+</button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Add assets for this brand&apos;s stamp card, the same way you asset a game. Anything you leave empty uses a themed default.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Reward settings */}
        <div className="ad-card space-y-3 p-4">
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ad-muted)" }}>Reward</div>
          <label className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-[12px] font-semibold" style={{ color: "var(--ad-muted)" }}>Stamps needed</span>
            <input type="range" min={2} max={12} step={1} value={sc.goal}
              onChange={(e) => { const g = Number(e.target.value); patchStamp({ goal: g }); setPreviewStamps((s) => Math.min(g, s)); }}
              className="flex-1" />
            <span className="w-8 text-right text-[12px] tabular-nums" style={{ color: "var(--ad-faint)" }}>{sc.goal}</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-[12px] font-semibold" style={{ color: "var(--ad-muted)" }}>Reward label</span>
            <input type="text" value={sc.rewardLabel} maxLength={60}
              onChange={(e) => patchStamp({ rewardLabel: e.target.value })}
              placeholder="Free drink"
              className="flex-1 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--ad-border)" }} />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 items-center gap-2">
              <span className="shrink-0 text-[12px] font-semibold" style={{ color: "var(--ad-muted)" }}>Stamp emoji</span>
              <input type="text" value={sc.stampEmoji ?? ""} maxLength={4}
                onChange={(e) => patchStamp({ stampEmoji: e.target.value || undefined })}
                placeholder="🧋"
                className="w-16 rounded-lg border px-3 py-1.5 text-center text-sm" style={{ borderColor: "var(--ad-border)" }} />
            </label>
            <label className="flex flex-1 items-center gap-2">
              <span className="shrink-0 text-[12px] font-semibold" style={{ color: "var(--ad-muted)" }}>Reward emoji</span>
              <input type="text" value={sc.rewardEmoji ?? ""} maxLength={4}
                onChange={(e) => patchStamp({ rewardEmoji: e.target.value || undefined })}
                placeholder="🎁"
                className="w-16 rounded-lg border px-3 py-1.5 text-center text-sm" style={{ borderColor: "var(--ad-border)" }} />
            </label>
          </div>
          <p className="text-[11px]" style={{ color: "var(--ad-faint)" }}>Emoji show when no icon image is uploaded — a quick way to brand without an asset.</p>
        </div>

        {/* Image slots */}
        <div className="grid gap-3 sm:grid-cols-2">
          {SLOTS.map((slot) => {
            const url = sc[slot.key];
            return (
              <div key={slot.key} className="ad-card space-y-2 p-3">
                <div className="text-xs font-bold" style={{ color: "#191921" }}>{slot.label}</div>
                <div className="flex items-center gap-2">
                  {url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-10 w-10 rounded border object-contain bg-white" />
                      <button type="button" onClick={() => patchStamp({ [slot.key]: undefined } as Partial<StampCardAssets>)} className="text-[11px] text-red-400 hover:text-red-600">Remove</button>
                    </>
                  ) : (
                    <ImageDrop label="🖼 Upload / drop" busy={busyKey === slot.key} onFile={(f) => uploadTo(slot.key, f, (u) => patchStamp({ [slot.key]: u } as Partial<StampCardAssets>))} />
                  )}
                </div>
                <p className="text-[11px]" style={{ color: "var(--ad-faint)" }}>{slot.hint}</p>
              </div>
            );
          })}
        </div>

        {/* Background */}
        <div className="ad-card space-y-2 p-4">
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ad-muted)" }}>Background</div>
          {!sc.bg?.url ? (
            <ImageDrop label="🖼 Upload / drop background" busy={busyKey === "bg"} onFile={(f) => uploadTo("bg", f, (u) => setBg({ url: u }))} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: "var(--ad-muted)" }}>Background framing</span>
                <button type="button" onClick={() => setBg(null)} className="text-[11px] text-red-400 hover:text-red-600">Remove</button>
              </div>
              <Slider label="X" min={-100} max={100} value={sc.bg.x} onChange={(v) => setBg({ x: v })} />
              <Slider label="Y" min={-100} max={100} value={sc.bg.y} onChange={(v) => setBg({ y: v })} />
              <Slider label="Zoom" min={1} max={3} step={0.05} value={sc.bg.scale} onChange={(v) => setBg({ scale: v })} fmt={(v) => `${v.toFixed(2)}×`} />
              <Slider label="Opacity" min={0} max={1} step={0.05} value={sc.bg.opacity} onChange={(v) => setBg({ opacity: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, min, max, step = 1, value, onChange, fmt }: {
  label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px]" style={{ color: "var(--ad-muted)" }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-10 text-right text-[10px] tabular-nums" style={{ color: "var(--ad-faint)" }}>{fmt ? fmt(value) : value}</span>
    </label>
  );
}
