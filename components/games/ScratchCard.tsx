"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten, darken, mix, readableText } from "@/lib/games/colors";

// Lazy-load scratchcard-js on the client only; it touches window/document.
type SCM = typeof import("scratchcard-js");

const CARD = 320;

export function ScratchCard({ config, theme, onComplete }: GameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fired = useRef(false);
  const startTs = useRef<number>(0);
  const [scratched, setScratched] = useState(false);
  const pal = palette(theme.brandColor, theme.brandFg);

  const percentToReveal =
    Math.max(10, Math.min(90, (config?.percentToReveal as number | undefined) ?? 50));
  const coverImage = (config?.coverImage as string | undefined) ?? null;
  const resultImage = (config?.resultImage as string | undefined) ?? null;

  useEffect(() => {
    let scInstance: { destroy?: () => void } | null = null;
    let cancelled = false;
    startTs.current = performance.now();

    (async () => {
      const mod: SCM = await import("scratchcard-js");
      if (cancelled || !containerRef.current) return;
      const { ScratchCard: SC, SCRATCH_TYPE } = mod as unknown as {
        ScratchCard: new (sel: string, opts: Record<string, unknown>) => {
          init: () => Promise<void>;
          canvas: HTMLCanvasElement;
          addFinishCallback: (cb: () => void) => void;
          destroy?: () => void;
        };
        SCRATCH_TYPE: { SPRAY: string; LINE: string; CIRCLE: string };
      };

      const sc = new SC(`#${containerRef.current.id}`, {
        scratchType: SCRATCH_TYPE.SPRAY,
        containerWidth: CARD,
        containerHeight: CARD,
        imageForwardSrc: coverImage ?? makeCoverDataUrl(pal.brand, pal.fg),
        imageBackgroundSrc: resultImage ?? makeBackgroundDataUrl(pal.accent, pal.light),
        htmlBackground: "",
        clearZoneRadius: 32,
        percentToFinish: percentToReveal,
        nPoints: 30,
        pointSize: 4,
        callback: () => {
          if (fired.current) return;
          fired.current = true;
          setScratched(true);
          onComplete({
            outcome: "scratched",
            durationMs: performance.now() - startTs.current,
          });
        },
      });
      try {
        await sc.init();
      } catch {
        if (!fired.current) {
          fired.current = true;
          onComplete({ outcome: "scratch_init_failed" });
        }
      }
      scInstance = sc;
    })();

    return () => {
      cancelled = true;
      if (scInstance?.destroy) scInstance.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverImage, resultImage, percentToReveal, pal.brand, pal.accent]);

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-base font-semibold flex items-center gap-2" style={{ color: pal.dark }}>
        <span className="text-xl">🪙</span> Scratch the panel to reveal
      </p>
      <div
        className="relative rounded-3xl p-3"
        style={{
          background: `linear-gradient(150deg, ${lighten(pal.brand, 0.25)}, ${darken(pal.brand, 0.2)})`,
          boxShadow: `0 20px 44px -16px ${mix(pal.dark, "#000", 0.35)}, inset 0 2px 4px rgba(255,255,255,0.3)`,
        }}
      >
        <div
          id="scratchcard-container"
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden touch-none select-none"
          style={{
            width: CARD,
            height: CARD,
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25)",
          }}
        />
        {/* sheen sweep over the foil while unscratched */}
        {!scratched ? (
          <div
            className="pointer-events-none absolute inset-3 rounded-2xl overflow-hidden"
            style={{ mixBlendMode: "overlay" }}
          >
            <div
              className="absolute inset-y-0 -inset-x-1/2"
              style={{
                background:
                  "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2.8s linear infinite",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function makeCoverDataUrl(brand: string, fg: string): string {
  const c0 = lighten(brand, 0.2);
  const c1 = darken(brand, 0.18);
  const sheen = lighten(brand, 0.55);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${CARD}' height='${CARD}'>` +
    `<defs>` +
    `<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0%' stop-color='${c0}'/><stop offset='100%' stop-color='${c1}'/>` +
    `</linearGradient>` +
    `<pattern id='hatch' width='14' height='14' patternTransform='rotate(45)' patternUnits='userSpaceOnUse'>` +
    `<rect width='14' height='14' fill='none'/>` +
    `<line x1='0' y1='0' x2='0' y2='14' stroke='${sheen}' stroke-opacity='0.18' stroke-width='6'/>` +
    `</pattern>` +
    `</defs>` +
    `<rect width='${CARD}' height='${CARD}' fill='url(#g)'/>` +
    `<rect width='${CARD}' height='${CARD}' fill='url(#hatch)'/>` +
    `<rect x='10' y='10' width='${CARD - 20}' height='${CARD - 20}' rx='16' fill='none' ` +
    `stroke='${sheen}' stroke-opacity='0.5' stroke-width='2' stroke-dasharray='6 8'/>` +
    `<text x='50%' y='46%' dominant-baseline='middle' text-anchor='middle' ` +
    `fill='${fg}' font-size='30' font-weight='800' font-family='system-ui,sans-serif' ` +
    `letter-spacing='3'>SCRATCH</text>` +
    `<text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle' ` +
    `fill='${fg}' fill-opacity='0.8' font-size='15' font-family='system-ui,sans-serif' ` +
    `letter-spacing='4'>HERE TO WIN</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeBackgroundDataUrl(accent: string, light: string): string {
  const fg = readableText(light);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${CARD}' height='${CARD}'>` +
    `<defs>` +
    `<radialGradient id='bg' cx='50%' cy='42%' r='70%'>` +
    `<stop offset='0%' stop-color='${lighten(accent, 0.45)}'/>` +
    `<stop offset='100%' stop-color='${light}'/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width='${CARD}' height='${CARD}' fill='url(#bg)'/>` +
    `<text x='50%' y='40%' dominant-baseline='middle' text-anchor='middle' font-size='84'>🎉</text>` +
    `<text x='50%' y='68%' dominant-baseline='middle' text-anchor='middle' ` +
    `fill='${fg}' font-size='24' font-weight='800' font-family='system-ui,sans-serif'>You did it!</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
