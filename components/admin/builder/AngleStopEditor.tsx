"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function AngleStopEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const rounds      = Math.max(1, Math.min(5, (config.rounds as number | undefined) ?? 3));
  const winHits     = Math.max(1, Math.min(rounds, (config.winHits as number | undefined) ?? rounds));
  const sweepSpeed  = Math.max(0.2, Math.min(2.5, (config.sweepSpeed as number | undefined) ?? 0.55));
  const tolerance   = Math.max(3, Math.min(45, (config.tolerance as number | undefined) ?? 12));
  const perfectTolerance = Math.max(0, Math.min(tolerance, (config.perfectTolerance as number | undefined) ?? 5));
  const randomTarget = (config.randomTarget as boolean | undefined) ?? true;
  const targetAngle = Math.max(1, Math.min(359, (config.targetAngle as number | undefined) ?? 180));
  const showAngleNumber = (config.showAngleNumber as boolean | undefined) ?? true;
  const showGhost   = (config.showGhost as boolean | undefined) ?? true;
  const showTargetTick = (config.showTargetTick as boolean | undefined) ?? true;
  const iconSize    = Math.max(90, Math.min(160, (config.iconSize as number | undefined) ?? 130));
  const mainSymbol  = (config.mainSymbol as string | undefined) ?? "🧩";
  const ringColor   = (config.ringColor as string | undefined) ?? "#6d28d9";
  const tickColor   = (config.tickColor as string | undefined) ?? "#f59e0b";
  const lockAnimation = (config.lockAnimation as string | undefined) ?? "pop";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const actionLabel = (config.actionLabel as string | undefined) ?? "STOP";
  const startLabel  = (config.startLabel  as string | undefined) ?? "START";
  const targetLabel = (config.targetLabel as string | undefined) ?? "Target";
  const hitText     = (config.hitText     as string | undefined) ?? "On target!";
  const perfectText = (config.perfectText as string | undefined) ?? "Bullseye! 🎯";
  const missText    = (config.missText    as string | undefined) ?? "Missed!";

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
          <Field label={`Rounds · ${rounds}`}>
            <input type="range" min={1} max={5} step={1} value={rounds}
              onChange={(e) => patch({ rounds: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">Each round gets faster. Hits counted across all rounds.</span>
          </Field>
          <Field label={`Win at · ${winHits} of ${rounds} rounds on target`}>
            <input type="range" min={1} max={rounds} step={1} value={winHits}
              onChange={(e) => patch({ winHits: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">Players win when they hit at least this many rounds.</span>
          </Field>
          <Field label={`Oscillation speed · ${sweepSpeed.toFixed(2)} sweeps/s (same every round)`}>
            <input type="range" min={0.2} max={2.5} step={0.05} value={sweepSpeed}
              onChange={(e) => patch({ sweepSpeed: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5"><span>Slow</span><span>Fast</span></div>
          </Field>
          <Field label={`Success threshold · ±${tolerance}°`}>
            <input type="range" min={3} max={45} step={1} value={tolerance}
              onChange={(e) => patch({ tolerance: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">Stopping within this many degrees of the target counts as a hit.</span>
          </Field>
          <Field label={`Bullseye tolerance · ±${perfectTolerance}° (0 = no bonus)`}>
            <input type="range" min={0} max={tolerance} step={1} value={perfectTolerance}
              onChange={(e) => patch({ perfectTolerance: Number(e.target.value) })} className="w-full" />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={randomTarget} onChange={(e) => patch({ randomTarget: e.target.checked })} />
            <span className="text-sm text-zinc-700">Random target angle each round</span>
          </label>
          {!randomTarget && (
            <Field label={`Fixed target angle · ${targetAngle}°`}>
              <input type="range" min={0} max={359} step={1} value={targetAngle}
                onChange={(e) => patch({ targetAngle: Number(e.target.value) })} className="w-full" />
            </Field>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showAngleNumber} onChange={(e) => patch({ showAngleNumber: e.target.checked })} />
            <span className="text-sm text-zinc-700">Show the target angle number</span>
          </label>
        </div>
      </Section>

      {/* ── Icon ─────────────────────────────────────────────── */}
      <Section title="Icon" defaultOpen>
        <div className="space-y-3">
          <Field label="Revealed icon (emoji or image — shown as a pie from 0–360°)">
            <SymbolEditor value={mainSymbol} uploading={uploading}
              onText={(v) => patch({ mainSymbol: v || "🧩" })}
              onUpload={(f) => uploadTo("anglestop", f, (url) => patch({ mainSymbol: url }))}
              onClearImage={() => patch({ mainSymbol: "🧩" })} />
          </Field>
          <Field label={`Icon size · ${iconSize}px`}>
            <input type="range" min={90} max={160} step={2} value={iconSize}
              onChange={(e) => patch({ iconSize: Number(e.target.value) })} className="w-full" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ring colour">
              <input type="color" value={ringColor} onChange={(e) => patch({ ringColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Target-tick colour">
              <input type="color" value={tickColor} onChange={(e) => patch({ tickColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showGhost} onChange={(e) => patch({ showGhost: e.target.checked })} />
              <span className="text-sm text-zinc-700">Show faint full icon behind (outline guide)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showTargetTick} onChange={(e) => patch({ showTargetTick: e.target.checked })} />
              <span className="text-sm text-zinc-700">Show target tick on the edge</span>
            </label>
          </div>
          <Field label="Lock-in animation">
            <select value={lockAnimation} onChange={(e) => patch({ lockAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white">
              <option value="none">None</option>
              <option value="pop">Pop</option>
              <option value="flash">Flash</option>
              <option value="tada">Tada</option>
              <option value="pulse">Pulse</option>
            </select>
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
          <div className="grid grid-cols-3 gap-2">
            <Field label="Action button"><input value={actionLabel} onChange={(e) => patch({ actionLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
            <Field label="Start button"><input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
            <Field label="Target label"><input value={targetLabel} onChange={(e) => patch({ targetLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Hit message"><input value={hitText} onChange={(e) => patch({ hitText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={30} /></Field>
            <Field label="Bullseye message"><input value={perfectText} onChange={(e) => patch({ perfectText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={30} /></Field>
            <Field label="Miss message"><input value={missText} onChange={(e) => patch({ missText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={30} /></Field>
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
