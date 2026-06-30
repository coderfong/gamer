"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameByType } from "@/components/games/GameWrapper";
import { getGameMeta } from "@/lib/games/gameMeta";
import type { GameType, GameResult } from "@/lib/types/game";
import type { BrandStudioTheme, BrandStudioText, StudioGameAssets } from "@/lib/types/studio";
import { studioTextCss } from "@/lib/types/studio";
import { optimizedImage } from "@/lib/brand/imageOpt";
import { StudioOverlays } from "./StudioOverlays";
import { EditableOverlays } from "./EditableOverlays";
import { StudioTexts } from "./StudioTexts";
import { EditableTexts } from "./EditableTexts";
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
  captureSlug,
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
  // When set (brand play hub), the result's email forms capture to this brand
  // via /api/hub/<slug>/signup. Unset (studio editor / landing portfolio) = demo.
  captureSlug?: string;
}) {
  const cfg = useMemo(() => config, [config]);
  const [key, setKey] = useState(0);
  const [size, setSize] = useState({ w: GAME_W, h: GAME_W });
  const contentRef = useRef<HTMLDivElement>(null);

  // Preview the FULL flow: play → result. After a game finishes we show the
  // matching win/lose result (derived from what the player actually saw), themed
  // by the same phone frame. We stay on the result until the player taps replay.
  const [stage, setStage] = useState<"playing" | "result">("playing");
  const [outcome, setOutcome] = useState<{ won: boolean; label: string | null; image: string | null }>({ won: true, label: null, image: null });

  const replay = useCallback(() => {
    setStage("playing");
    setKey((k) => k + 1);
  }, []);

  const handleComplete = useCallback((r: GameResult) => {
    setOutcome(interpretResult(r));
    setStage("result");
  }, []);

  // Switching to a different game must always show THAT game — even if the
  // preview was sitting on a result / email screen. Reset to playing on change.
  const prevGame = useRef(gameType);
  useEffect(() => {
    if (prevGame.current === gameType) return;
    prevGame.current = gameType;
    setStage("playing");
    setOutcome({ won: true, label: null, image: null });
    setKey((k) => k + 1);
  }, [gameType]);

  // Capture a hub email against the brand (no-op in non-hub previews). On a win
  // the brand mints a real voucher code, which we return so the result screen can
  // show a scannable, redeemable QR. Best-effort — never blocks the result UI.
  const captureEmail = useCallback(
    async (email: string, consent: boolean): Promise<string | null> => {
      if (!captureSlug) return null;
      try {
        const res = await fetch(`/api/hub/${captureSlug}/signup`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, gameType, won: outcome.won, marketingConsent: consent, prizeLabel: outcome.label }),
        });
        const json = await res.json().catch(() => ({}));
        return (json?.voucherCode as string | null) ?? null;
      } catch {
        return null;
      }
    },
    [captureSlug, gameType, outcome.won, outcome.label],
  );

  const bezel = 6;
  const innerW = phoneWidth - bezel * 2;
  const screenH = Math.round(phoneWidth * 1.92);
  const topPad = 24;  // notch zone
  const sidePad = 14; // breathing room from the screen edges
  const availW = innerW - sidePad * 2;
  const availH = screenH - topPad - 14;

  // Measure the game's rendered size and scale to fit the phone screen.
  //
  // Use offsetWidth/offsetHeight, NOT scrollWidth/scrollHeight: the measured
  // node lives inside the `transform: scale(...)` wrapper below, and WebKit /
  // iOS Safari report scroll* in *transformed* units. Reading those fed the
  // fit-scale back into itself, so the game (and its text) shrank a little on
  // every replay. offset* are layout pixels — transform-independent on every
  // browser. The 1px threshold stops sub-pixel jitter from re-triggering.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const w = Math.max(el.offsetWidth, GAME_W);
      const h = el.offsetHeight || GAME_W;
      setSize((prev) => (Math.abs(prev.w - w) <= 1 && Math.abs(prev.h - h) <= 1 ? prev : { w, h }));
    };
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
                <PreviewResult won={outcome.won} label={outcome.label} image={outcome.image} gameType={gameType} brandColor={theme.brandColor} onTryAgain={replay} onCapture={captureEmail} />
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

// Turn a game's reported result into a win/lose + prize label for the preview.
// Games that can tell visually pass `won` (and sometimes a `prizeLabel`, e.g. the
// wheel slice); otherwise we infer from the outcome string / score, defaulting to
// a win for reveal-style games (pick-a-box, card flip) that always land on a prize.
function interpretResult(r: GameResult): { won: boolean; label: string | null; image: string | null } {
  const label = r.prizeLabel && r.prizeLabel.trim() ? r.prizeLabel.trim() : null;
  const image = r.prizeImage && r.prizeImage.trim() ? r.prizeImage : null;
  if (typeof r.won === "boolean") return { won: r.won, label, image };
  const outcome = String(r.outcome ?? "");
  if (/miss|wrong|fail|lose|timeout|better.?luck/i.test(outcome)) return { won: false, label, image };
  if (typeof r.score === "number") return { won: r.score > 0, label, image };
  return { won: true, label, image };
}

// A small brand-styled email capture form used on the result screens. On a brand
// play hub it captures to that brand; in other previews it just shows the flow.
function EmailGateForm({
  cta,
  placeholder = "you@email.com",
  consentLabel,
  defaultConsent = false,
  onSubmit,
}: {
  cta: string;
  placeholder?: string;
  consentLabel?: string;       // optional opt-in checkbox
  defaultConsent?: boolean;    // implied consent when there's no checkbox
  onSubmit: (email: string, consent: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(defaultConsent);
  const [sent, setSent] = useState(false);
  return (
    <form
      className="mx-auto flex w-full max-w-[300px] flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
        onSubmit(email, consent);
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-2 border-black/15 px-3.5 py-2.5 text-base outline-none focus:border-[var(--brand-color)]"
        style={{ fontFamily: "var(--font-body)" }}
      />
      {consentLabel ? (
        <label className="flex items-start gap-2 text-left text-xs" style={{ color: "#52525b" }}>
          <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{consentLabel}</span>
        </label>
      ) : null}
      <button
        type="submit"
        disabled={sent}
        className="rounded-xl px-4 py-2.5 text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-70"
        style={{ background: "var(--brand-color)", color: "var(--brand-fg)" }}
      >
        {sent ? "Saved ✓" : cta}
      </button>
    </form>
  );
}

// The follow-up result shown after a preview play-through, so a client sees the
// whole flow (play → capture → result). It renders inside the same phone frame,
// so it inherits the brand background, colours and fonts — same styling as the
// game. Headline uses the lighter body font at a large size per the brand brief.
//
// Win  → email GATE first (claim to reveal the prize + voucher).
// Loss → email ENTRY to try again and receive new games / offers.
function PreviewResult({
  won,
  label,
  image,
  gameType,
  brandColor,
  onTryAgain,
  onCapture,
}: {
  won: boolean;
  label: string | null;
  image: string | null;
  gameType: GameType;
  brandColor?: string;
  onTryAgain: () => void;
  onCapture?: (email: string, consent: boolean) => Promise<string | null> | void;
}) {
  const [claimed, setClaimed] = useState(false);
  const [voucherCode, setVoucherCode] = useState<string | null>(null);

  // Same display font as the game's headline, just a bit thinner than the heavy
  // arcade-title default.
  const heading: React.CSSProperties = {
    fontFamily: "var(--font-arcade)",
    fontWeight: 400,
    fontSize: "2.6rem",
    lineHeight: 1.1,
    letterSpacing: "0.5px",
  };
  // The exact asset on the slice/box the player landed on (already optimized).
  const prizeImg = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="mx-auto h-24 w-24 object-contain drop-shadow" />
  ) : null;
  // Spin the Wheel already shows the prize on the wheel slice, so the win screen
  // omits the redundant prize image.
  const winImg = gameType === "spin_wheel" ? null : prizeImg;

  if (!won) {
    return (
      <div className="py-5 text-center space-y-3">
        {prizeImg}
        <h2 style={{ ...heading, color: "var(--ink, #231b2e)" }}>Better luck next time!</h2>
        <p className="arcade-muted text-sm">
          Enter your email for another try — and to get new games &amp; offers.
        </p>
        <EmailGateForm
          cta="Try again"
          defaultConsent
          onSubmit={(email, consent) => {
            onCapture?.(email, consent);
            onTryAgain();
          }}
        />
      </div>
    );
  }

  // Win: gate the prize behind email capture, then reveal.
  if (!claimed) {
    return (
      <div className="py-5 text-center space-y-3">
        <h2 style={{ ...heading, color: "var(--brand-color)" }}>You won! 🎉</h2>
        <p className="arcade-muted text-sm">Enter your email to claim your prize.</p>
        <EmailGateForm
          cta="Claim prize"
          consentLabel="Keep me updated with new games & offers"
          onSubmit={async (email, consent) => {
            const code = await onCapture?.(email, consent);
            if (code) setVoucherCode(code);
            setClaimed(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2 text-center">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] arcade-muted">🎉 You won 🎉</div>
        {winImg}
        <h2 style={{ ...heading, color: "var(--brand-color)" }}>{label ?? "You won a prize!"}</h2>
      </div>
      <VoucherTicket code={voucherCode ?? "DEMO-2K9X"} prizeName={label ?? "Your reward"} status="valid" showQr brandColor={brandColor} />
    </div>
  );
}
