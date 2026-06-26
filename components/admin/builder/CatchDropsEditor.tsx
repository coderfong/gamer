"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

const DEFAULT_GOOD = ["🍎", "⭐", "🍒", "💎", "🎁"];
const DEFAULT_BAD = ["💣", "☠️", "🦴"];

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

export function CatchDropsEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const gameSeconds = Math.max(10, Math.min(90, (config.gameSeconds as number | undefined) ?? 30));
  const winScore    = Math.max(1, (config.winScore as number | undefined) ?? 8);
  const spawnEvery  = Math.max(300, Math.min(2000, (config.spawnEvery as number | undefined) ?? 850));
  const fallSpeed   = Math.max(60, Math.min(420, (config.fallSpeed as number | undefined) ?? 150));
  const badChance   = Math.max(0, Math.min(0.8, (config.badChance as number | undefined) ?? 0.3));
  const lives       = Math.max(1, Math.min(9, (config.lives as number | undefined) ?? 3));
  const goodSymbols = toList(config.goodSymbols, DEFAULT_GOOD);
  const badSymbols  = toList(config.badSymbols, DEFAULT_BAD);
  const objectSize  = Math.max(24, Math.min(56, (config.objectSize as number | undefined) ?? 36));
  const catcherSymbol = (config.catcherSymbol as string | undefined) ?? "🧺";
  const catcherSize = Math.max(48, Math.min(140, (config.catcherSize as number | undefined) ?? 76));
  const lifeIcon    = (config.lifeIcon as string | undefined) ?? "❤️";
  const bgColor     = (config.bgColor as string | undefined) ?? "#1a1320";
  const useBgColor  = (config.bgColor as string | undefined) != null;
  const bgImage     = (config.bgImage as string | undefined) ?? null;
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#71717a";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 16;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";
  const scoreLabel  = (config.scoreLabel as string | undefined) ?? "Caught";
  const startLabel  = (config.startLabel as string | undefined) ?? "START";
  const winText     = (config.winText  as string | undefined) ?? "Time's up!";
  const loseText    = (config.loseText as string | undefined) ?? "Game over!";

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

  const chipOps = (key: "goodSymbols" | "badSymbols", list: string[]) => ({
    setAt: (i: number, v: string) => patch({ [key]: list.map((s, idx) => (idx === i ? v : s)) }),
    remove: (i: number) => patch({ [key]: list.filter((_, idx) => idx !== i) }),
    add: (v: string) => { if (v.trim()) patch({ [key]: [...list, v] }); },
  });
  const good = chipOps("goodSymbols", goodSymbols);
  const bad = chipOps("badSymbols", badSymbols);

  return (
    <div className="space-y-4">

      {/* ── Gameplay ─────────────────────────────────────────── */}
      <Section title="Gameplay" defaultOpen>
        <div className="space-y-4">
          <Field label={`Game length · ${gameSeconds}s`}>
            <input type="range" min={10} max={90} step={5} value={gameSeconds}
              onChange={(e) => patch({ gameSeconds: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Win at · ${winScore} caught`}>
            <input type="range" min={1} max={40} step={1} value={winScore}
              onChange={(e) => patch({ winScore: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">Players win when they catch at least this many good items.</span>
          </Field>
          <Field label={`Spawn rate · every ${spawnEvery}ms`}>
            <input type="range" min={300} max={2000} step={50} value={spawnEvery}
              onChange={(e) => patch({ spawnEvery: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5"><span>Busy (hard)</span><span>Sparse (easy)</span></div>
          </Field>
          <Field label={`Fall speed · ${fallSpeed}px/s`}>
            <input type="range" min={60} max={420} step={10} value={fallSpeed}
              onChange={(e) => patch({ fallSpeed: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Bad-item chance · ${Math.round(badChance * 100)}%`}>
            <input type="range" min={0} max={80} step={5} value={Math.round(badChance * 100)}
              onChange={(e) => patch({ badChance: Number(e.target.value) / 100 })} className="w-full" />
            <span className="text-xs text-zinc-400">How often a falling item is a bad one to avoid.</span>
          </Field>
          <Field label={`Lives · ${lives}`}>
            <input type="range" min={1} max={9} step={1} value={lives}
              onChange={(e) => patch({ lives: Number(e.target.value) })} className="w-full" />
            <span className="text-xs text-zinc-400">Catching a bad item costs a life. Out of lives = game over.</span>
          </Field>
        </div>
      </Section>

      {/* ── Items ────────────────────────────────────────────── */}
      <Section title="Items" defaultOpen>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-green-700">✓ Good items (catch these — emoji or images)</span>
            <ChipRow list={goodSymbols} ops={good} uploading={uploading}
              onUpload={(f, add) => uploadTo("catch", f, add)} />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-red-600">✗ Bad items (avoid these — emoji or images)</span>
            <ChipRow list={badSymbols} ops={bad} uploading={uploading}
              onUpload={(f, add) => uploadTo("catch", f, add)} />
          </div>
          <Field label={`Item size · ${objectSize}px`}>
            <input type="range" min={24} max={56} step={2} value={objectSize}
              onChange={(e) => patch({ objectSize: Number(e.target.value) })} className="w-full" />
          </Field>
        </div>
      </Section>

      {/* ── Catcher ──────────────────────────────────────────── */}
      <Section title="Catcher" defaultOpen>
        <div className="space-y-3">
          <Field label="Catcher (emoji or image)">
            <SymbolEditor value={catcherSymbol} uploading={uploading}
              onText={(v) => patch({ catcherSymbol: v || "🧺" })}
              onUpload={(f) => uploadTo("catch", f, (url) => patch({ catcherSymbol: url }))}
              onClearImage={() => patch({ catcherSymbol: "🧺" })} />
          </Field>
          <Field label={`Catcher size · ${catcherSize}px`}>
            <input type="range" min={48} max={140} step={4} value={catcherSize}
              onChange={(e) => patch({ catcherSize: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label="Life icon">
            <input value={lifeIcon} onChange={(e) => patch({ lifeIcon: e.target.value })}
              className="w-16 rounded border px-2 py-1.5 text-lg text-center" maxLength={4} />
          </Field>
        </div>
      </Section>

      {/* ── Background ───────────────────────────────────────── */}
      <Section title="Background">
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useBgColor} onChange={(e) => patch({ bgColor: e.target.checked ? bgColor : null })} />
            <span className="text-sm text-zinc-700">Custom background colour</span>
          </label>
          {useBgColor && (
            <input type="color" value={bgColor} onChange={(e) => patch({ bgColor: e.target.value })} className="w-full h-9 rounded border bg-white" />
          )}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-600">Background image (optional)</span>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo("catch", f, (url) => patch({ bgImage: url })); e.target.value = ""; }} />
                <span className="inline-block rounded border px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                  {uploading ? "Uploading…" : bgImage ? "Replace image" : "🖼 Upload image"}
                </span>
              </label>
              {bgImage && (<button type="button" onClick={() => patch({ bgImage: null })} className="text-xs text-red-400 hover:text-red-600">Remove</button>)}
            </div>
            {bgImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bgImage} alt="" className="w-full h-20 object-cover rounded-lg border" />
            )}
          </div>
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
            <Field label="Score label"><input value={scoreLabel} onChange={(e) => patch({ scoreLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
            <Field label="Start button"><input value={startLabel} onChange={(e) => patch({ startLabel: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={16} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Time-up message"><input value={winText} onChange={(e) => patch({ winText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} /></Field>
            <Field label="Out-of-lives message"><input value={loseText} onChange={(e) => patch({ loseText: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} /></Field>
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

function toList(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) {
    const a = (raw as string[]).filter((s) => typeof s === "string" && s.trim());
    if (a.length) return a;
  }
  if (typeof raw === "string" && raw.trim()) return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return fallback;
}

function ChipRow({
  list, ops, uploading, onUpload,
}: {
  list: string[];
  ops: { setAt: (i: number, v: string) => void; remove: (i: number) => void; add: (v: string) => void };
  uploading: boolean;
  onUpload: (f: File, add: (url: string) => void) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {list.map((sym, i) => (
        <div key={i} className="relative">
          {isImg(sym) ? (
            <div className="w-11 h-11 rounded-lg border bg-white overflow-hidden flex items-center justify-center"
              style={{ backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 8px 8px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sym} alt="" className="w-full h-full object-contain" />
            </div>
          ) : (
            <input value={sym} onChange={(e) => ops.setAt(i, e.target.value)}
              className="w-11 h-11 rounded-lg border text-lg text-center" maxLength={4} />
          )}
          <button type="button" onClick={() => ops.remove(i)}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-500">×</button>
        </div>
      ))}
      <input placeholder="＋😀" className="w-11 h-11 rounded-lg border text-lg text-center" maxLength={4}
        onKeyDown={(e) => { if (e.key === "Enter") { ops.add((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; e.preventDefault(); } }}
        onBlur={(e) => { ops.add(e.target.value); e.target.value = ""; }} />
      <label className="w-11 h-11 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer text-zinc-400 hover:border-violet-400 hover:text-violet-500">
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, ops.add); e.target.value = ""; }} />
        <span className="text-base">🖼</span>
      </label>
    </div>
  );
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
