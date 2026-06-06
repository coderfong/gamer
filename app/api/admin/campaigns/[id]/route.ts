import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { updateCampaignSchema } from "@/lib/admin/campaignSchemas";

export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// PATCH /api/admin/campaigns/[id] — partial update of an owned campaign.
// RLS scopes the update to the caller's brand; we don't need to filter by brand_id.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in to edit a campaign.", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  if (Object.keys(parsed.data).length === 0) {
    return err("empty_update", "No fields to update.", 400);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update(parsed.data)
    .eq("id", params.id)
    .select("id")
    .maybeSingle();

  if (error) return err("update_failed", error.message, 500);
  if (!data) return err("not_found", "Campaign not found.", 404);
  return NextResponse.json({ ok: true });
}
