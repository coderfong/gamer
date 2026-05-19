"use client";
import { useEffect, useRef } from "react";
import type { GameProps } from "@/lib/types/game";

// Lazy-load scratchcard-js on the client only; it touches window/document.
type SCM = typeof import("scratchcard-js");

const DEFAULT_COVER_COLOR = "#cccccc";

export function ScratchCard({ config, theme, onComplete }: GameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fired = useRef(false);
  const startTs = useRef<number>(0);

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
      // Library exports `ScratchCard` and `SCRATCH_TYPE`.
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
        containerWidth: 320,
        containerHeight: 320,
        imageForwardSrc: coverImage ?? makeCoverDataUrl(theme.brandColor ?? DEFAULT_COVER_COLOR),
        imageBackgroundSrc: resultImage ?? makeBackgroundDataUrl(theme.brandColor ?? "#16a34a"),
        htmlBackground: "",
        clearZoneRadius: 30,
        percentToFinish: percentToReveal,
        nPoints: 30,
        pointSize: 4,
        callback: () => {
          if (fired.current) return;
          fired.current = true;
          onComplete({
            outcome: "scratched",
            durationMs: performance.now() - startTs.current,
          });
        },
      });
      try {
        await sc.init();
      } catch {
        // init can throw if images fail to load; surface as an immediate complete
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
  }, [coverImage, resultImage, percentToReveal, theme.brandColor, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-600">Scratch to reveal!</p>
      <div
        id="scratchcard-container"
        ref={containerRef}
        className="rounded-xl overflow-hidden touch-none select-none"
        style={{ width: 320, height: 320 }}
      />
    </div>
  );
}

function makeCoverDataUrl(color: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'>` +
    `<rect width='320' height='320' fill='${color}'/>` +
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' ` +
    `fill='white' font-size='28' font-family='sans-serif'>Scratch here</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
function makeBackgroundDataUrl(color: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'>` +
    `<rect width='320' height='320' fill='${color}'/>` +
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' ` +
    `fill='white' font-size='48' font-family='sans-serif'>🎁</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
