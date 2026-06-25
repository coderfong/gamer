"use client";

import { useState } from "react";
import type { BuilderCampaign, BuilderSettings } from "./types";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local wants local wall-clock "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toISO(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function SettingsStep({
  campaign,
  setCampaign,
  onBack,
  onNext,
}: {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = (campaign.config ?? {}) as BuilderSettings & Record<string, unknown>;
  const rr = settings.returnReward ?? {};

  function setConfig(patch: Partial<BuilderSettings>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...patch } }));
  }

  function setReturnReward(patch: Partial<NonNullable<BuilderSettings["returnReward"]>>) {
    setCampaign((c) => ({
      ...c,
      config: { ...c.config, returnReward: { ...(c.config?.returnReward as object), ...patch } },
    }));
  }

  async function saveAndNext() {
    setSaving(true);
    setError(null);
    try {
      const requirePhone = Boolean(settings.requirePhone);
      const requireEmail = settings.requireEmail !== false; // default on
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          starts_at: campaign.starts_at,
          ends_at: campaign.ends_at,
          max_plays_per_player: campaign.max_plays_per_player,
          cooldown_hours: campaign.cooldown_hours,
          require_capture: requirePhone || requireEmail,
          config: {
            ...campaign.config,
            maxPlaysTotal: settings.maxPlaysTotal ?? null,
            requirePhone,
            requireEmail,
            redemptionInstructions: settings.redemptionInstructions ?? "",
            prizeValidity: settings.prizeValidity ?? "",
            returnReward: {
              enabled: Boolean(rr.enabled),
              target: Number(rr.target) || 3,
              tier: Number(rr.tier) || 1,
            },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save settings.");
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
    <div className="max-w-xl space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Start date & time">
          <input
            type="datetime-local"
            value={toLocalInput(campaign.starts_at)}
            onChange={(e) => setCampaign((c) => ({ ...c, starts_at: toISO(e.target.value) }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="End date & time">
          <input
            type="datetime-local"
            value={toLocalInput(campaign.ends_at)}
            onChange={(e) => setCampaign((c) => ({ ...c, ends_at: toISO(e.target.value) }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Max plays total (optional)">
          <input
            type="number"
            min={0}
            value={settings.maxPlaysTotal ?? ""}
            onChange={(e) =>
              setConfig({ maxPlaysTotal: e.target.value === "" ? null : Number(e.target.value) })
            }
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Max plays per contact">
          <input
            type="number"
            min={0}
            value={campaign.max_plays_per_player}
            onChange={(e) =>
              setCampaign((c) => ({ ...c, max_plays_per_player: Number(e.target.value) }))
            }
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Cooldown (hours)">
          <input
            type="number"
            min={0}
            value={campaign.cooldown_hours}
            onChange={(e) => setCampaign((c) => ({ ...c, cooldown_hours: Number(e.target.value) }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="flex gap-6">
        <Toggle
          label="Require phone"
          checked={Boolean(settings.requirePhone)}
          onChange={(v) => setConfig({ requirePhone: v })}
        />
        <Toggle
          label="Require email"
          checked={settings.requireEmail !== false}
          onChange={(v) => setConfig({ requireEmail: v })}
        />
      </div>

      <Field label="Redemption instructions">
        <textarea
          rows={3}
          value={settings.redemptionInstructions ?? ""}
          onChange={(e) => setConfig({ redemptionInstructions: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Show this voucher at the counter to redeem."
        />
      </Field>

      <Field label="Prize validity">
        <input
          value={settings.prizeValidity ?? ""}
          onChange={(e) => setConfig({ prizeValidity: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Valid until 31 Dec 2026"
        />
      </Field>

      <div className="rounded-xl border p-4 space-y-3">
        <Toggle
          label="Return-visit reward (collect-and-win)"
          checked={Boolean(rr.enabled)}
          onChange={(v) => setReturnReward({ enabled: v })}
        />
        <p className="text-xs text-zinc-500">
          Award a reserved prize on every Nth visit by the same contact, to drive repeat plays.
          Set the reward prize at the chosen tier with <strong>weight 0</strong> (so it only appears
          on milestone visits), and make sure “Max plays per contact” is at least the target.
        </p>
        {rr.enabled ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Award every N visits">
              <input
                type="number"
                min={2}
                value={rr.target ?? 3}
                onChange={(e) => setReturnReward({ target: Number(e.target.value) })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Reward prize tier">
              <input
                type="number"
                min={1}
                value={rr.tier ?? 1}
                onChange={(e) => setReturnReward({ tier: Number(e.target.value) })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </Field>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="rounded-lg border px-4 py-2 text-sm">
          Back
        </button>
        <button onClick={saveAndNext} disabled={saving} className="btn-brand">
          {saving ? "Saving…" : "Save & continue"}
        </button>
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default SettingsStep;
