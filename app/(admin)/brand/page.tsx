import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandSkinClient } from "@/components/admin/brand/BrandSkinClient";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select("name")
    .eq("owner_id", user.id)
    .maybeSingle();

  return <BrandSkinClient initialName={brand?.name ?? ""} />;
}
