"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

const GRID_PRESETS = [
  { label: "1",           cols: 1, rows: 1 },
  { label: "3",           cols: 3, rows: 1 },
  { label: "4 (2×2)",    cols: 2, rows: 2 },
  { label: "6 (3×2)",    cols: 3, rows: 2 },
  { label: "9 (3×3)",    cols: 3, rows: 3 },
] as const;

const SHAPES = [
  { value: "rounded", label: "Rounded" },
  { value: "square",  label: "Square" },
  { value: "circle",  label: "Circle" },
  { value: "diamond", label: "Diamond" },
  { value: "hexagon", label: "Hexagon" },
] as const;

type Shape = typeof SHAPES[number]["value"];

const SHAPE_PREVIEW_CSS: Record<Shape, React.CSSProperties> = {
  rounded: { borderRadius: 8 },
  square:  { borderRadius: 2 },
  circle:  { borderRadius: "50%" },
  diamond: { clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)" },
  hexagon: { clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" },
};

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function ScratchCardEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const cols         = Math.max(1, Math.min(3, (config.gridCols       as number | undefined) ?? 3));
  const rows         = Math.max(1, Math.min(3, (config.gridRows       as number | undefined) ?? 1));
  const total        = cols * rows;
  const shape        = (config.scratchShape   as Shape  | undefined) ?? "rounded";
  const boxSize      = Math.max(60, Math.min(150, (config.boxSize     as number | undefined) ?? 100));
  const brushRadius  = Math.max(10, Math.min(60,  (config.brushRadius as number | undefined) ?? 28));
  const pctThreshold = Math.max(20, Math.min(90,  (config.percentToReveal as number | undefined) ?? 55));
  const winSymbol    = (config.winSymbol      as string | undefined) ?? "⭐";
  const otherSymbols = toSymbolArray(config.otherSymbols, ["🍋", "🔔", "🍒", "💎"]);
  const winCount     = Math.max(1, Math.min(total, (config.winCount   as number | undefined) ?? Math.ceil(total / 2)));
  const coverImage   = (config.coverImage     as string | undefined) ?? null;
  const coverText    = (config.coverText      as string | undefined) ?? "?";
  const instructionText       = (config.instructionText       as string | undefined) ?? "Match {count}× {symbol} to win!";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 14;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";

  const activePreset = GRID_PRESETS.find((p) => p.cols === cols && p.rows === rows);

  function setGrid(c: number, r: number) {
    const newTotal = c * r;
    patch({ gridCols: c, gridRows: r, winCount: Math.max(1, Math.min(newTotal, winCount)) });
  }

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

  const uploadCover = (file: File) => uploadTo("scratch-cover", file, (url) => patch({ coverImage: url }));

  function setOtherAt(idx: number, value: string) {
    const next = [...otherSymbols];
    next[idx] = value;
    patch({ otherSymbols: next });
  }
  function removeOther(idx: number) {
    patch({ otherSymbols: otherSymbols.filter((_, i) => i !== idx) });
  }
  function addOther(value: string) {
    if (value.trim()) patch({ otherSymbols: [...otherSymbols, value] });
  }

  return (
    <div className="space-y-4">

      {/* ── Grid layout ────────────────────────────────────── */}
      <Section title="Grid layout" defaultOpen>
        <div className="space-y-2">
          <span className="text-xs text-zinc-500">Number of panels</span>
          <div className="flex gap-2 flex-wrap">
            {GRID_PRESETS.map((p) => {
              const active = activePreset?.cols === p.cols && activePreset?.rows === p.rows;
              return (
                <button
                  key={`${p.cols}x${p.rows}`}
                  type="button"
                  onClick={() => setGrid(p.cols, p.rows)}
                  className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
                  style={{
                    background: active ? "#6D4AFF" : "white",
                    color: active ? "white" : "#52525b",
                    borderColor: active ? "#6D4AFF" : "#d4d4d8",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-400">{total} scratch panel{total !== 1 ? "s" : ""} total</p>
        </div>
      </Section>

      {/* ── Panel shape ─────────────────────────────────────── */}
      <Section title="Panel shape" defaultOpen>
        <div className="flex gap-3 flex-wrap">
          {SHAPES.map((s) => {
            const active = shape === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => patch({ scratchShape: s.value })}
                className="flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  background: active ? "#F0EBFF" : "white",
                  color: active ? "#6D4AFF" : "#52525b",
                  borderColor: active ? "#6D4AFF" : "#d4d4d8",
                  minWidth: 60,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: active ? "#6D4AFF" : "#d4d4d8",
                    ...SHAPE_PREVIEW_CSS[s.value],
                  }}
                />
                {s.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Symbols & win rule ──────────────────────────────── */}
      <Section title="Symbols & win rule" defaultOpen>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 items-start">
            <Field label="Win symbol">
              <SymbolEditor
                value={winSymbol}
                uploading={uploading}
                onText={(v) => patch({ winSymbol: v.trim() || "⭐" })}
                onUpload={(f) => uploadTo("scratch-symbols", f, (url) => patch({ winSymbol: url }))}
                onClearImage={() => patch({ winSymbol: "⭐" })}
              />
            </Field>
            <Field label={`Match needed (of ${total})`}>
              <input
                type="number"
                value={winCount}
                min={1}
                max={total}
                onChange={(e) =>
                  patch({ winCount: Math.max(1, Math.min(total, Number(e.target.value))) })
                }
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </Field>
          </div>
          <Field label="Other symbols (emoji or images)">
            <div className="flex flex-wrap gap-2 items-center">
              {otherSymbols.map((sym, i) => (
                <div key={i} className="relative">
                  <SymbolChip value={sym} onChange={(v) => setOtherAt(i, v)} />
                  <button
                    type="button"
                    onClick={() => removeOther(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
              {/* Add emoji */}
              <input
                placeholder="＋😀"
                className="w-12 h-12 rounded-lg border text-lg text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addOther((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                    e.preventDefault();
                  }
                }}
                onBlur={(e) => { addOther(e.target.value); e.target.value = ""; }}
                maxLength={4}
              />
              {/* Add image */}
              <label className="w-12 h-12 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer text-zinc-400 hover:border-violet-400 hover:text-violet-500">
                <input
                  type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadTo("scratch-symbols", f, (url) => addOther(url));
                    e.target.value = "";
                  }}
                />
                <span className="text-base">🖼</span>
              </label>
            </div>
            <span className="text-xs text-zinc-400">
              Type an emoji and press Enter, or upload an image. Click × to remove.
            </span>
          </Field>
          <Field label="Instruction text">
            <input
              value={instructionText}
              onChange={(e) => patch({ instructionText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="Match {count}× {symbol} to win!"
            />
            <span className="text-xs text-zinc-400">
              Use <code>{"{count}"}</code> and <code>{"{symbol}"}</code> as placeholders. Leave blank to hide.
            </span>
          </Field>
          <div className="grid grid-cols-3 gap-2 items-end">
            <Field label="Text colour">
              <input
                type="color"
                value={instructionColor}
                onChange={(e) => patch({ instructionColor: e.target.value })}
                className="w-full h-9 rounded border bg-white"
              />
            </Field>
            <Field label={`Size · ${instructionFontSize}px`}>
              <input
                type="range" min={10} max={28} step={1}
                value={instructionFontSize}
                onChange={(e) => patch({ instructionFontSize: Number(e.target.value) })}
                className="w-full"
              />
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
          <p className="text-xs text-zinc-400">
            Player must reveal {winCount}× {winSymbol} to visually win. The actual prize is always determined by your campaign settings.
          </p>
        </div>
      </Section>

      {/* ── Panel cover ─────────────────────────────────────── */}
      <Section title="Panel cover">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCover(f);
                  e.target.value = "";
                }}
              />
              <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                {uploading ? "Uploading…" : coverImage ? "Replace cover image" : "Upload cover image"}
              </span>
            </label>
            {coverImage && (
              <button
                type="button"
                onClick={() => patch({ coverImage: null })}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="" className="w-full h-24 object-cover rounded-lg border" />
          ) : (
            <Field label='Text shown on each panel (e.g. "?" or "★")'>
              <input
                value={coverText}
                onChange={(e) => patch({ coverText: e.target.value })}
                className="w-28 rounded border px-2 py-1.5 text-lg text-center"
                maxLength={4}
                placeholder="?"
              />
            </Field>
          )}
          <p className="text-xs text-zinc-400">
            No image? Panel colour uses your brand colour automatically.
          </p>
        </div>
      </Section>

      {/* ── Gameplay ─────────────────────────────────────────── */}
      <Section title="Gameplay" defaultOpen>
        <div className="space-y-4">
          <Field label={`Panel size · ${boxSize}px`}>
            <input
              type="range" min={60} max={150} step={5}
              value={boxSize}
              onChange={(e) => patch({ boxSize: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Small</span><span>Large</span>
            </div>
          </Field>

          <Field label={`Reveal threshold · ${pctThreshold}%`}>
            <input
              type="range" min={20} max={90} step={5}
              value={pctThreshold}
              onChange={(e) => patch({ percentToReveal: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Easy reveal</span><span>Scratch more</span>
            </div>
          </Field>

          <Field label={`Brush size · ${brushRadius}px`}>
            <input
              type="range" min={10} max={60} step={2}
              value={brushRadius}
              onChange={(e) => patch({ brushRadius: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Fine</span><span>Wide</span>
            </div>
          </Field>
        </div>
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ── Symbol helpers & sub-components ──────────────────────────────────────────

function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

function toSymbolArray(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) return (raw as string[]).filter((s) => typeof s === "string" && s.trim());
  if (typeof raw === "string" && raw.trim())
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return fallback;
}

// Win-symbol editor: emoji input + image upload, swaps to a thumbnail when an image is set.
function SymbolEditor({
  value, uploading, onText, onUpload, onClearImage,
}: {
  value: string;
  uploading: boolean;
  onText: (v: string) => void;
  onUpload: (f: File) => void;
  onClearImage: () => void;
}) {
  if (isImg(value)) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 rounded-lg border bg-white overflow-hidden flex items-center justify-center"
          style={{ backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 8px 8px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-contain" />
        </div>
        <button type="button" onClick={onClearImage} className="text-xs text-red-400 hover:text-red-600">
          Remove
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => onText(e.target.value)}
        className="w-14 rounded border px-2 py-1.5 text-lg text-center"
        maxLength={4}
      />
      <label className="text-xs rounded border px-2 py-1.5 cursor-pointer hover:bg-zinc-100 text-zinc-600">
        {uploading ? "…" : "🖼 Image"}
        <input
          type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }}
        />
      </label>
    </div>
  );
}

// A single "other symbol" chip — image thumbnail or editable emoji.
function SymbolChip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (isImg(value)) {
    return (
      <div className="w-12 h-12 rounded-lg border bg-white overflow-hidden flex items-center justify-center"
        style={{ backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 8px 8px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-12 h-12 rounded-lg border text-lg text-center"
      maxLength={4}
    />
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
        <span
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 0.15s",
          }}
        >
          ▾
        </span>
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
