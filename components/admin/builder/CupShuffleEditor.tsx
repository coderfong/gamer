"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function CupShuffleEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const cupCount     = Math.max(3, Math.min(8, (config.cupCount as number | undefined) ?? 5));
  const shuffleCount = Math.max(3, Math.min(30, (config.shuffleCount as number | undefined) ?? 12));
  const shuffleSpeed = Math.max(120, Math.min(800, (config.shuffleSpeed as number | undefined) ?? 320));
  const cupSize      = Math.max(50, Math.min(140, (config.cupSize as number | undefined) ?? 96));
  const cupColor     = (config.cupColor as string | undefined) ?? "#6d28d9";
  const cupImage     = (config.cupImage as string | undefined) ?? null;
  const objectSymbol = (config.objectSymbol as string | undefined) ?? "⭐";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const startLabel   = (config.startLabel as string | undefined) ?? "START";
  const watchText    = (config.watchText  as string | undefined) ?? "Watch carefully…";
  const shuffleText  = (config.shuffleText as string | undefined) ?? "Keep your eye on it!";
  const pickText     = (config.pickText   as string | undefined) ?? "Which cup is it under?";
  const winText      = (config.winText    as string | undefined) ?? "You found it! 🎉";
  const loseText     = (config.loseText   as string | undefined) ?? "Not there — so close!";

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
          <div className="space-y-2">
            <span className="text-xs text-zinc-500">Number of cups</span>
            <div className="flex gap-2 flex-wrap">
              {[3, 4, 5, 6, 7, 8].map((n) => {
                const active = cupCount === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patch({ cupCount: n })}
                    className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
                    style={{
                      background: active ? "#6D4AFF" : "white",
                      color: active ? "white" : "#52525b",
                      borderColor: active ? "#6D4AFF" : "#d4d4d8",
                    }}
                  >
                    {n} cups
                  </button>
                );
              })}
            </div>
          </div>
          <Field label={`Shuffle moves · ${shuffleCount}`}>
            <input type="range" min={3} max={30} step={1}
              value={shuffleCount}
              onChange={(e) => patch({ shuffleCount: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Few (easy)</span><span>Many (hard)</span>
            </div>
          </Field>
          <Field label={`Shuffle speed · ${shuffleSpeed}ms per move`}>
            <input type="range" min={120} max={800} step={20}
              value={shuffleSpeed}
              onChange={(e) => patch({ shuffleSpeed: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Fast (hard)</span><span>Slow (easy)</span>
            </div>
          </Field>
        </div>
      </Section>

      {/* ── Hidden object ───────────────────────────────────── */}
      <Section title="Hidden object" defaultOpen>
        <Field label="Object under the cup (emoji or image)">
          <SymbolEditor
            value={objectSymbol}
            uploading={uploading}
            onText={(v) => patch({ objectSymbol: v || "⭐" })}
            onUpload={(f) => uploadTo("cup-shuffle", f, (url) => patch({ objectSymbol: url }))}
            onClearImage={() => patch({ objectSymbol: "⭐" })}
          />
        </Field>
      </Section>

      {/* ── Cup appearance ──────────────────────────────────── */}
      <Section title="Cup appearance" defaultOpen>
        <div className="space-y-3">
          <Field label={`Cup size · ${cupSize}px`}>
            <input type="range" min={60} max={140} step={4}
              value={cupSize}
              onChange={(e) => patch({ cupSize: Number(e.target.value) })}
              className="w-full" />
          </Field>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo("cup-shuffle", f, (url) => patch({ cupImage: url })); e.target.value = ""; }} />
              <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                {uploading ? "Uploading…" : cupImage ? "Replace cup image" : "🖼 Upload cup image"}
              </span>
            </label>
            {cupImage && (
              <button type="button" onClick={() => patch({ cupImage: null })} className="text-xs text-red-400 hover:text-red-600">Remove</button>
            )}
          </div>
          {cupImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cupImage} alt="" className="w-16 h-16 object-contain rounded-lg border" />
          ) : (
            <Field label="Cup colour">
              <input type="color" value={cupColor}
                onChange={(e) => patch({ cupColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          )}
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
          <Field label="Start button"><input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
          <Field label="“Watch” message"><input value={watchText} onChange={(e) => patch({ watchText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" /></Field>
          <Field label="“Shuffling” message"><input value={shuffleText} onChange={(e) => patch({ shuffleText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" /></Field>
          <Field label="“Pick” message"><input value={pickText} onChange={(e) => patch({ pickText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Win message"><input value={winText} onChange={(e) => patch({ winText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} /></Field>
            <Field label="Miss message"><input value={loseText} onChange={(e) => patch({ loseText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} /></Field>
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
      <input
        value={value}
        onChange={(e) => onText(e.target.value)}
        className="w-14 rounded border px-2 py-1.5 text-lg text-center"
        maxLength={4}
      />
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
