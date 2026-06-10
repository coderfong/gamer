"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function ReactionEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const minWait     = Math.max(0.3, Math.min(6, (config.minWait as number | undefined) ?? 1.2));
  const maxWait     = Math.max(minWait, Math.min(10, (config.maxWait as number | undefined) ?? 3.8));
  const waitColor   = (config.waitColor as string | undefined) ?? "#b91c1c";
  const goColor     = (config.goColor as string | undefined) ?? "#16a34a";
  const earlyColor  = (config.earlyColor as string | undefined) ?? "#7f1d1d";
  const goSymbol    = (config.goSymbol as string | undefined) ?? "";
  const panelHeight = Math.max(140, Math.min(320, (config.panelHeight as number | undefined) ?? 224));
  const instructionText       = (config.instructionText       as string | undefined) ?? "Tap the instant the panel turns green";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const readyText   = (config.readyText as string | undefined) ?? "Ready?";
  const waitText    = (config.waitText  as string | undefined) ?? "Wait for it…";
  const goText      = (config.goText    as string | undefined) ?? "TAP NOW!";
  const earlyText   = (config.earlyText as string | undefined) ?? "Too early! Try again";
  const startLabel  = (config.startLabel as string | undefined) ?? "START";
  const retryLabel  = (config.retryLabel as string | undefined) ?? "RETRY";
  const resultText  = (config.resultText as string | undefined) ?? "Nice reflexes!";

  async function uploadGo(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/reaction/${campaign.id ?? "draft"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      patch({ goSymbol: data.publicUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Timing ───────────────────────────────────────────── */}
      <Section title="Timing" defaultOpen>
        <div className="space-y-4">
          <Field label={`Minimum wait · ${minWait.toFixed(1)}s`}>
            <input type="range" min={0.3} max={6} step={0.1} value={minWait}
              onChange={(e) => patch({ minWait: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Maximum wait · ${maxWait.toFixed(1)}s`}>
            <input type="range" min={minWait} max={10} step={0.1} value={maxWait}
              onChange={(e) => patch({ maxWait: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">The “go” signal fires at a random point in this window.</span>
          </Field>
          <Field label={`Panel height · ${panelHeight}px`}>
            <input type="range" min={140} max={320} step={10} value={panelHeight}
              onChange={(e) => patch({ panelHeight: Number(e.target.value) })} className="w-full" />
          </Field>
        </div>
      </Section>

      {/* ── Colours & icon ──────────────────────────────────── */}
      <Section title="Colours & icon" defaultOpen>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Wait colour">
              <input type="color" value={waitColor} onChange={(e) => patch({ waitColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Go colour">
              <input type="color" value={goColor} onChange={(e) => patch({ goColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Too-early colour">
              <input type="color" value={earlyColor} onChange={(e) => patch({ earlyColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>
          <Field label="Go icon (optional emoji/image shown on the green panel)">
            <SymbolEditor value={goSymbol} uploading={uploading}
              onText={(v) => patch({ goSymbol: v })}
              onUpload={uploadGo}
              onClearImage={() => patch({ goSymbol: "" })} />
          </Field>
        </div>
      </Section>

      {/* ── Text & labels ───────────────────────────────────── */}
      <Section title="Text & labels">
        <div className="space-y-3">
          <Field label="Instruction text">
            <input value={instructionText} onChange={(e) => patch({ instructionText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm" placeholder="Tap the instant the panel turns green" />
            <span className="text-xs text-zinc-400">Leave blank to hide.</span>
          </Field>
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
            <Field label="“Ready” text"><input value={readyText} onChange={(e) => patch({ readyText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={24} /></Field>
            <Field label="“Wait” text"><input value={waitText} onChange={(e) => patch({ waitText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={24} /></Field>
            <Field label="“Go” text"><input value={goText} onChange={(e) => patch({ goText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={24} /></Field>
            <Field label="“Too early” text"><input value={earlyText} onChange={(e) => patch({ earlyText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={30} /></Field>
            <Field label="Start button"><input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
            <Field label="Retry button"><input value={retryLabel} onChange={(e) => patch({ retryLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
          </div>
          <Field label="Result message">
            <input value={resultText} onChange={(e) => patch({ resultText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm" />
            <span className="text-xs text-zinc-400">Use <code>{"{ms}"}</code> for the reaction time in milliseconds.</span>
          </Field>
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
