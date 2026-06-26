"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function TapTargetEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const gameSeconds  = Math.max(5, Math.min(60, (config.gameSeconds as number | undefined) ?? 12));
  const winScore     = Math.max(1, (config.winScore as number | undefined) ?? 10);
  const arenaSize    = Math.max(220, Math.min(340, (config.arenaSize as number | undefined) ?? 280));
  const targetSize   = Math.max(36, Math.min(96, (config.targetSize as number | undefined) ?? 56));
  const targetImage  = (config.targetImage as string | undefined) ?? null;
  const targetColor  = (config.targetColor as string | undefined) ?? "#6d28d9";
  const arenaColor   = (config.arenaColor  as string | undefined) ?? "#1a1320";
  const useArenaColor = (config.arenaColor as string | undefined) != null;
  const moveSpeed    = Math.max(0, Math.min(300, (config.moveSpeed as number | undefined) ?? 80));
  const shrinkOnHit  = (config.shrinkOnHit as boolean | undefined) ?? false;
  const idleEmoji    = (config.idleEmoji   as string | undefined) ?? "🎯";
  const hitAnimation = (config.hitAnimation as string | undefined) ?? "pop";
  const instructionText       = (config.instructionText       as string | undefined) ?? "Tap the bullseye as many times as you can in {seconds}s!";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const hitsLabel    = (config.hitsLabel  as string | undefined) ?? "Hits";
  const timeLabel    = (config.timeLabel  as string | undefined) ?? "Time";
  const startLabel   = (config.startLabel as string | undefined) ?? "START";

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

      {/* ── Gameplay ─────────────────────────────────────────── */}
      <Section title="Gameplay" defaultOpen>
        <div className="space-y-4">
          <Field label={`Game length · ${gameSeconds}s`}>
            <input
              type="range" min={5} max={60} step={1}
              value={gameSeconds}
              onChange={(e) => patch({ gameSeconds: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label={`Win at · ${winScore} hits`}>
            <input
              type="range" min={1} max={40} step={1}
              value={winScore}
              onChange={(e) => patch({ winScore: Number(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-zinc-400">Players win when they hit the target at least this many times.</span>
          </Field>
          <Field label={`Arena size · ${arenaSize}px`}>
            <input
              type="range" min={220} max={340} step={10}
              value={arenaSize}
              onChange={(e) => patch({ arenaSize: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label={`Target size · ${targetSize}px`}>
            <input
              type="range" min={36} max={96} step={2}
              value={targetSize}
              onChange={(e) => patch({ targetSize: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label={`Move speed · ${moveSpeed}ms glide`}>
            <input
              type="range" min={0} max={300} step={10}
              value={moveSpeed}
              onChange={(e) => patch({ moveSpeed: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Instant teleport</span><span>Slow glide</span>
            </div>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={shrinkOnHit}
              onChange={(e) => patch({ shrinkOnHit: e.target.checked })} />
            <span className="text-sm text-zinc-700">Shrink target as score climbs (harder)</span>
          </label>
        </div>
      </Section>

      {/* ── Target appearance ───────────────────────────────── */}
      <Section title="Target appearance" defaultOpen>
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadTo("tap-target", f, (url) => patch({ targetImage: url }));
                  e.target.value = "";
                }}
              />
              <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                {uploading ? "Uploading…" : targetImage ? "Replace target image" : "Upload target image"}
              </span>
            </label>
            {targetImage && (
              <button type="button" onClick={() => patch({ targetImage: null })} className="text-xs text-red-400 hover:text-red-600">
                Remove
              </button>
            )}
          </div>
          {targetImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={targetImage} alt="" className="w-16 h-16 object-contain rounded-lg border" />
          ) : (
            <Field label="Target colour (bullseye rings)">
              <input type="color" value={targetColor}
                onChange={(e) => patch({ targetColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          )}

          <Field label="Idle symbol (shown before start — emoji or image)">
            <SymbolEditor
              value={idleEmoji}
              uploading={uploading}
              onText={(v) => patch({ idleEmoji: v || "🎯" })}
              onUpload={(f) => uploadTo("tap-target", f, (url) => patch({ idleEmoji: url }))}
              onClearImage={() => patch({ idleEmoji: "🎯" })}
            />
          </Field>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useArenaColor}
                onChange={(e) => patch({ arenaColor: e.target.checked ? arenaColor : null })} />
              <span className="text-sm text-zinc-700">Custom arena background colour</span>
            </label>
            {useArenaColor && (
              <input type="color" value={arenaColor}
                onChange={(e) => patch({ arenaColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            )}
          </div>
        </div>
      </Section>

      {/* ── Animations ──────────────────────────────────────── */}
      <Section title="Animations" defaultOpen>
        <div className="space-y-4">
          <Field label="Hit animation">
            <select
              value={hitAnimation}
              onChange={(e) => patch({ hitAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="pop">Pop</option>
              <option value="tada">Tada</option>
              <option value="wobble">Wobble</option>
              <option value="flash">Flash</option>
              <option value="spin">Spin</option>
            </select>
            <span className="text-xs text-zinc-400">Plays on the target each time it's tapped.</span>
          </Field>
        </div>
      </Section>

      {/* ── Text & labels ───────────────────────────────────── */}
      <Section title="Text & labels">
        <div className="space-y-3">
          <Field label="Instruction text">
            <input
              value={instructionText}
              onChange={(e) => patch({ instructionText: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="Tap the bullseye as many times as you can in {seconds}s!"
            />
            <span className="text-xs text-zinc-400">
              Use <code>{"{seconds}"}</code> for the timer length. Leave blank to hide.
            </span>
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
          <div className="grid grid-cols-3 gap-2">
            <Field label="Hits label">
              <input value={hitsLabel} onChange={(e) => patch({ hitsLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Time label">
              <input value={timeLabel} onChange={(e) => patch({ timeLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Start button">
              <input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
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
