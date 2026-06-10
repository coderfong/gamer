"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

const DEFAULT_ICONS = ["🍒", "⭐", "💎", "🍀", "🔔", "🎁"];

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function MemoryEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const pairs        = Math.min(6, Math.max(3, (config.pairs as number | undefined) ?? 4));
  const icons        = toSymbolArray(config.icons, DEFAULT_ICONS);
  const cardSize     = Math.max(56, Math.min(110, (config.cardSize as number | undefined) ?? 80));
  const cardBackColor   = (config.cardBackColor      as string | undefined) ?? "#6d28d9";
  const cardBackSymbol  = (config.cardBackSymbol     as string | undefined) ?? "?";
  const cardBackSymCol  = (config.cardBackSymbolColor as string | undefined) ?? "#ffffff";
  const cardFrontColor  = (config.cardFrontColor     as string | undefined) ?? "#ffffff";
  const matchGlowColor  = (config.matchGlowColor     as string | undefined) ?? "#f59e0b";
  const showMoves    = (config.showMoves    as boolean | undefined) ?? true;
  const movesLabel   = (config.movesLabel   as string  | undefined) ?? "Moves";
  const flipSpeed      = Math.max(150, Math.min(1000, (config.flipSpeed as number | undefined) ?? 500));
  const matchAnimation = (config.matchAnimation as string | undefined) ?? "pop";
  const cardEntrance   = (config.cardEntrance   as string | undefined) ?? "none";
  const instructionText       = (config.instructionText       as string | undefined) ?? "Find all the matching pairs";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";

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

  function setIconAt(idx: number, value: string) {
    const next = [...icons];
    next[idx] = value;
    patch({ icons: next });
  }
  function removeIcon(idx: number) {
    patch({ icons: icons.filter((_, i) => i !== idx) });
  }
  function addIcon(value: string) {
    if (value.trim()) patch({ icons: [...icons, value] });
  }

  const enoughIcons = icons.length >= pairs;

  return (
    <div className="space-y-4">

      {/* ── Difficulty ──────────────────────────────────────── */}
      <Section title="Difficulty" defaultOpen>
        <div className="space-y-2">
          <span className="text-xs text-zinc-500">Number of pairs</span>
          <div className="flex gap-2 flex-wrap">
            {[3, 4, 5, 6].map((n) => {
              const active = pairs === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => patch({ pairs: n })}
                  className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
                  style={{
                    background: active ? "#6D4AFF" : "white",
                    color: active ? "white" : "#52525b",
                    borderColor: active ? "#6D4AFF" : "#d4d4d8",
                  }}
                >
                  {n} pairs
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-400">{pairs * 2} cards on the board.</p>
        </div>
      </Section>

      {/* ── Card faces (symbols) ────────────────────────────── */}
      <Section title="Card faces (symbols)" defaultOpen>
        <div className="space-y-2">
          <span className="text-xs text-zinc-500">Symbols — emoji or images</span>
          <div className="flex flex-wrap gap-2 items-center">
            {icons.map((sym, i) => (
              <div key={i} className="relative">
                <SymbolChip value={sym} onChange={(v) => setIconAt(i, v)} />
                <button
                  type="button"
                  onClick={() => removeIcon(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-500"
                >
                  ×
                </button>
              </div>
            ))}
            <input
              placeholder="＋😀"
              className="w-12 h-12 rounded-lg border text-lg text-center"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addIcon((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = "";
                  e.preventDefault();
                }
              }}
              onBlur={(e) => { addIcon(e.target.value); e.target.value = ""; }}
              maxLength={4}
            />
            <label className="w-12 h-12 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer text-zinc-400 hover:border-violet-400 hover:text-violet-500">
              <input
                type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadTo("memory-symbols", f, (url) => addIcon(url));
                  e.target.value = "";
                }}
              />
              <span className="text-base">🖼</span>
            </label>
          </div>
          {!enoughIcons ? (
            <p className="text-xs text-red-500">
              Add at least {pairs} symbols for {pairs} pairs (you have {icons.length}).
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              The first {pairs} symbols are used. Type an emoji + Enter, or upload an image.
            </p>
          )}
        </div>
      </Section>

      {/* ── Card styling ────────────────────────────────────── */}
      <Section title="Card styling" defaultOpen>
        <div className="space-y-4">
          <Field label={`Card size · ${cardSize}px`}>
            <input
              type="range" min={56} max={110} step={2}
              value={cardSize}
              onChange={(e) => patch({ cardSize: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Small</span><span>Large</span>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Card back colour">
              <input type="color" value={cardBackColor}
                onChange={(e) => patch({ cardBackColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Card front colour">
              <input type="color" value={cardFrontColor}
                onChange={(e) => patch({ cardFrontColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Back symbol colour">
              <input type="color" value={cardBackSymCol}
                onChange={(e) => patch({ cardBackSymbolColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Match glow colour">
              <input type="color" value={matchGlowColor}
                onChange={(e) => patch({ matchGlowColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>

          <Field label="Card back symbol (text or image)">
            <SymbolEditor
              value={cardBackSymbol}
              uploading={uploading}
              onText={(v) => patch({ cardBackSymbol: v || "?" })}
              onUpload={(f) => uploadTo("memory-symbols", f, (url) => patch({ cardBackSymbol: url }))}
              onClearImage={() => patch({ cardBackSymbol: "?" })}
            />
          </Field>
        </div>
      </Section>

      {/* ── Animations ──────────────────────────────────────── */}
      <Section title="Animations" defaultOpen>
        <div className="space-y-4">
          <Field label={`Flip speed · ${flipSpeed}ms`}>
            <input
              type="range" min={150} max={1000} step={50}
              value={flipSpeed}
              onChange={(e) => patch({ flipSpeed: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Snappy</span><span>Slow</span>
            </div>
          </Field>

          <Field label="Match celebration">
            <select
              value={matchAnimation}
              onChange={(e) => patch({ matchAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="pop">Pop</option>
              <option value="pulse">Pulse</option>
              <option value="flash">Flash</option>
              <option value="tada">Tada</option>
              <option value="wobble">Wobble</option>
            </select>
            <span className="text-xs text-zinc-400">Plays on a card when its pair is matched.</span>
          </Field>

          <Field label="Card entrance">
            <select
              value={cardEntrance}
              onChange={(e) => patch({ cardEntrance: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="fade">Fade in</option>
              <option value="pop">Pop in</option>
              <option value="zoom">Zoom in</option>
              <option value="drop">Drop in</option>
              <option value="flip">Flip in</option>
            </select>
            <span className="text-xs text-zinc-400">Cards animate in (staggered) when the board loads.</span>
          </Field>
        </div>
      </Section>

      {/* ── Instruction & counter ───────────────────────────── */}
      <Section title="Instruction & counter">
        <div className="space-y-3">
          <Field label="Instruction text">
            <input
              value={instructionText}
              onChange={(e) => patch({ instructionText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="Find all the matching pairs"
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

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMoves}
              onChange={(e) => patch({ showMoves: e.target.checked })}
            />
            <span className="text-sm text-zinc-700">Show moves counter</span>
          </label>
          {showMoves && (
            <Field label="Counter label">
              <input
                value={movesLabel}
                onChange={(e) => patch({ movesLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
                placeholder="Moves"
                maxLength={16}
              />
            </Field>
          )}
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
  if (Array.isArray(raw)) {
    const arr = (raw as string[]).filter((s) => typeof s === "string" && s.trim());
    if (arr.length) return arr;
  }
  if (typeof raw === "string" && raw.trim())
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return fallback;
}

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
