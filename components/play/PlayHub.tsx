"use client";

import { useState } from "react";
import { GameByType } from "@/components/games/GameWrapper";
import { StudioOverlays } from "@/components/admin/brand/StudioOverlays";
import { StudioTexts } from "@/components/admin/brand/StudioTexts";
import { getEnabledGames } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BrandStudioConfig } from "@/lib/types/studio";
import { studioTextCss } from "@/lib/types/studio";
import { buildGameConfig } from "@/lib/brand/gameAssets";

const ENABLED = getEnabledGames();

// Public, just-for-fun hub: pick any of the brand's games and play it, themed and
// asset-dressed per the Brand Studio config. No prizes / rewards.
export function PlayHub({ brandName, config }: { brandName: string; config: BrandStudioConfig }) {
  const [active, setActive] = useState<GameType | null>(null);
  const theme = config.theme;

  return (
    <main
      className="studio-skin arcade-shell min-h-screen px-4 py-8"
      style={{
        ["--brand-color" as string]: theme.brandColor,
        ["--brand-fg" as string]: theme.brandFg,
        ["--font-arcade" as string]: config.text?.display.font || theme.fontFamily,
        ["--font-body" as string]: config.text?.body.font || theme.fontFamily,
        fontFamily: config.text?.body.font || theme.fontFamily,
        backgroundColor: theme.bgColor,
      }}
    >
      {config.text && <style dangerouslySetInnerHTML={{ __html: studioTextCss(config.text) }} />}
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-3 mb-6">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/90 p-0.5 border" />
          ) : (
            <div className="h-10 w-10 rounded-lg flex items-center justify-center arcade-title text-lg"
              style={{ background: "var(--brand-color)", color: "var(--brand-fg)" }}>
              {(brandName || "?").slice(0, 1)}
            </div>
          )}
          <div className="arcade-title text-xl leading-tight">{brandName || "Play"}</div>
        </header>

        {active ? (
          <div>
            <button onClick={() => setActive(null)} className="mb-3 text-sm font-semibold" style={{ color: "var(--brand-color)" }}>
              ← All games
            </button>
            <GameStage gameType={active} config={config} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {ENABLED.map(([gt, meta]) => (
              <button
                key={gt}
                onClick={() => setActive(gt as GameType)}
                className="rounded-2xl p-4 text-left transition-transform active:scale-95"
                style={{ background: "var(--brand-color)", color: "var(--brand-fg)", boxShadow: "0 6px 0 rgba(0,0,0,0.18)" }}
              >
                <div className="text-3xl">{meta.icon}</div>
                <div className="mt-2 arcade-title text-base leading-tight">{meta.label}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function GameStage({ gameType, config }: { gameType: GameType; config: BrandStudioConfig }) {
  const assets = config.games[gameType];
  const bg = assets?.bg;
  const overlays = assets?.overlays;
  const [key, setKey] = useState(0); // replay

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5"
      style={{
        background: bg?.url ? undefined : "rgba(255,255,255,0.04)",
        boxShadow: "inset 0 2px 10px rgba(0,0,0,0.15)",
        minHeight: 420,
      }}
    >
      {bg?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg.url} alt="" className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ objectFit: "cover", opacity: bg.opacity ?? 1, transform: `translate(${bg.x ?? 0}%, ${bg.y ?? 0}%) scale(${bg.scale ?? 1})` }} />
      )}
      <div className="relative">
        {assets?.padTop ? <div style={{ height: assets.padTop }} /> : null}
        <GameByType
          key={key}
          gameType={gameType}
          campaignId="hub"
          config={buildGameConfig(gameType, assets, config.text)}
          theme={{ brandColor: config.theme.brandColor, brandFg: config.theme.brandFg }}
          onComplete={() => setTimeout(() => setKey((k) => k + 1), 2600)}
        />
      </div>
      {overlays && overlays.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <StudioOverlays overlays={overlays} />
        </div>
      )}
      {assets?.texts && assets.texts.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <StudioTexts texts={assets.texts} />
        </div>
      )}
    </div>
  );
}
