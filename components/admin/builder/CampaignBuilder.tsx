"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BuilderCampaign, PrizeDraft } from "./types";
import { GameTypePicker } from "./GameTypePicker";
import { ThemeStep } from "./ThemeStep";
import { PrizesStep } from "./PrizesStep";
import { SettingsStep } from "./SettingsStep";
import { ReviewStep } from "./ReviewStep";

const STEPS = ["Game", "Theme", "Prizes", "Settings", "Review"] as const;
type StepIndex = 0 | 1 | 2 | 3 | 4;

export function CampaignBuilder({
  initialCampaign,
  initialPrizes,
}: {
  initialCampaign: BuilderCampaign;
  initialPrizes: PrizeDraft[];
}) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<BuilderCampaign>(initialCampaign);
  const [prizes, setPrizes] = useState<PrizeDraft[]>(initialPrizes);
  // Start on Theme if the campaign already exists (edit), else Game (new).
  const [step, setStep] = useState<StepIndex>(campaign.id ? 1 : 0);

  const hasCampaign = Boolean(campaign.id);

  function goTo(i: StepIndex) {
    if (i > 0 && !hasCampaign) return; // can't leave step 1 until draft exists
    setStep(i);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {hasCampaign ? campaign.name || "Untitled campaign" : "New campaign"}
          </h1>
          <p className="text-sm text-zinc-600">
            {hasCampaign ? `Status: ${campaign.status}` : "Pick a game to get started"}
          </p>
        </div>
      </header>

      {/* Stepper */}
      <nav className="flex flex-wrap gap-1 border-b">
        {STEPS.map((label, i) => {
          const active = i === step;
          const disabled = i > 0 && !hasCampaign;
          return (
            <button
              key={label}
              type="button"
              onClick={() => goTo(i as StepIndex)}
              disabled={disabled}
              className={[
                "px-4 py-2 -mb-px border-b-2 text-sm",
                active
                  ? "border-brand text-zinc-900 font-medium"
                  : "border-transparent text-zinc-500 hover:text-zinc-800",
                disabled ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {i + 1}. {label}
            </button>
          );
        })}
      </nav>

      <div>
        {step === 0 && (
          <GameTypePicker
            campaign={campaign}
            onCreated={(c) => {
              setCampaign(c);
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <ThemeStep
            campaign={campaign}
            setCampaign={setCampaign}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <PrizesStep
            campaign={campaign}
            prizes={prizes}
            setPrizes={setPrizes}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <SettingsStep
            campaign={campaign}
            setCampaign={setCampaign}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <ReviewStep
            campaign={campaign}
            prizes={prizes}
            onBack={() => setStep(3)}
            onLaunched={() => router.push("/dashboard")}
          />
        )}
      </div>
    </div>
  );
}

export default CampaignBuilder;
