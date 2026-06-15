"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { buildGameConfig } from "@/lib/brand/gameAssets";
import type { BrandStudioConfig } from "@/lib/types/studio";
import type { GameType } from "@/lib/types/game";

// Reuse the Brand Studio's live phone preview, lazily (it pulls in every game
// component, so we keep it out of the landing page's initial/SSR bundle).
const MiniGamePreview = dynamic(
  () => import("@/components/admin/brand/MiniGamePreview").then((m) => m.MiniGamePreview),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: 232,
          height: Math.round(232 * 1.92),
          borderRadius: 26,
          background: "#15151b",
          margin: "0 auto",
        }}
      />
    ),
  },
);

export interface PortfolioBrand {
  name: string;
  publicSlug: string | null;
  config: BrandStudioConfig;
}

// Renders ONE brand's representative game (first configured game) as a live,
// fully-branded phone preview — used in the hero and inside the carousel.
export function BrandGamePreview({
  brand,
  phoneWidth = 232,
  gameType: gameTypeOverride,
}: {
  brand: PortfolioBrand;
  phoneWidth?: number;
  gameType?: GameType; // force a specific game; otherwise use the brand's first
}) {
  const gameType = useMemo<GameType>(() => {
    if (gameTypeOverride) return gameTypeOverride;
    const keys = Object.keys(brand.config.games);
    return (keys[0] as GameType) ?? ("spin_wheel" as GameType);
  }, [brand, gameTypeOverride]);

  const assets = brand.config.games[gameType];
  const cfg = useMemo(
    () => buildGameConfig(gameType, assets, brand.config.text),
    [gameType, assets, brand.config.text],
  );

  // Clear the display-text colour override so the "… to win!" header falls back
  // to var(--brand-color) — i.e. each brand's own theme colour.
  const text = useMemo(
    () => ({
      ...brand.config.text,
      display: { ...brand.config.text.display, color: "" },
    }),
    [brand.config.text],
  );

  return (
    <MiniGamePreview
      gameType={gameType}
      theme={brand.config.theme}
      config={cfg}
      bg={assets?.bg}
      overlays={assets?.overlays}
      texts={assets?.texts}
      padTop={assets?.padTop ?? 0}
      text={text}
      phoneWidth={phoneWidth}
    />
  );
}
