import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="h-7 w-7 rounded bg-brand text-brand-fg grid place-items-center text-sm">
              {(brand?.name ?? "G").slice(0, 1).toUpperCase()}
            </span>
            <span>{brand?.name ?? "gamer"}</span>
            {brand?.subscription_tier ? (
              <span className="text-xs uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                {brand.subscription_tier}
              </span>
            ) : null}
          </Link>
          <form action="/logout" method="post">
            <button type="submit" className="text-sm text-zinc-600 hover:text-zinc-900">
              Log out
            </button>
          </form>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-4 text-sm">
          <NavLink href="/dashboard" label="Dashboard" />
          <NavLink href="/campaigns" label="Campaigns" />
          <NavLink href="/billing" label="Billing" />
        </nav>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-2 py-3 -mb-px border-b-2 border-transparent hover:border-zinc-300 text-zinc-600 hover:text-zinc-900"
    >
      {label}
    </Link>
  );
}
