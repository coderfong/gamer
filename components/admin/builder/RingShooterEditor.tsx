"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

const DEFAULT_TARGETS = ["🎯", "🎈", "⭐", "🍎", "👾", "🔵"];

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function RingShooterEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const targetCount = Math.max(3, Math.min(12, (config.targetCount as number | undefined) ?? 6));
  const baseSpeed   = Math.max(20, Math.min(300, (config.baseSpeed as number | undefined) ?? 110));
  const speedUp     = Math.max(1, Math.min(2.5, (config.speedUp as number | undefined) ?? 1.45));
  const bullets     = Math.max(1, Math.min(40, (config.bullets as number | undefined) ?? targetCount + 2));
  const spinClockwise = (config.spinClockwise as boolean | undefined) ?? true;
  const targets     = toSymbolArray(config.targetSymbols, DEFAULT_TARGETS);
  const targetSize  = Math.max(28, Math.min(80, (config.targetSize as number | undefined) ?? 56));
  const ringRadius  = Math.max(70, Math.min(130, (config.ringRadius as number | undefined) ?? 100));
  const ringColor   = (config.ringColor as string | undefined) ?? "#6d28d9";
  const hitTolerance = Math.max(4, Math.min(45, (config.hitTolerance as number | undefined) ?? 11));
  const crosshairColor  = (config.crosshairColor  as string | undefined) ?? "#ef4444";
  const crosshairSymbol = (config.crosshairSymbol as string | undefined) ?? "";
  const crosshairScale  = Math.max(0.6, Math.min(3, (config.crosshairScale as number | undefined) ?? 1.7));
  const shootLabel  = (config.shootLabel as string | undefined) ?? "SHOOT";
  const timeLimit   = Math.max(0, Math.min(60, (config.timeLimit as number | undefined) ?? 0));
  const hitAnimation = (config.hitAnimation as string | undefined) ?? "pop";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const startLabel  = (config.startLabel as string | undefined) ?? "START";
  const scoreLabel  = (config.scoreLabel as string | undefined) ?? "Hits";
  const bulletsLabel = (config.bulletsLabel as string | undefined) ?? "Ammo";
  const winText     = (config.winText  as string | undefined) ?? "Cleared! 🎯";
  const loseText    = (config.loseText as string | undefined) ?? "Out of shots!";

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

  function setTargetAt(idx: number, value: string) {
    patch({ targetSymbols: targets.map((t, i) => (i === idx ? value : t)) });
  }
  function removeTarget(idx: number) {
    const next = targets.filter((_, i) => i !== idx);
    patch({ targetSymbols: next.length ? next : DEFAULT_TARGETS });
  }
  function addTarget(value: string) {
    if (value.trim()) patch({ targetSymbols: [...targets, value] });
  }

  return (
    <div className="space-y-4">

      {/* ── Difficulty ──────────────────────────────────────── */}
      <Section title="Difficulty" defaultOpen>
        <div className="space-y-4">
          <Field label={`Number of targets · ${targetCount}`}>
            <input type="range" min={3} max={12} step={1}
              value={targetCount}
              onChange={(e) => patch({ targetCount: Number(e.target.value) })}
              className="w-full" />
          </Field>
          <Field label={`Start speed · ${baseSpeed}°/s`}>
            <input type="range" min={20} max={240} step={5}
              value={baseSpeed}
              onChange={(e) => patch({ baseSpeed: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Slow (easy)</span><span>Fast (hard)</span>
            </div>
          </Field>
          <Field label={`Speed-up per hit · ×${speedUp.toFixed(2)}`}>
            <input type="range" min={1} max={2.5} step={0.05}
              value={speedUp}
              onChange={(e) => patch({ speedUp: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>No change</span><span>Much faster</span>
            </div>
          </Field>
          <Field label={`Aim window · ±${hitTolerance}°`}>
            <input type="range" min={4} max={45} step={1}
              value={hitTolerance}
              onChange={(e) => patch({ hitTolerance: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Precise (hard)</span><span>Forgiving (easy)</span>
            </div>
          </Field>
          <Field label={`Bullets · ${bullets}`}>
            <input type="range" min={1} max={40} step={1}
              value={bullets}
              onChange={(e) => patch({ bullets: Number(e.target.value) })}
              className="w-full" />
            <span className="text-xs text-zinc-400">
              Total shots. Run out before clearing the ring and it's game over. ({targetCount} needed to win — give a little margin.)
            </span>
          </Field>
          <Field label={`Time limit · ${timeLimit === 0 ? "none" : timeLimit + "s"}`}>
            <input type="range" min={0} max={60} step={1}
              value={timeLimit}
              onChange={(e) => patch({ timeLimit: Number(e.target.value) })}
              className="w-full" />
            <span className="text-xs text-zinc-400">0 = clear at your own pace (no timer).</span>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={spinClockwise}
              onChange={(e) => patch({ spinClockwise: e.target.checked })} />
            <span className="text-sm text-zinc-700">Spin clockwise</span>
          </label>
        </div>
      </Section>

      {/* ── Targets ─────────────────────────────────────────── */}
      <Section title="Targets" defaultOpen>
        <div className="space-y-3">
          <div className="space-y-2">
            <span className="text-xs text-zinc-500">Target symbols — emoji or images (cycled around the ring)</span>
            <div className="flex flex-wrap gap-2 items-center">
              {targets.map((sym, i) => (
                <div key={i} className="relative">
                  <SymbolChip value={sym} onChange={(v) => setTargetAt(i, v)} />
                  <button type="button" onClick={() => removeTarget(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-500">×</button>
                </div>
              ))}
              <input
                placeholder="＋😀"
                className="w-12 h-12 rounded-lg border text-lg text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { addTarget((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; e.preventDefault(); }
                }}
                onBlur={(e) => { addTarget(e.target.value); e.target.value = ""; }}
                maxLength={4}
              />
              <label className="w-12 h-12 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer text-zinc-400 hover:border-violet-400 hover:text-violet-500">
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo("ring-shooter", f, (url) => addTarget(url)); e.target.value = ""; }} />
                <span className="text-base">🖼</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Target size · ${targetSize}px`}>
              <input type="range" min={28} max={80} step={2}
                value={targetSize}
                onChange={(e) => patch({ targetSize: Number(e.target.value) })}
                className="w-full" />
            </Field>
            <Field label={`Ring radius · ${ringRadius}px`}>
              <input type="range" min={70} max={130} step={5}
                value={ringRadius}
                onChange={(e) => patch({ ringRadius: Number(e.target.value) })}
                className="w-full" />
            </Field>
          </div>
          <Field label="Target colour">
            <input type="color" value={ringColor}
              onChange={(e) => patch({ ringColor: e.target.value })}
              className="w-full h-9 rounded border bg-white" />
          </Field>
        </div>
      </Section>

      {/* ── Crosshair & animation ───────────────────────────── */}
      <Section title="Crosshair & animation" defaultOpen>
        <div className="space-y-3">
          <Field label="Crosshair (leave blank for the default reticle, or use an emoji/image)">
            <SymbolEditor
              value={crosshairSymbol}
              uploading={uploading}
              onText={(v) => patch({ crosshairSymbol: v })}
              onUpload={(f) => uploadTo("ring-shooter", f, (url) => patch({ crosshairSymbol: url }))}
              onClearImage={() => patch({ crosshairSymbol: "" })}
            />
          </Field>
          {!crosshairSymbol && (
            <Field label="Crosshair colour">
              <input type="color" value={crosshairColor}
                onChange={(e) => patch({ crosshairColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          )}
          <Field label={`Crosshair size · ×${crosshairScale.toFixed(2)}`}>
            <input type="range" min={0.6} max={3} step={0.1}
              value={crosshairScale}
              onChange={(e) => patch({ crosshairScale: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Small</span><span>Large</span>
            </div>
          </Field>
          <Field label="Hit animation">
            <select value={hitAnimation} onChange={(e) => patch({ hitAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white">
              <option value="pop">Pop</option>
              <option value="flash">Flash</option>
              <option value="spin">Spin</option>
              <option value="tada">Tada</option>
            </select>
            <span className="text-xs text-zinc-400">Plays on a target when it's shot.</span>
          </Field>
        </div>
      </Section>

      {/* ── Text & labels ───────────────────────────────────── */}
      <Section title="Text & labels">
        <div className="space-y-3">
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
              <select value={instructionFontFamily} onChange={(e) => patch({ instructionFontFamily: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm bg-white">
                <option value="">Default</option>
                {FONT_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Score label">
              <input value={scoreLabel} onChange={(e) => patch({ scoreLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Ammo label">
              <input value={bulletsLabel} onChange={(e) => patch({ bulletsLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Start button">
              <input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Shoot button">
              <input value={shootLabel} onChange={(e) => patch({ shootLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Win message">
              <input value={winText} onChange={(e) => patch({ winText: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} />
            </Field>
            <Field label="Game-over message">
              <input value={loseText} onChange={(e) => patch({ loseText: e.target.value })}
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
        <button type="button" onClick={onClearImage} className="text-xs text-red-400 hover:text-red-600">Remove</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input value={value} onChange={(e) => onText(e.target.value)}
        className="w-14 rounded border px-2 py-1.5 text-lg text-center" maxLength={4} />
      <label className="text-xs rounded border px-2 py-1.5 cursor-pointer hover:bg-zinc-100 text-zinc-600">
        {uploading ? "…" : "🖼 Image"}
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
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
    <input value={value} onChange={(e) => onChange(e.target.value)}
      className="w-12 h-12 rounded-lg border text-lg text-center" maxLength={4} />
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
