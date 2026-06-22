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

  return (
    <main
      className="studio-skin arcade-shell min-h-screen px-4 py-10"
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
        <header className="flex flex-col items-center text-center gap-4 mb-10">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.logoUrl}
              alt=""
              className="h-20 w-20 rounded-2xl object-contain bg-white/95 p-1.5 border-4 border-black shadow-[4px_5px_0_rgba(0,0,0,1)]"
            />
          ) : (
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center arcade-title text-4xl border-4 border-black shadow-[4px_5px_0_rgba(0,0,0,1)]"
              style={{ background: "var(--brand-color)", color: "var(--brand-fg)" }}
            >
              {(brandName || "?").slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="arcade-title text-4xl leading-none" style={{ color: "var(--brand-color)" }}>
              {brandName || "Play"}
            </h1>
            <p className="arcade-muted mt-3 text-lg font-semibold">
              {active ? getGameMeta(active).label : "Pick a game and play"}
            </p>
          </div>
        </header>

        {active ? (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActive(null)}
              className="self-start mb-5 arcade-chip px-4 py-2 text-base font-bold"
            >
              ← All games
            </button>
            <GameStage gameType={active} config={config} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {ENABLED.map(([gt, meta]) => (
              <button
                key={gt}
                onClick={() => setActive(gt as GameType)}
                className="rounded-3xl p-5 text-left transition-transform duration-100 active:translate-y-1 active:scale-[0.97] border-4 border-black shadow-[5px_6px_0_rgba(0,0,0,1)] hover:-translate-y-0.5"
                style={{ background: "var(--brand-color)", color: "var(--brand-fg)" }}
              >
                <div className="text-5xl leading-none drop-shadow-[2px_2px_0_rgba(0,0,0,0.25)]">{meta.icon}</div>
                <div className="mt-3 arcade-title text-xl leading-tight">{meta.label}</div>
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
