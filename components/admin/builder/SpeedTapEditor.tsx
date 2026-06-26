"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function SpeedTapEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const gameSeconds  = Math.max(2, Math.min(30, (config.gameSeconds as number | undefined) ?? 5));
  const winScore     = Math.max(1, (config.winScore as number | undefined) ?? 20);
  const buttonSize   = Math.max(120, Math.min(260, (config.buttonSize as number | undefined) ?? 192));
  const buttonColor  = (config.buttonColor as string | undefined) ?? "#6d28d9";
  const buttonImage  = (config.buttonImage as string | undefined) ?? null;
  const buttonText   = (config.buttonText  as string | undefined) ?? "TAP!";
  const buttonTextColor = (config.buttonTextColor as string | undefined) ?? "#ffffff";
  const tapAnimation = (config.tapAnimation as string | undefined) ?? "bump";
  const instructionText       = (config.instructionText       as string | undefined) ?? "Tap the button as fast as you can for {seconds} seconds!";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const tapsLabel    = (config.tapsLabel  as string | undefined) ?? "Taps";
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
              type="range" min={2} max={30} step={1}
              value={gameSeconds}
              onChange={(e) => patch({ gameSeconds: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label={`Win at · ${winScore} taps`}>
            <input
              type="range" min={1} max={80} step={1}
              value={winScore}
              onChange={(e) => patch({ winScore: Number(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-zinc-400">Players win when they reach at least this many taps.</span>
          </Field>
          <Field label={`Button size · ${buttonSize}px`}>
            <input
              type="range" min={120} max={260} step={4}
              value={buttonSize}
              onChange={(e) => patch({ buttonSize: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </div>
      </Section>

      {/* ── Button appearance ───────────────────────────────── */}
      <Section title="Button appearance" defaultOpen>
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadTo("speed-tap", f, (url) => patch({ buttonImage: url }));
                  e.target.value = "";
                }}
              />
              <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                {uploading ? "Uploading…" : buttonImage ? "Replace button image" : "Upload button image"}
              </span>
            </label>
            {buttonImage && (
              <button type="button" onClick={() => patch({ buttonImage: null })} className="text-xs text-red-400 hover:text-red-600">
                Remove
              </button>
            )}
          </div>
          {buttonImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={buttonImage} alt="" className="w-20 h-20 object-cover rounded-full border" />
          ) : (
            <Field label="Button colour">
              <input type="color" value={buttonColor}
                onChange={(e) => patch({ buttonColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Button label">
              <input value={buttonText} onChange={(e) => patch({ buttonText: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" placeholder="TAP!" maxLength={12} />
            </Field>
            <Field label="Label colour">
              <input type="color" value={buttonTextColor}
                onChange={(e) => patch({ buttonTextColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>
        </div>
      </Section>

      {/* ── Animations ──────────────────────────────────────── */}
      <Section title="Animations" defaultOpen>
        <div className="space-y-4">
          <Field label="Tap reaction">
            <select
              value={tapAnimation}
              onChange={(e) => patch({ tapAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="bump">Bump (classic press)</option>
              <option value="pop">Pop</option>
              <option value="pulse">Pulse</option>
              <option value="wobble">Wobble</option>
              <option value="flash">Flash</option>
            </select>
            <span className="text-xs text-zinc-400">Plays on the button each tap.</span>
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
              placeholder="Tap the button as fast as you can for {seconds} seconds!"
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
            <Field label="Taps label">
              <input value={tapsLabel} onChange={(e) => patch({ tapsLabel: e.target.value })}
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
