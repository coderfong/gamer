"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function StackBlocksEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const baseWidth    = Math.max(60, Math.min(200, (config.baseWidth as number | undefined) ?? 120));
  const maxStack     = Math.max(3, Math.min(20, (config.maxStack as number | undefined) ?? 8));
  const startSpeed   = Math.max(1, Math.min(8, (config.startSpeed as number | undefined) ?? 3));
  const speedStep    = Math.max(0, Math.min(1.5, (config.speedStep as number | undefined) ?? 0.4));
  const blockColorMode = (config.blockColorMode as string | undefined) ?? "rainbow";
  const blockColor   = (config.blockColor   as string | undefined) ?? "#6d28d9";
  const movingColor  = (config.movingColor  as string | undefined) ?? "#f59e0b";
  const arenaColor   = (config.arenaColor   as string | undefined) ?? "#1a1320";
  const useArenaColor = (config.arenaColor as string | undefined) != null;
  const arenaImage   = (config.arenaImage   as string | undefined) ?? null;
  const pictureImage = (config.pictureImage as string | undefined) ?? null;
  const dropAnimation = (config.dropAnimation as string | undefined) ?? "settle";
  const instructionIdle = (config.instructionIdle as string | undefined) ?? "Tap DROP to stack the blocks — keep them aligned!";
  const instructionPlay = (config.instructionPlay as string | undefined) ?? "Tap DROP to land the block";
  const instructionDone = (config.instructionDone as string | undefined) ?? "Stacked {count}!";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const stackedLabel = (config.stackedLabel as string | undefined) ?? "Stacked";
  const startLabel   = (config.startLabel   as string | undefined) ?? "START";
  const dropLabel    = (config.dropLabel    as string | undefined) ?? "DROP";

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
          <Field label={`Base block width · ${baseWidth}px`}>
            <input
              type="range" min={60} max={200} step={5}
              value={baseWidth}
              onChange={(e) => patch({ baseWidth: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label={`Max stack height · ${maxStack} blocks`}>
            <input
              type="range" min={3} max={20} step={1}
              value={maxStack}
              onChange={(e) => patch({ maxStack: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label={`Start speed · ${startSpeed}`}>
            <input
              type="range" min={1} max={8} step={0.5}
              value={startSpeed}
              onChange={(e) => patch({ startSpeed: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Slow (easy)</span><span>Fast (hard)</span>
            </div>
          </Field>
          <Field label={`Speed ramp per block · +${speedStep}`}>
            <input
              type="range" min={0} max={1.5} step={0.1}
              value={speedStep}
              onChange={(e) => patch({ speedStep: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Steady</span><span>Speeds up fast</span>
            </div>
          </Field>
        </div>
      </Section>

      {/* ── Appearance ──────────────────────────────────────── */}
      <Section title="Appearance" defaultOpen>
        <div className="space-y-3">
          {/* Picture: shown as the arena background, behind the blocks */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-600">Picture (shown as the background)</span>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input
                  type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadTo("stack-picture", f, (url) => patch({ pictureImage: url }));
                    e.target.value = "";
                  }}
                />
                <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                  {uploading ? "Uploading…" : pictureImage ? "Replace picture" : "🖼 Upload picture"}
                </span>
              </label>
              {pictureImage && (
                <button type="button" onClick={() => patch({ pictureImage: null })} className="text-xs text-red-400 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>
            {pictureImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pictureImage} alt="" className="w-full h-28 object-contain rounded-lg border bg-zinc-100" />
            ) : (
              <p className="text-xs text-zinc-400">
                Fills the play area as the backdrop; the solid-coloured blocks stack in front of it.
              </p>
            )}
          </div>

          <Field label="Block colours (used when no picture is set)">
            <div className="flex gap-2">
              {[
                { v: "rainbow", l: "Rainbow" },
                { v: "solid", l: "Single colour" },
              ].map((o) => {
                const active = blockColorMode === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => patch({ blockColorMode: o.v })}
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
            <Field label={blockColorMode === "solid" ? "Block colour" : "Base hue"}>
              <input type="color" value={blockColor}
                onChange={(e) => patch({ blockColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Moving block colour">
              <input type="color" value={movingColor}
                onChange={(e) => patch({ movingColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>

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

          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-600">Arena background image</span>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input
                  type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadTo("stack-arena", f, (url) => patch({ arenaImage: url }));
                    e.target.value = "";
                  }}
                />
                <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                  {uploading ? "Uploading…" : arenaImage ? "Replace image" : "🖼 Upload image"}
                </span>
              </label>
              {arenaImage && (
                <button type="button" onClick={() => patch({ arenaImage: null })} className="text-xs text-red-400 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>
            {arenaImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={arenaImage} alt="" className="w-full h-20 object-cover rounded-lg border" />
            )}
          </div>
        </div>
      </Section>

      {/* ── Animations ──────────────────────────────────────── */}
      <Section title="Animations" defaultOpen>
        <div className="space-y-4">
          <Field label="Drop landing effect">
            <select
              value={dropAnimation}
              onChange={(e) => patch({ dropAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="settle">Settle (pop)</option>
              <option value="flash">Flash</option>
              <option value="none">None</option>
            </select>
            <span className="text-xs text-zinc-400">Plays on each block as it lands.</span>
          </Field>
        </div>
      </Section>

      {/* ── Text & labels ───────────────────────────────────── */}
      <Section title="Text & labels">
        <div className="space-y-3">
          <Field label="Start instruction">
            <input value={instructionIdle} onChange={(e) => patch({ instructionIdle: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Playing instruction">
            <input value={instructionPlay} onChange={(e) => patch({ instructionPlay: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Finish message">
            <input value={instructionDone} onChange={(e) => patch({ instructionDone: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm" placeholder="Stacked {count}!" />
            <span className="text-xs text-zinc-400">Use <code>{"{count}"}</code> for the final stack height.</span>
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
            <Field label="Counter label">
              <input value={stackedLabel} onChange={(e) => patch({ stackedLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Start button">
              <input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} />
            </Field>
            <Field label="Drop button">
              <input value={dropLabel} onChange={(e) => patch({ dropLabel: e.target.value })}
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
