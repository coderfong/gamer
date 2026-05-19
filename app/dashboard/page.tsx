import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Phase 3 step 3.1: placeholder. Step 3.2 will replace this with the real
// admin shell + dashboard. Today: confirm the user is logged in, fetch
// their brand, show a logout button.
export default async function DashboardPage() {
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
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-zinc-600 text-sm">
              {brand?.name ?? "(no brand)"} · {brand?.subscription_tier ?? "—"}
            </p>
          </div>
          <form action="/logout" method="post">
            <button type="submit" className="rounded-lg border px-4 py-2 text-sm font-medium">
              Log out
            </button>
          </form>
        </header>
        <section className="rounded-xl border bg-white p-6">
          <p className="text-zinc-600">
            Admin shell + dashboard land in step 3.2. For now this page just confirms
            auth + brand provisioning are wired up.
          </p>
        </section>
      </div>
    </main>
  );
}
