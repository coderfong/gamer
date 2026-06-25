"use client";
import { useMemo, useState } from "react";
import type { CampaignRow, PrizeRow } from "@/lib/types/database";
import { readTheme } from "@/lib/types/campaign";
import { optimizedImage } from "@/lib/brand/imageOpt";
import { optimizeHeroConfig } from "@/lib/brand/gameAssets";

const ANIM_MAP: Record<string, string> = {
  float:         "el-float 2.4s ease-in-out infinite",
  spin:          "el-spin 3s linear infinite",
  pulse:         "el-pulse 1.6s ease-in-out infinite",
  bounce:        "el-bounce 1.2s ease infinite",
  shake:         "el-shake 0.8s ease-in-out infinite",
  wiggle:        "el-wiggle 1.2s ease-in-out infinite",
  swing:         "el-swing 2s ease-in-out infinite",
  "rubber-band": "el-rubber-band 2s ease infinite",
  heartbeat:     "el-heartbeat 2.4s ease-in-out infinite",
  jello:         "el-jello 3s ease infinite",
  tada:          "el-tada 2.5s ease infinite",
};
import type { GameProps, GameResult, GameType } from "@/lib/types/game";
import { BrandingPanel } from "@/components/shared/BrandingPanel";
import { PlayerCapture, type CaptureSubmit } from "./PlayerCapture";
import { ResultScreen } from "@/components/shared/ResultScreen";
import { SpinWheel } from "./SpinWheel";
import { CupShuffle } from "./CupShuffle";
import { RingShooter } from "./RingShooter";
import { ScratchCard } from "./ScratchCard";
import { Quiz } from "./Quiz";
import { SlotMachine } from "./SlotMachine";
import { PickABox } from "./PickABox";
import { Plinko } from "./Plinko";
import { PrecisionMeter } from "./PrecisionMeter";
import { PopBalloon } from "./PopBalloon";
import { AngleStop } from "./AngleStop";
import { WhackAMole } from "./WhackAMole";
import { SpeedTap } from "./SpeedTap";
import { Reaction } from "./Reaction";
import { TapTarget } from "./TapTarget";
import { PinDrop } from "./PinDrop";
import { Memory } from "./Memory";
import { CatchDrops } from "./CatchDrops";
import { StackBlocks } from "./StackBlocks";

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
  returnReward?: { visitNumber: number; target: number } | null;
}

export function GameWrapper({
  campaign,
  shareUrl,
  preview = false,
  accessToken = null,
}: {
  campaign: CampaignRow & { prizes: PrizeRow[] };
  shareUrl: string;
  preview?: boolean;
  accessToken?: string | null;
}) {
  const theme = readTheme(campaign);
  // Full-bleed background — wrapped at 1200px (covers desktop) via the optimizer.
  const bgImage = optimizedImage(theme.bgImageUrl, 1200);
  // Hero images live in the stored config as raw upload URLs; optimize them
  // before handing the config to the game component (matches the studio path).
  const playConfig = useMemo(
    () => optimizeHeroConfig(campaign.game_type, campaign.config),
    [campaign.game_type, campaign.config],
  );
  const apiQuery = (() => {
    const sp = new URLSearchParams();
    if (preview) sp.set("preview", "1");
    if (accessToken) sp.set("k", accessToken);
    const s = sp.toString();
    return s ? `?${s}` : "";
  })();
  const [stage, setStage] = useState<Stage>(campaign.require_capture ? "capture" : "playing");
  const [playId, setPlayId] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCapture(form: CaptureSubmit) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/play/${campaign.slug}/start${apiQuery}`, {
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
      const res = await fetch(`/api/play/${campaign.slug}/submit${apiQuery}`, {
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
      className="arcade-shell min-h-screen px-4 py-8"
      style={
        {
          "--brand-color": theme.brandColor ?? "#6d28d9",
          "--brand-fg": theme.brandFg ?? "#ffffff",
          fontFamily: theme.fontFamily ?? "inherit",
          backgroundColor: theme.bgColor ?? undefined,
          // Setting backgroundImage inline overrides arcade-shell's halftone dots
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: bgImage ? "cover" : undefined,
          backgroundPosition: bgImage ? "center" : undefined,
          backgroundRepeat: bgImage ? "no-repeat" : undefined,
        } as React.CSSProperties
      }
    >
      <div className="max-w-md mx-auto relative">
        {/* Free-position text overlays (set via builder drag handles) */}
        {theme.nameBlock && (
          <div
            className="arcade-title absolute pointer-events-none z-10"
            style={{
              left: theme.nameBlock.x,
              top: theme.nameBlock.y,
              fontSize: theme.nameBlock.fontSize,
              color: "var(--brand-color)",
              textAlign: theme.nameBlock.align ?? "left",
            }}
          >
            {campaign.name}
          </div>
        )}
        {theme.headlineBlock && theme.headline && (
          <div
            className="arcade-title font-semibold absolute pointer-events-none z-10"
            style={{
              left: theme.headlineBlock.x,
              top: theme.headlineBlock.y,
              fontSize: theme.headlineBlock.fontSize,
              color: "var(--brand-color)",
              textAlign: theme.headlineBlock.align ?? "left",
            }}
          >
            {theme.headline}
          </div>
        )}

        {/* Decorative overlay elements */}
        {(theme.overlayElements ?? []).map((el) => {
          const animStyle =
            el.animation !== "none"
              ? ({ "--el-rot": `${el.rotation}deg`, animation: ANIM_MAP[el.animation] } as React.CSSProperties)
              : { transform: `rotate(${el.rotation}deg)` };
          const flipParts = [el.flipH && "scaleX(-1)", el.flipV && "scaleY(-1)"].filter(Boolean);
          const flipStyle = flipParts.length ? { transform: flipParts.join(" ") } : undefined;
          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                opacity: el.opacity,
                pointerEvents: "none",
                transformOrigin: "center center",
                ...animStyle,
              }}
            >
              <div style={{ width: "100%", height: "100%", ...flipStyle }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={optimizedImage(el.imageUrl, Math.ceil(Math.max(el.width, el.height) * 2))} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </div>
            </div>
          );
        })}

        {preview ? (
          <div className="mb-3 rounded-lg bg-amber-400/90 text-amber-950 text-sm font-semibold text-center px-3 py-2">
            Preview mode — plays don’t count and no vouchers are claimed.
          </div>
        ) : null}
        <BrandingPanel theme={theme} campaignName={campaign.name} />

        {/* Headline above game panel (default flow mode — no headlineBlock set) */}
        {theme.headline && !theme.headlineBlock && (
          <div className="arcade-title text-xl mb-4 leading-tight" style={{ color: "var(--brand-color)" }}>
            {theme.headline}
          </div>
        )}

        <div className="p-6 relative">

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
                config={playConfig}
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
              returnReward={result?.returnReward ?? null}
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

export function GameByType(props: {
  gameType: GameType;
  campaignId: string;
  config: Record<string, unknown>;
  theme: GameProps["theme"];
  onComplete: (r: GameResult) => void;
  onConfigChange?: GameProps["onConfigChange"];
  editorMode?: boolean;
  busy?: boolean;
}) {
  if (props.busy) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="h-10 w-10 rounded-full border-4 border-black/10 border-t-[var(--brand-color)] animate-spin" />
        <div className="arcade-muted">Picking your prize…</div>
      </div>
    );
  }
  switch (props.gameType) {
    case "spin_wheel":
      return <SpinWheel {...props} />;
    case "wheel_of_fortune":
      return <CupShuffle {...props} />;
    case "scratch":
      return <ScratchCard {...props} />;
    case "quiz":
      return <Quiz {...props} />;
    case "slot_machine":
      return <SlotMachine {...props} />;
    case "lucky_dip":
      return <PickABox {...props} />;
    case "card_flip":
      return <RingShooter {...props} />;
    case "dice_roll":
      return <Plinko {...props} />;
    case "pinata":
      return <PrecisionMeter {...props} />;
    case "pop_balloon":
      return <PopBalloon {...props} />;
    case "treasure_hunt":
      return <AngleStop {...props} />;
    case "whack_a_mole":
      return <WhackAMole {...props} />;
    case "speed_tap":
      return <SpeedTap {...props} />;
    case "reaction":
      return <Reaction {...props} />;
    case "tap_target":
      return <TapTarget {...props} />;
    case "color_match":
      return <PinDrop {...props} />;
    case "memory":
      return <Memory {...props} />;
    case "claw_machine":
      return <CatchDrops {...props} />;
    case "stack_blocks":
      return <StackBlocks {...props} />;
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
