"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function PrecisionMeterEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const orientation = (config.orientation as string | undefined) ?? "horizontal";
  const rounds      = Math.max(1, Math.min(5, (config.rounds as number | undefined) ?? 3));
  const markerSpeed = Math.max(0.3, Math.min(3, (config.markerSpeed as number | undefined) ?? 0.9));
  const speedUp     = Math.max(1, Math.min(2, (config.speedUp as number | undefined) ?? 1.25));
  const zoneWidth   = Math.max(0.06, Math.min(0.5, (config.zoneWidth as number | undefined) ?? 0.22));
  const bullseyeWidth = Math.max(0, Math.min(zoneWidth, (config.bullseyeWidth as number | undefined) ?? 0.07));
  const randomZone  = (config.randomZone as boolean | undefined) ?? true;
  const iconSize    = Math.max(28, Math.min(96, (config.iconSize as number | undefined) ?? 56));
  const trackColor  = (config.trackColor as string | undefined) ?? "#8b7fb0";
  const zoneColor   = (config.zoneColor  as string | undefined) ?? "#6d28d9";
  const movingSymbol = (config.movingSymbol as string | undefined) ?? "⭐";
  const targetSymbol = (config.targetSymbol as string | undefined) ?? "⭕";
  const lockAnimation = (config.lockAnimation as string | undefined) ?? "pop";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const actionLabel = (config.actionLabel as string | undefined) ?? "STOP";
  const startLabel  = (config.startLabel  as string | undefined) ?? "START";
  const hitText     = (config.hitText     as string | undefined) ?? "Nice hit!";
  const perfectText = (config.perfectText as string | undefined) ?? "Perfect! 🎯";
  const missText    = (config.missText    as string | undefined) ?? "Missed!";
  const roundLabel  = (config.roundLabel  as string | undefined) ?? "Round";

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

      {/* ── Difficulty ──────────────────────────────────────── */}
      <Section title="Difficulty" defaultOpen>
        <div className="space-y-4">
          <Field label="Track orientation">
            <div className="flex gap-2">
              {[
                { v: "horizontal", l: "Horizontal ↔" },
                { v: "vertical", l: "Vertical ↕" },
              ].map((o) => {
                const active = orientation === o.v;
                return (
                  <button key={o.v} type="button" onClick={() => patch({ orientation: o.v })}
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                    style={{ background: active ? "#F0EBFF" : "white", color: active ? "#6D4AFF" : "#52525b", borderColor: active ? "#6D4AFF" : "#d4d4d8" }}>
                    {o.l}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={`Rounds · ${rounds}`}>
            <input type="range" min={1} max={5} step={1}
              value={rounds} onChange={(e) => patch({ rounds: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">Each round gets faster. Hits are counted across all rounds.</span>
          </Field>
          <Field label={`Marker speed · ${markerSpeed.toFixed(1)} sweeps/s`}>
            <input type="range" min={0.3} max={3} step={0.1}
              value={markerSpeed} onChange={(e) => patch({ markerSpeed: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5"><span>Slow</span><span>Fast</span></div>
          </Field>
          <Field label={`Speed-up per round · ×${speedUp.toFixed(2)}`}>
            <input type="range" min={1} max={2} step={0.05}
              value={speedUp} onChange={(e) => patch({ speedUp: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Fit tolerance · ${Math.round(zoneWidth * 100)}% of track`}>
            <input type="range" min={6} max={60} step={1}
              value={Math.round(zoneWidth * 100)} onChange={(e) => patch({ zoneWidth: Number(e.target.value) / 100 })} className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5"><span>Tiny (hard)</span><span>Wide (easy)</span></div>
          </Field>
          <Field label={`Perfect tolerance · ${Math.round(bullseyeWidth * 100)}% (0 = no bonus)`}>
            <input type="range" min={0} max={Math.round(zoneWidth * 100)} step={1}
              value={Math.round(bullseyeWidth * 100)} onChange={(e) => patch({ bullseyeWidth: Number(e.target.value) / 100 })} className="w-full" />
            <span className="text-xs text-zinc-400">Land this close to dead-center for a bonus point.</span>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={randomZone} onChange={(e) => patch({ randomZone: e.target.checked })} />
            <span className="text-sm text-zinc-700">Randomise target position each round</span>
          </label>
        </div>
      </Section>

      {/* ── Icons ───────────────────────────────────────────── */}
      <Section title="Icons" defaultOpen>
        <div className="space-y-3">
          <Field label="Moving icon (emoji or image — this is what oscillates)">
            <SymbolEditor value={movingSymbol} uploading={uploading}
              onText={(v) => patch({ movingSymbol: v || "⭐" })}
              onUpload={(f) => uploadTo("precision", f, (url) => patch({ movingSymbol: url }))}
              onClearImage={() => patch({ movingSymbol: "⭐" })} />
          </Field>
          <Field label="Target icon (emoji or image — drop the moving icon into this)">
            <SymbolEditor value={targetSymbol} uploading={uploading}
              onText={(v) => patch({ targetSymbol: v || "⭕" })}
              onUpload={(f) => uploadTo("precision", f, (url) => patch({ targetSymbol: url }))}
              onClearImage={() => patch({ targetSymbol: "⭕" })} />
          </Field>
          <Field label={`Icon size · ${iconSize}px`}>
            <input type="range" min={28} max={96} step={2}
              value={iconSize} onChange={(e) => patch({ iconSize: Number(e.target.value) })} className="w-full" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target-area colour">
              <input type="color" value={zoneColor} onChange={(e) => patch({ zoneColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Track colour">
              <input type="color" value={trackColor} onChange={(e) => patch({ trackColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
            </Field>
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
              <input type="range" min={10} max={28} step={1}
                value={instructionFontSize} onChange={(e) => patch({ instructionFontSize: Number(e.target.value) })} className="w-full" />
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
            <Field label="Round label"><input value={roundLabel} onChange={(e) => patch({ roundLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Hit message"><input value={hitText} onChange={(e) => patch({ hitText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={30} /></Field>
            <Field label="Perfect message"><input value={perfectText} onChange={(e) => patch({ perfectText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={30} /></Field>
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
