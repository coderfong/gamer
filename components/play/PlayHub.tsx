"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MiniGamePreview } from "@/components/admin/brand/MiniGamePreview";
import { getEnabledGames } from "@/lib/games/gameMeta";
import type { GameMeta } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BrandStudioConfig } from "@/lib/types/studio";
import { studioTextCss } from "@/lib/types/studio";
import { buildGameConfig } from "@/lib/brand/gameAssets";

const ENABLED = getEnabledGames();

// Standardised typography for the hub chrome (header + cards): plain system font,
// near-black, lighter weight — kept consistent across every brand. Per-brand
// fonts/colours still apply inside the game phone itself.
const STD_FONT = "var(--font-sans)";

// Public, just-for-fun hub: pick any of the brand's games and play it, themed and
// asset-dressed per the Brand Studio config. No prizes / rewards.
export function PlayHub({ brandName, config, captureSlug }: { brandName: string; config: BrandStudioConfig; captureSlug?: string }) {
  const theme = config.theme;

  return (
    <main
      className="studio-skin arcade-shell relative min-h-screen overflow-hidden px-4 py-10"
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

      {/* Decorative brand-colour glows behind the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--brand-color)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-color)" }}
      />

      <div className="relative max-w-5xl mx-auto">
        <header className="text-center mb-12" style={{ fontFamily: STD_FONT }}>
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.18em]"
            style={{
              fontWeight: 600,
              color: "var(--brand-color)",
              background: "color-mix(in srgb, var(--brand-color) 14%, white)",
              border: "1px solid color-mix(in srgb, var(--brand-color) 30%, white)",
            }}
          >
            <span>●</span> Play Hub
          </span>
          <h1 className="mt-5 text-4xl sm:text-6xl tracking-tight" style={{ fontWeight: 600, color: "#18181b" }}>
            {brandName || "Play"}
          </h1>
          <p className="mt-3 text-lg sm:text-xl" style={{ fontWeight: 400, color: "#3f3f46" }}>
            Every game — play any of them right here
          </p>
        </header>

        {/* All games shown as live, playable previews in a single grid. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {ENABLED.map(([gt, meta]) => (
            <GamePreviewCard key={gt} gameType={gt as GameType} meta={meta} config={config} captureSlug={captureSlug} />
          ))}
        </div>

        {/* Custom-game CTA — distinct, brand-filled card below the previews */}
        <div className="mt-14 max-w-md mx-auto">
          <CustomGameCard brandName={brandName} />
        </div>
      </div>
    </main>
  );
}

// One live, playable game preview in the hub grid, with its label/use-case
// underneath. The heavy game only mounts once it scrolls near the viewport, so
// opening the page doesn't spin up every game at once.
function GamePreviewCard({
  gameType,
  meta,
  config,
  captureSlug,
}: {
  gameType: GameType;
  meta: GameMeta;
  config: BrandStudioConfig;
  captureSlug?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center">
      {inView ? (
        <GameStage gameType={gameType} config={config} captureSlug={captureSlug} />
      ) : (
        <PhonePlaceholder />
      )}
      <div className="mt-4 text-center" style={{ fontFamily: STD_FONT }}>
        <div className="text-lg leading-tight" style={{ fontWeight: 600, color: "#18181b" }}>
          {meta.label}
        </div>
        <div className="mt-1 text-sm leading-snug" style={{ fontWeight: 400, color: "#52525b" }}>
          {meta.useCase}
        </div>
      </div>
    </div>
  );
}

// Phone-shaped skeleton shown before a preview mounts — keeps the grid from
// jumping as games lazily come into view.
function PhonePlaceholder() {
  return (
    <div
      className="mx-auto w-full animate-pulse"
      style={{ maxWidth: 320, aspectRatio: "1 / 1.92", borderRadius: 26, background: "#e4e4e7" }}
    />
  );
}

// A distinct, brand-filled card inviting visitors to commission their own game.
// Opens a self-contained lead modal posting to /api/contact (same store the
// landing-page "Book a call" uses).
function CustomGameCard({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex flex-col overflow-hidden rounded-2xl p-5 text-left transition-all duration-150 active:translate-y-1 active:scale-[0.98] border-2 border-black/80 shadow-[4px_5px_0_rgba(0,0,0,0.85)] hover:-translate-y-1 hover:shadow-[6px_8px_0_rgba(0,0,0,0.85)]"
        style={{
          fontFamily: STD_FONT,
          color: "var(--brand-fg)",
          background: "linear-gradient(150deg, color-mix(in srgb, var(--brand-color) 78%, black) 0%, var(--brand-color) 100%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-25 blur-xl"
          style={{ background: "#ffffff" }}
        />
        <div
          className="grid place-items-center h-14 w-14 rounded-2xl text-3xl transition-transform duration-150 group-hover:rotate-6 group-hover:scale-105"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
        >
          ✨
        </div>
        <div className="mt-4 text-xl leading-tight" style={{ fontWeight: 700 }}>
          Custom game
        </div>
        <div className="mt-1.5 text-sm leading-snug" style={{ fontWeight: 400, opacity: 0.9 }}>
          Want your own branded game? Let&apos;s build it for you.
        </div>
        <span
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm"
          style={{ fontWeight: 600 }}
        >
          Get yours <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </button>
      {open && <CustomGameModal brandName={brandName} onClose={() => setOpen(false)} />}
    </>
  );
}

type Status = "idle" | "sending" | "sent" | "error";

function CustomGameModal({ brandName, onClose }: { brandName: string; onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    // Attribute the lead to the brand page it came from.
    const note = data.message?.trim();
    data.message = `[Custom game request from "${brandName}" play hub]${note ? `\n\n${note}` : ""}`;
    setStatus("sending");
    setErr(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        setStatus("error");
        setErr("Couldn't send right now — please try again.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setErr("Network error — please try again.");
    }
  }

  const inputCls = "w-full rounded-xl border-2 border-black/15 px-3.5 py-2.5 text-base outline-none focus:border-[var(--brand-color)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Request a custom game"
      style={{ fontFamily: STD_FONT, color: "#18181b" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl border-2 border-black/80 bg-white p-6 shadow-[6px_8px_0_rgba(0,0,0,0.85)]">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-xl hover:bg-black/5"
        >
          ×
        </button>

        {status === "sent" ? (
          <div className="py-6 text-center">
            <div className="text-4xl">✅</div>
            <h3 className="mt-3 text-2xl" style={{ fontWeight: 600 }}>
              Thanks — we&apos;ll be in touch!
            </h3>
            <p className="mt-2 text-base" style={{ color: "#52525b" }}>
              Your request has been sent. We&apos;ll reach out shortly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-full px-5 py-2.5 text-base"
              style={{ fontWeight: 600, background: "var(--brand-color)", color: "var(--brand-fg)" }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-2xl tracking-tight" style={{ fontWeight: 600 }}>
              Request a custom game
            </h3>
            <p className="mt-1.5 text-base" style={{ color: "#52525b" }}>
              Tell us a little about your brand and we&apos;ll build a game like these for you.
            </p>
            <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
              <input className={inputCls} name="name" placeholder="Your name" required maxLength={120} />
              <input className={inputCls} type="email" name="email" placeholder="Email" required maxLength={200} />
              <input className={inputCls} name="phone" placeholder="Phone (optional)" maxLength={40} />
              <input className={inputCls} name="company" placeholder="Company (optional)" maxLength={120} />
              <textarea
                className={inputCls}
                name="message"
                placeholder="What kind of game are you after? (optional)"
                rows={3}
                maxLength={2000}
              />
              {/* honeypot — hidden from humans */}
              <input
                className="absolute -left-[9999px] h-0 w-0"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              {status === "error" && (
                <p className="text-sm" style={{ color: "#dc2626" }}>
                  {err}
                </p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-1 rounded-full px-5 py-3 text-base transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{ fontWeight: 600, background: "var(--brand-color)", color: "var(--brand-fg)" }}
              >
                {status === "sending" ? "Sending…" : "Send request"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Renders the selected game in a full phone mockup that scales the whole game to
// fit (no cropping) — reuses the Brand Studio's live preview frame.
function GameStage({ gameType, config, captureSlug }: { gameType: GameType; config: BrandStudioConfig; captureSlug?: string }) {
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
        captureSlug={captureSlug}
      />
    </div>
  );
}
