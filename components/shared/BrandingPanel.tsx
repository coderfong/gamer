import type { Theme } from "@/lib/types/campaign";

export function BrandingPanel({ theme, campaignName }: { theme: Theme; campaignName: string }) {
  return (
    <header className="flex items-center gap-3 mb-6">
      {theme.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={theme.logoUrl} alt="" className="h-10 w-10 rounded object-contain bg-white border" />
      ) : (
        <div className="h-10 w-10 rounded bg-brand text-brand-fg flex items-center justify-center font-bold">
          {campaignName.slice(0, 1)}
        </div>
      )}
      <div>
        <div className="font-semibold">{campaignName}</div>
        {theme.headline ? <div className="text-sm text-zinc-500">{theme.headline}</div> : null}
      </div>
    </header>
  );
}
