import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select("name, subscription_tier, contact_email, created_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Welcome back, {brand?.name ?? "there"}</h1>
        <p className="text-sm text-zinc-600">
          {brand?.contact_email ?? user.email} · {brand?.subscription_tier ?? "—"}
        </p>
      </header>

      <section className="rounded-xl border bg-white p-8 text-center space-y-3">
        <div className="text-5xl">🎯</div>
        <h2 className="text-lg font-semibold">No campaigns yet</h2>
        <p className="text-sm text-zinc-600 max-w-md mx-auto">
          Create your first prize-game campaign to start collecting plays and growing your audience.
        </p>
        <Link href="/campaigns/new" className="btn-brand inline-block">
          New campaign
        </Link>
      </section>
    </div>
  );
}
