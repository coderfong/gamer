import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { sendCampaignLaunchedEmail } from "@/lib/messaging/resend";
import { toDataUrl } from "@/lib/utils/qrcode";

export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /api/admin/campaigns/[id]/launch — validate then flip draft/paused -> active.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in to launch a campaign.", 401);

  const supabase = createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status, theme, slug, name")
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) return err("not_found", "Campaign not found.", 404);
  if (campaign.status === "active") return err("already_live", "Campaign is already live.", 409);
  if (campaign.status === "ended") return err("ended", "Ended campaigns can’t be relaunched.", 409);

  // --- launch validation ---
  const theme = (campaign.theme ?? {}) as { brandColor?: string };
  if (!theme.brandColor) {
    return err("no_theme", "Set a brand color in the Theme step before launching.", 422);
  }

  const { data: prizes, error: prizesErr } = await supabase
    .from("prizes")
    .select("id, name, is_loss, voucher_codes(count)")
    .eq("campaign_id", params.id);
  if (prizesErr) return err("read_failed", prizesErr.message, 500);
  if (!prizes || prizes.length === 0) {
    return err("no_prizes", "Add at least one prize before launching.", 422);
  }

  const missingCodes = prizes
    .filter((p) => !p.is_loss)
    .filter((p) => {
      const vc = p.voucher_codes as unknown as Array<{ count: number }> | null;
      const count = Array.isArray(vc) ? vc[0]?.count ?? 0 : 0;
      return count === 0;
    })
    .map((p) => p.name);

  if (missingCodes.length > 0) {
    return err(
      "missing_codes",
      `Upload voucher codes for: ${missingCodes.join(", ")}.`,
      422,
    );
  }

  const { error: updateErr } = await supabase
    .from("campaigns")
    .update({ status: "active" })
    .eq("id", params.id);
  if (updateErr) return err("update_failed", updateErr.message, 500);

  // Campaign-launched email (fire-and-forget — failure must not block launch).
  if (brand.contact_email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const publicUrl = `${appUrl}/play/${campaign.slug}`;
    try {
      const qrDataUrl = await toDataUrl(publicUrl);
      await sendCampaignLaunchedEmail({
        to: brand.contact_email,
        brandName: brand.name,
        campaignName: campaign.name,
        publicUrl,
        qrDataUrl,
      });
    } catch (e) {
      console.error("[campaign launched email failed]", e);
    }
  }

  return NextResponse.json({ ok: true });
}
