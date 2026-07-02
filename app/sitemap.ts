import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = "https://gameablestudios.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/demo`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Include the live demo brand pages, if the DB is reachable at build/runtime.
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("brands")
      .select("public_slug")
      .not("public_slug", "is", null);
    const brandRoutes: MetadataRoute.Sitemap = (data ?? [])
      .map((r) => (r as { public_slug: string | null }).public_slug)
      .filter((s): s is string => !!s)
      .map((slug) => ({
        url: `${SITE_URL}/b/${slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
    return [...staticRoutes, ...brandRoutes];
  } catch {
    return staticRoutes;
  }
}
