"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GameByType } from "@/components/games/GameWrapper";
import type { GameType } from "@/lib/types/game";
import type { BrandStudioTheme, BrandStudioText, StudioGameAssets } from "@/lib/types/studio";
import { studioTextCss } from "@/lib/types/studio";
import { StudioOverlays } from "./StudioOverlays";
import { StudioTexts } from "./StudioTexts";
import { EditableTexts } from "./EditableTexts";
import type { StudioText } from "@/lib/types/studio";

const GAME_W = 340; // natural game width

// A phone-mockup live preview of a single game — used in the Brand Studio grids.
// The game is scaled to fit entirely within the phone screen (no scrolling) and
// can be reset/replayed.
export function MiniGamePreview({
  gameType,
  theme,
  config = {},
  bg,
  overlays,
  texts,
  padTop = 0,
  onTextChange,
  text,
  phoneWidth = 232,
}: {
  gameType: GameType;
  theme: BrandStudioTheme;
  config?: Record<string, unknown>;
  bg?: StudioGameAssets["bg"];
  overlays?: StudioGameAssets["overlays"];
  texts?: StudioGameAssets["texts"];
  padTop?: number;
  onTextChange?: (id: string, patch: Partial<StudioText>) => void;
  text?: BrandStudioText;
  phoneWidth?: number;
  height?: number; // ignored — kept for caller compatibility
}) {
  const cfg = useMemo(() => config, [config]);
  const [key, setKey] = useState(0);
  const [size, setSize] = useState({ w: GAME_W, h: GAME_W });
  const contentRef = useRef<HTMLDivElement>(null);

  const bezel = 6;
  const innerW = phoneWidth - bezel * 2;
  const screenH = Math.round(phoneWidth * 1.92);
  const topPad = 24;  // notch zone
  const sidePad = 14; // breathing room from the screen edges
  const availW = innerW - sidePad * 2;
  const availH = screenH - topPad - 14;

  // Measure the game's actual rendered size (incl. overflow) and scale to fit.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setSize({ w: Math.max(el.scrollWidth, GAME_W), h: el.scrollHeight || GAME_W });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [key]);

  const scale = Math.min(availW / Math.max(1, size.w), availH / Math.max(1, size.h));

  return (
    <div
      className="mx-auto"
      style={{ width: phoneWidth, background: "#15151b", borderRadius: 26, padding: bezel, boxShadow: "0 10px 30px -12px rgba(0,0,0,0.5)" }}
    >
      <div
        className="studio-skin relative overflow-hidden"
        style={{
          height: screenH,
          borderRadius: 20,
          background: theme.bgColor,
          backgroundImage: bg?.url ? undefined : "radial-gradient(rgba(35,27,46,0.05) 2px, transparent 2px)",
          backgroundSize: bg?.url ? undefined : "14px 14px",
          ["--brand-color" as string]: theme.brandColor,
          ["--brand-fg" as string]: theme.brandFg,
          ["--font-arcade" as string]: text?.display.font || theme.fontFamily,
          ["--font-body" as string]: text?.body.font || theme.fontFamily,
          fontFamily: text?.body.font || theme.fontFamily,
        }}
      >
        {text && <style dangerouslySetInnerHTML={{ __html: studioTextCss(text) }} />}
        {/* background image layer */}
        {bg?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg.url}
            alt=""
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: "cover", opacity: bg.opacity ?? 1, transform: `translate(${bg.x ?? 0}%, ${bg.y ?? 0}%) scale(${bg.scale ?? 1})` }}
          />
        )}

        {/* notch */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: 6, width: 64, height: 14, background: "#15151b", borderRadius: 10 }} />

        {/* reset / replay */}
        <button
          type="button"
          onClick={() => setKey((k) => k + 1)}
          title="Replay"
          className="absolute z-30 grid place-items-center rounded-full"
          style={{ top: 6, right: 6, width: 24, height: 24, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 13 }}
        >
          ↻
        </button>

        {/* game — scaled to fit, centred, no scroll */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: topPad }}>
          <div style={{ width: GAME_W, transform: `scale(${scale})`, transformOrigin: "center center" }}>
            <div ref={contentRef} className="relative">
              {padTop > 0 && <div style={{ height: padTop }} />}
              <GameByType
                key={key}
                gameType={gameType}
                campaignId="studio-preview"
                config={cfg}
                theme={{ brandColor: theme.brandColor, brandFg: theme.brandFg }}
                onComplete={() => setTimeout(() => setKey((k) => k + 1), 2400)}
              />
              {overlays && overlays.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  <StudioOverlays overlays={overlays} />
                </div>
              )}
              {texts && texts.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {onTextChange
                    ? <EditableTexts texts={texts} scale={scale} onChange={onTextChange} />
                    : <StudioTexts texts={texts} />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
