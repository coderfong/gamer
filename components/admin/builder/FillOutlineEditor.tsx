"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

const SHAPES = [
  { value: "rounded", label: "Rounded" },
  { value: "square",  label: "Square" },
  { value: "circle",  label: "Circle" },
  { value: "diamond", label: "Diamond" },
  { value: "hexagon", label: "Hexagon" },
  { value: "star",    label: "Star" },
] as const;

type Shape = typeof SHAPES[number]["value"];

const SHAPE_PREVIEW: Record<Shape, React.CSSProperties> = {
  rounded: { borderRadius: 8 },
  square:  { borderRadius: 2 },
  circle:  { borderRadius: "50%" },
  diamond: { clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)" },
  hexagon: { clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" },
  star:    { clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" },
};

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function FillOutlineEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const shape       = (config.shape as Shape | undefined) ?? "rounded";
  const shapeWidth  = Math.max(60, Math.min(260, (config.shapeWidth  as number | undefined) ?? 120));
  const shapeHeight = Math.max(60, Math.min(220, (config.shapeHeight as number | undefined) ?? 120));
  const oscillateSpeed = Math.max(1, Math.min(12, (config.oscillateSpeed as number | undefined) ?? 4));
  const outlineColor = (config.outlineColor as string | undefined) ?? "#6d28d9";
  const fillColor    = (config.fillColor    as string | undefined) ?? "#f59e0b";
  const outlineImage = (config.outlineImage as string | undefined) ?? null;
  const fillImage    = (config.fillImage    as string | undefined) ?? null;
  const perfectThreshold = Math.max(50, Math.min(100, (config.perfectThreshold as number | undefined) ?? 90));
  const lockAnimation = (config.lockAnimation as string | undefined) ?? "pulse";
  const instructionText       = (config.instructionText       as string | undefined) ?? "Stop the slider to fill the outline!";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const filledLabel  = (config.filledLabel as string | undefined) ?? "Filled";
  const stopLabel    = (config.stopLabel   as string | undefined) ?? "STOP";
  const perfectText  = (config.perfectText as string | undefined) ?? "Perfect fit! 🎯";
  const tryAgainText = (config.tryAgainText as string | undefined) ?? "So close!";

  async function uploadTo(folder: string, file: File, onDone: (url: string) => void) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/${folder}/${campaign.id ?? "draft"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      onDone(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Shape ────────────────────────────────────────────── */}
      <Section title="Outline shape" defaultOpen>
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            {SHAPES.map((s) => {
              const active = shape === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => patch({ shape: s.value })}
                  className="flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    background: active ? "#F0EBFF" : "white",
                    color: active ? "#6D4AFF" : "#52525b",
                    borderColor: active ? "#6D4AFF" : "#d4d4d8",
                    minWidth: 56,
                  }}
                >
                  <div style={{ width: 26, height: 26, background: active ? "#6D4AFF" : "#d4d4d8", ...SHAPE_PREVIEW[s.value] }} />
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Width · ${shapeWidth}px`}>
              <input type="range" min={60} max={260} step={5}
                value={shapeWidth}
                onChange={(e) => patch({ shapeWidth: Number(e.target.value) })}
                className="w-full" />
            </Field>
            <Field label={`Height · ${shapeHeight}px`}>
              <input type="range" min={60} max={220} step={5}
                value={shapeHeight}
                onChange={(e) => patch({ shapeHeight: Number(e.target.value) })}
                className="w-full" />
            </Field>
          </div>
        </div>
      </Section>

      {/* ── Appearance ──────────────────────────────────────── */}
      <Section title="Appearance" defaultOpen>
        <div className="space-y-3">
          <ImageOrColor
            label="Outline (target)"
            image={outlineImage}
            color={outlineColor}
            uploading={uploading}
            onColor={(v) => patch({ outlineColor: v })}
            onUpload={(f) => uploadTo("fill-outline", f, (url) => patch({ outlineImage: url }))}
            onRemove={() => patch({ outlineImage: null })}
          />
          <ImageOrColor
            label="Moving object (fill)"
            image={fillImage}
            color={fillColor}
            uploading={uploading}
            onColor={(v) => patch({ fillColor: v })}
            onUpload={(f) => uploadTo("fill-outline", f, (url) => patch({ fillImage: url }))}
            onRemove={() => patch({ fillImage: null })}
          />
          <p className="text-xs text-zinc-400">
            Tip: use the same image for both (one faded as the target, one solid as the object) for a satisfying snap-to-fit.
          </p>
        </div>
      </Section>

      {/* ── Difficulty & animation ──────────────────────────── */}
      <Section title="Difficulty & animation" defaultOpen>
        <div className="space-y-4">
          <Field label={`Oscillation speed · ${oscillateSpeed}`}>
            <input type="range" min={1} max={12} step={1}
              value={oscillateSpeed}
              onChange={(e) => patch({ oscillateSpeed: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Slow (easy)</span><span>Fast (hard)</span>
            </div>
          </Field>
          <Field label={`Perfect threshold · ${perfectThreshold}% filled`}>
            <input type="range" min={50} max={100} step={1}
              value={perfectThreshold}
              onChange={(e) => patch({ perfectThreshold: Number(e.target.value) })}
              className="w-full" />
            <span className="text-xs text-zinc-400">Fill at or above this shows the “perfect” message.</span>
          </Field>
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
            <span className="text-xs text-zinc-400">Plays on the object when stopped.</span>
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
              placeholder="Stop the slider to fill the outline!"
            />
            <span className="text-xs text-zinc-400">Leave blank to hide.</span>
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
          <div className="grid grid-cols-2 gap-2">
            <Field label="Percentage label">
              <input value={filledLabel} onChange={(e) => patch({ filledLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Stop button">
              <input value={stopLabel} onChange={(e) => patch({ stopLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Perfect message">
              <input value={perfectText} onChange={(e) => patch({ perfectText: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} />
            </Field>
            <Field label="Miss message">
              <input value={tryAgainText} onChange={(e) => patch({ tryAgainText: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} />
            </Field>
          </div>
        </div>
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ImageOrColor({
  label, image, color, uploading, onColor, onUpload, onRemove,
}: {
  label: string;
  image: string | null;
  color: string;
  uploading: boolean;
  onColor: (v: string) => void;
  onUpload: (f: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {image ? (
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-lg border bg-white overflow-hidden flex items-center justify-center"
            style={{ backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 8px 8px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="w-full h-full object-contain" />
          </div>
          <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Remove image</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input type="color" value={color} onChange={(e) => onColor(e.target.value)}
            className="h-9 w-16 rounded border bg-white" />
          <label className="text-xs rounded border px-2 py-1.5 cursor-pointer hover:bg-zinc-100 text-zinc-600">
            {uploading ? "…" : "🖼 Use image"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          </label>
        </div>
      )}
    </div>
  );
}

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
