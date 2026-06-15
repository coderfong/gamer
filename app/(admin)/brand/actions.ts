"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";
import type { BrandStudioConfig } from "@/lib/types/studio";

export async function saveBrandName(
  brandId: string,
  name: string,
): Promise<{ ok?: true } | { error: { message: string } }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: { message: "Brand name can't be empty." } };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not signed in." } };

  // RLS scopes the update to the owner, so matching on id alone is safe.
  const { error } = await supabase.from("brands").update({ name: trimmed }).eq("id", brandId);
  if (error) return { error: { message: error.message } };

  revalidatePath(`/brand/${brandId}`);
  revalidatePath("/brands");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Persist the whole Brand Studio config for one brand. Also ensures the brand
// has a stable public_slug (created lazily) so the play-hub URL is shareable.
export async function saveStudio(
  brandId: string,
  config: BrandStudioConfig,
  brandName?: string,
): Promise<{ ok: true; publicSlug: string } | { error: { message: string } }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not signed in." } };

  const { data: brand, error: readErr } = await supabase
    .from("brands")
    .select("id, name, public_slug")
    .eq("id", brandId)
    .maybeSingle();
  if (readErr) return { error: { message: readErr.message } };
  if (!brand) return { error: { message: "Brand not found." } };

  let publicSlug = (brand as { public_slug: string | null }).public_slug;
  if (!publicSlug) {
    const base = slugify(brandName || (brand as { name: string }).name || "brand") || "brand";
    publicSlug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const patch: Record<string, unknown> = { studio: config, public_slug: publicSlug };
  if (brandName && brandName.trim()) patch.name = brandName.trim();

  const { error } = await supabase.from("brands").update(patch).eq("id", brandId);
  if (error) return { error: { message: error.message } };

  revalidatePath(`/brand/${brandId}`);
  revalidatePath("/brands");
  return { ok: true, publicSlug };
}
