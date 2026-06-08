import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

// Admin shell. Wraps /dashboard, /campaigns/*, /billing.
// Middleware has already verified there's a user; here we hydrate the brand.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select("name, subscription_tier")
    .eq("owner_id", user.id)
    .maybeSingle();

  const brandName = brand?.name ?? "gamer";
  const initials = (user.email ?? "G").slice(0, 2).toUpperCase();

  return (
    <div className="ad" style={{ display: "flex", minHeight: "100vh", background: "var(--ad-bg)" }}>
      <AdminSidebar brandName={brandName} tier={brand?.subscription_tier ?? null} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-6"
          style={{ height: 58, flex: "0 0 58px", borderBottom: "1px solid var(--ad-border)", background: "var(--ad-surface)" }}
        >
          <div className="text-sm font-bold">{brandName}</div>
          <div className="flex items-center gap-3">
            <form action="/logout" method="post">
              <button type="submit" className="ad-btn ad-btn-ghost" style={{ padding: "7px 13px" }}>
                Log out
              </button>
            </form>
            <span
              className="grid place-items-center text-white font-extrabold text-sm"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#FF8A5B,#FF5A4D)" }}
            >
              {initials}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
