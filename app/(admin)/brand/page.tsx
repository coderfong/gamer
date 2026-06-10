import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandStudio } from "@/components/admin/brand/BrandStudio";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Base columns always exist — fetch id/name first so uploads (which need the
  // brand id as the storage path prefix) always work.
  const { data: base } = await supabase
    .from("brands")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  // Studio columns may not exist yet (migration 0008). Tolerate failure so the
  // page still renders before the migration is applied.
  let studio: unknown = {};
  let publicSlug: string | null = null;
  const { data: extra } = await supabase
    .from("brands")
    .select("studio, public_slug")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (extra) {
    studio = (extra as { studio?: unknown }).studio ?? {};
    publicSlug = (extra as { public_slug?: string | null }).public_slug ?? null;
  }

  return (
    <BrandStudio
      brandId={(base as { id?: string } | null)?.id ?? ""}
      initialName={(base as { name?: string } | null)?.name ?? ""}
      initialConfig={studio}
      initialPublicSlug={publicSlug}
    />
  );
}
