import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { prizesPutSchema } from "@/lib/admin/campaignSchemas";

export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// GET /api/admin/campaigns/[id]/prizes — list prizes (with voucher counts).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in.", 401);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("prizes")
    .select("id, name, description, image_url, tier, weight, stock_total, stock_remaining, is_loss, min_score, voucher_codes(count)")
    .eq("campaign_id", params.id)
    .order("tier", { ascending: true });
  if (error) return err("read_failed", error.message, 500);
  return NextResponse.json({ prizes: data ?? [] });
}

// PUT /api/admin/campaigns/[id]/prizes — replace the campaign's prize set.
// Inserts new prizes, updates existing ones, deletes any omitted. Also rebuilds
// campaign.config.win_thresholds from the prizes that carry a min_score.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in to edit prizes.", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = prizesPutSchema.safeParse(body);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const supabase = createClient();

  // Confirm the campaign is owned by the caller (RLS) and load config.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, config")
    .eq("id", params.id)
    .maybeSingle();
  if (!campaign) return err("not_found", "Campaign not found.", 404);

  const incoming = parsed.data.prizes;
  const keepIds = incoming.filter((p) => p.id).map((p) => p.id as string);

  // 1. Delete prizes no longer present (cascade removes their voucher codes).
  {
    let del = supabase.from("prizes").delete().eq("campaign_id", params.id);
    if (keepIds.length > 0) del = del.not("id", "in", `(${keepIds.join(",")})`);
    const { error } = await del;
    if (error) return err("delete_failed", error.message, 500);
  }

  // 2. Update existing prizes (preserve stock_remaining / live inventory).
  for (const p of incoming.filter((x) => x.id)) {
    const { error } = await supabase
      .from("prizes")
      .update({
        name: p.name,
        description: p.description ?? null,
        image_url: p.image_url ?? null,
        tier: p.tier,
        weight: p.weight,
        stock_total: p.stock_total ?? null,
        is_loss: p.is_loss ?? false,
        min_score: p.min_score ?? null,
      })
      .eq("id", p.id as string)
      .eq("campaign_id", params.id);
    if (error) return err("update_failed", error.message, 500);
  }

  // 3. Insert new prizes (stock_remaining starts at stock_total).
  const newRows = incoming
    .filter((x) => !x.id)
    .map((p) => ({
      campaign_id: params.id,
      name: p.name,
      description: p.description ?? null,
      image_url: p.image_url ?? null,
      tier: p.tier,
      weight: p.weight,
      stock_total: p.stock_total ?? null,
      stock_remaining: p.stock_total ?? null,
      is_loss: p.is_loss ?? false,
      min_score: p.min_score ?? null,
    }));
  if (newRows.length > 0) {
    const { error } = await supabase.from("prizes").insert(newRows);
    if (error) return err("insert_failed", error.message, 500);
  }

  // 4. Rebuild win_thresholds for skill games (score -> tier).
  const winThresholds = incoming
    .filter((p) => typeof p.min_score === "number" && !p.is_loss)
    .map((p) => ({ min_score: p.min_score as number, prize_tier: p.tier }));
  const config = { ...(campaign.config as Record<string, unknown>) };
  if (winThresholds.length > 0) config.win_thresholds = winThresholds;
  else delete config.win_thresholds;
  const { error: cfgErr } = await supabase
    .from("campaigns")
    .update({ config })
    .eq("id", params.id);
  if (cfgErr) return err("config_failed", cfgErr.message, 500);

  return NextResponse.json({ ok: true });
}
