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
    <div className="ad space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            {hasCampaign ? campaign.name || "Untitled campaign" : "New campaign"}
          </h1>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            {hasCampaign ? `Draft · ${campaign.status}` : "Pick a game to get started"}
          </p>
        </div>
      </header>

      {/* Stepper */}
      <nav className="ad-card flex items-center gap-0 p-4">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          const disabled = i > 0 && !hasCampaign;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => goTo(i as StepIndex)}
                disabled={disabled}
                className="flex items-center gap-2.5"
                style={{ cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold"
                  style={{
                    background: done ? "var(--ad-accent)" : active ? "var(--ad-accent-soft)" : "#ECECF1",
                    color: done ? "#fff" : active ? "var(--ad-accent-ink)" : "var(--ad-faint)",
                    border: active ? "2px solid var(--ad-accent)" : "2px solid transparent",
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className="text-sm"
                  style={{ fontWeight: active ? 800 : 600, color: active ? "var(--ad-ink)" : done ? "var(--ad-body)" : "var(--ad-faint)" }}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 ? (
                <span className="mx-3 h-0.5 min-w-[16px] flex-1 rounded" style={{ background: i < step ? "var(--ad-accent)" : "#ECECF1" }} />
              ) : null}
            </div>
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
