"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BrandGamePreview, type PortfolioBrand } from "./BrandGamePreview";
import { getGameMeta } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";

// The 12 games shown in the intro grid, in order. Each brand gets paired with
// one of these so the opening slide shows every brand AND every game at once.
const INTRO_GAME_ORDER: GameType[] = [
  "spin_wheel",       // Spin Wheel 🎡
  "scratch",          // Scratch Card 🪙
  "memory",           // Memory Match
  "dice_roll",        // Plinko
  "wheel_of_fortune", // Cup Shuffle
  "color_match",      // Pin Drop
  "card_flip",        // Ring Shooter
  "lucky_dip",        // Pick a Box
  "pop_balloon",      // Stop the Timer
  "stack_blocks",     // Stack the Blocks
  "claw_machine",     // Catch the Drops
  "slot_machine",     // Fill the Outline
];

// Homepage showcase: an opening grid that pairs each brand with one game (every
// brand + every game on one slide), then one auto-sliding slide per brand.
export function PortfolioCarousel({ brands }: { brands: PortfolioBrand[] }) {
  // One grid cell per brand (capped to the 12 games), brand k → game k.
  const introCells = useMemo(
    () =>
      brands.slice(0, INTRO_GAME_ORDER.length).map((brand, k) => ({
        brand,
        gameType: INTRO_GAME_ORDER[k % INTRO_GAME_ORDER.length],
      })),
    [brands],
  );

  const hasIntro = introCells.length > 1;
  const total = (hasIntro ? 1 : 0) + brands.length;

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % total), 5200);
    return () => clearInterval(id);
  }, [paused, total]);

  if (total === 0) {
    return (
      <div className="pf-empty">
        No brands to feature yet — build one in your{" "}
        <Link href="/brands" style={{ textDecoration: "underline" }}>Studio</Link>{" "}
        and it appears here automatically.
      </div>
    );
  }

  const isIntro = hasIntro && i === 0;
  const brand = hasIntro ? brands[i - 1] : brands[i];

  return (
    <div
      className="pf"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {isIntro ? (
        <div className="pf-stage pf-intro">
          <div className="pf-intro-head">
            <h3>{introCells.length} brands. Every kind of game.</h3>
            <p>Each one custom-built and fully branded — tap through to play any of them.</p>
          </div>
          <div className="pf-grid">
            {introCells.map(({ brand: b, gameType }) => (
              <div className="pf-grid-cell" key={b.name + gameType}>
                <BrandGamePreview brand={b} gameType={gameType} phoneWidth={116} />
                <span className="pf-grid-label">{getGameMeta(gameType).icon} {getGameMeta(gameType).label}</span>
                <span className="pf-grid-brand">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="pf-stage">
          <div className="pf-info">
            {brand.config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="pf-logo" src={brand.config.logoUrl} alt={`${brand.name} logo`} />
            ) : (
              <div className="pf-logo pf-logo-fallback" style={{ background: brand.config.theme.brandColor }}>
                {brand.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <h3>{brand.name}</h3>
            <p className="pf-count">
              {Object.keys(brand.config.games).length} branded game
              {Object.keys(brand.config.games).length === 1 ? "" : "s"} · fully themed
            </p>
            <div className="pf-chips">
              {Object.keys(brand.config.games).slice(0, 6).map((g) => {
                const meta = getGameMeta(g);
                return (
                  <span key={g} className="pf-chip">{meta.icon} {meta.label}</span>
                );
              })}
              {Object.keys(brand.config.games).length > 6 ? (
                <span className="pf-chip">+{Object.keys(brand.config.games).length - 6} more</span>
              ) : null}
            </div>
            {brand.publicSlug ? (
              <Link className="btn btn-primary" href={`/b/${brand.publicSlug}`}>Open live hub →</Link>
            ) : (
              <span className="pf-draft">Live hub not published yet</span>
            )}
          </div>

          <div className="pf-phone">
            <BrandGamePreview key={`${brand.name}-${i}`} brand={brand} phoneWidth={244} />
          </div>
        </div>
      )}

      {total > 1 && (
        <div className="pf-controls">
          <button type="button" aria-label="Previous" onClick={() => setI((p) => (p - 1 + total) % total)}>‹</button>
          <div className="pf-dots">
            {Array.from({ length: total }).map((_, k) => (
              <button
                key={k}
                type="button"
                aria-label={hasIntro && k === 0 ? "All games" : `Brand ${hasIntro ? k : k + 1}`}
                className={k === i ? "on" : ""}
                onClick={() => setI(k)}
              />
            ))}
          </div>
          <button type="button" aria-label="Next" onClick={() => setI((p) => (p + 1) % total)}>›</button>
        </div>
      )}
    </div>
  );
}
