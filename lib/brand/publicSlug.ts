import type { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";

type SupabaseClient = ReturnType<typeof createClient>;

// True when `slug` is already the name-derived slug — either the bare slugified
// name, or it plus a numeric collision suffix (e.g. "itea", "itea-2"). The old
// random-suffix slugs (e.g. "untitled-brand-hbfjl") do NOT match, so they get
// regenerated.
export function slugMatchesName(slug: string | null | undefined, name: string): boolean {
  if (!slug) return false;
  const base = slugify(name) || "brand";
  if (slug === base) return true;
  if (!slug.startsWith(`${base}-`)) return false;
  return /^\d+$/.test(slug.slice(base.length + 1));
}

// Build a unique public slug from the brand name: the bare slug first, then
// "-2", "-3", … on collision. `excludeId` lets a brand keep matching its own row.
export async function uniqueBrandSlug(
  supabase: SupabaseClient,
  name: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(name) || "brand";
  // slugify only emits [a-z0-9-], so `base` is LIKE-safe (no % or _).
  const { data } = await supabase
    .from("brands")
    .select("id, public_slug")
    .like("public_slug", `${base}%`);

  const taken = new Set(
    (data ?? [])
      .filter((r) => r.id !== excludeId && r.public_slug)
      .map((r) => r.public_slug as string),
  );

  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`; // pathological fallback
}

// Returns a slug that reflects the brand name, reusing the current one when it
// already matches (idempotent — no churn on re-save with an unchanged name).
export async function ensureBrandSlug(
  supabase: SupabaseClient,
  name: string,
  currentSlug: string | null | undefined,
  brandId?: string,
): Promise<string> {
  if (slugMatchesName(currentSlug, name)) return currentSlug as string;
  return uniqueBrandSlug(supabase, name, brandId);
}
