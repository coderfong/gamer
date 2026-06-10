"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function StopTimerEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const targetSeconds   = Math.max(2, Math.min(30, (config.targetSeconds as number | undefined) ?? 10));
  const perfectWindowMs = Math.max(30, Math.min(2000, (config.perfectWindowMs as number | undefined) ?? 120));
  const fillStyle    = (config.fillStyle    as string | undefined) ?? "vertical";
  const fillColor    = (config.fillColor    as string | undefined) ?? "#6d28d9";
  const trackColor   = (config.trackColor   as string | undefined) ?? "#d8d4e0";
  const fillImage    = (config.fillImage    as string | undefined) ?? null;
  const showTimer    = (config.showTimer    as boolean | undefined) ?? true;
  const showTargetMarker = (config.showTargetMarker as boolean | undefined) ?? true;
  const lockAnimation = (config.lockAnimation as string | undefined) ?? "pulse";
  const instructionText       = (config.instructionText       as string | undefined) ?? "Stop the timer exactly at {target}s!";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const accuracyLabel = (config.accuracyLabel as string | undefined) ?? "Accuracy";
  const startLabel    = (config.startLabel    as string | undefined) ?? "START";
  const stopLabel     = (config.stopLabel     as string | undefined) ?? "STOP";
  const perfectText   = (config.perfectText   as string | undefined) ?? "Bullseye! ⏱️";
  const resultText    = (config.resultText    as string | undefined) ?? "You stopped at {time}s — {accuracy}% accurate";

  async function uploadFill(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/stop-timer/${campaign.id ?? "draft"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      patch({ fillImage: data.publicUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Challenge ────────────────────────────────────────── */}
      <Section title="Challenge" defaultOpen>
        <div className="space-y-4">
          <Field label={`Target time · ${targetSeconds}s`}>
            <input type="range" min={2} max={30} step={1}
              value={targetSeconds}
              onChange={(e) => patch({ targetSeconds: Number(e.target.value) })}
              className="w-full" />
            <span className="text-xs text-zinc-400">Players try to stop the timer exactly here.</span>
          </Field>
          <Field label={`Perfect window · ±${perfectWindowMs}ms`}>
            <input type="range" min={30} max={2000} step={10}
              value={perfectWindowMs}
              onChange={(e) => patch({ perfectWindowMs: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Strict (hard)</span><span>Generous (easy)</span>
            </div>
          </Field>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showTimer}
                onChange={(e) => patch({ showTimer: e.target.checked })} />
              <span className="text-sm text-zinc-700">Show live timer (uncheck for hard mode)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showTargetMarker}
                onChange={(e) => patch({ showTargetMarker: e.target.checked })} />
              <span className="text-sm text-zinc-700">Show target marker line on the fill</span>
            </label>
          </div>
        </div>
      </Section>

      {/* ── Fill visual ─────────────────────────────────────── */}
      <Section title="Fill visual" defaultOpen>
        <div className="space-y-3">
          <Field label="Fill style">
            <div className="flex gap-2 flex-wrap">
              {[
                { v: "vertical", l: "Vertical bar" },
                { v: "bar", l: "Horizontal bar" },
                { v: "circle", l: "Circle" },
              ].map((o) => {
                const active = fillStyle === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => patch({ fillStyle: o.v })}
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      background: active ? "#F0EBFF" : "white",
                      color: active ? "#6D4AFF" : "#52525b",
                      borderColor: active ? "#6D4AFF" : "#d4d4d8",
                    }}
                  >
                    {o.l}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fill colour">
              <input type="color" value={fillColor}
                onChange={(e) => patch({ fillColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Track colour">
              <input type="color" value={trackColor}
                onChange={(e) => patch({ trackColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>
          {fillStyle !== "circle" && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-600">Fill image (optional — revealed as it fills)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFill(f); e.target.value = ""; }} />
                  <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                    {uploading ? "Uploading…" : fillImage ? "Replace image" : "🖼 Upload image"}
                  </span>
                </label>
                {fillImage && (
                  <button type="button" onClick={() => patch({ fillImage: null })} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
              {fillImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fillImage} alt="" className="w-full h-20 object-contain rounded-lg border bg-zinc-100" />
              )}
            </div>
          )}
          <Field label="Lock-in animation">
            <select
              value={lockAnimation}
              onChange={(e) => patch({ lockAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="pulse">Pulse</option>
              <option value="pop">Pop</option>
              <option value="flash">Flash</option>
              <option value="tada">Tada</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* ── Text & labels ───────────────────────────────────── */}
      <Section title="Text & labels">
        <div className="space-y-3">
          <Field label="Instruction text">
            <input
              value={instructionText}
              onChange={(e) => patch({ instructionText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="Stop the timer exactly at {target}s!"
            />
            <span className="text-xs text-zinc-400">Use <code>{"{target}"}</code> for the target time. Leave blank to hide.</span>
          </Field>
          <div className="grid grid-cols-3 gap-2 items-end">
            <Field label="Text colour">
              <input type="color" value={instructionColor}
                onChange={(e) => patch({ instructionColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label={`Size · ${instructionFontSize}px`}>
              <input type="range" min={10} max={28} step={1}
                value={instructionFontSize}
                onChange={(e) => patch({ instructionFontSize: Number(e.target.value) })}
                className="w-full" />
            </Field>
            <Field label="Font">
              <select
                value={instructionFontFamily}
                onChange={(e) => patch({ instructionFontFamily: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Default</option>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Accuracy label">
              <input value={accuracyLabel} onChange={(e) => patch({ accuracyLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Start button">
              <input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Stop button">
              <input value={stopLabel} onChange={(e) => patch({ stopLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
          </div>
          <Field label="Perfect message">
            <input value={perfectText} onChange={(e) => patch({ perfectText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} />
          </Field>
          <Field label="Result message">
            <input value={resultText} onChange={(e) => patch({ resultText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm" />
            <span className="text-xs text-zinc-400">
              Use <code>{"{time}"}</code>, <code>{"{accuracy}"}</code>, <code>{"{target}"}</code>.
            </span>
          </Field>
        </div>
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left"
        style={{ background: "var(--ad-surface2, #f4f4f6)" }}
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        <span style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && <div className="px-4 py-3 space-y-3 border-t">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}
