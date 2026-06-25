import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCustomers } from "@/lib/admin/loadCustomers";
import { CustomersView } from "@/components/admin/CustomersView";

export const dynamic = "force-dynamic";

// Unified per-operator Customer database: deduped players + leads with their
// engagement history, segmentable and exportable. The core Phase 2 moat.
export default async function CustomersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Game data via the RLS-scoped client (owner-scoped); leads via the admin
  // client (RLS denies authenticated reads) — same pattern as /leads.
  const admin = createAdminClient();
  const { customers, error } = await loadCustomers(supabase, admin);

  return (
    <div className="ad space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Customers</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Everyone who played a game or booked a call — your customer database. Filter by segment,
          then export the list to re-engage them.
        </p>
      </header>

      <CustomersView customers={customers} errored={error} />
    </div>
  );
}
