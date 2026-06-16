import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookCallEmail } from "@/lib/messaging/resend";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
  // Honeypot: bots fill hidden fields; humans never see it.
  website: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  // Honeypot tripped → pretend success, store nothing.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const { name, email, phone, company, message } = parsed.data;

  // Store the lead — this is the source of truth the admin views at /leads.
  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").insert({
    name,
    email,
    phone: phone || null,
    company: company || null,
    message: message || null,
    source: "book_a_call",
  });
  if (error) {
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  // Optional email notification — only if ADMIN_NOTIFICATION_EMAIL is configured.
  // Never blocks success; the stored lead is what matters.
  const notify = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (notify) {
    try {
      await sendBookCallEmail({ to: notify, name, email, phone, company, message });
    } catch {
      /* ignore — lead is already stored */
    }
  }

  return NextResponse.json({ ok: true });
}
