"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameByType } from "@/components/games/GameWrapper";
import { getGameMeta } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BrandStudioTheme, BrandStudioText, StudioGameAssets } from "@/lib/types/studio";
import { studioTextCss } from "@/lib/types/studio";
import { optimizedImage } from "@/lib/brand/imageOpt";
import { StudioOverlays } from "./StudioOverlays";
import { EditableOverlays } from "./EditableOverlays";
import { StudioTexts } from "./StudioTexts";
import { EditableTexts } from "./EditableTexts";
import { PrizeDisplay } from "@/components/shared/PrizeDisplay";
import { VoucherTicket } from "@/components/shared/VoucherTicket";
import type { StudioText } from "@/lib/types/studio";
import type { OverlayElement } from "@/lib/types/campaign";

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
  onOverlayChange,
  selectedOverlayId,
  onSelectOverlay,
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
  onOverlayChange?: (id: string, patch: Partial<OverlayElement>) => void;
  selectedOverlayId?: string | null;
  onSelectOverlay?: (id: string) => void;
  text?: BrandStudioText;
  phoneWidth?: number;
  height?: number; // ignored — kept for caller compatibility
}) {
  const cfg = useMemo(() => config, [config]);
  const [key, setKey] = useState(0);
  const [size, setSize] = useState({ w: GAME_W, h: GAME_W });
  const contentRef = useRef<HTMLDivElement>(null);

  // Preview the FULL flow: play → result. After a game finishes we show a sample
  // win/lose result screen (themed by the same phone frame), then replay with the
  // outcome flipped so the client sees both a win and a loss over two plays.
  const [stage, setStage] = useState<"playing" | "result">("playing");
  const [won, setWon] = useState(true);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replay = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setStage("playing");
    setKey((k) => k + 1);
  }, []);

  const handleComplete = useCallback(() => {
    setStage("result");
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setWon((w) => !w);
      setStage("playing");
      setKey((k) => k + 1);
    }, 3400);
  }, []);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

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
  }, [key, stage]);

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
            src={optimizedImage(bg.url, Math.ceil(phoneWidth * 2))}
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
          onClick={replay}
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
              {stage === "result" ? (
                <PreviewResult won={won} brandColor={theme.brandColor} />
              ) : (
                <>
                  {/* Big main header above the game — uses the headline (display)
                      text settings via the .arcade-display class. */}
                  <div
                    className="arcade-display text-center leading-none"
                    style={{ fontSize: text?.display.size ?? 30, color: "var(--brand-color)", marginBottom: gameType === "spin_wheel" ? 64 : 32, letterSpacing: "0.12em" }}
                  >
                    {getGameMeta(gameType).headline}
                  </div>
                  {padTop > 0 && <div style={{ height: padTop }} />}
                  <GameByType
                    key={key}
                    gameType={gameType}
                    campaignId="studio-preview"
                    config={cfg}
                    theme={{ brandColor: theme.brandColor, brandFg: theme.brandFg }}
                    onComplete={handleComplete}
                  />
                  {overlays && overlays.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                      {onOverlayChange
                        ? <EditableOverlays overlays={overlays} scale={scale} onChange={onOverlayChange} selectedId={selectedOverlayId} onSelect={onSelectOverlay} />
                        : <StudioOverlays overlays={overlays} />}
                    </div>
                  )}
                  {texts && texts.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                      {onTextChange
                        ? <EditableTexts texts={texts} scale={scale} onChange={onTextChange} />
                        : <StudioTexts texts={texts} />}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sample win/lose result shown after a preview play-through, so a client sees the
// whole flow (play → result). It renders inside the same phone frame, so it
// inherits the brand background, colours and fonts — same styling as the game.
function PreviewResult({ won, brandColor }: { won: boolean; brandColor?: string }) {
  return (
    <div className="space-y-4 py-2">
      {won ? (
        <>
          <PrizeDisplay name="10% OFF" description="Your reward is ready" isLoss={false} />
          <VoucherTicket code="DEMO-2K9X" prizeName="10% OFF" status="valid" showQr brandColor={brandColor} />
        </>
      ) : (
        <PrizeDisplay name="So close!" description="Better luck next time — play again!" isLoss />
      )}
    </div>
  );
}
