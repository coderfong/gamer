import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { toDataUrl } from "@/lib/utils/qrcode";
import { InvoiceRequestForm } from "@/components/admin/billing/InvoiceRequestForm";

export const dynamic = "force-dynamic";

const PLAN_LIMITS: Record<string, number> = {
  pilot: 1,
  active: Infinity,
  suspended: 0,
};

export default async function BillingPage() {
  const brand = await getCurrentBrand();
  if (!brand) redirect("/login");

  const supabase = createClient();
  const { count: activeCount } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const active = activeCount ?? 0;
  const limit = PLAN_LIMITS[brand.subscription_tier] ?? 1;
  const limitLabel = limit === Infinity ? "Unlimited" : String(limit);

  const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "";
  const paynowUen = process.env.NEXT_PUBLIC_OWNER_PAYNOW_UEN ?? "";
  const paynowQr = paynowUen ? await toDataUrl(`PayNow UEN: ${paynowUen}`) : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-zinc-600">Plan, usage, and invoicing</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">Current plan</p>
          <p className="text-xl font-bold capitalize">{brand.subscription_tier}</p>
          <p className="text-sm text-zinc-600 mt-1">
            {limit === Infinity ? "Unlimited campaigns" : `Up to ${limit} active campaign(s)`}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">Active campaigns</p>
          <p className="text-xl font-bold">
            {active} <span className="text-sm font-normal text-zinc-500">/ {limitLabel}</span>
          </p>
          {limit !== Infinity && active >= limit ? (
            <p className="text-sm text-amber-600 mt-1">
              You’ve reached your plan limit. Upgrade to launch more.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h3 className="font-medium">Payment</h3>
        <p className="text-sm text-zinc-600">
          We invoice manually — no cards or subscriptions. Pay via PayNow and we’ll reconcile.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          {paynowQr ? (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paynowQr} alt="PayNow QR" className="rounded border p-1 bg-white" />
              <p className="text-xs text-zinc-500 mt-1">PayNow UEN: {paynowUen}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">PayNow details not configured.</p>
          )}
          <div className="text-sm">
            <p className="text-zinc-500">Billing contact</p>
            <p className="font-medium">{ownerEmail || "Not configured"}</p>
          </div>
        </div>
      </div>

      <InvoiceRequestForm defaultCount={active} />
    </div>
  );
}
