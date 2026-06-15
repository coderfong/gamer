import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandCard, type BrandCardData } from "@/components/admin/BrandCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { readStudioConfig } from "@/lib/types/studio";
import { createBrand } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string };

export default async function BrandsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // `studio`/`public_slug` arrive with migration 0008; tolerate their absence so
  // the page still renders on un-migrated databases.
  const { data: rows } = await supabase
    .from("brands")
    .select("id, name, studio, public_slug, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const brands: BrandCardData[] = (rows ?? []).map((r) => {
    const row = r as {
      id: string;
      name: string;
      studio?: unknown;
      public_slug?: string | null;
    };
    const config = readStudioConfig(row.studio);
    return {
      id: row.id,
      name: row.name,
      public_slug: row.public_slug ?? null,
      games_count: Object.keys(config.games).length,
      brand_color: config.theme.brandColor,
      logo_url: config.logoUrl,
    };
  });

  return (
    <div className="ad space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Brands</h1>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            Each brand is a themed game collection with its own public play hub.
          </p>
        </div>
        <form action={createBrand}>
          <button type="submit" className="ad-btn ad-btn-primary shrink-0">
            + New brand
          </button>
        </form>
      </header>

      {searchParams.error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
          Couldn’t create brand: {searchParams.error}
        </p>
      ) : null}

      {brands.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <BrandCard key={b.id} brand={b} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🎨"
          title="No brands yet"
          description="Create your first brand to theme every game at once and share them through a single QR code."
        >
          <form action={createBrand}>
            <button type="submit" className="ad-btn ad-btn-primary">
              + New brand
            </button>
          </form>
        </EmptyState>
      )}
    </div>
  );
}
