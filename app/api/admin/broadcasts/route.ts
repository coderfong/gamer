import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCustomers } from "@/lib/admin/loadCustomers";
import { sendBroadcastEmail } from "@/lib/messaging/resend";
import { unsubscribeUrl } from "@/lib/messaging/unsubscribe";
import { playUrl } from "@/lib/play/qrToken";

export const dynamic = "force-dynamic";

const schema = z.object({
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  campaignId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { subject, message, campaignId } = parsed.data;

  const admin = createAdminClient();

  // Strictly opt-in: only marketing-consented contacts with an email address.
  const { customers } = await loadCustomers(supabase, admin);
  const recipients = Array.from(
    new Map(
      customers
        .filter((c) => c.marketingConsent && c.email)
        .map((c) => [c.email!.toLowerCase(), c.email!] as const),
    ).values(),
  );

  if (recipients.length === 0) {
    return NextResponse.json({ error: "no_recipients" }, { status: 400 });
  }

  // Optional campaign CTA (owner-scoped lookup, so a foreign id yields no link).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let ctaUrl: string | null = null;
  if (campaignId) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("slug")
      .eq("id", campaignId)
      .maybeSingle();
    if (campaign?.slug) ctaUrl = playUrl(appUrl, campaign.slug);
  }

  let sent = 0;
  let failed = 0;
  for (const email of recipients) {
    const res = await sendBroadcastEmail({
      to: email,
      subject,
      message,
      ctaLabel: ctaUrl ? "Play now" : null,
      ctaUrl,
      unsubscribeUrl: unsubscribeUrl(appUrl, email),
    });
    if (res.ok) sent += 1;
    else failed += 1;
  }

  // Record the broadcast (service-role insert; RLS scopes the admin UI reads).
  const { data: inserted, error } = await admin
    .from("broadcasts")
    .insert({
      owner_id: user.id,
      campaign_id: campaignId ?? null,
      subject,
      body: message,
      segment: "consented",
      recipients: recipients.length,
      sent,
      failed,
    })
    .select("id")
    .single();
  if (error) {
    // Emails already went out; surface the count but flag the record failure.
    return NextResponse.json(
      { error: "record_failed", message: error.message, recipients: recipients.length, sent, failed },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, broadcastId: inserted.id, recipients: recipients.length, sent, failed });
}
