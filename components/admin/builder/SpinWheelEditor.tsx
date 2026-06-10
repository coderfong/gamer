"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  readSpinWheelConfig,
  resolveSliceFill,
  WHEEL_COLOR_PRESETS,
  type SliceFill,
  type SpinWheelConfig,
} from "@/lib/types/spinwheel";
import type { BuilderCampaign } from "./types";
import { ImagePositionModal } from "./ImagePositionModal";

// ─── helpers ────────────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left"
        style={{ background: "var(--ad-surface2)" }}
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        <span style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-zinc-500 w-28 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SliderRow({ label, min, max, step = 1, value, onChange, display }: {
  label: string; min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void; display?: string;
}) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs font-mono text-zinc-500 w-14 text-right shrink-0">
          {display ?? value}
        </span>
      </div>
    </Row>
  );
}

function ColorRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border cursor-pointer"
        />
        <span className="text-xs font-mono text-zinc-400">{value}</span>
      </div>
    </Row>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function SpinWheelEditor({
  campaign,
  setCampaign,
}: {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null); // which slot is uploading
  const [imageModal, setImageModal] = useState<number | null>(null); // slice index for position modal

  const cfg = readSpinWheelConfig(campaign.config ?? {});

  function patch(updates: Partial<SpinWheelConfig>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...updates } }));
  }

  // ── Slice count ─────────────────────────────────────────────────────────
  function setNumSlices(n: number) {
    const newSegs    = [...cfg.segments];
    const newImgs    = [...cfg.segmentImages];
    const newLabels  = [...cfg.labels];
    const newFills   = [...cfg.sliceFills];
    const DEF_ICONS  = ["🥤","🍀","🏷️","🍩","🎁","🍀","🧋","💎","⭐","🔥","💥","🎉"];
    const DEF_LABELS = ["FREE","TRY AGAIN","20% OFF","BOGO","GIFT","TRY AGAIN","TOPPING","JACKPOT","BONUS","HOT","WOW","PARTY"];
    while (newSegs.length < n)   newSegs.push(DEF_ICONS[newSegs.length % DEF_ICONS.length]);
    while (newImgs.length < n)   newImgs.push(null);
    while (newLabels.length < n) newLabels.push(DEF_LABELS[newLabels.length % DEF_LABELS.length]);
    while (newFills.length < n)  newFills.push({ type: "solid", color: "#FFFCF4" });
    patch({
      numSlices: n,
      segments:      newSegs.slice(0, n),
      segmentImages: newImgs.slice(0, n),
      labels:        newLabels.slice(0, n),
      sliceFills:    newFills.slice(0, n),
    });
  }

  // ── Per-slice updates ────────────────────────────────────────────────────
  function setSliceEmoji(i: number, v: string) {
    const a = [...cfg.segments]; a[i] = v; patch({ segments: a });
  }
  function setSliceLabel(i: number, v: string) {
    const a = [...cfg.labels]; a[i] = v; patch({ labels: a });
  }
  function setSliceFill(i: number, f: Partial<SliceFill>) {
    const a = [...cfg.sliceFills];
    a[i] = { ...a[i], ...f };
    patch({ sliceFills: a, colorPreset: "custom" });
  }
  function clearSliceImage(i: number) {
    const a = [...cfg.segmentImages]; a[i] = null; patch({ segmentImages: a });
  }

  async function uploadSegmentImage(i: number, file: File) {
    setUploading(`seg-${i}`);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/segments/${campaign.id}-seg${i}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (error) return;
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      const a = [...cfg.segmentImages]; a[i] = data.publicUrl;
      patch({ segmentImages: a });
    } finally {
      setUploading(null);
    }
  }

  async function uploadHubLogo(file: File) {
    setUploading("hub-logo");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/hub/${campaign.id}-hub-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (error) return;
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      patch({ hubLogoUrl: data.publicUrl });
    } finally {
      setUploading(null);
    }
  }

  async function uploadSliceImage(i: number, file: File) {
    setUploading(`fill-${i}`);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${campaign.brandId}/slices/${campaign.id}-slice${i}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (error) return;
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setSliceFill(i, { type: "image", imageUrl: data.publicUrl });
    } finally {
      setUploading(null);
    }
  }

  const PRESETS = Object.entries(WHEEL_COLOR_PRESETS);

  return (
    <div className="space-y-3">

      {/* ── Slices ────────────────────────────────────────────────────────── */}
      <Section title="Slices" defaultOpen>
        <SliderRow
          label="Number of slices"
          min={2} max={12} value={cfg.numSlices}
          onChange={setNumSlices}
        />

        {/* Color presets */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-zinc-500">Color preset</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([key, colors]) => (
              <button
                key={key}
                type="button"
                title={key}
                onClick={() => patch({ colorPreset: key })}
                className="flex gap-0.5 rounded-lg overflow-hidden border-2 transition-all"
                style={{
                  borderColor: cfg.colorPreset === key ? "#6D4AFF" : "transparent",
                  boxShadow: cfg.colorPreset === key ? "0 0 0 2px #6D4AFF40" : undefined,
                }}
              >
                {colors.slice(0, 4).map((c, ci) => (
                  <span key={ci} style={{ background: c, width: 14, height: 28, display: "block" }} />
                ))}
              </button>
            ))}
            {/* Custom indicator */}
            {cfg.colorPreset === "custom" && (
              <span className="text-xs font-semibold text-purple-600 self-center">Custom</span>
            )}
          </div>
        </div>

        {/* Per-slice rows */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500">Per-slice</p>
          {Array.from({ length: cfg.numSlices }).map((_, i) => (
            <SliceRow
              key={i}
              index={i}
              emoji={cfg.segments[i]}
              label={cfg.labels[i]}
              segmentImage={cfg.segmentImages[i]}
              fill={resolveSliceFill(i, cfg)}
              rawFill={cfg.sliceFills[i]}
              isUploading={uploading === `seg-${i}` || uploading === `fill-${i}`}
              onEmojiChange={(v) => setSliceEmoji(i, v)}
              onLabelChange={(v) => setSliceLabel(i, v)}
              onFillChange={(f) => setSliceFill(i, f)}
              onSegmentImageUpload={(file) => uploadSegmentImage(i, file)}
              onSliceImageUpload={(file) => uploadSliceImage(i, file)}
              onClearSegmentImage={() => clearSliceImage(i)}
              onAdjustImagePosition={() => setImageModal(i)}
            />
          ))}
        </div>
      </Section>

      {/* ── Wheel style ───────────────────────────────────────────────────── */}
      <Section title="Wheel Style">
        <SliderRow
          label="Wheel size"
          min={200} max={420} step={10}
          value={cfg.wheelSize}
          onChange={(v) => patch({ wheelSize: v })}
          display={`${cfg.wheelSize}px`}
        />
        <ColorRow label="Peg colour"     value={cfg.pegColor}     onChange={(v) => patch({ pegColor: v })} />
        <ColorRow label="Pointer colour" value={cfg.pointerColor} onChange={(v) => patch({ pointerColor: v })} />
        <Row label="Pointer animation">
          <div className="flex gap-3">
            {(["none", "tick", "bounce"] as const).map((a) => (
              <label key={a} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="pointerAnim"
                  value={a}
                  checked={cfg.pointerAnim === a}
                  onChange={() => patch({ pointerAnim: a })}
                />
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </label>
            ))}
          </div>
        </Row>
      </Section>

      {/* ── Hub ──────────────────────────────────────────────────────────── */}
      <Section title="Hub / Centre">
        <ColorRow label="Hub colour" value={cfg.hubColor} onChange={(v) => patch({ hubColor: v })} />
        <Row label="Logo image">
          <div className="space-y-2">
            {cfg.hubLogoUrl && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.hubLogoUrl} alt="" className="h-10 w-10 rounded-full object-contain border" />
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-600"
                  onClick={() => patch({ hubLogoUrl: undefined })}
                >
                  Remove
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHubLogo(f); }}
              />
              <span className="rounded border px-2 py-1 text-xs hover:bg-zinc-100 cursor-pointer">
                {cfg.hubLogoUrl ? "Replace logo" : "Upload logo"}
              </span>
            </label>
            {uploading === "hub-logo" && <span className="text-xs text-zinc-400">Uploading…</span>}
          </div>
        </Row>
        {cfg.hubLogoUrl && (
          <SliderRow
            label="Logo size"
            min={30} max={100} step={5}
            value={Math.round(cfg.hubLogoScale * 100)}
            onChange={(v) => patch({ hubLogoScale: v / 100 })}
            display={`${Math.round(cfg.hubLogoScale * 100)}%`}
          />
        )}
      </Section>

      {/* ── Button ────────────────────────────────────────────────────────── */}
      <Section title="Spin Button">
        <Row label="Button text">
          <input
            value={cfg.spinButtonText}
            onChange={(e) => patch({ spinButtonText: e.target.value })}
            className="w-full rounded-lg border px-3 py-1.5 text-sm"
            placeholder="SPIN!"
          />
        </Row>
        <Row label="Spinning text">
          <input
            value={cfg.spinningText}
            onChange={(e) => patch({ spinningText: e.target.value })}
            className="w-full rounded-lg border px-3 py-1.5 text-sm"
            placeholder="GOOD LUCK…"
          />
        </Row>
        <SliderRow
          label="Font size"
          min={12} max={32} value={cfg.spinButtonFontSize}
          onChange={(v) => patch({ spinButtonFontSize: v })}
          display={`${cfg.spinButtonFontSize}px`}
        />
      </Section>

      {/* ── Layout ────────────────────────────────────────────────────────── */}
      <Section title="Layout">
        <p className="text-xs text-zinc-500">
          Drag the wheel and spin button freely in the preview panel. Use Reset to re-centre both.
        </p>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
          onClick={() => patch({ wheelOffsetX: 0, wheelOffsetY: 0, spinBtnOffsetX: 0, spinBtnOffsetY: 0 })}
        >
          Reset positions to centre
        </button>
      </Section>

      {/* ── Timing ────────────────────────────────────────────────────────── */}
      <Section title="Timing">
        <SliderRow
          label="Spin duration"
          min={1000} max={10000} step={200}
          value={cfg.spinDuration}
          onChange={(v) => patch({ spinDuration: v })}
          display={`${(cfg.spinDuration / 1000).toFixed(1)}s`}
        />
      </Section>

      {/* Image position modal */}
      {imageModal !== null && (
        <ImagePositionModal
          sliceIndex={imageModal}
          numSlices={cfg.numSlices}
          fill={cfg.sliceFills[imageModal] ?? { type: "image", color: "#fff" }}
          onApply={(patch) => setSliceFill(imageModal, patch)}
          onClose={() => setImageModal(null)}
        />
      )}

    </div>
  );
}

// ─── Per-slice row ────────────────────────────────────────────────────────────

function SliceRow({
  index, emoji, label, segmentImage, fill, rawFill, isUploading,
  onEmojiChange, onLabelChange, onFillChange,
  onSegmentImageUpload, onSliceImageUpload, onClearSegmentImage,
  onAdjustImagePosition,
}: {
  index: number;
  emoji: string;
  label: string;
  segmentImage: string | null;
  fill: SliceFill;
  rawFill: SliceFill;
  isUploading: boolean;
  onEmojiChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onFillChange: (f: Partial<SliceFill>) => void;
  onSegmentImageUpload: (file: File) => void;
  onSliceImageUpload: (file: File) => void;
  onClearSegmentImage: () => void;
  onAdjustImagePosition: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-xs font-bold text-zinc-400 w-4">{index + 1}</span>

        {/* Slice color swatch */}
        <button
          type="button"
          className="w-6 h-6 rounded border-2 border-zinc-300 shrink-0"
          style={{
            background: fill.type === "gradient"
              ? `linear-gradient(135deg, ${fill.color}, ${fill.color2 ?? fill.color})`
              : fill.type === "image" ? "url(" + (fill.imageUrl ?? "") + ") center/cover"
              : fill.color,
          }}
          title="Edit fill"
          onClick={() => setExpanded((o) => !o)}
        />

        {/* Icon preview / emoji input */}
        {segmentImage ? (
          <div className="flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={segmentImage} alt="" className="w-6 h-6 rounded object-cover" />
            <button type="button" className="text-[10px] text-red-400 hover:text-red-600" onClick={onClearSegmentImage}>✕</button>
          </div>
        ) : (
          <input
            value={emoji}
            onChange={(e) => onEmojiChange(e.target.value)}
            className="w-10 text-center rounded border px-1 py-0.5 text-base"
            maxLength={2}
          />
        )}

        {/* Label */}
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          className="flex-1 rounded border px-2 py-1 text-xs"
          placeholder="Label"
        />

        <button
          type="button"
          className="text-xs text-zinc-400 hover:text-zinc-700 px-1"
          onClick={() => setExpanded((o) => !o)}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded fill editor */}
      {expanded && (
        <div className="border-t px-3 py-3 space-y-3 bg-zinc-50">
          {/* Fill type */}
          <div className="flex gap-3">
            {(["solid", "gradient", "image"] as const).map((t) => (
              <label key={t} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="radio"
                  name={`fill-type-${index}`}
                  checked={rawFill?.type === t || (!rawFill && t === "solid")}
                  onChange={() => onFillChange({ type: t })}
                />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>

          {/* Solid */}
          {(rawFill?.type === "solid" || !rawFill?.type) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-16">Color</span>
              <input type="color" value={fill.color} onChange={(e) => onFillChange({ type: "solid", color: e.target.value })} className="h-8 w-10 rounded border" />
              <span className="text-xs font-mono text-zinc-400">{fill.color}</span>
            </div>
          )}

          {/* Gradient */}
          {rawFill?.type === "gradient" && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">From</span>
                <input type="color" value={rawFill.color} onChange={(e) => onFillChange({ color: e.target.value })} className="h-8 w-10 rounded border" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">To</span>
                <input type="color" value={rawFill.color2 ?? rawFill.color} onChange={(e) => onFillChange({ color2: e.target.value })} className="h-8 w-10 rounded border" />
              </div>
              <div
                className="h-8 flex-1 min-w-[80px] rounded border"
                style={{ background: `linear-gradient(to right, ${rawFill.color}, ${rawFill.color2 ?? rawFill.color})` }}
              />
            </div>
          )}

          {/* Image */}
          {rawFill?.type === "image" && (
            <div className="space-y-2">
              {rawFill.imageUrl && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={rawFill.imageUrl} alt="" className="h-8 w-12 object-cover rounded border" />
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs hover:bg-zinc-100"
                    onClick={onAdjustImagePosition}
                  >
                    Adjust position
                  </button>
                  <button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => onFillChange({ imageUrl: undefined })}>Remove</button>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <span className="text-zinc-500">Upload image</span>
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onSliceImageUpload(f); }}
                />
                <span className="rounded border px-2 py-1 text-xs hover:bg-zinc-100 cursor-pointer">Choose file</span>
              </label>
              {isUploading && <span className="text-xs text-zinc-400">Uploading…</span>}
            </div>
          )}

          {/* Icon image */}
          <div className="border-t pt-3 space-y-1">
            <p className="text-xs font-medium text-zinc-500">Icon (overrides emoji)</p>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onSegmentImageUpload(f); }}
              />
              <span className="rounded border px-2 py-1 text-xs hover:bg-zinc-100 cursor-pointer">Upload icon image</span>
            </label>
            {isUploading && <span className="text-xs text-zinc-400">Uploading…</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpinWheelEditor;
