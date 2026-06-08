"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBrandName(name: string): Promise<{ ok?: true } | { error: { message: string } }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: { message: "Brand name can't be empty." } };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not signed in." } };

  const { error } = await supabase.from("brands").update({ name: trimmed }).eq("owner_id", user.id);
  if (error) return { error: { message: error.message } };

  revalidatePath("/brand");
  revalidatePath("/dashboard");
  return { ok: true };
}
