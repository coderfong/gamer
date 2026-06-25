// Preview assets (game backgrounds, overlays, hero images) are uploaded as raw,
// full-resolution PNGs to Supabase storage. Rendered straight from getPublicUrl
// into a ~300px phone mockup, that means downloading several MB per game just to
// show a thumbnail — which is why flipping through the homepage carousel stalled
// for seconds. We route those URLs through Next's image optimizer so the browser
// gets a small, compressed (WebP) version sized for the preview instead.

// Next's optimizer 400s on any width that isn't in its configured size list.
// These are the framework defaults (imageSizes + deviceSizes); we snap up to the
// nearest allowed value so we never request a disallowed width.
const ALLOWED_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920];

function snapWidth(w: number): number {
  for (const a of ALLOWED_WIDTHS) if (a >= w) return a;
  return ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}

// Wrap a remote asset URL in Next's image optimizer. Leaves anything that isn't
// an http(s) URL (data:/blob:/relative/empty) untouched, and never double-wraps.
export function optimizedImage(url: string | undefined, width: number, quality = 70): string | undefined {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/_next/image")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${snapWidth(width)}&q=${quality}`;
}

// Same as optimizedImage, applied to a list of URLs (e.g. wheel segments, memory
// card faces). Non-string entries are passed through unchanged.
export function optimizedImageList(urls: unknown, width: number, quality = 70): unknown {
  if (!Array.isArray(urls)) return urls;
  return urls.map((u) => (typeof u === "string" ? optimizedImage(u, width, quality) : u));
}
