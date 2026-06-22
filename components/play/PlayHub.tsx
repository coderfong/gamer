"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MiniGamePreview } from "@/components/admin/brand/MiniGamePreview";
import { getEnabledGames, getGameMeta } from "@/lib/games/gameMeta";
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

  // Standardised typography for the hub chrome (header + cards): plain system
  // font, near-black, lighter weight — kept consistent across every brand. The
  // per-brand fonts/colours still apply inside the game phone itself.
  const STD_FONT = "var(--font-sans)";

  return (
    <main
      className="studio-skin arcade-shell min-h-screen px-4 py-10"
      style={{
        ["--brand-color" as string]: theme.brandColor,
        ["--brand-fg" as string]: theme.brandFg,
        ["--font-arcade" as string]: config.text?.display.font || theme.fontFamily,
        ["--font-body" as string]: config.text?.body.font || theme.fontFamily,
        fontFamily: STD_FONT,
        color: "#18181b",
        backgroundColor: theme.bgColor,
      }}
    >
      {config.text && <style dangerouslySetInnerHTML={{ __html: studioTextCss(config.text) }} />}
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-12" style={{ fontFamily: STD_FONT }}>
          <h1 className="text-4xl sm:text-5xl tracking-tight" style={{ fontWeight: 500, color: "#18181b" }}>
            {brandName || "Play"}
          </h1>
          <p className="mt-3 text-lg sm:text-xl" style={{ fontWeight: 400, color: "#3f3f46" }}>
            {active ? getGameMeta(active).label : "Pick a game and play"}
          </p>
        </header>

        {active ? (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActive(null)}
              className="self-start mb-5 rounded-full border-2 border-black/80 px-4 py-2 text-base hover:bg-black/5"
              style={{ fontFamily: STD_FONT, fontWeight: 500, color: "#18181b" }}
            >
              ← All games
            </button>
            <GameStage gameType={active} config={config} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {ENABLED.map(([gt, meta]) => (
              <button
                key={gt}
                onClick={() => setActive(gt as GameType)}
                className="flex flex-col rounded-2xl bg-white p-5 text-left transition-transform duration-100 active:translate-y-1 active:scale-[0.98] border-2 border-black/80 shadow-[4px_5px_0_rgba(0,0,0,0.85)] hover:-translate-y-0.5"
                style={{ fontFamily: STD_FONT, color: "#18181b" }}
              >
                <div
                  className="grid place-items-center h-14 w-14 rounded-xl text-3xl"
                  style={{ background: "var(--brand-color)", color: "var(--brand-fg)" }}
                >
                  {meta.icon}
                </div>
                <div className="mt-4 text-xl leading-tight" style={{ fontWeight: 500 }}>
                  {meta.label}
                </div>
                <div className="mt-1.5 text-sm leading-snug" style={{ fontWeight: 400, color: "#52525b" }}>
                  {meta.useCase}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// Renders the selected game in a full phone mockup that scales the whole game to
// fit (no cropping) — reuses the Brand Studio's live preview frame.
function GameStage({ gameType, config }: { gameType: GameType; config: BrandStudioConfig }) {
  const assets = config.games[gameType];
  const cfg = useMemo(() => buildGameConfig(gameType, assets, config.text), [gameType, assets, config.text]);

  // Clear the display-text colour override so the game's headline falls back to
  // the brand colour (matches the landing-page previews).
  const text = useMemo(
    () => ({ ...config.text, display: { ...config.text.display, color: "" } }),
    [config.text],
  );

  // Size the phone to the available width so it never overflows the screen.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [phoneWidth, setPhoneWidth] = useState(320);
  useEffect(() => {
    const measure = () => {
      const avail = wrapRef.current?.clientWidth ?? 360;
      setPhoneWidth(Math.max(240, Math.min(360, avail)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div ref={wrapRef} className="w-full">
      <MiniGamePreview
        gameType={gameType}
        theme={config.theme}
        config={cfg}
        bg={assets?.bg}
        overlays={assets?.overlays}
        texts={assets?.texts}
        padTop={assets?.padTop ?? 0}
        text={text}
        phoneWidth={phoneWidth}
      />
    </div>
  );
}
