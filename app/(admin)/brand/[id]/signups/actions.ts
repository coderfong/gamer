"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Set/clear a brand's client-portal access key. RLS scopes the update to the
// owner, so a caller can only touch their own brand.
async function setKey(brandId: string, key: string | null) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("brands").update({ client_access_key: key }).eq("id", brandId);
  revalidatePath(`/brand/${brandId}/signups`);
}

export async function generateClientKey(brandId: string) {
  await setKey(brandId, randomBytes(18).toString("base64url"));
}

export async function clearClientKey(brandId: string) {
  await setKey(brandId, null);
}
