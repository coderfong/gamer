"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign, BuilderTheme } from "./types";
import { FONT_OPTIONS } from "./types";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = campaign.theme;

  function setTheme(patch: Partial<BuilderTheme>) {
    setCampaign((c) => ({ ...c, theme: { ...c.theme, ...patch } }));
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/logos/${campaign.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (upErr) {
        setError(`Logo upload failed: ${upErr.message}`);
        return;
      }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setTheme({ logoUrl: data.publicUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
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

        <div className="grid grid-cols-3 gap-3">
          <ColorField label="Primary" value={theme.brandColor ?? "#6d28d9"} onChange={(v) => setTheme({ brandColor: v })} />
          <ColorField label="Text on primary" value={theme.brandFg ?? "#ffffff"} onChange={(v) => setTheme({ brandFg: v })} />
          <ColorField label="Background" value={theme.bgColor ?? "#fafafa"} onChange={(v) => setTheme({ bgColor: v })} />
        </div>

        <Field label="Font family">
          <select
            value={theme.fontFamily ?? "Inter"}
            onChange={(e) => setTheme({ fontFamily: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
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
            {uploading ? <span className="text-xs text-zinc-500">Uploading…</span> : null}
          </div>
          {theme.logoUrl ? (
            <img src={theme.logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain" />
          ) : null}
        </Field>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end">
          <button onClick={saveAndNext} disabled={saving} className="btn-brand">
            {saving ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Preview</p>
        <div
          className="rounded-2xl border p-6 text-center"
          style={{ background: theme.bgColor ?? "#fafafa", fontFamily: theme.fontFamily ?? "Inter" }}
        >
          {theme.logoUrl ? (
            <img src={theme.logoUrl} alt="" className="h-12 mx-auto object-contain mb-3" />
          ) : null}
          <h3 className="text-lg font-bold" style={{ color: theme.brandColor ?? "#6d28d9" }}>
            {theme.headline || campaign.name || "Your campaign"}
          </h3>
          <div
            className="mt-4 inline-flex items-center justify-center rounded-lg px-5 py-3 font-semibold"
            style={{ background: theme.brandColor ?? "#6d28d9", color: theme.brandFg ?? "#ffffff" }}
          >
            Play now
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
