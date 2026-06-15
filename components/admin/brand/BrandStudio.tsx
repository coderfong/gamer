"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveStudio } from "@/app/(admin)/brand/actions";
import type { BrandStudioConfig } from "@/lib/types/studio";
import { readStudioConfig } from "@/lib/types/studio";
import { ThemeStepAll } from "./steps/ThemeStepAll";
import { HeroStepAll } from "./steps/HeroStepAll";
import { TextStepAll } from "./steps/TextStepAll";
import { BackgroundsStepAll } from "./steps/BackgroundsStepAll";
import { OverlaysStepAll } from "./steps/OverlaysStepAll";
import { ShareStep } from "./steps/ShareStep";

const STEPS = [
  { key: "theme", label: "Theme", hint: "Upload an image, extract colours, theme every game" },
  { key: "hero", label: "Hero assets", hint: "Per-game hero images" },
  { key: "text", label: "Text", hint: "Headline & supporting text styles" },
  { key: "backgrounds", label: "Backgrounds", hint: "Background images, adjustable" },
  { key: "overlays", label: "Extra assets", hint: "Decorative images + animations" },
  { key: "share", label: "Share", hint: "One QR for all your games" },
] as const;

type StepKey = typeof STEPS[number]["key"];

export function BrandStudio({
  brandId,
  initialName,
  initialConfig,
  initialPublicSlug,
}: {
  brandId: string;
  initialName: string;
  initialConfig: unknown;
  initialPublicSlug: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [config, setConfig] = useState<BrandStudioConfig>(() => readStudioConfig(initialConfig));
  const [publicSlug, setPublicSlug] = useState<string | null>(initialPublicSlug);
  const [step, setStep] = useState<StepKey>("theme");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function patchConfig(updater: (c: BrandStudioConfig) => BrandStudioConfig) {
    setConfig((c) => updater(c));
    setSaved(false);
  }

  // Always persist the latest state — refs keep the saver current without
  // re-subscribing the debounce on every keystroke.
  const configRef = useRef(config);
  const nameRef = useRef(name);
  configRef.current = config;
  nameRef.current = name;

  const persist = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    const res = await saveStudio(brandId, configRef.current, nameRef.current);
    setSaving(false);
    if ("ok" in res) { setPublicSlug(res.publicSlug); setSaved(true); }
    else setSaveError(res.error.message);
  }, []);

  function save() {
    startTransition(() => { void persist(); });
  }

  // Debounced auto-save whenever config/name change (skips the first render).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const t = setTimeout(() => { void persist(); }, 1000);
    return () => clearTimeout(t);
  }, [config, name, persist]);

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="ad">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Brand Studio</h1>
          <p className="mt-1.5 max-w-xl text-sm" style={{ color: "var(--ad-muted)" }}>
            Theme and asset every game at once. Players reach them all through a single QR code.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold" style={{ color: saveError ? "#DC2626" : saving ? "#73737F" : saved ? "#16A34A" : "#C9820A" }}>
            {saveError ? "Save failed" : saving ? "Saving…" : saved ? "✓ All changes saved" : "Unsaved changes"}
          </span>
          <button className="ad-btn ad-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Step nav */}
      <div className="mt-6 flex flex-wrap gap-1.5 rounded-xl p-1.5" style={{ background: "var(--ad-surface2, #f4f4f6)" }}>
        {STEPS.map((s, i) => {
          const on = s.key === step;
          return (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className="flex-1 min-w-[120px] rounded-lg px-3 py-2 text-left transition-colors"
              style={{ background: on ? "#fff" : "transparent", boxShadow: on ? "0 1px 3px rgba(0,0,0,0.1)" : undefined }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: on ? "var(--ad-accent, #6D4AFF)" : "#d4d4d8", color: "#fff" }}>{i + 1}</span>
                <span className="text-sm font-semibold" style={{ color: on ? "#191921" : "#73737F" }}>{s.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--ad-muted)" }}>{STEPS[stepIdx].hint}</p>
      {saveError ? (
        <p className="mt-2 text-xs rounded-lg px-3 py-2" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
          Couldn’t save: {saveError}. If this mentions a missing “studio”/“public_slug” column, apply migration <code>0008_brand_studio.sql</code>.
        </p>
      ) : null}

      <div className="mt-5">
        {step === "theme" && (
          <ThemeStepAll
            brandId={brandId}
            config={config}
            patchConfig={patchConfig}
            brandName={name}
            setBrandName={(n) => { setName(n); setSaved(false); }}
          />
        )}
        {step === "hero" && (
          <HeroStepAll brandId={brandId} config={config} patchConfig={patchConfig} />
        )}
        {step === "text" && (
          <TextStepAll config={config} patchConfig={patchConfig} />
        )}
        {step === "backgrounds" && (
          <BackgroundsStepAll brandId={brandId} config={config} patchConfig={patchConfig} />
        )}
        {step === "overlays" && (
          <OverlaysStepAll brandId={brandId} config={config} patchConfig={patchConfig} />
        )}
        {step === "share" && (
          <ShareStep
            publicSlug={publicSlug}
            saved={saved}
            saving={saving}
            onSave={save}
            config={config}
            onImport={(raw) => patchConfig(() => readStudioConfig(raw))}
          />
        )}
      </div>
    </div>
  );
}

