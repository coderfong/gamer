import type { Theme } from "@/lib/types/campaign";
import { optimizedImage } from "@/lib/brand/imageOpt";

export function BrandingPanel({ theme, campaignName }: { theme: Theme; campaignName: string }) {
  const freeMode = !!theme.nameBlock;

  return (
    <header className="flex items-center gap-3 mb-4">
      {theme.logoUrl ? (
        // Rendered at 48px (h-12 w-12); a 96px optimized copy covers 2x screens.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={optimizedImage(theme.logoUrl, 96) ?? theme.logoUrl}
          alt=""
          className="h-12 w-12 rounded-xl object-contain bg-white/90 border-2 border-white/30 p-1"
        />
      ) : (
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center arcade-title text-2xl shrink-0"
          style={{
            background: "var(--brand-color)",
            color: "var(--brand-fg)",
            boxShadow: "inset 0 2px 0 rgba(255,255,255,0.3)",
          }}
        >
          {campaignName.slice(0, 1)}
        </div>
      )}
      {/* Name only in header — headline renders above game panel separately */}
      {!freeMode && (
        <div className="arcade-title text-2xl leading-tight">{campaignName}</div>
      )}
    </header>
  );
}
