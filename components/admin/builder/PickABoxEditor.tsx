"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

const DEFAULT_DECOYS = ["🎁", "⭐", "💎", "🍫", "🎉", "🍩", "🎈", "🍀", "🧸"];

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function PickABoxEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const boxCount     = ([3, 6, 9].includes(config.boxCount as number) ? (config.boxCount as number) : 6);
  const decoys       = toSymbolArray(config.decoys, DEFAULT_DECOYS);
  const boxSize      = Math.max(80, Math.min(150, (config.boxSize as number | undefined) ?? 112));
  const wrapColorMode = (config.wrapColorMode as string | undefined) ?? "rainbow";
  const boxColor     = (config.boxColor     as string | undefined) ?? "#6d28d9";
  const ribbonColor  = (config.ribbonColor  as string | undefined) ?? "#ffffff";
  const showRibbon   = (config.showRibbon   as boolean | undefined) ?? true;
  const bowSymbol    = (config.bowSymbol    as string | undefined) ?? "🎀";
  const showBow      = (config.showBow      as boolean | undefined) ?? true;
  const boxImage     = (config.boxImage     as string | undefined) ?? null;
  const revealGlowColor = (config.revealGlowColor as string | undefined) ?? "#f59e0b";
  const idleAnimation     = (config.idleAnimation     as string | undefined) ?? "float";
  const flipSpeed         = Math.max(200, Math.min(1500, (config.flipSpeed as number | undefined) ?? 700));
  const revealAnimation   = (config.revealAnimation   as string | undefined) ?? "pop";
  const entranceAnimation = (config.entranceAnimation as string | undefined) ?? "none";
  const instructionText       = (config.instructionText       as string | undefined) ?? "Pick a gift to reveal your prize";
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

  function setDecoyAt(idx: number, value: string) {
    const next = [...decoys];
    next[idx] = value;
    patch({ decoys: next });
  }
  function removeDecoy(idx: number) {
    patch({ decoys: decoys.filter((_, i) => i !== idx) });
  }
  function addDecoy(value: string) {
    if (value.trim()) patch({ decoys: [...decoys, value] });
  }

  return (
    <div className="space-y-4">

      {/* ── Boxes ───────────────────────────────────────────── */}
      <Section title="Boxes" defaultOpen>
        <div className="space-y-3">
          <div className="space-y-2">
            <span className="text-xs text-zinc-500">Number of boxes</span>
            <div className="flex gap-2 flex-wrap">
              {[3, 6, 9].map((n) => {
                const active = boxCount === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patch({ boxCount: n })}
                    className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
                    style={{
                      background: active ? "#6D4AFF" : "white",
                      color: active ? "white" : "#52525b",
                      borderColor: active ? "#6D4AFF" : "#d4d4d8",
                    }}
                  >
                    {n} boxes
                  </button>
                );
              })}
            </div>
          </div>
          <Field label={`Box size · ${boxSize}px`}>
            <input
              type="range" min={80} max={150} step={4}
              value={boxSize}
              onChange={(e) => patch({ boxSize: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </div>
      </Section>

      {/* ── Box appearance ──────────────────────────────────── */}
      <Section title="Box appearance" defaultOpen>
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadTo("box-front", f, (url) => patch({ boxImage: url }));
                  e.target.value = "";
                }}
              />
              <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                {uploading ? "Uploading…" : boxImage ? "Replace box image" : "Upload box image"}
              </span>
            </label>
            {boxImage && (
              <button type="button" onClick={() => patch({ boxImage: null })} className="text-xs text-red-400 hover:text-red-600">
                Remove
              </button>
            )}
          </div>
          {boxImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={boxImage} alt="" className="w-24 h-24 object-cover rounded-lg border" />
          ) : (
            <div className="space-y-3">
              <Field label="Wrap colours">
                <div className="flex gap-2">
                  {[
                    { v: "rainbow", l: "Rainbow" },
                    { v: "solid", l: "Single colour" },
                  ].map((o) => {
                    const active = wrapColorMode === o.v;
                    return (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => patch({ wrapColorMode: o.v })}
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
                <Field label={wrapColorMode === "solid" ? "Box colour" : "Base hue"}>
                  <input type="color" value={boxColor}
                    onChange={(e) => patch({ boxColor: e.target.value })}
                    className="w-full h-9 rounded border bg-white" />
                </Field>
                <Field label="Ribbon colour">
                  <input type="color" value={ribbonColor}
                    onChange={(e) => patch({ ribbonColor: e.target.value })}
                    className="w-full h-9 rounded border bg-white" />
                </Field>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showRibbon}
                    onChange={(e) => patch({ showRibbon: e.target.checked })} />
                  <span className="text-sm text-zinc-700">Show ribbon</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showBow}
                    onChange={(e) => patch({ showBow: e.target.checked })} />
                  <span className="text-sm text-zinc-700">Show bow</span>
                </label>
              </div>
              {showBow && (
                <Field label="Bow (emoji or image)">
                  <SymbolEditor
                    value={bowSymbol}
                    uploading={uploading}
                    onText={(v) => patch({ bowSymbol: v || "🎀" })}
                    onUpload={(f) => uploadTo("box-front", f, (url) => patch({ bowSymbol: url }))}
                    onClearImage={() => patch({ bowSymbol: "🎀" })}
                  />
                </Field>
              )}
            </div>
          )}
          <Field label="Reveal glow colour">
            <input type="color" value={revealGlowColor}
              onChange={(e) => patch({ revealGlowColor: e.target.value })}
              className="w-full h-9 rounded border bg-white" />
          </Field>
        </div>
      </Section>

      {/* ── Box contents (symbols) ──────────────────────────── */}
      <Section title="Box contents" defaultOpen>
        <div className="space-y-2">
          <span className="text-xs text-zinc-500">Decoy contents — emoji or images</span>
          <div className="flex flex-wrap gap-2 items-center">
            {decoys.map((sym, i) => (
              <div key={i} className="relative">
                <SymbolChip value={sym} onChange={(v) => setDecoyAt(i, v)} />
                <button
                  type="button"
                  onClick={() => removeDecoy(i)}
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
                  addDecoy((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = "";
                  e.preventDefault();
                }
              }}
              onBlur={(e) => { addDecoy(e.target.value); e.target.value = ""; }}
              maxLength={4}
            />
            <label className="w-12 h-12 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer text-zinc-400 hover:border-violet-400 hover:text-violet-500">
              <input
                type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadTo("box-contents", f, (url) => addDecoy(url));
                  e.target.value = "";
                }}
              />
              <span className="text-base">🖼</span>
            </label>
          </div>
          <p className="text-xs text-zinc-400">
            Shown when boxes open. Type an emoji + Enter, or upload an image.
          </p>
        </div>
      </Section>

      {/* ── Animations ──────────────────────────────────────── */}
      <Section title="Animations" defaultOpen>
        <div className="space-y-4">
          <Field label="Idle motion (before picking)">
            <select
              value={idleAnimation}
              onChange={(e) => patch({ idleAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="float">Float</option>
              <option value="pulse">Pulse</option>
              <option value="bounce">Bounce</option>
              <option value="swing">Swing</option>
              <option value="wiggle">Wiggle</option>
            </select>
          </Field>

          <Field label={`Flip speed · ${flipSpeed}ms`}>
            <input
              type="range" min={200} max={1500} step={50}
              value={flipSpeed}
              onChange={(e) => patch({ flipSpeed: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Snappy</span><span>Slow</span>
            </div>
          </Field>

          <Field label="Reveal animation">
            <select
              value={revealAnimation}
              onChange={(e) => patch({ revealAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="pop">Pop</option>
              <option value="tada">Tada</option>
              <option value="wobble">Wobble</option>
              <option value="flash">Flash</option>
              <option value="bounce">Bounce</option>
            </select>
            <span className="text-xs text-zinc-400">Plays on the prize inside the picked box.</span>
          </Field>

          <Field label="Box entrance">
            <select
              value={entranceAnimation}
              onChange={(e) => patch({ entranceAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="fade">Fade in</option>
              <option value="pop">Pop in</option>
              <option value="zoom">Zoom in</option>
              <option value="drop">Drop in</option>
            </select>
            <span className="text-xs text-zinc-400">Boxes animate in (staggered) when the game loads.</span>
          </Field>
        </div>
      </Section>

      {/* ── Instruction ─────────────────────────────────────── */}
      <Section title="Instruction">
        <div className="space-y-3">
          <Field label="Instruction text">
            <input
              value={instructionText}
              onChange={(e) => patch({ instructionText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="Pick a gift to reveal your prize"
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
