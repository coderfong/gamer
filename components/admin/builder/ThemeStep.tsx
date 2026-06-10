"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign, BuilderTheme } from "./types";
import { FONT_OPTIONS } from "./types";
import { GamePreview } from "./GamePreview";
import { SpinWheelEditor } from "./SpinWheelEditor";
import { ScratchCardEditor } from "./ScratchCardEditor";
import { MemoryEditor } from "./MemoryEditor";
import { PickABoxEditor } from "./PickABoxEditor";
import { WhackAMoleEditor } from "./WhackAMoleEditor";
import { TapTargetEditor } from "./TapTargetEditor";
import { SpeedTapEditor } from "./SpeedTapEditor";
import { QuizEditor } from "./QuizEditor";
import { StackBlocksEditor } from "./StackBlocksEditor";
import { FillOutlineEditor } from "./FillOutlineEditor";
import { StopTimerEditor } from "./StopTimerEditor";
import { CupShuffleEditor } from "./CupShuffleEditor";
import { RingShooterEditor } from "./RingShooterEditor";
import { PlinkoEditor } from "./PlinkoEditor";
import { PrecisionMeterEditor } from "./PrecisionMeterEditor";
import { CatchDropsEditor } from "./CatchDropsEditor";
import { PinDropEditor } from "./PinDropEditor";
import { ReactionEditor } from "./ReactionEditor";
import { AngleStopEditor } from "./AngleStopEditor";
import { AdditionalElementsEditor } from "./AdditionalElementsEditor";

export function ThemeStep({
  campaign,
  setCampaign,
  onNext,
}: {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
  onNext: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "bg" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"branding" | "game" | "elements">("branding");

  const hasGameDesign = ["spin_wheel", "wheel_of_fortune", "scratch", "memory", "lucky_dip", "whack_a_mole", "tap_target", "speed_tap", "quiz", "stack_blocks", "slot_machine", "pop_balloon", "card_flip", "dice_roll", "pinata", "claw_machine", "color_match", "reaction", "treasure_hunt"].includes(campaign.game_type ?? "");

  const tabs = [
    { key: "branding" as const, label: "Branding" },
    ...(hasGameDesign ? [{ key: "game" as const, label: "Game Design" }] : []),
    { key: "elements" as const, label: "Elements" },
  ];

  const theme = campaign.theme;

  function setTheme(patch: Partial<BuilderTheme>) {
    setCampaign((c) => ({ ...c, theme: { ...c.theme, ...patch } }));
  }

  async function uploadLogo(file: File) {
    setUploading("logo");
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/logos/${campaign.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (upErr) { setError(`Logo upload failed: ${upErr.message}`); return; }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setTheme({ logoUrl: data.publicUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function uploadBgImage(file: File) {
    setUploading("bg");
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${campaign.brandId}/backgrounds/${campaign.id}-bg-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (upErr) { setError(`Background upload failed: ${upErr.message}`); return; }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setTheme({ bgImageUrl: data.publicUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function saveAndNext() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: campaign.name, theme: campaign.theme }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save theme.");
        return;
      }
      onNext();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px] items-start">
      <div className="space-y-4">
        {/* Tab switcher — always shown */}
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t.key ? "#fff" : "transparent",
                color: tab === t.key ? "#191921" : "#73737F",
                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : undefined,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Game design tab */}
        {tab === "game" && hasGameDesign && (
          campaign.game_type === "scratch"
            ? <ScratchCardEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "memory"
            ? <MemoryEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "lucky_dip"
            ? <PickABoxEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "whack_a_mole"
            ? <WhackAMoleEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "tap_target"
            ? <TapTargetEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "speed_tap"
            ? <SpeedTapEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "quiz"
            ? <QuizEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "stack_blocks"
            ? <StackBlocksEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "slot_machine"
            ? <FillOutlineEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "pop_balloon"
            ? <StopTimerEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "wheel_of_fortune"
            ? <CupShuffleEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "card_flip"
            ? <RingShooterEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "dice_roll"
            ? <PlinkoEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "pinata"
            ? <PrecisionMeterEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "claw_machine"
            ? <CatchDropsEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "color_match"
            ? <PinDropEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "reaction"
            ? <ReactionEditor campaign={campaign} setCampaign={setCampaign} />
            : campaign.game_type === "treasure_hunt"
            ? <AngleStopEditor campaign={campaign} setCampaign={setCampaign} />
            : <SpinWheelEditor campaign={campaign} setCampaign={setCampaign} />
        )}

        {/* Elements tab */}
        {tab === "elements" && (
          <AdditionalElementsEditor campaign={campaign} setCampaign={setCampaign} />
        )}

        {/* Branding tab */}
        {tab === "branding" && (<>
        <Field label="Campaign name">
          <input
            value={campaign.name}
            onChange={(e) => setCampaign((c) => ({ ...c, name: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Summer giveaway"
          />
        </Field>

        <Field label="Headline (shown above the game)">
          <input
            value={theme.headline ?? ""}
            onChange={(e) => setTheme({ headline: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Spin to win!"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Primary colour" value={theme.brandColor ?? "#6d28d9"} onChange={(v) => setTheme({ brandColor: v })} />
          <ColorField label="Button text" value={theme.brandFg ?? "#ffffff"} onChange={(v) => setTheme({ brandFg: v })} />
        </div>

        <Field label="Background">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <ColorField label="Solid colour" value={theme.bgColor ?? "#fafafa"} onChange={(v) => setTheme({ bgColor: v })} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBgImage(f); }}
                />
                <span className="rounded border px-2 py-1 text-xs hover:bg-zinc-100 cursor-pointer">
                  {theme.bgImageUrl ? "Replace image" : "Upload image"}
                </span>
              </label>
              {theme.bgImageUrl && (
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-600"
                  onClick={() => setTheme({ bgImageUrl: undefined })}
                >
                  Remove image
                </button>
              )}
              {uploading === "bg" && <span className="text-xs text-zinc-400">Uploading…</span>}
            </div>
            {theme.bgImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.bgImageUrl} alt="Background preview" className="h-16 w-full object-cover rounded-lg border" />
            )}
          </div>
        </Field>

        <Field label="Font family">
          <select
            value={theme.fontFamily ?? "Inter"}
            onChange={(e) => setTheme({ fontFamily: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Logo">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
              }}
              className="text-sm"
            />
            {uploading === "logo" ? <span className="text-xs text-zinc-500">Uploading…</span> : null}
          </div>
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain" />
          ) : null}
        </Field>
        </>)}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end">
          <button onClick={saveAndNext} disabled={saving} className="btn-brand">
            {saving ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </div>

      {/* Live game preview — phone mockup */}
      <div className="flex flex-col items-center sticky top-4">
        <p className="text-xs uppercase tracking-wide text-zinc-400 mb-3 self-start">
          Preview — drag text to reposition
        </p>

        {/* Phone shell */}
        <div
          style={{
            width: 375,
            background: "#101014",
            borderRadius: 44,
            padding: "0 6px 10px",
            boxShadow: "0 0 0 1px #2a2a35, 0 0 0 3px #1a1a22, 0 24px 60px rgba(0,0,0,0.55)",
          }}
        >
          {/* Dynamic Island / notch */}
          <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 110, height: 30, background: "#000", borderRadius: 20 }} />
          </div>

          {/* Screen — scrollable, mobile height */}
          <div
            style={{
              height: 720,
              borderRadius: 34,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
              <GamePreview
                campaign={campaign}
                onThemeChange={(patch) => setCampaign((c) => ({ ...c, theme: { ...c.theme, ...patch } }))}
                onConfigChange={(patch) => setCampaign((c) => ({ ...c, config: { ...c.config, ...patch } }))}
              />
            </div>
          </div>

          {/* Home indicator */}
          <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 120, height: 4, background: "#2a2a35", borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded border bg-white"
      />
    </label>
  );
}

export default ThemeStep;
