"use client";

import type { StampCardAssets, BrandStudioTheme } from "@/lib/types/studio";

// A brand-themed digital stamp card driven entirely by StampCardAssets — the
// loyalty equivalent of a game preview. Used in the Brand Studio preview today,
// and reusable by a real rewards page later. Image slots fall back to themed
// defaults so an empty config still looks complete.
export function StampCard({
  assets,
  theme,
  brandName,
  fallbackLogo,
  stamps,
  onTapNext,
  hideHeader = false,
}: {
  assets: StampCardAssets;
  theme: BrandStudioTheme;
  brandName: string;
  fallbackLogo?: string | null;
  stamps: number;
  onTapNext?: () => void; // when set, the next empty slot is tappable
  hideHeader?: boolean;   // omit the brand header (e.g. when the page already shows it)
}) {
  const goal = assets.goal || 5;
  const collected = Math.max(0, Math.min(goal, stamps));
  const full = collected >= goal;
  const brand = theme.brandColor;
  const brandFg = theme.brandFg;
  const logo = assets.logoUrl || fallbackLogo || null;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 22,
        background: theme.bgColor,
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 18px 40px -26px rgba(0,0,0,0.45)",
      }}
    >
      {/* Background image layer */}
      {assets.bg?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assets.bg.url}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{
            objectFit: "cover",
            opacity: assets.bg.opacity ?? 1,
            transform: `translate(${assets.bg.x ?? 0}%, ${assets.bg.y ?? 0}%) scale(${assets.bg.scale ?? 1})`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative p-5">
        {/* Header */}
        {!hideHeader && (
          <div className="flex items-center gap-2.5">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-10 w-10 rounded-xl object-contain" style={{ background: "rgba(255,255,255,0.85)" }} />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl text-lg font-extrabold" style={{ background: brand, color: brandFg }}>
                {(brandName || "B").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="leading-tight">
              <div className="text-[15px] font-extrabold" style={{ color: "#18181b" }}>{brandName || "Your brand"}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: brand }}>Rewards</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xl font-extrabold" style={{ color: brand }}>{collected}/{goal}</div>
              <div className="text-[10px] font-semibold" style={{ color: "#71717a" }}>stamps</div>
            </div>
          </div>
        )}

        {/* Stamp grid on a legibility panel */}
        <div className={`${hideHeader ? "" : "mt-4"} rounded-2xl p-3`} style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(2px)" }}>
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-bold" style={{ color: "#3f3f46" }}>
              Buy {goal}, get 1 free
            </div>
            {hideHeader && (
              <div className="text-[13px] font-extrabold" style={{ color: brand }}>{collected}/{goal}</div>
            )}
          </div>
          <div className="mt-2.5 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(goal, 5)}, 1fr)` }}>
            {Array.from({ length: goal }).map((_, i) => {
              const isFilled = i < collected;
              const isNext = !!onTapNext && i === collected && !full;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={isNext ? onTapNext : undefined}
                  aria-label={isFilled ? `Stamp ${i + 1} collected` : isNext ? "Add a stamp" : `Stamp ${i + 1} empty`}
                  className="grid aspect-square place-items-center overflow-hidden rounded-xl transition-transform active:scale-90"
                  style={
                    isFilled
                      ? { background: assets.stampFilledUrl ? "transparent" : brand, border: `2px solid ${brand}` }
                      : {
                          background: "rgba(0,0,0,0.02)",
                          border: `2px ${isNext ? "dashed" : "solid"} ${isNext ? brand : "rgba(0,0,0,0.12)"}`,
                          cursor: isNext ? "pointer" : "default",
                        }
                  }
                >
                  {isFilled ? (
                    assets.stampFilledUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assets.stampFilledUrl} alt="" className="h-full w-full object-contain" />
                    ) : assets.stampEmoji ? (
                      <span style={{ fontSize: 20 }}>{assets.stampEmoji}</span>
                    ) : (
                      <span style={{ color: brandFg, fontSize: 18, fontWeight: 800 }}>✓</span>
                    )
                  ) : assets.stampEmptyUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assets.stampEmptyUrl} alt="" className="h-full w-full object-contain" style={{ opacity: 0.4 }} />
                  ) : (
                    <span style={{ color: isNext ? brand : "#c9c9d2", fontSize: 16, fontWeight: 800 }}>{isNext ? "+" : ""}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reward area */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: full ? brand : "rgba(255,255,255,0.82)", color: full ? brandFg : "#18181b" }}>
          {full && assets.rewardImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assets.rewardImageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" style={{ background: "rgba(255,255,255,0.85)" }} />
          ) : (
            <span className="text-xl">{assets.rewardEmoji || (full ? "🎉" : "🎁")}</span>
          )}
          <div className="leading-tight">
            <div className="text-[14px] font-extrabold">{assets.rewardLabel || "Free reward"}</div>
            <div className="text-[12px] font-semibold" style={{ opacity: 0.85 }}>
              {full ? "Reward unlocked — ready to redeem" : `${goal - collected} more to unlock`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
