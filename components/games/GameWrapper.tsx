"use client";
import { useState } from "react";
import type { CampaignRow, PrizeRow } from "@/lib/types/database";
import { readTheme } from "@/lib/types/campaign";
import type { GameResult, GameType } from "@/lib/types/game";
import { BrandingPanel } from "@/components/shared/BrandingPanel";
import { PlayerCapture } from "./PlayerCapture";
import { ResultScreen } from "@/components/shared/ResultScreen";
import { SpinWheel } from "./SpinWheel";

type Stage = "capture" | "playing" | "submitting" | "result";

interface SubmitResponse {
  playId: string;
  prize: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    is_loss: boolean;
  } | null;
  voucherCode: string | null;
}

export function GameWrapper({
  campaign,
  shareUrl,
}: {
  campaign: CampaignRow & { prizes: PrizeRow[] };
  shareUrl: string;
}) {
  const theme = readTheme(campaign);
  const [stage, setStage] = useState<Stage>(campaign.require_capture ? "capture" : "playing");
  const [playId, setPlayId] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCapture(form: { name: string; email: string; phone: string }) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/play/${campaign.slug}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not start");
        return;
      }
      setPlayId(json.playId);
      setStage("playing");
    } catch (e) {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGameComplete(r: GameResult) {
    if (!playId) {
      setError("Missing play id");
      return;
    }
    setStage("submitting");
    try {
      const res = await fetch(`/api/play/${campaign.slug}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playId, ...r }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not submit");
        setStage("playing");
        return;
      }
      setResult(json);
      setStage("result");
    } catch (e) {
      setError("Network error");
      setStage("playing");
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-8"
      style={
        {
          "--brand-color": theme.brandColor ?? "#6d28d9",
          "--brand-fg": theme.brandFg ?? "#ffffff",
        } as React.CSSProperties
      }
    >
      <div className="max-w-md mx-auto">
        <BrandingPanel theme={theme} campaignName={campaign.name} />
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          {stage === "capture" ? (
            <PlayerCapture onSubmit={handleCapture} submitting={submitting} error={error} />
          ) : stage === "playing" || stage === "submitting" ? (
            <GameByType
              gameType={campaign.game_type as GameType}
              campaignId={campaign.id}
              config={campaign.config}
              theme={theme}
              onComplete={handleGameComplete}
              busy={stage === "submitting"}
            />
          ) : (
            <ResultScreen
              prize={result?.prize ?? null}
              voucherCode={result?.voucherCode ?? null}
              shareUrl={shareUrl}
              campaignName={campaign.name}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function GameByType(props: {
  gameType: GameType;
  campaignId: string;
  config: Record<string, unknown>;
  theme: { brandColor?: string; brandFg?: string };
  onComplete: (r: GameResult) => void;
  busy?: boolean;
}) {
  if (props.busy) {
    return <div className="text-center py-12 text-zinc-500">Picking your prize...</div>;
  }
  // Phase 1: only SpinWheel is implemented. Other game types fall back to it
  // so the rest of the flow remains testable.
  switch (props.gameType) {
    case "spin_wheel":
    default:
      return <SpinWheel {...props} />;
  }
}
