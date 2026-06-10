"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import type { OverlayElement } from "@/lib/types/campaign";

const ANIMATION_OPTIONS: { value: OverlayElement["animation"]; label: string }[] = [
  { value: "none",         label: "None" },
  { value: "float",        label: "Float" },
  { value: "bounce",       label: "Bounce" },
  { value: "pulse",        label: "Pulse" },
  { value: "spin",         label: "Spin" },
  { value: "wiggle",       label: "Wiggle" },
  { value: "swing",        label: "Swing" },
  { value: "shake",        label: "Shake" },
  { value: "rubber-band",  label: "Rubber band" },
  { value: "heartbeat",    label: "Heartbeat" },
  { value: "jello",        label: "Jello" },
  { value: "tada",         label: "Tada" },
];

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function AdditionalElementsEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elements = (campaign.theme.overlayElements ?? []) as OverlayElement[];

  function updateElements(els: OverlayElement[]) {
    setCampaign((c) => ({ ...c, theme: { ...c.theme, overlayElements: els } }));
  }

  function updateElement(id: string, patch: Partial<OverlayElement>) {
    updateElements(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }

  function removeElement(id: string) {
    updateElements(elements.filter((el) => el.id !== id));
  }

  function moveUp(id: string) {
    const idx = elements.findIndex((el) => el.id === id);
    if (idx <= 0) return;
    const arr = [...elements];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    updateElements(arr);
  }

  function moveDown(id: string) {
    const idx = elements.findIndex((el) => el.id === id);
    if (idx < 0 || idx === elements.length - 1) return;
    const arr = [...elements];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    updateElements(arr);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/elements/${campaign.id ?? "draft"}-el-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      const newEl: OverlayElement = {
        id: `el-${Date.now()}`,
        imageUrl: data.publicUrl,
        x: 60, y: 180,
        width: 110, height: 110,
        rotation: 0,
        animation: "none",
        opacity: 1,
      };
      updateElements([...elements, newEl]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Upload decorative images. Drag them in the preview to reposition — use the handles to resize and rotate.
      </p>

      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading || elements.length >= 20}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImage(f);
            e.target.value = "";
          }}
        />
        <span className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:border-violet-400 hover:text-violet-600 transition-colors">
          {uploading ? "Uploading…" : elements.length >= 20 ? "Max 20 elements reached" : "+ Add image element"}
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {elements.length === 0 && (
        <p className="text-center text-xs text-zinc-400 py-6">
          No elements yet — upload a PNG or SVG sticker above.
        </p>
      )}

      <div className="space-y-3">
        {elements.map((el, idx) => (
          <div key={el.id} className="rounded-xl border bg-zinc-50 p-3 space-y-3">
            {/* Header row */}
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              <div
                className="w-14 h-14 rounded-lg border bg-white overflow-hidden shrink-0 flex items-center justify-center"
                style={{ backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 10px 10px" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={el.imageUrl} alt="" className="w-full h-full object-contain" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-semibold text-zinc-700">Element {idx + 1}</span>
                  <div className="flex gap-0.5 ml-auto">
                    <button type="button" onClick={() => moveUp(el.id)} disabled={idx === 0}
                      title="Render earlier (behind)"
                      className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveDown(el.id)} disabled={idx === elements.length - 1}
                      title="Render later (in front)"
                      className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => removeElement(el.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>

                <label className="block space-y-0.5">
                  <span className="text-xs text-zinc-500">Animation</span>
                  <select
                    value={el.animation}
                    onChange={(e) => updateElement(el.id, { animation: e.target.value as OverlayElement["animation"] })}
                    className="w-full rounded border px-2 py-1 text-xs bg-white"
                  >
                    {ANIMATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Position + size */}
            <div className="grid grid-cols-4 gap-1.5">
              <NumField label="X" value={el.x} onChange={(v) => updateElement(el.id, { x: v })} />
              <NumField label="Y" value={el.y} onChange={(v) => updateElement(el.id, { y: v })} />
              <NumField label="W" value={el.width} onChange={(v) => updateElement(el.id, { width: Math.max(10, v) })} />
              <NumField label="H" value={el.height} onChange={(v) => updateElement(el.id, { height: Math.max(10, v) })} />
            </div>

            {/* Flip + rotation + opacity */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 shrink-0">Flip</span>
              <button
                type="button"
                onClick={() => updateElement(el.id, { flipH: !el.flipH })}
                className="rounded px-2 py-1 text-xs font-medium border transition-colors"
                style={{
                  background: el.flipH ? "#6D4AFF" : "white",
                  color: el.flipH ? "white" : "#52525b",
                  borderColor: el.flipH ? "#6D4AFF" : "#d4d4d8",
                }}
              >
                ↔ H
              </button>
              <button
                type="button"
                onClick={() => updateElement(el.id, { flipV: !el.flipV })}
                className="rounded px-2 py-1 text-xs font-medium border transition-colors"
                style={{
                  background: el.flipV ? "#6D4AFF" : "white",
                  color: el.flipV ? "white" : "#52525b",
                  borderColor: el.flipV ? "#6D4AFF" : "#d4d4d8",
                }}
              >
                ↕ V
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Rotation</span>
                  <span className="text-xs text-zinc-400">{Math.round(el.rotation)}°</span>
                </div>
                <input
                  type="range" min={-180} max={180} step={1}
                  value={Math.round(el.rotation)}
                  onChange={(e) => updateElement(el.id, { rotation: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
              <label className="block space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Opacity</span>
                  <span className="text-xs text-zinc-400">{Math.round(el.opacity * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={el.opacity}
                  onChange={(e) => updateElement(el.id, { opacity: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border px-1.5 py-1 text-xs bg-white"
      />
    </label>
  );
}
