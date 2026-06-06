import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";

export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /api/admin/campaigns/[id]/end — any non-ended status -> ended.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in to manage campaigns.", 401);

  const supabase = createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) return err("not_found", "Campaign not found.", 404);
  if (campaign.status === "ended") {
    return err("invalid_transition", "Campaign has already ended.", 409);
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "ended" })
    .eq("id", params.id);
  if (error) return err("update_failed", error.message, 500);
  return NextResponse.json({ ok: true });
}
