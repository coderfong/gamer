"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function PlinkoEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const rows        = Math.max(4, Math.min(9, (config.rows as number | undefined) ?? 7));
  const dropSpeed   = Math.max(120, Math.min(700, (config.dropSpeed as number | undefined) ?? 320));
  const shooterSpeed = Math.max(40, Math.min(360, (config.shooterSpeed as number | undefined) ?? 170));
  const shooterSymbol = (config.shooterSymbol as string | undefined) ?? "";
  const pegColor    = (config.pegColor   as string | undefined) ?? "#c4b5fd";
  const boardColor  = (config.boardColor as string | undefined) ?? "#1a1320";
  const boardImage  = (config.boardImage as string | undefined) ?? null;
  const ballColor   = (config.ballColor  as string | undefined) ?? "#f59e0b";
  const ballImage   = (config.ballImage  as string | undefined) ?? null;
  const ballSize    = Math.max(14, Math.min(34, (config.ballSize as number | undefined) ?? 22));
  const slotColorMode = (config.slotColorMode as string | undefined) ?? "rainbow";
  const slotColor   = (config.slotColor  as string | undefined) ?? "#6d28d9";
  const slotLabels  = typeof config.slotLabels === "string"
    ? (config.slotLabels as string)
    : Array.isArray(config.slotLabels) ? (config.slotLabels as string[]).join(", ") : "";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const dropLabel   = (config.dropLabel as string | undefined) ?? "DROP";
  const resultText  = (config.resultText as string | undefined) ?? "Landed on {slot}!";

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

      {/* ── Board ────────────────────────────────────────────── */}
      <Section title="Board" defaultOpen>
        <div className="space-y-4">
          <Field label={`Peg rows · ${rows}  (→ ${rows + 1} slots)`}>
            <input type="range" min={4} max={9} step={1}
              value={rows}
              onChange={(e) => patch({ rows: Number(e.target.value) })}
              className="w-full" />
          </Field>
          <Field label={`Drop speed · ${dropSpeed}ms per row`}>
            <input type="range" min={120} max={700} step={10}
              value={dropSpeed}
              onChange={(e) => patch({ dropSpeed: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Fast</span><span>Slow</span>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peg colour">
              <input type="color" value={pegColor}
                onChange={(e) => patch({ pegColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Board colour">
              <input type="color" value={boardColor}
                onChange={(e) => patch({ boardColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-600">Board background image (optional)</span>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo("plinko", f, (url) => patch({ boardImage: url })); e.target.value = ""; }} />
                <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                  {uploading ? "Uploading…" : boardImage ? "Replace image" : "🖼 Upload image"}
                </span>
              </label>
              {boardImage && (
                <button type="button" onClick={() => patch({ boardImage: null })} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              )}
            </div>
            {boardImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={boardImage} alt="" className="w-full h-20 object-cover rounded-lg border" />
            )}
          </div>
        </div>
      </Section>

      {/* ── Launcher ─────────────────────────────────────────── */}
      <Section title="Launcher" defaultOpen>
        <div className="space-y-3">
          <Field label={`Sweep speed · ${shooterSpeed}px/s`}>
            <input type="range" min={40} max={360} step={10}
              value={shooterSpeed}
              onChange={(e) => patch({ shooterSpeed: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Slow (easy aim)</span><span>Fast (hard aim)</span>
            </div>
          </Field>
          <Field label="Launcher (leave blank for the default arrow, or use an emoji/image)">
            <SymbolEditor
              value={shooterSymbol}
              uploading={uploading}
              onText={(v) => patch({ shooterSymbol: v })}
              onUpload={(f) => uploadTo("plinko", f, (url) => patch({ shooterSymbol: url }))}
              onClearImage={() => patch({ shooterSymbol: "" })}
            />
          </Field>
        </div>
      </Section>

      {/* ── Ball ─────────────────────────────────────────────── */}
      <Section title="Ball" defaultOpen>
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo("plinko", f, (url) => patch({ ballImage: url })); e.target.value = ""; }} />
              <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                {uploading ? "Uploading…" : ballImage ? "Replace ball image" : "🖼 Upload ball image"}
              </span>
            </label>
            {ballImage && (
              <button type="button" onClick={() => patch({ ballImage: null })} className="text-xs text-red-400 hover:text-red-600">Remove</button>
            )}
          </div>
          {ballImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ballImage} alt="" className="w-14 h-14 object-contain rounded-full border" />
          ) : (
            <Field label="Ball colour">
              <input type="color" value={ballColor}
                onChange={(e) => patch({ ballColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          )}
          <Field label={`Ball size · ${ballSize}px`}>
            <input type="range" min={14} max={34} step={2}
              value={ballSize}
              onChange={(e) => patch({ ballSize: Number(e.target.value) })}
              className="w-full" />
          </Field>
        </div>
      </Section>

      {/* ── Slots ────────────────────────────────────────────── */}
      <Section title="Slots" defaultOpen>
        <div className="space-y-3">
          <Field label="Slot colours">
            <div className="flex gap-2">
              {[
                { v: "rainbow", l: "Rainbow" },
                { v: "solid", l: "Single colour" },
              ].map((o) => {
                const active = slotColorMode === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => patch({ slotColorMode: o.v })}
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
          <Field label={slotColorMode === "solid" ? "Slot colour" : "Base hue"}>
            <input type="color" value={slotColor}
              onChange={(e) => patch({ slotColor: e.target.value })}
              className="w-full h-9 rounded border bg-white" />
          </Field>
          <Field label="Slot labels (comma-separated, cycled across slots)">
            <input
              value={slotLabels}
              onChange={(e) => patch({ slotLabels: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="e.g. 10%, 20%, JACKPOT, 20%, 10%"
            />
            <span className="text-xs text-zinc-400">{rows + 1} slots. Leave blank to number them 1–{rows + 1}.</span>
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
            <Field label="Drop button">
              <input value={dropLabel} onChange={(e) => patch({ dropLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Result message">
              <input value={resultText} onChange={(e) => patch({ resultText: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" />
            </Field>
          </div>
          <span className="text-xs text-zinc-400">Use <code>{"{slot}"}</code> in the result message for the landed slot's label.</span>
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
        className="w-14 rounded border px-2 py-1.5 text-lg text-center" maxLength={4} placeholder="▼" />
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
