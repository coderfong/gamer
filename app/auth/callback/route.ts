import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase email-link callback (confirm-signup, magic-link, OAuth).
// The token comes either as `?code=...` (PKCE) or in the URL hash (implicit).
// We handle the PKCE/code flow here; implicit flow is handled client-side in the
// destination page (the reset-password update page).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, req.url));
}
