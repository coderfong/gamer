import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandSignupsView, type SignupRow } from "@/components/admin/BrandSignupsView";
import { ClientAccessPanel } from "@/components/admin/ClientAccessPanel";

export const dynamic = "force-dynamic";

// Per-brand dashboard: emails captured from this brand's public play hub.
export default async function BrandSignupsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS scopes to the owner, so a foreign id returns nothing.
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, public_slug, client_access_key")
    .eq("id", params.id)
    .maybeSingle();
  if (!brand) notFound();

  const { data: rows } = await supabase
    .from("brand_signups")
    .select("id, email, name, game_type, won, marketing_consent, created_at")
    .eq("brand_id", params.id)
    .order("created_at", { ascending: false })
    .limit(2000);
  const signups = (rows as SignupRow[] | null) ?? [];
  const b = brand as { id: string; name: string; public_slug: string | null; client_access_key: string | null };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="ad space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{b.name} · Signups</h1>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            Emails captured from this brand&apos;s play hub. Export the consented list to re-engage them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/brand/${b.id}`} className="ad-btn ad-btn-ghost">Edit studio</Link>
          {b.public_slug ? (
            <Link href={`/b/${b.public_slug}`} target="_blank" className="ad-btn ad-btn-ghost">Open hub</Link>
          ) : null}
        </div>
      </header>

      <ClientAccessPanel
        brandId={b.id}
        publicSlug={b.public_slug}
        accessKey={b.client_access_key}
        appUrl={appUrl}
      />

      <BrandSignupsView brandName={b.name} signups={signups} />
    </div>
  );
}
