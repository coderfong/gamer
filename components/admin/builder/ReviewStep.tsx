"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { GAME_META } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BuilderCampaign, BuilderSettings, PrizeDraft } from "./types";

export function ReviewStep({
  campaign,
  prizes,
  onBack,
  onLaunched,
}: {
  campaign: BuilderCampaign;
  prizes: PrizeDraft[];
  onBack: () => void;
  onLaunched: () => void;
}) {
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const publicUrl = campaign.slug ? `${appUrl}/play/${campaign.slug}` : "";

  useEffect(() => {
    if (!publicUrl) return;
    QRCode.toDataURL(publicUrl, { margin: 1, width: 240 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [publicUrl]);

  const meta = campaign.game_type ? GAME_META[campaign.game_type as GameType] : null;
  const settings = (campaign.config ?? {}) as BuilderSettings;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function downloadQr() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `${campaign.slug ?? "campaign"}-qr.png`;
    a.click();
  }

  async function launch() {
    setLaunching(true);
    setError(null);
    try {
      // Auto-save current state so the launch check sees up-to-date values,
      // even if the user navigated here without hitting "Save & continue".
      // Also normalise visual defaults (brandColor picker shows #6d28d9 even when
      // the field is undefined in state — write the real value so launch passes).
      if (campaign.id) {
        const normalizedTheme = {
          ...campaign.theme,
          brandColor: campaign.theme.brandColor ?? "#6d28d9",
          brandFg: campaign.theme.brandFg ?? "#ffffff",
        };
        const saveRes = await fetch(`/api/admin/campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: campaign.name, theme: normalizedTheme }),
        });
        if (!saveRes.ok) {
          const j = await saveRes.json().catch(() => null);
          setError(j?.error?.message ?? "Could not save campaign before launching.");
          return;
        }
      }

      const res = await fetch(`/api/admin/campaigns/${campaign.id}/launch`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not launch campaign.");
        return;
      }
      setLaunched(true);
    } catch {
      setError("Network error.");
    } finally {
      setLaunching(false);
    }
  }

  if (launched) {
    return (
      <div className="max-w-md mx-auto rounded-xl border bg-white p-8 text-center space-y-4">
        <div className="text-5xl">🚀</div>
        <h2 className="text-lg font-semibold">Campaign is live!</h2>
        <p className="text-sm text-zinc-600">Share this link or QR code with your audience.</p>
        {qr ? <img src={qr} alt="Campaign QR code" className="mx-auto" /> : null}
        <div className="flex justify-center gap-2">
          <button onClick={copyUrl} className="rounded-lg border px-3 py-2 text-sm">
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <button onClick={downloadQr} className="btn-brand">
            Download QR
          </button>
        </div>
        <button onClick={onLaunched} className="text-sm text-zinc-500 hover:underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Summary label="Name" value={campaign.name} />
        <Summary label="Game" value={meta ? `${meta.icon} ${meta.label}` : campaign.game_type ?? "—"} />
        <Summary label="Status" value={campaign.status} />
        <Summary
          label="Schedule"
          value={`${fmt(campaign.starts_at)} → ${fmt(campaign.ends_at)}`}
        />
        <Summary label="Max plays / contact" value={String(campaign.max_plays_per_player)} />
        <Summary label="Cooldown" value={`${campaign.cooldown_hours}h`} />
        {settings.redemptionInstructions ? (
          <Summary label="Redemption" value={settings.redemptionInstructions} />
        ) : null}

        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Prizes</p>
          <ul className="text-sm space-y-1">
            {prizes.map((p, i) => (
              <li key={p.id ?? i} className="flex justify-between">
                <span>
                  {p.name} {p.is_loss ? "(consolation)" : `· ${p.weight}%`}
                </span>
                <span className="text-zinc-500">
                  {p.is_loss ? "—" : `${p.existingCodeCount ?? 0} codes`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Public URL</p>
        <code className="block text-sm break-all rounded-lg border bg-zinc-50 px-3 py-2">
          {publicUrl || "(slug pending)"}
        </code>
        {qr ? <img src={qr} alt="Campaign QR code" className="rounded-lg border p-2 bg-white" /> : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-between pt-2">
          <button type="button" onClick={onBack} className="rounded-lg border px-4 py-2 text-sm">
            Back
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onLaunched} className="rounded-lg border px-4 py-2 text-sm">
              Save as draft
            </button>
            <button onClick={launch} disabled={launching} className="btn-brand">
              {launching ? "Launching…" : "Launch"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default ReviewStep;
