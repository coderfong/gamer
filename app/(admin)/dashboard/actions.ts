"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";
import type { CampaignStatus } from "@/lib/types/database";

// Result helpers --------------------------------------------------------------

type ActionError = { error: { code: string; message: string } };
type ActionOk = { ok: true };

function fail(code: string, message: string): ActionError {
  return { error: { code, message } };
}

// All actions run against the RLS-enforced server client, so a brand can only
// touch its own campaigns — the WHERE never even has to mention brand_id, RLS
// scopes every statement to brands.owner_id = auth.uid().

async function setStatus(
  id: string,
  next: CampaignStatus,
  allowedFrom: CampaignStatus[],
): Promise<ActionOk | ActionError> {
  try {
    const supabase = createClient();

    const { data: campaign, error: readErr } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (readErr) return fail("read_failed", readErr.message);
    if (!campaign) return fail("not_found", "Campaign not found.");
    if (!allowedFrom.includes(campaign.status as CampaignStatus)) {
      return fail(
        "invalid_transition",
        `Cannot move a campaign from "${campaign.status}" to "${next}".`,
      );
    }

    const { error: updateErr } = await supabase
      .from("campaigns")
      .update({ status: next })
      .eq("id", id);

    if (updateErr) return fail("update_failed", updateErr.message);

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail("unexpected", e instanceof Error ? e.message : "Unexpected error.");
  }
}

export async function pauseCampaign(id: string): Promise<ActionOk | ActionError> {
  return setStatus(id, "paused", ["active"]);
}

export async function resumeCampaign(id: string): Promise<ActionOk | ActionError> {
  return setStatus(id, "active", ["paused"]);
}

export async function endCampaign(id: string): Promise<ActionOk | ActionError> {
  return setStatus(id, "ended", ["active", "paused", "draft"]);
}

export async function duplicateCampaign(
  id: string,
): Promise<{ ok: true; newId: string } | ActionError> {
  try {
    const supabase = createClient();

    const { data: source, error: readErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readErr) return fail("read_failed", readErr.message);
    if (!source) return fail("not_found", "Campaign not found.");

    // Build the new campaign row from the source, minus identity/timestamps.
    const {
      id: _id,
      slug: _slug,
      created_at: _createdAt,
      updated_at: _updatedAt,
      status: _status,
      name: sourceName,
      ...rest
    } = source as Record<string, unknown> & { name: string };

    const newName = `${sourceName} (copy)`;
    // Unique-ish slug; slug column is UNIQUE so add a short random suffix.
    const newSlug = `${slugify(sourceName) || "campaign"}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const { data: created, error: insertErr } = await supabase
      .from("campaigns")
      .insert({ ...rest, name: newName, slug: newSlug, status: "draft" })
      .select("id")
      .single();

    if (insertErr) return fail("insert_failed", insertErr.message);
    const newId = created.id as string;

    // Copy prizes (but NOT voucher codes — the brand uploads fresh ones).
    const { data: prizes, error: prizesErr } = await supabase
      .from("prizes")
      .select("*")
      .eq("campaign_id", id);

    if (prizesErr) return fail("prizes_read_failed", prizesErr.message);

    if (prizes && prizes.length > 0) {
      const cloned = prizes.map((p) => {
        const { id: _pid, campaign_id: _cid, created_at: _pcreated, ...prest } = p as Record<
          string,
          unknown
        >;
        return {
          ...prest,
          campaign_id: newId,
          // Reset live inventory to full stock for the fresh copy.
          stock_remaining: (p as { stock_total: number | null }).stock_total,
        };
      });
      const { error: prizeInsertErr } = await supabase.from("prizes").insert(cloned);
      if (prizeInsertErr) return fail("prizes_insert_failed", prizeInsertErr.message);
    }

    revalidatePath("/dashboard");
    return { ok: true, newId };
  } catch (e) {
    return fail("unexpected", e instanceof Error ? e.message : "Unexpected error.");
  }
}

export async function deleteCampaign(id: string): Promise<ActionOk | ActionError> {
  try {
    const supabase = createClient();

    const { data: campaign, error: readErr } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (readErr) return fail("read_failed", readErr.message);
    if (!campaign) return fail("not_found", "Campaign not found.");

    // Child rows (prizes, plays, voucher_codes, redemptions) all have
    // ON DELETE CASCADE, so removing the campaign removes its data too.
    const { error: deleteErr } = await supabase.from("campaigns").delete().eq("id", id);
    if (deleteErr) return fail("delete_failed", deleteErr.message);

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return fail("unexpected", e instanceof Error ? e.message : "Unexpected error.");
  }
}
