import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentBrand } from "@/lib/admin/brand";
import { sendInvoiceRequestEmail } from "@/lib/messaging/resend";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaign_count: z.number().int().min(0).max(100000),
  notes: z.string().max(4000).optional(),
});

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /api/admin/billing/invoice-request — emails the platform owner.
export async function POST(req: NextRequest) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in to request an invoice.", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const owner = process.env.NEXT_PUBLIC_OWNER_EMAIL;
  if (!owner) return err("not_configured", "Billing contact isn’t configured.", 500);

  const result = await sendInvoiceRequestEmail({
    to: owner,
    brandName: brand.name,
    brandEmail: brand.contact_email ?? "(no email on file)",
    campaignCount: parsed.data.campaign_count,
    notes: parsed.data.notes,
  });
  if (!result.ok) return err("send_failed", result.error ?? "Could not send request.", 500);

  return NextResponse.json({ ok: true });
}
