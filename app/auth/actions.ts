"use server";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// All server actions for the auth flow. Each writes session cookies via
// the SSR server client; the brand row is created server-side via the
// admin (service-role) client so we don't depend on RLS during onboarding.

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const brandName = String(formData.get("brand_name") ?? "").trim() || "My Brand";

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);

  // If we got a user, create their brand row immediately via admin client.
  // (Works whether or not email confirmation is required — the row will sit
  // dormant until they confirm + log in.)
  if (data.user) {
    const admin = createAdminClient();
    await admin.from("brands").upsert(
      {
        owner_id: data.user.id,
        name: brandName,
        contact_email: email,
      },
      { onConflict: "owner_id" },
    );
  }

  // If session is set (email confirmation off), go straight to dashboard.
  // Otherwise prompt to check email.
  if (data.session) {
    redirect("/dashboard");
  }
  redirect("/login?message=check-email");
}

export async function logoutAction() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPasswordRequestAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/update-password`,
  });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect("/reset-password?message=sent");
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const supabase = createServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/auth/update-password?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}
