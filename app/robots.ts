import type { MetadataRoute } from "next";

const SITE_URL = "https://gameablestudios.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep the admin app, client portal, and API out of the index.
      disallow: ["/portal", "/dashboard", "/campaigns", "/billing", "/leads", "/customers", "/broadcasts", "/roi", "/brand", "/brands", "/login", "/signup", "/reset-password", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
