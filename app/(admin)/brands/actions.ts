"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";

// Brand management actions for the /brands dashboard. Every statement runs
// through the RLS-enforced server client, so an owner can only ever touch their
// own brands — the WHERE never has to spell out the ownership check.

type ActionError = { error: { message: string } };

function newSlug(name: string): string {
  const base = slugify(name) || "brand";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

// Create a blank brand and jump straight into its studio. Called from a form,
// so it redirects on success.
export async function createBrand(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("brands")
    .insert({ owner_id: user.id, name: "Untitled brand", contact_email: user.email ?? null })
    .select("id")
    .single();

  if (error) redirect(`/brands?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/brands");
  redirect(`/brand/${data.id}`);
}

// Clone a brand's studio config into a fresh brand (assets stay referenced by
// their existing public URLs; new uploads land under the new brand id). Does
// not copy campaigns.
export async function duplicateBrand(
  id: string,
): Promise<{ ok: true; newId: string } | ActionError> {
  const supabase = createClient();

  const { data: source, error: readErr } = await supabase
    .from("brands")
    .select("name, studio")
    .eq("id", id)
    .maybeSingle();

  if (readErr) return { error: { message: readErr.message } };
  if (!source) return { error: { message: "Brand not found." } };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not signed in." } };

  const sourceName = (source as { name: string }).name;
  const newName = `${sourceName} (copy)`;

  const { data: created, error: insertErr } = await supabase
    .from("brands")
    .insert({
      owner_id: user.id,
      name: newName,
      contact_email: user.email ?? null,
      studio: (source as { studio: unknown }).studio ?? {},
      public_slug: newSlug(newName),
    })
    .select("id")
    .single();

  if (insertErr) return { error: { message: insertErr.message } };

  revalidatePath("/brands");
  return { ok: true, newId: created.id as string };
}

export async function deleteBrand(id: string): Promise<{ ok: true } | ActionError> {
  const supabase = createClient();

  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) return { error: { message: error.message } };

  revalidatePath("/brands");
  return { ok: true };
}

export async function renameBrand(
  id: string,
  name: string,
): Promise<{ ok: true } | ActionError> {
  const trimmed = name.trim();
  if (!trimmed) return { error: { message: "Brand name can't be empty." } };

  const supabase = createClient();
  const { error } = await supabase.from("brands").update({ name: trimmed }).eq("id", id);
  if (error) return { error: { message: error.message } };

  revalidatePath("/brands");
  return { ok: true };
}
