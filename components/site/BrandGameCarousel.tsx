"use client";

import { useState } from "react";
import { BrandGamePreview, type PortfolioBrand } from "./BrandGamePreview";
import { getGameMeta } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";

// One grid cell: a brand's themed game preview with left/right arrows to flip
// through the other games (same brand, same theme) without leaving the page.
export function BrandGameCarousel({
  brand,
  games,
  startIndex = 0,
  phoneWidth = 300,
}: {
  brand: PortfolioBrand;
  games: GameType[];
  startIndex?: number;
  phoneWidth?: number;
}) {
  const [i, setI] = useState(games.length ? startIndex % games.length : 0);
  const gameType = games[i] ?? games[0];
  const meta = getGameMeta(gameType);
  const many = games.length > 1;
  const go = (d: number) => setI((p) => (p + d + games.length) % games.length);

  return (
    <>
      <div className="pf-carousel" style={{ width: phoneWidth }}>
        {many && (
          <button type="button" className="pf-arrow pf-arrow-l" aria-label="Previous game" onClick={() => go(-1)}>
            ‹
          </button>
        )}
        <BrandGamePreview brand={brand} gameType={gameType} phoneWidth={phoneWidth} />
        {many && (
          <button type="button" className="pf-arrow pf-arrow-r" aria-label="Next game" onClick={() => go(1)}>
            ›
          </button>
        )}
      </div>
      <span className="pf-grid-label" style={{ color: "#000" }}>
        {meta.icon} {meta.label}
      </span>
    </>
  );
}
