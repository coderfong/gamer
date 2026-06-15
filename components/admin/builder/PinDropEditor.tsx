"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function PinDropEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const spinSpeed   = Math.max(20, Math.min(360, (config.spinSpeed as number | undefined) ?? 90));
  const speedUp     = Math.max(1, Math.min(1.4, (config.speedUp as number | undefined) ?? 1.06));
  const spinClockwise = (config.spinClockwise as boolean | undefined) ?? true;
  const targetPins  = Math.max(3, Math.min(30, (config.targetPins as number | undefined) ?? 10));
  const startingPins = Math.max(0, Math.min(8, (config.startingPins as number | undefined) ?? 1));
  const tolerance   = Math.max(6, Math.min(40, (config.tolerance as number | undefined) ?? 15));
  const lives       = Math.max(1, Math.min(9, (config.lives as number | undefined) ?? 3));
  const coreSize    = Math.max(36, Math.min(100, (config.coreSize as number | undefined) ?? 72));
  const coreColor   = (config.coreColor as string | undefined) ?? "#6d28d9";
  const coreSymbol  = (config.coreSymbol as string | undefined) ?? "";
  const pinColor    = (config.pinColor as string | undefined) ?? "#c4b5fd";
  const pinThickness = Math.max(2, Math.min(8, (config.pinThickness as number | undefined) ?? 4));
  const pinHeadSize = Math.max(8, Math.min(80, (config.pinHeadSize as number | undefined) ?? 28));
  const pinHead     = (config.pinHead as string | undefined) ?? "";
  const bgColor     = (config.bgColor as string | undefined) ?? "#1a1320";
  const useBgColor  = (config.bgColor as string | undefined) != null;
  const lifeIcon    = (config.lifeIcon as string | undefined) ?? "❤️";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const shootLabel  = (config.shootLabel as string | undefined) ?? "SHOOT";
  const startLabel  = (config.startLabel as string | undefined) ?? "START";
  const winText     = (config.winText  as string | undefined) ?? "All pinned! 🎯";
  const loseText    = (config.loseText as string | undefined) ?? "Crash! Out of lives.";

  async function uploadTo(folder: string, file: File, onDone: (url: string) => void) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/${folder}/${campaign.id ?? "draft"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
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

      {/* ── Difficulty ──────────────────────────────────────── */}
      <Section title="Difficulty" defaultOpen>
        <div className="space-y-4">
          <Field label={`Spin speed · ${spinSpeed}°/s`}>
            <input type="range" min={20} max={360} step={10} value={spinSpeed}
              onChange={(e) => patch({ spinSpeed: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5"><span>Slow (easy)</span><span>Fast (hard)</span></div>
          </Field>
          <Field label={`Speed-up per pin · ×${speedUp.toFixed(2)}`}>
            <input type="range" min={1} max={1.4} step={0.01} value={speedUp}
              onChange={(e) => patch({ speedUp: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Pins to win · ${targetPins}`}>
            <input type="range" min={3} max={30} step={1} value={targetPins}
              onChange={(e) => patch({ targetPins: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Pins already in the core · ${startingPins}`}>
            <input type="range" min={0} max={8} step={1} value={startingPins}
              onChange={(e) => patch({ startingPins: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">Pre-placed obstacles to dodge.</span>
          </Field>
          <Field label={`Overlap tolerance · ±${tolerance}°`}>
            <input type="range" min={6} max={40} step={1} value={tolerance}
              onChange={(e) => patch({ tolerance: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5"><span>Tight (hard)</span><span>Loose (easy)</span></div>
          </Field>
          <Field label={`Lives · ${lives}`}>
            <input type="range" min={1} max={9} step={1} value={lives}
              onChange={(e) => patch({ lives: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">A pin that overlaps another costs a life.</span>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={spinClockwise} onChange={(e) => patch({ spinClockwise: e.target.checked })} />
            <span className="text-sm text-zinc-700">Spin clockwise</span>
          </label>
        </div>
      </Section>

      {/* ── Core ─────────────────────────────────────────────── */}
      <Section title="Core" defaultOpen>
        <div className="space-y-3">
          <Field label={`Core size · ${coreSize}px`}>
            <input type="range" min={36} max={100} step={2} value={coreSize}
              onChange={(e) => patch({ coreSize: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label="Core colour">
            <input type="color" value={coreColor} onChange={(e) => patch({ coreColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
          </Field>
          <Field label="Core symbol (optional emoji/image in the center)">
            <SymbolEditor value={coreSymbol} uploading={uploading}
              onText={(v) => patch({ coreSymbol: v })}
              onUpload={(f) => uploadTo("pindrop", f, (url) => patch({ coreSymbol: url }))}
              onClearImage={() => patch({ coreSymbol: "" })} />
          </Field>
        </div>
      </Section>

      {/* ── Pins ─────────────────────────────────────────────── */}
      <Section title="Pins" defaultOpen>
        <div className="space-y-3">
          <Field label="Pin colour">
            <input type="color" value={pinColor} onChange={(e) => patch({ pinColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
          </Field>
          <Field label={`Pin thickness · ${pinThickness}px`}>
            <input type="range" min={2} max={8} step={1} value={pinThickness}
              onChange={(e) => patch({ pinThickness: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Pin head size · ${pinHeadSize}px`}>
            <input type="range" min={8} max={80} step={2} value={pinHeadSize}
              onChange={(e) => patch({ pinHeadSize: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label="Pin head (optional emoji/image at the tip)">
            <SymbolEditor value={pinHead} uploading={uploading}
              onText={(v) => patch({ pinHead: v })}
              onUpload={(f) => uploadTo("pindrop", f, (url) => patch({ pinHead: url }))}
              onClearImage={() => patch({ pinHead: "" })} />
          </Field>
        </div>
      </Section>

      {/* ── Appearance ──────────────────────────────────────── */}
      <Section title="Appearance">
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useBgColor} onChange={(e) => patch({ bgColor: e.target.checked ? bgColor : null })} />
            <span className="text-sm text-zinc-700">Custom background colour</span>
          </label>
          {useBgColor && (
            <input type="color" value={bgColor} onChange={(e) => patch({ bgColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
          )}
          <Field label="Life icon">
            <input value={lifeIcon} onChange={(e) => patch({ lifeIcon: e.target.value })}
              className="w-16 rounded border px-2 py-1.5 text-lg text-center" maxLength={4} />
          </Field>
        </div>
      </Section>

      {/* ── Text & labels ───────────────────────────────────── */}
      <Section title="Text & labels">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-end">
            <Field label="Text colour">
              <input type="color" value={instructionColor} onChange={(e) => patch({ instructionColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label={`Size · ${instructionFontSize}px`}>
              <input type="range" min={10} max={28} step={1} value={instructionFontSize}
                onChange={(e) => patch({ instructionFontSize: Number(e.target.value) })} className="w-full" />
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
            <Field label="Shoot button"><input value={shootLabel} onChange={(e) => patch({ shootLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
            <Field label="Start button"><input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
            <Field label="Win message"><input value={winText} onChange={(e) => patch({ winText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} /></Field>
            <Field label="Lose message"><input value={loseText} onChange={(e) => patch({ loseText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} /></Field>
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

function SymbolEditor({
  value, uploading, onText, onUpload, onClearImage,
}: {
  value: string; uploading: boolean; onText: (v: string) => void; onUpload: (f: File) => void; onClearImage: () => void;
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

function Section({
  title, children, defaultOpen = false,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left"
        style={{ background: "var(--ad-surface2, #f4f4f6)" }} onClick={() => setOpen((o) => !o)}>
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
