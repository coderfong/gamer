"use client";
import { useState } from "react";
import type { CampaignRow, PrizeRow } from "@/lib/types/database";
import { readTheme } from "@/lib/types/campaign";
import type { GameResult, GameType } from "@/lib/types/game";
import { BrandingPanel } from "@/components/shared/BrandingPanel";
import { PlayerCapture, type CaptureSubmit } from "./PlayerCapture";
import { ResultScreen } from "@/components/shared/ResultScreen";
import { SpinWheel } from "./SpinWheel";
import { ScratchCard } from "./ScratchCard";
import { Quiz } from "./Quiz";
import { SlotMachine } from "./SlotMachine";
import { PickABox } from "./PickABox";

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
  flagged?: boolean;
}

export function GameWrapper({
  campaign,
  shareUrl,
  preview = false,
}: {
  campaign: CampaignRow & { prizes: PrizeRow[] };
  shareUrl: string;
  preview?: boolean;
}) {
  const theme = readTheme(campaign);
  const previewQuery = preview ? "?preview=1" : "";
  const [stage, setStage] = useState<Stage>(campaign.require_capture ? "capture" : "playing");
  const [playId, setPlayId] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCapture(form: CaptureSubmit) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/play/${campaign.slug}/start${previewQuery}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const { json, raw } = await readResponse(res);
      if (!res.ok) {
        setError(json ? prettyError(json) : `Server error ${res.status}: ${raw.slice(0, 200)}`);
        return;
      }
      setPlayId(json.playId);
      setStage("playing");
    } catch (e) {
      setError(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
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
      const res = await fetch(`/api/play/${campaign.slug}/submit${previewQuery}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playId, ...r }),
      });
      const { json, raw } = await readResponse(res);
      if (!res.ok) {
        setError(json ? prettyError(json) : `Server error ${res.status}: ${raw.slice(0, 200)}`);
        setStage("playing");
        return;
      }
      setResult(json);
      setStage("result");
    } catch (e) {
      setError(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
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
        {preview ? (
          <div className="mb-3 rounded-lg bg-amber-100 text-amber-800 text-sm text-center px-3 py-2">
            Preview mode — plays don’t count and no vouchers are claimed.
          </div>
        ) : null}
        <BrandingPanel theme={theme} campaignName={campaign.name} />
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          {stage === "capture" ? (
            <PlayerCapture onSubmit={handleCapture} submitting={submitting} error={error} />
          ) : stage === "playing" || stage === "submitting" ? (
            <>
              {error ? (
                <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm text-center px-3 py-2 border border-red-200">
                  {error}
                </div>
              ) : null}
              <GameByType
                gameType={campaign.game_type as GameType}
                campaignId={campaign.id}
                config={campaign.config}
                theme={theme}
                onComplete={handleGameComplete}
                busy={stage === "submitting"}
              />
            </>
          ) : (
            <ResultScreen
              prize={result?.prize ?? null}
              voucherCode={result?.voucherCode ?? null}
              flagged={result?.flagged}
              shareUrl={shareUrl}
              campaignName={campaign.name}
              brandColor={theme.brandColor}
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
  switch (props.gameType) {
    case "spin_wheel":
      return <SpinWheel {...props} />;
    case "scratch":
      return <ScratchCard {...props} />;
    case "quiz":
    case "trivia":
      return <Quiz {...props} />;
    case "slot_machine":
      return <SlotMachine {...props} />;
    case "lucky_dip":
      return <PickABox {...props} />;
    default:
      return <SpinWheel {...props} />;
  }
}

// Read a response body once, tolerating non-JSON error pages (HTML 500s).
async function readResponse(res: Response): Promise<{ json: any; raw: string }> {
  const raw = await res.text();
  try {
    return { json: raw ? JSON.parse(raw) : null, raw };
  } catch {
    return { json: null, raw };
  }
}

function prettyError(json: { error?: string; layer?: string; reason?: string }): string {
  if (json.error === "rate_limited") {
    if (json.layer === "contact") return "You've already played this campaign recently. Please try again later.";
    if (json.layer === "ip") return "Too many attempts from your network. Please wait a few minutes.";
    if (json.layer === "global") return "We're busy right now — please try again shortly.";
    return "Rate limit hit. Please try again later.";
  }
  if (json.error === "velocity_blocked") return "Too many recent plays detected. Please try again later.";
  if (json.error === "captcha_failed") return "Please complete the captcha and try again.";
  if (json.error === "max_plays_reached") return "You've reached the max plays for this campaign.";
  if (json.error === "campaign_inactive") return "This campaign is not currently active.";
  return json.error ?? "Something went wrong";
}
