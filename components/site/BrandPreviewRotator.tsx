"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandGamePreview, type PortfolioBrand } from "./BrandGamePreview";
import { getGameMeta } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";

// One grid tile: shows a live, branded game preview that auto-advances through
// THAT brand's games — and pauses while the user is hovering/playing it.
export function BrandPreviewRotator({
  brand,
  startGame,
  phoneWidth = 300,
  intervalMs = 5000,
}: {
  brand: PortfolioBrand;
  startGame?: GameType;
  phoneWidth?: number;
  intervalMs?: number;
}) {
  // The brand's configured games, rotated so the paired "start" game shows first.
  const games = useMemo<GameType[]>(() => {
    const keys = Object.keys(brand.config.games) as GameType[];
    if (keys.length === 0) return [startGame ?? ("spin_wheel" as GameType)];
    if (startGame && keys.includes(startGame)) {
      const idx = keys.indexOf(startGame);
      return [...keys.slice(idx), ...keys.slice(0, idx)];
    }
    return keys;
  }, [brand, startGame]);

  const [i, setI] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to the first game whenever the game set changes.
  useEffect(() => setI(0), [games]);

  // Pause auto-advance while hovering or while the user is actively playing.
  const paused = hovered || interacting;
  useEffect(() => {
    if (paused || games.length <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % games.length), intervalMs);
    return () => clearInterval(id);
  }, [paused, games.length, intervalMs]);

  // A tap/click inside the preview = "playing" → pause, then resume after a
  // spell of no interaction (covers touch, where there's no hover-out).
  function bumpInteract() {
    setInteracting(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setInteracting(false), 9000);
  }
  useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current); }, []);

  const gameType = games[i] ?? games[0];
  const meta = getGameMeta(gameType);
  const brandColor = brand.config.theme.brandColor;

  return (
    <div
      className="pf-grid-cell"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={bumpInteract}
    >
      {/* key remounts + re-triggers the slide animation on each game change */}
      <div className="pf-slide-in" key={gameType}>
        <BrandGamePreview brand={brand} gameType={gameType} phoneWidth={phoneWidth} />
      </div>
      <span className="pf-grid-label" style={{ color: brandColor }}>{meta.icon} {meta.label}</span>
      {brand.publicSlug ? (
        <Link className="pf-grid-brand pf-grid-hub" href={`/b/${brand.publicSlug}`} style={{ color: brandColor, opacity: 0.78 }}>
          {brand.name} ↗
        </Link>
      ) : (
        <span className="pf-grid-brand" style={{ color: brandColor, opacity: 0.72 }}>{brand.name}</span>
      )}
      {games.length > 1 && (
        <div className="pf-mini-dots">
          {games.map((g, k) => (
            <span key={g + k} className={k === i ? "on" : ""} style={k === i ? { background: brandColor } : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
