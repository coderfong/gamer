import type { Theme } from "@/lib/types/campaign";

export function BrandingPanel({ theme, campaignName }: { theme: Theme; campaignName: string }) {
  return (
    <header className="flex items-center gap-3 mb-6">
      {theme.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.logoUrl}
          alt=""
          className="h-12 w-12 rounded-xl object-contain bg-white/90 border-2 border-white/30 p-1"
        />
      ) : (
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center arcade-title text-2xl"
          style={{
            background: "var(--brand-color)",
            color: "var(--brand-fg)",
            boxShadow: "inset 0 2px 0 rgba(255,255,255,0.3)",
          }}
        >
          {campaignName.slice(0, 1)}
        </div>
      )}
      <div>
        <div className="arcade-title text-2xl text-white">{campaignName}</div>
        {theme.headline ? <div className="text-sm arcade-muted">{theme.headline}</div> : null}
      </div>
    </header>
  );
}
