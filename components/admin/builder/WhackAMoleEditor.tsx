"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

const DEFAULT_MOLES = ["🐹"];

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function WhackAMoleEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const holeCount    = ([6, 9].includes(config.holeCount as number) ? (config.holeCount as number) : 9);
  const gameSeconds  = Math.max(5, Math.min(60, (config.gameSeconds as number | undefined) ?? 15));
  const moleInterval = Math.max(300, Math.min(1500, (config.moleInterval as number | undefined) ?? 750));
  const moles        = toSymbolArray(config.moleSymbols, DEFAULT_MOLES);
  const holeSize     = Math.max(60, Math.min(110, (config.holeSize as number | undefined) ?? 80));
  const moleColor    = (config.moleColor as string | undefined) ?? "#6d28d9";
  const holeColor    = (config.holeColor as string | undefined) ?? "#2a1f3d";
  const moleAnimation = (config.moleAnimation as string | undefined) ?? "popup";
  const holeEntrance  = (config.holeEntrance  as string | undefined) ?? "none";
  const scoreLabel   = (config.scoreLabel as string | undefined) ?? "Score";
  const timeLabel    = (config.timeLabel  as string | undefined) ?? "Time";
  const startLabel   = (config.startLabel as string | undefined) ?? "START";
  const instructionText       = (config.instructionText       as string | undefined) ?? "Whack as many moles as you can in {seconds}s!";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";

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

  function setMoleAt(idx: number, value: string) {
    const next = [...moles];
    next[idx] = value;
    patch({ moleSymbols: next });
  }
  function removeMole(idx: number) {
    const next = moles.filter((_, i) => i !== idx);
    patch({ moleSymbols: next.length ? next : DEFAULT_MOLES });
  }
  function addMole(value: string) {
    if (value.trim()) patch({ moleSymbols: [...moles, value] });
  }

  return (
    <div className="space-y-4">

      {/* ── Gameplay ─────────────────────────────────────────── */}
      <Section title="Gameplay" defaultOpen>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs text-zinc-500">Number of holes</span>
            <div className="flex gap-2 flex-wrap">
              {[6, 9].map((n) => {
                const active = holeCount === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patch({ holeCount: n })}
                    className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
                    style={{
                      background: active ? "#6D4AFF" : "white",
                      color: active ? "white" : "#52525b",
                      borderColor: active ? "#6D4AFF" : "#d4d4d8",
                    }}
                  >
                    {n} holes
                  </button>
                );
              })}
            </div>
          </div>

          <Field label={`Game length · ${gameSeconds}s`}>
            <input
              type="range" min={5} max={60} step={1}
              value={gameSeconds}
              onChange={(e) => patch({ gameSeconds: Number(e.target.value) })}
              className="w-full"
            />
          </Field>

          <Field label={`Mole speed · every ${moleInterval}ms`}>
            <input
              type="range" min={300} max={1500} step={50}
              value={moleInterval}
              onChange={(e) => patch({ moleInterval: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>Fast (hard)</span><span>Slow (easy)</span>
            </div>
          </Field>

          <Field label={`Hole size · ${holeSize}px`}>
            <input
              type="range" min={60} max={110} step={2}
              value={holeSize}
              onChange={(e) => patch({ holeSize: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </div>
      </Section>

      {/* ── Moles ───────────────────────────────────────────── */}
      <Section title="Moles" defaultOpen>
        <div className="space-y-3">
          <div className="space-y-2">
            <span className="text-xs text-zinc-500">Mole characters — emoji or images (picked at random)</span>
            <div className="flex flex-wrap gap-2 items-center">
              {moles.map((sym, i) => (
                <div key={i} className="relative">
                  <SymbolChip value={sym} onChange={(v) => setMoleAt(i, v)} />
                  <button
                    type="button"
                    onClick={() => removeMole(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                placeholder="＋😀"
                className="w-12 h-12 rounded-lg border text-lg text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addMole((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                    e.preventDefault();
                  }
                }}
                onBlur={(e) => { addMole(e.target.value); e.target.value = ""; }}
                maxLength={4}
              />
              <label className="w-12 h-12 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer text-zinc-400 hover:border-violet-400 hover:text-violet-500">
                <input
                  type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadTo("mole-symbols", f, (url) => addMole(url));
                    e.target.value = "";
                  }}
                />
                <span className="text-base">🖼</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mole colour">
              <input type="color" value={moleColor}
                onChange={(e) => patch({ moleColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Hole colour">
              <input type="color" value={holeColor}
                onChange={(e) => patch({ holeColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>
        </div>
      </Section>

      {/* ── Animations ──────────────────────────────────────── */}
      <Section title="Animations" defaultOpen>
        <div className="space-y-4">
          <Field label="Mole pop-up">
            <select
              value={moleAnimation}
              onChange={(e) => patch({ moleAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="popup">Pop up (classic)</option>
              <option value="pop">Pop</option>
              <option value="bounce">Bounce</option>
              <option value="tada">Tada</option>
            </select>
          </Field>

          <Field label="Hole entrance">
            <select
              value={holeEntrance}
              onChange={(e) => patch({ holeEntrance: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="fade">Fade in</option>
              <option value="pop">Pop in</option>
              <option value="zoom">Zoom in</option>
              <option value="drop">Drop in</option>
            </select>
            <span className="text-xs text-zinc-400">Holes animate in (staggered) when the game loads.</span>
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
              placeholder="Whack as many moles as you can in {seconds}s!"
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
            <Field label="Score label">
              <input value={scoreLabel} onChange={(e) => patch({ scoreLabel: e.target.value })}
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

// ── Symbol helpers & sub-components ──────────────────────────────────────────

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
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-12 h-12 rounded-lg border text-lg text-center"
      maxLength={4}
    />
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
