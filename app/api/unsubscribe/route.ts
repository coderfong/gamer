import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyEmailToken } from "@/lib/messaging/unsubscribe";

export const dynamic = "force-dynamic";

// One-click marketing opt-out reached from the footer of broadcast emails.
// GET (email clients can't POST): verify the HMAC token, then clear
// marketing_consent on every players/leads row for that email. Service-role,
// since the recipient isn't logged in.

function page(title: string, body: string, ok: boolean): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title></head>
    <body style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:64px auto;padding:24px;text-align:center;">
      <div style="font-size:42px;">${ok ? "✅" : "⚠️"}</div>
      <h1 style="font-size:20px;">${title}</h1>
      <p style="color:#555;">${body}</p>
    </body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("e");
  const token = req.nextUrl.searchParams.get("t");

  if (!email || !verifyEmailToken(email, token)) {
    return page("Invalid unsubscribe link", "This link is invalid or has expired.", false);
  }

  const normalized = email.trim().toLowerCase();
  const supabase = createAdminClient();
  const patch = { marketing_consent: false, marketing_consent_at: null };

  // ilike with no wildcards = case-insensitive exact match on the stored email.
  await supabase.from("players").update(patch).ilike("email", normalized);
  await supabase.from("leads").update(patch).ilike("email", normalized);

  return page(
    "You're unsubscribed",
    "You won't receive any more marketing emails from us. You can still play any games you're sent.",
    true,
  );
}
