import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState } from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LeadsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Leads are service-role only (RLS denies everyone else), so read with the
  // admin client after confirming an authenticated operator above.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leads")
    .select("id, name, email, phone, company, message, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const leads = (data as LeadRow[] | null) ?? [];

  return (
    <div className="ad space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Leads</h1>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          People who asked to book a call from your site.
        </p>
      </header>

      {error ? (
        <EmptyState
          icon="⚠️"
          title="Couldn't load leads"
          description="The leads table may not exist yet — run migration 0010 in Supabase."
        />
      ) : leads.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No leads yet"
          description="When someone submits the “Book a call” form, they'll show up here."
        />
      ) : (
        <div className="ad-card overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ad-border)" }}>
                {["Received", "Name", "Email", "Phone", "Company", "Message"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide"
                    style={{ color: "var(--ad-faint)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--ad-border)" }} className="align-top">
                  <td className="px-3 py-3 whitespace-nowrap" style={{ color: "var(--ad-muted)" }}>
                    {fmtDate(l.created_at)}
                  </td>
                  <td className="px-3 py-3 font-semibold">{l.name}</td>
                  <td className="px-3 py-3">
                    <a href={`mailto:${l.email}`} className="underline" style={{ color: "var(--ad-accent)" }}>
                      {l.email}
                    </a>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {l.phone ? (
                      <a href={`tel:${l.phone}`} style={{ color: "var(--ad-accent)" }}>
                        {l.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">{l.company || "—"}</td>
                  <td className="px-3 py-3" style={{ maxWidth: 320 }}>
                    {l.message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
